import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

// ── May 25, 2026 — VERBATIM user-tested Replicate prompts ──
//
// User direction: "copy my prompts exactly". Previously this edge function
// asked OpenRouter / gpt-4o to *generate* a prompt from a system-prompt
// template, which paraphrased the user's tested wording every call and
// hurt output quality. We now return the user's exact tested prompt for
// each transformation category. Kling sees the start and end images
// directly — the prompt only describes the morph between them — so a
// fixed, hand-tuned prompt is strictly more reliable than a generated one.
//
// Each entry below was lifted verbatim from the user's Replicate playground
// tests. Every prompt ends with "Ending fully at the second image." so
// Kling's end_image anchor locks the final frame.
const USER_VERBATIM_PROMPTS: Record<string, string> = {
  // Build / full ground-up construction
  build:
    "a sped up timelapse of a group of workers building the house from the ground up, from the foundation to the final painting job with the complete house as the final frame. Ending fully at the second image.",
  construction:
    "a sped up timelapse of a group of workers building the house from the ground up, from the foundation to the final painting job with the complete house as the final frame. Ending fully at the second image.",

  // Cleanup / declutter
  cleanup:
    "a sped up timelapse of a cleaning crew removing every piece of clutter, bagging trash, and wiping every surface until the room is fully clean as the final frame. Ending fully at the second image.",
  clean:
    "a sped up timelapse of a cleaning crew removing every piece of clutter, bagging trash, and wiping every surface until the room is fully clean as the final frame. Ending fully at the second image.",
  declutter:
    "a sped up timelapse of a cleaning crew removing every piece of clutter, bagging trash, and wiping every surface until the room is fully clean as the final frame. Ending fully at the second image.",

  // Setup / staging / decoration
  setup:
    "a sped up timelapse of a staging crew placing furniture, rugs, lighting, and decor piece by piece until the room is fully staged as the final frame. Ending fully at the second image.",
  staging:
    "a sped up timelapse of a staging crew placing furniture, rugs, lighting, and decor piece by piece until the room is fully staged as the final frame. Ending fully at the second image.",
  decoration:
    "a sped up timelapse of a staging crew placing furniture, rugs, lighting, and decor piece by piece until the room is fully staged as the final frame. Ending fully at the second image.",
}

function getVerbatimPrompt(category?: string): string {
  const key = (category || "").toLowerCase()
  return USER_VERBATIM_PROMPTS[key] || USER_VERBATIM_PROMPTS.build
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const prompt = getVerbatimPrompt(body?.transformation_category)

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
