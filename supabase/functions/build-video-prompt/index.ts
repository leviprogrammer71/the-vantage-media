import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions"

// ── May 23, 2026 — REWRITE: simple, no negatives, FORCE end state ──
// User reports "house build from ground up doesn't finish full transformation
// by the time 10 or 15 secs done." Root cause: the previous 134-line system
// prompt loaded the model with physics laws, character causation rules,
// negative aesthetics, etc — diluting Kling's end_image anchor. The morph
// stretched out too slowly to land on the AFTER state in 10s.
//
// New approach: short, declarative, FRONT-LOAD end-state language. Kling
// already sees the end image — the prompt just tells it WHEN to get there
// (by the final second) and HOW to interpolate (smoothly, no jitter).
// All negatives stripped per user directive: "simple, no negatives".
RULES:
1. Maximum 50 words total.
2. End the prompt with the exact phrase: "ending fully at the second image".
3. Time-compressed build sequence: the construction must complete by the final frame. Use phrases like "rapid time-lapse", "fast-forward construction", "the building rises and finishes" so Kling allocates the full transformation across the clip duration instead of stalling.
4. One natural camera move only (slow dolly forward, gentle pan, or slow pull back). No directorial vocabulary, no camera body names, no f-stops, no film stock names.
5. Use plain present-tense action verbs. No negatives ("no X", "not Y"). No anti-AI clauses.

FORMAT (exactly this shape):
"<one short sentence describing the time-lapse build action>. <one short sentence describing the camera move>. Ending fully at the second image."

EXAMPLE for a house build:
"Time-lapse of crews framing, sheathing, roofing, siding, and finishing the house from foundation to completion. Slow dolly forward. Ending fully at the second image."

Output ONLY the prompt — no headings, no commentary.`

// ── May 23, 2026 — same rewrite for cleanup. Simple, no negatives, force end state. ──
const CLEANUP_VIDEO_SYSTEM_PROMPT = `You write cleanup transformation video prompts for Kling 2.5 Turbo Pro. Kling sees the messy START frame and the clean END frame directly — your prompt only describes the cleanup motion between them.

RULES:
1. Maximum 50 words total.
2. End the prompt with the exact phrase: "ending fully at the second image".
3. Time-compressed cleanup: the space must reach the fully clean state by the final frame. Use phrases like "rapid time-lapse cleanup", "fast-forward declutter", "the clutter is removed and surfaces wiped".
4. One natural camera move only (slow dolly forward, gentle pan, or slow pull back). No camera body names, no f-stops, no film stock.
5. Plain present-tense verbs. No negatives, no "no X" clauses, no anti-AI lines.

FORMAT:
"<one short sentence describing the time-lapse cleanup>. <one short sentence describing the camera move>. Ending fully at the second image."

EXAMPLE:
"Time-lapse of crews removing clutter, bagging waste, and wiping every surface until the room is fully clean. Slow pull back. Ending fully at the second image."

Output ONLY the prompt.`

// ── May 23, 2026 — same rewrite for setup. Simple, no negatives, force end state. ──
const SETUP_VIDEO_SYSTEM_PROMPT = `You write setup / staging transformation video prompts for Kling 2.5 Turbo Pro. Kling sees the empty START frame and the fully-staged END frame directly — your prompt only describes the placement motion between them.

RULES:
1. Maximum 50 words total.
2. End the prompt with the exact phrase: "ending fully at the second image".
3. Time-compressed setup: the space must reach the fully-staged state by the final frame. Use phrases like "rapid time-lapse staging", "fast-forward setup", "stylists place every item until the room is fully arranged".
4. One natural camera move only (slow dolly forward, gentle pan, or slow pull back). No camera body names, no f-stops, no film stock.
5. Plain present-tense verbs. No negatives, no "no X" clauses, no anti-AI lines.

FORMAT:
"<one short sentence describing the time-lapse staging>. <one short sentence describing the camera move>. Ending fully at the second image."

EXAMPLE:
"Time-lapse of stylists placing furniture, rugs, lighting, and decor until the room is fully staged. Slow dolly forward. Ending fully at the second image."

Output ONLY the prompt.`

function getSystemPrompt(category?: string): string {
  switch ((category || "").toLowerCase()) {
    case "cleanup":
    case "clean":
    case "declutter":
      return CLEANUP_VIDEO_SYSTEM_PROMPT
    case "setup":
    case "staging":
    case "decoration":
      return SETUP_VIDEO_SYSTEM_PROMPT
    default:
      return CONSTRUCTION_VIDEO_SYSTEM_PROMPT
  }
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status}): ${url.slice(0, 120)}`)
  const buffer = await res.arrayBuffer()
  const b64 = base64Encode(new Uint8Array(buffer))
  const ct = res.headers.get("content-type") || "image/jpeg"
  const mime = ct.split(";")[0].trim()
  return `data:${mime};base64,${b64}`
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY")
  if (!OPENROUTER_KEY) {
    return new Response(
      JSON.stringify({ error: "OPENROUTER_API_KEY not set" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  try {
    const {
      before_image_url,
      after_image_url,
      transformation_type,
      transformation_category,
      build_type,
      motion_style,
      description,
    } = await req.json()

    const systemPrompt = getSystemPrompt(transformation_category)

    if (!after_image_url) {
      throw new Error("after_image_url is required")
    }

    const userMessage = `Transformation type: ${transformation_type}
Project description: ${description || "Not provided"}

Write a maximum 50-word prompt following the system rules. The prompt MUST end with the exact phrase "ending fully at the second image". Force the transformation to complete by the final frame using time-lapse / fast-forward language. One natural camera move. No negatives.`

    // Convert images to base64 so OpenRouter/Azure accepts the format
    const imageParts: any[] = []
    if (before_image_url) {
      const b64Before = await fetchImageAsBase64(before_image_url)
      imageParts.push({ type: "image_url", image_url: { url: b64Before } })
    }
    const b64After = await fetchImageAsBase64(after_image_url)
    imageParts.push({ type: "image_url", image_url: { url: b64After } })

    const res = await fetch(OPENROUTER, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://thevantage.co",
        "X-Title": "The Vantage"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              ...imageParts,
              { type: "text", text: userMessage }
            ]
          }
        ],
        max_tokens: 400,
        temperature: 0.7
      })
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(`OpenRouter error ${res.status}: ${JSON.stringify(data)}`)
    }

    const prompt = data.choices?.[0]?.message?.content?.trim()
    if (!prompt) {
      throw new Error(`OpenRouter returned no content: ${JSON.stringify(data)}`)
    }

    return new Response(
      JSON.stringify({ video_prompt: prompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
