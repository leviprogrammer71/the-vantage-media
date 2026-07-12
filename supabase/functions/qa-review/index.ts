// qa-review — the agentic QA gate.
//
// After a reel/clip renders, this asks a vision model (Claude via OpenRouter)
// to look at a few frames and judge whether the output is clean and matches
// the source, or shows the classic AI-video failure modes (warping, melted
// geometry, hallucinated objects/people, duplicated rooms, text garble,
// flicker). It returns a verdict + score + concrete issues so the app can
// surface a "re-generate" suggestion.
//
// FAIL-SAFE: if the key is missing, no frames are provided, the model errors,
// or the reply is unparseable, it returns verdict:"unavailable" — NEVER a
// false "review", so it can't nag users about good reels or block anything.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions"
const MODEL = Deno.env.get("QA_MODEL") || Deno.env.get("CURATION_MODEL") || "anthropic/claude-3.5-sonnet"

type Verdict = "pass" | "review" | "unavailable"

interface QAResult {
  verdict: Verdict
  score: number // 0-100 confidence the clip is clean/usable
  issues: string[]
  summary: string
  source: "claude" | "fallback"
}

function unavailable(note: string): QAResult {
  return { verdict: "unavailable", score: 0, issues: [], summary: note, source: "fallback" }
}

function extractJson(text: string): any | null {
  if (!text) return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch {
    return null
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => ({}))
    const frameUrls: string[] = Array.isArray(body?.frame_urls)
      ? body.frame_urls.filter((u: unknown) => typeof u === "string" && u.length > 0)
      : []
    const sourceUrls: string[] = Array.isArray(body?.source_photo_urls)
      ? body.source_photo_urls.filter((u: unknown) => typeof u === "string" && u.length > 0).slice(0, 4)
      : []

    if (frameUrls.length === 0) {
      return new Response(JSON.stringify(unavailable("No frames provided to review.")), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const KEY = Deno.env.get("OPENROUTER_API_KEY")
    if (!KEY) {
      return new Response(JSON.stringify(unavailable("QA model not configured.")), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const frames = frameUrls.slice(0, 5)

    const system =
      "You are the quality-control reviewer for The Vantage, a real-estate reel studio. " +
      "You are shown a few FRAMES sampled from one generated video clip (and optionally the SOURCE photos it was made from). " +
      "Judge whether the clip is clean and usable for a professional listing, or shows AI-video failure modes: " +
      "warping/melting geometry, bent walls or windows, hallucinated people/objects/furniture that shouldn't be there, " +
      "duplicated or morphing rooms, garbled text or signage, severe flicker/artifacts, or a subject that no longer matches the source. " +
      "Minor motion softness is fine — only flag real, noticeable defects a client would reject. " +
      "Return ONLY strict minified JSON: " +
      '{"verdict":"pass"|"review","score":0-100,"issues":["..."],"summary":"one short sentence"}. ' +
      'Use "review" only when there is a clear, visible defect; otherwise "pass". score = your confidence the clip is clean.'

    const content: unknown[] = []
    if (sourceUrls.length) {
      content.push({ type: "text", text: "SOURCE photo(s):" })
      for (const u of sourceUrls) content.push({ type: "image_url", image_url: { url: u } })
    }
    content.push({ type: "text", text: "FRAMES from the generated clip:" })
    for (const u of frames) content.push({ type: "image_url", image_url: { url: u } })

    let data: any
    try {
      const res = await fetch(OPENROUTER, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://thevantage.media",
          "X-Title": "The Vantage",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content },
          ],
          max_tokens: 400,
          temperature: 0.2,
        }),
      })
      if (!res.ok) {
        return new Response(JSON.stringify(unavailable(`QA model HTTP ${res.status}.`)), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      data = await res.json()
    } catch (e) {
      return new Response(JSON.stringify(unavailable(`QA call failed: ${(e as Error).message}`)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const text = data?.choices?.[0]?.message?.content?.trim?.() ?? ""
    const parsed = extractJson(text)
    if (!parsed || (parsed.verdict !== "pass" && parsed.verdict !== "review")) {
      return new Response(JSON.stringify(unavailable("QA reply unparseable.")), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const result: QAResult = {
      verdict: parsed.verdict,
      score: Number.isFinite(Number(parsed.score)) ? Math.max(0, Math.min(100, Math.round(Number(parsed.score)))) : parsed.verdict === "pass" ? 90 : 40,
      issues: Array.isArray(parsed.issues) ? parsed.issues.map((s: unknown) => String(s)).slice(0, 6) : [],
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 240) : "",
      source: "claude",
    }
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify(unavailable(`Unexpected error: ${(err as Error).message}`)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
