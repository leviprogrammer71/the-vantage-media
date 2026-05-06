import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

const REPLICATE = "https://api.replicate.com/v1"

// ── Model registry ──
// Replicate model slugs. Centralised so we can swap a model in one place.
// Seedance 2.0 ("seedance-1-pro" is ByteDance's current Seedance Pro release on
// Replicate; the marketing name is Seedance 2.0).
const MODEL_KLING = "kwaivgi/kling-v2.5-turbo-pro"
const MODEL_SEEDANCE = "bytedance/seedance-1-pro"

// Force Seedance 2.0 for every clip. Quality over snap — users complained about
// Kling output and we standardise on the higher-quality model.
const LONG_FORM_THRESHOLD_SECONDS = 0

// ── SHOT LIBRARY ──
// motionHint uses standard cinematography vocab Seedance/Kling were trained on:
// dolly, pan, tilt, tracking, crane, arc, slider, rack focus. Each hint is one
// declarative sentence — no double moves, no contradictions.
//
// pacing affects the timeline beat structure (slow shots get a longer settle,
// medium pacing keeps the move in motion until the last beat).
const SHOT_CONFIG: Record<string, { model: "kling" | "seedance"; motionHint: string; pacing: "slow" | "medium" }> = {
  slow_push: {
    model: "kling",
    motionHint: "Slow dolly push-in toward the subject from medium-wide to medium close. Gimbal-stabilized, no rotation, no roll.",
    pacing: "slow",
  },
  drone_orbit: {
    model: "seedance",
    motionHint: "Slow aerial arc — drone orbits 60 degrees around the subject at elevated altitude, gimbal-stabilized, smooth circular path.",
    pacing: "slow",
  },
  parallax_pan: {
    model: "kling",
    motionHint: "Lateral parallax tracking shot moving slowly left to right, camera at eye level, foreground and background drift at different rates revealing depth.",
    pacing: "medium",
  },
  reveal_rise: {
    model: "kling",
    motionHint: "Crane up — camera rises vertically from low ground level to eye height, revealing the composition from the bottom up.",
    pacing: "medium",
  },
  architectural: {
    model: "seedance",
    motionHint: "Clean architectural slider — perfectly horizontal lateral track, no rotation, no tilt, emphasizing symmetry and architectural lines.",
    pacing: "slow",
  },
  establishing: {
    model: "seedance",
    motionHint: "Slow pull-back dolly out from tight composition to a wide establishing frame. The space opens up as the camera retreats.",
    pacing: "slow",
  },
}

// Build a timeline-prompted clip prompt. Seedance + Kling perform dramatically
// better with explicit [0:00–0:0N] beats than with vague "first half / last
// half" instructions. We open with a 1-second hold (locks the source frame),
// run the camera move through the middle, and reserve the last beat for a
// settle so the clip doesn't end mid-motion.
function buildClipPrompt(
  motionHint: string,
  duration: number,
  vibeLine: string,
  pacing: "slow" | "medium" = "slow"
): string {
  const settleMark = pacing === "slow" ? Math.max(duration - 1, 3) : Math.max(duration - 1, 4)
  const dd = (n: number) => String(n).padStart(2, "0")
  // Stability cues at the END of the prompt — Seedance + Kling weight the
  // tail of the prompt heavily for negative constraints. The "single primary
  // camera instruction + slow / smooth / stable + gimbal" pattern is the
  // research-backed jitter-prevention recipe.
  return (
    `Cinematic 9:16 vertical real-estate listing reel. 1080p photorealistic, magazine-quality. ` +
    `[0:00–0:01] Open on the establishing frame; architecture, materials, lighting, and framing locked exactly to the source photo. ` +
    `[0:01–0:${dd(settleMark)}] ${motionHint} Slow, smooth, stable, gimbal-stabilized motion — single deliberate move, no acceleration changes. ` +
    `[0:${dd(settleMark)}–0:${dd(duration)}] Settle on the final composition and hold absolutely still. ` +
    `Subject and architecture stay identical to the source throughout — no morphing, no invented rooms, no added people or animals, no weather change. ` +
    `Stability constraints: avoid jitter, avoid camera shake, avoid handheld micro-wobble, avoid sudden direction changes, avoid frame drops, avoid flickering, avoid motion blur. ` +
    `${vibeLine}`
  )
}

// Sign overlay prompts. gpt-image-2 (and the nano-banana fallback) handle
// typography reasoning best when given: subject, exact placement, sign anatomy
// (post + panel + frame), typography brief, scale anchor, lighting match,
// and what to leave unchanged. Order matters — placement first, look-and-feel
// after, "do not modify the rest of the image" last.
const EFFECT_PROMPTS: Record<string, string> = {
  none: "",
  just_listed:
    "Add a single 'JUST LISTED' real estate yard sign in the lawn directly in front of the property, post planted upright at ground level, panel facing the camera. " +
    "Sign anatomy: rigid white aluminum panel approximately 24 inches wide by 18 inches tall, mounted on a 4-foot black metal post with a small finial cap. " +
    "Typography: 'JUST LISTED' set in clean dark navy serif capitals, evenly weighted, perfectly sharp, no kerning errors, no double letters. Optional small brokerage placeholder line below in lighter text. " +
    "Scale: post height roughly equal to a fire hydrant, sign panel about waist-high. Cast a soft realistic shadow on the grass matching the existing sun direction. " +
    "Match the photo's lighting, white balance, and depth of field exactly. Do not alter the building, landscaping, sky, or any other element of the image.",
  open_house:
    "Add a single 'OPEN HOUSE' A-frame sandwich-board sign on the entrance walkway, just before the front door, panel angled 30° toward the camera. " +
    "Sign anatomy: white-painted timber A-frame, sturdy and matte, approximately 36 inches tall, both faces showing the same text. " +
    "Typography: 'OPEN HOUSE' in bold dark navy serif capitals across the top, with a sharp narrow 'THIS WEEKEND' line beneath in a thinner italic. Letters perfectly crisp, no fuzz, no doubled glyphs. " +
    "Scale: knee-high, fits naturally on the walkway without obstructing the front entrance. Cast a soft realistic shadow on the path matching the existing sun direction. " +
    "Match the photo's lighting, white balance, and depth of field exactly. Do not alter the building, landscaping, sky, or any other element of the image.",
  for_sale:
    "Add a single 'FOR SALE' real estate yard sign in the lawn in front of the property, post planted upright at ground level, panel facing the camera. " +
    "Sign anatomy: rigid white aluminum panel approximately 24 inches wide by 18 inches tall, mounted on a 4-foot black metal post with a small finial cap. " +
    "Typography: 'FOR SALE' set in clean dark navy serif capitals, evenly weighted, perfectly sharp, no kerning errors, no double letters. Small brokerage placeholder line below in lighter weight. " +
    "Scale: post height roughly equal to a fire hydrant, sign panel about waist-high. Cast a soft realistic shadow on the grass matching the existing sun direction. " +
    "Match the photo's lighting, white balance, and depth of field exactly. Do not alter the building, landscaping, sky, or any other element of the image.",
  sold:
    "Add a single 'SOLD' real estate yard sign in the lawn in front of the property, post planted upright at ground level, panel facing the camera. " +
    "Sign anatomy: rigid white aluminum panel approximately 24 inches wide by 18 inches tall on a 4-foot black metal post, with a bold red diagonal 'SOLD' banner riding across the panel. " +
    "Typography: 'SOLD' in heavy white serif capitals on the red banner, perfectly crisp, no fuzz. Smaller brokerage placeholder line in dark navy serif beneath the banner. " +
    "Scale: post height roughly equal to a fire hydrant. Cast a soft realistic shadow on the grass matching the existing sun direction. " +
    "Match the photo's lighting, white balance, and depth of field exactly. Do not alter the building, landscaping, sky, or any other element of the image.",
}

const QUICK_EFFECT_BADGES: Record<string, { label: string; color: string }> = {
  just_listed: { label: "JUST LISTED", color: "#8C3F2E" },
  open_house: { label: "OPEN HOUSE THIS WEEKEND", color: "#0E0E0C" },
  for_sale: { label: "FOR SALE", color: "#8C3F2E" },
  sold: { label: "SOLD", color: "#0E0E0C" },
}

// Staging style libraries. Each preset names exact materials (with finish
// callouts), exact placement zones (center, against the longest wall, etc.),
// and a one-line lighting cue so Seedance can render the right diffuse vs.
// directional light. Specificity drives realism — vague descriptions read as
// AI slop, named materials read as a photographer's brief.
const STAGING_STYLES: Record<string, string> = {
  modern:
    "Modern minimalist palette: warm white walls, mid-tone European oak floor, brushed nickel and matte black accents. " +
    "Furniture: low-profile linen sofa centered against the longest wall, smoked-glass coffee table on a flat-weave wool rug in front of it, sculptural matte-black arc floor lamp arching over the sofa, framed abstract canvas above the sofa back. " +
    "Accents: one large potted fiddle-leaf fig in a stoneware pot in the corner, two ceramic vessels on the coffee table. " +
    "Lighting: cool diffuse daylight from the existing windows, soft fill, no hard shadows.",
  mid_century:
    "Mid-century modern palette: walnut tones throughout, mustard and teal accents on a cream backdrop. " +
    "Furniture: low-profile teak credenza on tapered hairpin legs against the longest wall, boucle armchair angled into the room with a small walnut side table, geometric wool area rug centered under the seating. " +
    "Accents: sunburst wall clock above the credenza, rounded ceramic table lamp on the credenza, atomic-era pottery in mustard and teal. " +
    "Lighting: warm afternoon side light rakes across the walnut grain, exposing wood texture and ceramic glaze.",
  coastal:
    "Coastal palette: weathered driftwood, soft sea blue, sandy beige, layered jute and white linen. " +
    "Furniture: white slipcovered sofa with linen weave centered against the longest wall, weathered-driftwood coffee table on a chunky woven jute rug, slim raffia armchair angled into the room. " +
    "Accents: rope-and-clear-glass pendant overhead, framed black-and-white shoreline photography in a whitewashed timber frame, ceramic vase with dried beach grass on the coffee table. " +
    "Lighting: bright soft diffuse light, slight sun-warm cast, gauzy linen sheers softening the windows.",
  farmhouse:
    "Modern farmhouse palette: shiplap accent walls, distressed reclaimed-wood beams, cream and forest green, vintage matte-iron fixtures. " +
    "Furniture: slipcovered cream linen sofa centered against the longest wall, barn-wood coffee table on a hand-loomed cotton rug, woven-rush armchair angled in. " +
    "Accents: oversized woven basket beside the sofa, mason-jar pendant lighting, simple cream cotton throw draped over the sofa arm. " +
    "Lighting: soft warm tungsten interior light supplemented by daylight, gentle long shadows on the shiplap.",
  luxury_modern:
    "Luxury modern palette: deep navy, warm gold, ink-veined Calacatta marble, unlacquered brass, lacquered black surfaces. " +
    "Furniture: deep navy velvet sofa with channel tufting centered against the longest wall, black-veined Calacatta marble coffee table on a high-pile cream wool rug, single Italian-leather lounge chair angled in cognac. " +
    "Accents: sculptural alabaster pendant overhead, fluted ribbed-wood console along the side wall, oversized abstract canvas above the sofa, unlacquered brass picture light. " +
    "Lighting: low-angle warm golden side light, deep shadows on velvet pile, controlled highlights on the marble veining and brass.",
  scandinavian:
    "Scandinavian palette: bright white walls, blonde oak floors, soft greys, layered creamy wool, abundant natural light. " +
    "Furniture: cream linen sofa with rounded arms centered against the longest wall, two blonde-oak nesting tables in front, single bouclé accent chair angled into the room. " +
    "Accents: tall paper-shade floor lamp beside the sofa, three framed graphic black-and-white prints in a clean grid above the sofa, one large monstera in a matte-stoneware pot. " +
    "Lighting: high-key diffuse daylight, almost shadowless, gentle warm bounce from the oak floor.",
}

async function pollReplicate(predictionId: string, maxAttempts = 120): Promise<string> {
  const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 4000))
    const res = await fetch(
      `${REPLICATE}/predictions/${predictionId}`,
      { headers: { Authorization: `Token ${TOKEN}` } }
    )
    const data = await res.json()
    if (data.status === "succeeded") {
      if (typeof data.output === "string") return data.output
      if (Array.isArray(data.output)) return data.output[0]
      throw new Error("Unexpected Replicate output format")
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(data.error || "Replicate prediction failed")
    }
  }
  throw new Error("Replicate prediction timed out")
}

// ── Vibe → cinematic suffix mapping (single source of truth) ──
// Each suffix is a four-element brief: lens/depth, lighting quality + colour
// temperature, motion grammar, finishing aesthetic. Drawn from the
// Higgsfield / Veo / Seedance prompt guides — naming optical specifics like
// "shallow depth of field at f/1.8" and "anamorphic widescreen flares" gives
// the model concrete visual targets that vague mood words don't.
function vibeSuffix(vibe: string): string {
  switch (vibe) {
    case "luxury":
      return "Shot on a full-frame cinema camera with a 35mm prime at f/2 — shallow depth of field, creamy bokeh on backgrounds. Golden-hour warm light at 3200K raking across architectural surfaces, deep saturated shadows, controlled specular highlights on metal and stone. Slow deliberate motion. Editorial magazine cinematic finish."
    case "cozy":
      return "Shot on a 50mm prime at f/2.8 — natural depth of field, faces and textures in tactile focus. Warm interior tungsten light at 2700K, soft long shadows, low-key fill. Gentle hand-felt camera movement. Lived-in domestic warmth, slight film grain finish."
    case "modern":
      return "Shot on a 24mm wide prime at f/4 — sharp edge-to-edge, architectural lines crisp. Cool diffuse daylight at 5600K, almost shadowless, clean white balance. Smooth gimbal motion in a single direction. Contemporary minimalist finish, high contrast on geometry."
    case "family":
      return "Shot on a 35mm at f/2.8 — natural perspective, gentle depth of field. Bright midday natural light at 5000K, soft fill from off-camera bounce, no hard shadows. Steady eye-level motion, no parallax distortion. Welcoming approachable finish, slight warmth in the highlights."
    case "investment":
      return "Shot on a 28mm at f/5.6 — deep depth of field, every detail of layout legible. Neutral even lighting at 5200K, no directional drama. Steady documentary motion. Professional real-estate showcase finish — no film grain, no colour grading flourish."
    case "vacation":
      return "Shot on a 35mm at f/2 — shallow depth of field, atmospheric backgrounds. Sunset warm palette at 3000K with hot horizon glow, gentle haze, sun flare across foliage. Smooth gimbal motion with light breeze in branches and grasses. Escapist resort finish, lightly warm-graded."
    default:
      return "Shot on a 35mm prime at f/2.8 — natural depth of field. Warm diffuse natural light at 3800K, soft shadows. Slow deliberate motion. Editorial magazine cinematic finish."
  }
}

// ── Property photo → "sketch on a desk" reference image ──
// Uses google/nano-banana on Replicate. Verified working: takes a photo as
// `image_input` reference, outputs a hand-drawing-on-desk sketch of the same
// subject in ~8s. Used for the Sketch to Reality reveal flow where the sketch
// then morphs back into the real photo via Kling.
async function generateSketchWithNanoBanana(
  referenceImageUrl: string,
  prompt: string,
  token: string
): Promise<string> {
  const res = await fetch(
    `${REPLICATE}/models/google/nano-banana/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({
        input: {
          prompt,
          image_input: [referenceImageUrl],
          output_format: "jpg",
        },
      }),
    }
  )

  const prediction = await res.json()
  if (!res.ok || !prediction.id) {
    const detail = prediction?.detail || prediction?.error?.message || JSON.stringify(prediction).slice(0, 400)
    throw new Error(`nano-banana sketch generation rejected (HTTP ${res.status}): ${detail}`)
  }

  if (prediction.status === "succeeded") {
    const out = prediction.output
    const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : (out?.url || ""))
    if (url) return url
  }

  const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
  for (let i = 0; i < 12; i++) {
    await new Promise((r) => setTimeout(r, 4000))
    const pollRes = await fetch(`${REPLICATE}/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${TOKEN}` },
    })
    const pollData = await pollRes.json()
    if (pollData.status === "succeeded") {
      const out = pollData.output
      const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : (out?.url || ""))
      if (url) return url
      throw new Error("nano-banana succeeded but returned no URL")
    }
    if (pollData.status === "failed" || pollData.status === "canceled") {
      throw new Error(`nano-banana failed: ${pollData.error || "unknown"}`)
    }
  }
  throw new Error("nano-banana sketch generation timed out")
}

// ── Sketch / Floor Plan → Photoreal renderer ──
// Uses flux-kontext-pro which is purpose-built for image-to-image style
// transformation (sketch → photoreal, line drawing → render). Falls back to
// gpt-image-2 if flux-kontext fails.
async function renderSketchToPhotoreal(
  sourceImageUrl: string,
  prompt: string,
  token: string
): Promise<string> {
  // PRIMARY: black-forest-labs/flux-kontext-pro — designed for transformations
  try {
    const res = await fetch(
      `${REPLICATE}/models/black-forest-labs/flux-kontext-pro/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait=60",
        },
        body: JSON.stringify({
          input: {
            prompt,
            input_image: sourceImageUrl,
            aspect_ratio: "match_input_image",
            output_format: "jpg",
            safety_tolerance: 2,
            prompt_upsampling: false,
          },
        }),
      }
    )
    const prediction = await res.json()
    if (!res.ok || !prediction.id) {
      const detail = prediction?.detail || prediction?.error?.message || JSON.stringify(prediction).slice(0, 400)
      throw new Error(`flux-kontext-pro rejected (HTTP ${res.status}): ${detail}`)
    }
    if (prediction.status === "succeeded") {
      const out = prediction.output
      const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : (out?.url || ""))
      if (url) return url
    }
    const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
    for (let i = 0; i < 18; i++) {
      await new Promise((r) => setTimeout(r, 4000))
      const pollRes = await fetch(`${REPLICATE}/predictions/${prediction.id}`, {
        headers: { Authorization: `Token ${TOKEN}` },
      })
      const pollData = await pollRes.json()
      if (pollData.status === "succeeded") {
        const out = pollData.output
        const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : (out?.url || ""))
        if (url) return url
        throw new Error("flux-kontext-pro succeeded but returned no URL")
      }
      if (pollData.status === "failed" || pollData.status === "canceled") {
        throw new Error(`flux-kontext-pro failed: ${pollData.error || "unknown"}`)
      }
    }
    throw new Error("flux-kontext-pro polling timed out")
  } catch (kontextErr) {
    console.error("[renderSketchToPhotoreal] flux-kontext-pro failed, trying gpt-image-2:", kontextErr)
    // Fallback: gpt-image-2
    return await generateWithNanoBanana(sourceImageUrl, prompt, token)
  }
}

async function generateWithNanoBanana(
  imageUrl: string,
  effectPrompt: string,
  token: string
): Promise<string> {
  // PRIMARY: openai/gpt-image-2 — best at rendering text-on-signs (real estate signage)
  // FALLBACK: google/nano-banana for non-text edits if gpt-image-2 fails
  // Function name kept for backwards compatibility.

  // gpt-image-2 only accepts 1:1, 3:2, 2:3 — listing photos are vertical so use 2:3
  try {
    const res = await fetch(
      `${REPLICATE}/models/openai/gpt-image-2/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait=60",
        },
        body: JSON.stringify({
          input: {
            prompt: effectPrompt,
            input_images: [imageUrl],
            aspect_ratio: "2:3",
            output_format: "jpg", // Kling/Seedance reject webp downstream
          },
        }),
      }
    )

    const prediction = await res.json()
    if (!res.ok || !prediction.id) {
      const detail = prediction?.detail || prediction?.error?.message || JSON.stringify(prediction).slice(0, 400)
      throw new Error(`gpt-image-2 rejected (HTTP ${res.status}): ${detail}`)
    }

    if (prediction.status === "succeeded") {
      const out = prediction.output
      const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : (out?.url || ""))
      if (url) return url
    }

    // Bounded poll — gpt-image-2 usually finishes in 20-30s.
    const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 4000))
      const pollRes = await fetch(`${REPLICATE}/predictions/${prediction.id}`, {
        headers: { Authorization: `Token ${TOKEN}` },
      })
      const pollData = await pollRes.json()
      if (pollData.status === "succeeded") {
        const out = pollData.output
        const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : (out?.url || ""))
        if (url) return url
        throw new Error("gpt-image-2 succeeded but returned no URL")
      }
      if (pollData.status === "failed" || pollData.status === "canceled") {
        throw new Error(`gpt-image-2 failed: ${pollData.error || "unknown"}`)
      }
    }
    throw new Error("gpt-image-2 took longer than expected")
  } catch (gptErr) {
    console.error("[generateWithNanoBanana] gpt-image-2 failed, trying nano-banana fallback:", gptErr)
    // Fallback to nano-banana for non-text edits
    const res = await fetch(
      `${REPLICATE}/models/google/nano-banana/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait=60",
        },
        body: JSON.stringify({
          input: { prompt: effectPrompt, image_input: [imageUrl], output_format: "jpg" },
        }),
      }
    )
    const prediction = await res.json()
    if (!res.ok || !prediction.id) {
      throw new Error(`Both gpt-image-2 and nano-banana failed. Last error: ${(gptErr as Error).message}`)
    }
    if (prediction.status === "succeeded") {
      const out = prediction.output
      return typeof out === "string" ? out : (Array.isArray(out) ? out[0] : "")
    }
    const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 4000))
      const pollRes = await fetch(`${REPLICATE}/predictions/${prediction.id}`, {
        headers: { Authorization: `Token ${TOKEN}` },
      })
      const pollData = await pollRes.json()
      if (pollData.status === "succeeded") {
        const out = pollData.output
        const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : "")
        if (url) return url
      }
      if (pollData.status === "failed" || pollData.status === "canceled") {
        throw new Error(`Both image models failed. gpt-image-2: ${(gptErr as Error).message}. nano-banana: ${pollData.error || "unknown"}`)
      }
    }
    throw new Error("Image generation timed out on both models")
  }
}

// Returns either { videoUrl } if Replicate finished within wait window,
// or { predictionId } if still processing — caller can poll.
async function startVideoGeneration(
  imageUrl: string,
  shotType: string,
  duration: number,
  token: string
): Promise<{ videoUrl?: string; predictionId?: string }> {
  const config = SHOT_CONFIG[shotType]
  if (!config) throw new Error(`Unknown shot type: ${shotType}`)

  // Auto-promote long-form clips to Seedance 2.0 even when the shot type defaults to Kling
  const useSeedance = config.model === "seedance" || duration >= LONG_FORM_THRESHOLD_SECONDS

  // Timeline-prompted: explicit [0:00–0:0N] beats guide Seedance/Kling to a
  // controlled open → move → settle structure. Removes the lingering tail that
  // shows up when the model improvises pacing.
  const prompt = buildClipPrompt(config.motionHint, duration, vibeSuffix("luxury"), config.pacing)
  const negativePrompt = "Invented rooms, new objects, added people or animals, weather changes, morphing or warping geometry, flickering, motion blur, floating objects, lighting changes, added reflections, ghost trails, duplicated surfaces, fast motion, jitter, camera shake."

  const endpoint = useSeedance
    ? `${REPLICATE}/models/${MODEL_SEEDANCE}/predictions`
    : `${REPLICATE}/models/${MODEL_KLING}/predictions`

  // Kling accepts start_image/end_image + negative_prompt.
  // Seedance Pro accepts `image` only.
  const modelInput: Record<string, unknown> = useSeedance
    ? {
        prompt,
        image: imageUrl,
        duration,
        aspect_ratio: "9:16",
        resolution: "1080p",
      }
    : {
        prompt,
        start_image: imageUrl,
        duration,
        aspect_ratio: "9:16",
        negative_prompt: negativePrompt,
      }

  console.log(`[generateVideo] model=${useSeedance ? "seedance-2" : "kling"} endpoint=${endpoint} duration=${duration}s`)

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({ input: modelInput }),
  })

  const prediction = await res.json()
  if (!res.ok || !prediction.id) {
    const detail = prediction?.detail || prediction?.error?.message || JSON.stringify(prediction).slice(0, 400)
    throw new Error(`${config.model} rejected the request (HTTP ${res.status}): ${detail}`)
  }

  if (prediction.status === "succeeded" && prediction.output) {
    const out = prediction.output
    const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : null)
    if (url) return { videoUrl: url }
  }

  // Not yet ready — return prediction_id for client polling
  return { predictionId: prediction.id }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const REPLICATE_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")
  if (!REPLICATE_TOKEN) {
    return new Response(
      JSON.stringify({ error: "Missing REPLICATE_API_TOKEN" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  let body: any = {}
  try {
    body = await req.json()
    console.log("[generate-listing-video] payload:", JSON.stringify({
      mode: body.prediction_id ? "poll" : "start",
      prediction_id: body.prediction_id,
      category: body.category,
      photo_count: body.photo_urls?.length,
      shot_type: body.shot_type,
      effect_id: body.effect_id,
      effect_mode: body.effect_mode,
    }))

    // ── POLL MODE B: bundle (array of prediction_ids) ──
    if (Array.isArray(body.prediction_ids) && body.prediction_ids.length > 0) {
      const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
      const updated = await Promise.all(
        body.prediction_ids.map(async (entry: any) => {
          if (entry.video_url) return entry // already done
          if (!entry.prediction_id) return { ...entry, video_url: null, error: "missing prediction_id" }
          try {
            const r = await fetch(`${REPLICATE}/predictions/${entry.prediction_id}`, {
              headers: { Authorization: `Token ${TOKEN}` },
            })
            const d = await r.json()
            if (d.status === "succeeded") {
              const out = d.output
              const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : null)
              return { ...entry, video_url: url }
            }
            if (d.status === "failed" || d.status === "canceled") {
              return { ...entry, video_url: null, error: d.error || "failed" }
            }
            return entry // still processing
          } catch (e) {
            return { ...entry, error: (e as Error).message }
          }
        })
      )

      const allDone = updated.every((e: any) => e.video_url || e.error)
      if (allDone) {
        const clipUrls = updated.filter((e: any) => e.video_url).map((e: any) => e.video_url)
        if (clipUrls.length === 0) {
          throw new Error("All bundle clips failed: " + updated.map((e: any) => e.error).join("; "))
        }
        // Persist
        const clipPaths: string[] = []
        for (let i = 0; i < clipUrls.length; i++) {
          try {
            const clipFetch = await fetch(clipUrls[i])
            const clipBuffer = await clipFetch.arrayBuffer()
            const clipPath = `listing-videos/${Date.now()}/clip-${i}.mp4`
            await supabase.storage.from("project-submissions").upload(clipPath, clipBuffer, {
              contentType: "video/mp4", upsert: true,
            })
            clipPaths.push(clipPath)
          } catch (storageErr) {
            console.error(`[bundle-poll] storage clip ${i} failed:`, storageErr)
          }
        }
        return new Response(JSON.stringify({
          status: "complete",
          video_url: clipUrls[0],
          clip_urls: clipUrls,
          output_clip_paths: clipPaths,
          quick_effect: body.quick_effect || null,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      const remaining = updated.filter((e: any) => !e.video_url && !e.error).length
      return new Response(JSON.stringify({
        status: "processing",
        prediction_ids: updated,
        remaining,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // ── POLL MODE A: single prediction_id ──
    if (body.prediction_id && !body.category) {
      const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
      const pollRes = await fetch(`${REPLICATE}/predictions/${body.prediction_id}`, {
        headers: { Authorization: `Token ${TOKEN}` },
      })
      const pollData = await pollRes.json()

      if (pollData.status === "succeeded") {
        const out = pollData.output
        const videoUrl = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : null)
        if (!videoUrl) {
          throw new Error(`Replicate succeeded but returned no URL: ${JSON.stringify(out).slice(0, 200)}`)
        }

        // Persist
        let outputVideoPath: string | null = null
        try {
          const videoFetch = await fetch(videoUrl)
          const videoBuffer = await videoFetch.arrayBuffer()
          const videoPath = `listing-videos/${Date.now()}/video.mp4`
          await supabase.storage.from("project-submissions").upload(videoPath, videoBuffer, {
            contentType: "video/mp4",
            upsert: true,
          })
          outputVideoPath = videoPath
        } catch (storageErr) {
          console.error("[poll] storage failed:", storageErr)
        }

        return new Response(JSON.stringify({
          status: "complete",
          video_url: videoUrl,
          clip_urls: [videoUrl],
          output_video_path: outputVideoPath,
          quick_effect: body.quick_effect || null,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      if (pollData.status === "failed" || pollData.status === "canceled") {
        throw new Error(pollData.error || "Replicate prediction failed")
      }

      // Still processing
      return new Response(JSON.stringify({
        status: "processing",
        prediction_id: body.prediction_id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const {
      category,
      photo_urls,
      shot_type,
      staging_style,
      effect_id,
      effect_mode,
      vibe,
      listing,
      duration,
      credits_cost,
    } = body

    // Validate
    if (!category || !photo_urls || photo_urls.length === 0) {
      throw new Error(`category and photo_urls required. Received: category="${category}", photo_urls.length=${photo_urls?.length}`)
    }

    if (!["animate_single", "sun_to_sun", "listing_bundle", "virtual_staging", "sketch_to_real", "floor_plan_pan"].includes(category)) {
      throw new Error(`category must be animate_single, sun_to_sun, listing_bundle, virtual_staging, sketch_to_real, or floor_plan_pan. Received: "${category}"`)
    }

    if (category === "animate_single" && !shot_type) {
      throw new Error(`animate_single requires shot_type. Received: shot_type="${shot_type}"`)
    }

    // Verify all photo URLs are reachable before calling Replicate
    for (let i = 0; i < photo_urls.length; i++) {
      try {
        const head = await fetch(photo_urls[i], { method: "HEAD" })
        if (!head.ok) {
          throw new Error(`Photo URL ${i} returned ${head.status}: ${photo_urls[i].slice(0, 80)}...`)
        }
      } catch (fetchErr) {
        throw new Error(`Photo URL ${i} unreachable: ${(fetchErr as Error).message}. URL: ${photo_urls[i].slice(0, 100)}...`)
      }
    }

    // Category: animate_single
    if (category === "animate_single") {
      let sourceImageUrl = photo_urls[0]

      // Apply effect if realistic (gpt-image-2 — typically 20-30s)
      if (effect_id !== "none" && effect_mode === "realistic") {
        const effectPrompt = EFFECT_PROMPTS[effect_id]
        if (!effectPrompt) throw new Error(`Unknown effect: ${effect_id}`)
        sourceImageUrl = await generateWithNanoBanana(sourceImageUrl, effectPrompt, REPLICATE_TOKEN)
      }

      // Kick off video generation. If it completes within wait window, return URL.
      // Otherwise return prediction_id so the client can poll without hitting edge timeout.
      const result = await startVideoGeneration(
        sourceImageUrl,
        shot_type,
        duration || 5,
        REPLICATE_TOKEN
      )

      // Synchronous success
      if (result.videoUrl) {
        let outputVideoPath: string | null = null
        try {
          const videoFetch = await fetch(result.videoUrl)
          const videoBuffer = await videoFetch.arrayBuffer()
          const videoPath = `listing-videos/${Date.now()}/video.mp4`
          await supabase.storage.from("project-submissions").upload(videoPath, videoBuffer, {
            contentType: "video/mp4",
            upsert: true,
          })
          outputVideoPath = videoPath
        } catch (storageErr) {
          console.error("[animate_single] storage failed:", storageErr)
        }

        const response: any = {
          status: "complete",
          category,
          video_url: result.videoUrl,
          clip_urls: [result.videoUrl],
          output_video_path: outputVideoPath,
          listing,
        }
        if (effect_id !== "none" && effect_mode === "quick") {
          response.quick_effect = QUICK_EFFECT_BADGES[effect_id]
        }
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      // Async path — client polls
      return new Response(JSON.stringify({
        status: "processing",
        prediction_id: result.predictionId,
        category,
        listing,
        quick_effect: (effect_id !== "none" && effect_mode === "quick") ? QUICK_EFFECT_BADGES[effect_id] : null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Category: sun_to_sun — true day cycle: sunrise → golden hour → dusk
    // FIRE-AND-POLL architecture: render 3 time-of-day frames synchronously
    // (~30-45s for 3 parallel gpt-image-2 calls), then KICK OFF the two Kling
    // transitions and immediately return prediction_ids for client-side polling.
    // Without this, total wall time exceeds the 60s edge timeout.
    // Category: sun_to_sun — single Seedance 2.0 day-cycle render.
    //
    // Old approach was 3 parallel gpt-image-2 frames + 2 Kling transitions = 5
    // Replicate calls and ~120s wall time, which kept hitting the 60s edge
    // timeout and burning credits even when it didn't fail. Seedance 2.0 can
    // animate a full sunrise→golden→dusk cycle from a single source photo with
    // a rich descriptive prompt — one call, higher quality, no timeout risk.
    if (category === "sun_to_sun") {
      const exteriorUrl = photo_urls[0]

      // Timeline-prompted day cycle. Each phase gets its own dedicated beat
      // so the model commits to the full sunrise → golden → dusk arc instead
      // of dwelling in one phase and dropping the others.
      const dayCyclePrompt =
        "Cinematic 9:16 vertical real-estate time-lapse. 1080p photorealistic, magazine-quality. Static lock-off camera — no movement, no zoom, no parallax. " +
        "[0:00–0:02] SUNRISE: soft pink-and-amber sky, sun just above the eastern horizon, long cool blue shadows pointing west across the lawn. " +
        "[0:02–0:05] Sun arcs across the sky toward the south. Light warms into GOLDEN HOUR — orange tones rake across the building, shadows compress and warm, sky shifts from amber to deep gold. " +
        "[0:05–0:08] Late golden hour transitions into BLUE HOUR / DUSK — sky deepens to cobalt with a warm horizon glow, ambient light cools, building begins to silhouette. " +
        "[0:08–0:10] Full dusk — interior windows glow warm yellow from inside, exterior reads as a dark blue silhouette with a warm-light interior. " +
        "Architecture, landscaping, foliage, and framing all stay identical to the source throughout. Sun motion is continuous — no jump cuts, no flicker, no camera shake."

      console.log("[sun_to_sun] kicking off single Seedance 2.0 day-cycle prediction (10s)")
      const result = await startSeedanceFromImage(
        exteriorUrl,
        dayCyclePrompt,
        10,
        REPLICATE_TOKEN
      )

      // Synchronous success
      if (result.videoUrl) {
        let outputVideoPath: string | null = null
        try {
          const videoFetch = await fetch(result.videoUrl)
          const videoBuffer = await videoFetch.arrayBuffer()
          const videoPath = `listing-videos/${Date.now()}/sun-cycle.mp4`
          await supabase.storage.from("project-submissions").upload(videoPath, videoBuffer, {
            contentType: "video/mp4",
            upsert: true,
          })
          outputVideoPath = videoPath
        } catch (storageErr) {
          console.error("[sun_to_sun] storage failed:", storageErr)
        }

        return new Response(JSON.stringify({
          status: "complete",
          category,
          video_url: result.videoUrl,
          clip_urls: [result.videoUrl],
          output_video_path: outputVideoPath,
          listing,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      // Async path — single prediction_id, client polls
      return new Response(JSON.stringify({
        status: "processing",
        prediction_id: result.predictionId,
        category,
        listing,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Category: listing_bundle — fire N Seedance predictions in parallel, return prediction_ids
    if (category === "listing_bundle") {
      const shotRotation = ["slow_push", "parallax_pan", "reveal_rise", "architectural", "establishing", "drone_orbit"]
      const photos = photo_urls.slice(0, 6)

      // Apply realistic effect to first photo only (nano-banana, ~10s)
      let firstPhoto = photos[0]
      if (effect_id !== "none" && effect_mode === "realistic") {
        const effectPrompt = EFFECT_PROMPTS[effect_id]
        if (effectPrompt) {
          firstPhoto = await generateWithNanoBanana(firstPhoto, effectPrompt, REPLICATE_TOKEN)
          photos[0] = firstPhoto
        }
      }

      // Kick off ALL clip predictions in parallel (don't await individual completions)
      // 5s per clip × 3-6 clips = 15-30s reel — enough Seedance 2.0 runtime for clean motion
      console.log(`[listing_bundle] kicking off ${photos.length} parallel Seedance 2.0 predictions @ 5s each`)
      const startResults = await Promise.all(
        photos.map(async (url, i) => {
          try {
            const result = await startVideoGeneration(
              url,
              shotRotation[i % shotRotation.length],
              5,
              REPLICATE_TOKEN
            )
            return { index: i, ...result }
          } catch (err) {
            return { index: i, error: (err as Error).message }
          }
        })
      )

      const successful = startResults.filter((r) => !r.error)
      const failed = startResults.filter((r) => r.error)

      if (successful.length === 0) {
        throw new Error(`All ${photos.length} clips failed to start: ${failed[0]?.error}`)
      }

      // If ALL clips happened to complete during the wait window, return immediately
      const allDone = successful.every((r) => r.videoUrl)
      if (allDone) {
        const clipUrls = successful.map((r) => r.videoUrl!)
        // Store
        const clipPaths: string[] = []
        for (let i = 0; i < clipUrls.length; i++) {
          try {
            const clipFetch = await fetch(clipUrls[i])
            const clipBuffer = await clipFetch.arrayBuffer()
            const clipPath = `listing-videos/${Date.now()}/clip-${i}.mp4`
            await supabase.storage
              .from("project-submissions")
              .upload(clipPath, clipBuffer, { contentType: "video/mp4", upsert: true })
            clipPaths.push(clipPath)
          } catch (storageErr) {
            console.error(`Failed to store clip ${i}:`, storageErr)
          }
        }
        const response: any = {
          status: "complete",
          category,
          video_url: clipUrls[0],
          clip_urls: clipUrls,
          output_clip_paths: clipPaths,
          listing,
        }
        if (effect_id !== "none" && effect_mode === "quick") {
          response.quick_effect = QUICK_EFFECT_BADGES[effect_id]
        }
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      // Async path — return prediction_ids array, client polls
      return new Response(JSON.stringify({
        status: "processing",
        category,
        prediction_ids: successful.map((r) => ({ index: r.index, prediction_id: r.predictionId, video_url: r.videoUrl || null })),
        listing,
        quick_effect: (effect_id !== "none" && effect_mode === "quick") ? QUICK_EFFECT_BADGES[effect_id] : null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Category: virtual_staging
    if (category === "virtual_staging") {
      const { staging_style, vibe } = body

      if (!staging_style || !STAGING_STYLES[staging_style]) {
        throw new Error(`virtual_staging requires valid staging_style. Received: "${staging_style}"`)
      }

      if (!vibe) {
        throw new Error(`All categories require vibe. Received: "${vibe}"`)
      }

      const emptyRoomUrl = photo_urls[0]
      const stylePrompt = STAGING_STYLES[staging_style]
      const vibePromptSuffix = vibeSuffix(vibe)
      // Single Seedance call handles the entire transformation — no separate
      // gpt-image-2 staging step. The style prompt drives the furnishing.

      // SINGLE 10s Seedance 2.0 clip — timeline-prompted so the dressing phase
      // FINISHES by 0:04 and the camera move owns the back half. Without an
      // explicit completion beat the model lingers in transformation through
      // the full ten seconds and we never see a fully-styled reveal.
      const fullTransformPrompt =
        `Cinematic 9:16 vertical real-estate reel. 1080p photorealistic, magazine-quality interior styling. ` +
        `[0:00–0:01] Hold on the empty, undressed source room. Walls, windows, doors, floors, ceiling locked to the source frame. ` +
        `[0:01–0:04] The room dresses itself: furniture, area rug, lamps, art, throw pillows, and decor lift smoothly into their final positions. ${stylePrompt} ` +
        `[0:04–0:05] Dressing completes — every object settles, soft natural light warms the room, the styling is now fully resolved. No further objects move into place after this beat. ` +
        `[0:05–0:10] Slow dolly camera push-in through the now-styled interior. Gimbal-stabilized. Reveal the finished composition. ` +
        `Walls, windows, doors, floors, ceiling, and architectural features stay locked exactly as in the source throughout. ` +
        `Smooth physically-plausible motion, single deliberate camera move. ${vibePromptSuffix}`

      console.log("[virtual_staging] kicking off SINGLE 10s Seedance dressing+walkthrough")
      const result = await startSeedanceFromImage(
        emptyRoomUrl,
        fullTransformPrompt,
        10,
        REPLICATE_TOKEN
      )

      // Single-clip path — same shape as animate_single
      if (result.videoUrl) {
        let outputVideoPath: string | null = null
        try {
          const videoFetch = await fetch(result.videoUrl)
          const videoBuffer = await videoFetch.arrayBuffer()
          const videoPath = `listing-videos/${Date.now()}/staging.mp4`
          await supabase.storage.from("project-submissions").upload(videoPath, videoBuffer, {
            contentType: "video/mp4", upsert: true,
          })
          outputVideoPath = videoPath
        } catch (storageErr) {
          console.error("[virtual_staging] storage failed:", storageErr)
        }

        return new Response(JSON.stringify({
          status: "complete",
          category,
          video_url: result.videoUrl,
          clip_urls: [result.videoUrl],
          output_video_path: outputVideoPath,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      // Async — single prediction_id, client polls (single-clip shape)
      return new Response(JSON.stringify({
        status: "processing",
        prediction_id: result.predictionId,
        category,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Category: sketch_to_real
    // FLOW (nano-banana sketch reveal — verified working on Replicate):
    //   1. User uploads their PROPERTY PHOTO (the real subject, not a sketch).
    //   2. nano-banana takes that photo as `image_input` reference and produces
    //      a hand-drawing-on-desk image: pencil sketch of the same property,
    //      sitting on a wooden desk, with a person's hand drawing it.
    //   3. Kling animates: sketch-on-desk → actual property photo. The sketch
    //      "becomes real" — the magic moment from the reference reels.
    //   4. Kling slow_push reveal of the property photo as clip 2.
    if (category === "sketch_to_real") {
      const { sketch_intent, vibe: selectedVibe } = body

      if (!sketch_intent || !["interior", "exterior"].includes(sketch_intent)) {
        throw new Error(`sketch_to_real requires sketch_intent: "interior" | "exterior". Received: "${sketch_intent}"`)
      }

      if (!selectedVibe) {
        throw new Error(`sketch_to_real requires vibe. Received: "${selectedVibe}"`)
      }

      const propertyPhotoUrl = photo_urls[0]
      const vibeLine = vibeSuffix(selectedVibe)

      // Step 1: nano-banana — generate the sketch-on-desk version of the property.
      // Highly specific: paper grade, pencil grade, hand position, desk material,
      // and lighting all named. nano-banana renders sketch + photoreal hybrids
      // best when given an explicit physical-scene brief instead of an abstract
      // "architectural sketch" prompt.
      const sketchPrompt = sketch_intent === "interior"
        ? `Generate a photograph: a piece of warm-cream A3 architectural drafting paper sits on a polished walnut desk, slightly off-centre. ` +
          `On the paper is a clean 2H pencil architectural sketch of the interior room shown in the reference image — same room, same proportions, same window placements, same key furniture positions. ` +
          `Sketch style: confident architect's hand, single weight pencil lines, light cross-hatching for shading, soft perspective lines visible at the edges, no colour. ` +
          `A person's right hand enters from the bottom-right of the frame, holding a graphite pencil with the tip currently touching one of the lines as if mid-stroke. The hand is bare, relaxed, photographed sharply. ` +
          `Desk surroundings: a mug of coffee just out of focus in the upper-left, a small architect's scale ruler at the top edge, a brass desk lamp casting warm 2900K directional light from the upper-left. ` +
          `Camera: top-down 3/4 angle, 50mm lens equivalent, shallow depth of field on the pencil tip, paper edges sharp, desk softly defocused. Photoreal background, hand-drawn sketch on the paper.`
        : `Generate a photograph: a piece of warm-cream A3 architectural drafting paper sits on a polished walnut desk, slightly off-centre. ` +
          `On the paper is a clean 2H pencil architectural sketch of the building exterior shown in the reference image — same façade, same proportions, same window and door placements, same rooflines. ` +
          `Sketch style: confident architect's hand, single weight pencil lines, light cross-hatching for stone or siding texture, perspective lines visible at the edges, no colour. ` +
          `A person's right hand enters from the bottom-right of the frame, holding a graphite pencil with the tip currently touching one of the lines as if mid-stroke. The hand is bare, relaxed, photographed sharply. ` +
          `Desk surroundings: a mug of coffee just out of focus in the upper-left, a small architect's scale ruler at the top edge, a brass desk lamp casting warm 2900K directional light from the upper-left. ` +
          `Camera: top-down 3/4 angle, 50mm lens equivalent, shallow depth of field on the pencil tip, paper edges sharp, desk softly defocused. Photoreal background, hand-drawn sketch on the paper.`

      console.log("[sketch_to_real] generating sketch-on-desk via nano-banana")
      const sketchOnDeskUrl = await generateSketchWithNanoBanana(propertyPhotoUrl, sketchPrompt, REPLICATE_TOKEN)

      // SINGLE 10s Seedance 2.0 clip — timeline-prompted to FORCE the sketch-
      // to-real morph to complete by 0:04. The user's previous complaint was
      // "transition was too slow" — that was the model improvising pacing. By
      // marking the morph as complete at a specific beat, the model commits
      // to the transformation and gives us a clean reveal in the back half.
      const fullSketchPrompt = sketch_intent === "interior"
        ? `Cinematic 9:16 vertical real-estate reel. 1080p photorealistic, magazine-quality. ` +
          `[0:00–0:01] Hold on the pencil architectural sketch sitting on a wooden desk, person's right hand drawing with a pencil. Warm desk lighting. ` +
          `[0:01–0:04] The sketch on the paper fills with colour, light, texture, and materials as it morphs into the photorealistic interior it depicts. Pencil shading dissolves into real surfaces, walls gain texture, daylight floods through windows, furniture settles into place. The desk and the drawing hand dissolve and fade out completely. ` +
          `[0:04–0:05] Transition completes — the frame is now a fully photoreal interior. No trace of pencil lines, paper, desk, or hand remains. The styling is fully resolved. ` +
          `[0:05–0:10] Slow dolly camera push-in through the now-photoreal interior, gimbal-stabilized, revealing the finished space. ` +
          `Architectural geometry from the original drawing — wall lines, window placements, room proportions — stays anchored throughout. ` +
          `Smooth physically-plausible motion, single deliberate camera move. ${vibeLine}`
        : `Cinematic 9:16 vertical real-estate reel. 1080p photorealistic, magazine-quality. ` +
          `[0:00–0:01] Hold on the pencil architectural sketch sitting on a wooden desk, person's right hand drawing with a pencil. Warm desk lighting. ` +
          `[0:01–0:04] The sketch on the paper fills with realistic materials, sky, foliage, and landscaping as it morphs into the photoreal building exterior it depicts. Pencil shading dissolves into siding, brick, glass, and roof materials. The desk and the drawing hand dissolve and fade out completely. ` +
          `[0:04–0:05] Transition completes — the frame is now a fully photoreal exterior. No trace of pencil lines, paper, desk, or hand remains. ` +
          `[0:05–0:10] Slow cinematic move across the now-photoreal exterior — gentle parallax tracking shot — revealing the finished composition. ` +
          `Façade geometry from the original drawing — window placements, rooflines, massing — stays anchored throughout. ` +
          `Smooth physically-plausible motion, single deliberate camera move. ${vibeLine}`

      console.log("[sketch_to_real] kicking off SINGLE 10s Seedance morph+reveal")
      const result = await startSeedanceFromImage(
        sketchOnDeskUrl,
        fullSketchPrompt,
        10,
        REPLICATE_TOKEN
      )

      if (result.videoUrl) {
        let outputVideoPath: string | null = null
        try {
          const videoFetch = await fetch(result.videoUrl)
          const videoBuffer = await videoFetch.arrayBuffer()
          const videoPath = `listing-videos/${Date.now()}/sketch.mp4`
          await supabase.storage.from("project-submissions").upload(videoPath, videoBuffer, {
            contentType: "video/mp4", upsert: true,
          })
          outputVideoPath = videoPath
        } catch (storageErr) {
          console.error("[sketch_to_real] storage failed:", storageErr)
        }

        return new Response(JSON.stringify({
          status: "complete",
          category,
          video_url: result.videoUrl,
          clip_urls: [result.videoUrl],
          output_video_path: outputVideoPath,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      return new Response(JSON.stringify({
        status: "processing",
        prediction_id: result.predictionId,
        category,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Category: floor_plan_pan — Floor plan / axonometric → photoreal walkthrough
    // (Match user's reference flow: drawing → animated photoreal interior)
    if (category === "floor_plan_pan") {
      const { shot_type: selectedShotType, vibe: selectedVibe } = body

      if (!selectedShotType || !SHOT_CONFIG[selectedShotType]) {
        throw new Error(`floor_plan_pan requires valid shot_type. Received: "${selectedShotType}"`)
      }

      if (!selectedVibe) {
        throw new Error(`floor_plan_pan requires vibe. Received: "${selectedVibe}"`)
      }

      const floorPlanUrl = photo_urls[0]
      const vibeLine = vibeSuffix(selectedVibe)

      // Timeline-prompted floor plan morph. The drawing → photoreal transition
      // is resolved by 0:04 so the camera move owns the back half. Drafting
      // lines that linger past 0:04 ruin the magic — by fixing a hard
      // completion beat we get a clean, fully-realized interior reveal.
      const cameraHint = SHOT_CONFIG[selectedShotType]?.motionHint || "Slow dolly camera push-in, gimbal-stabilized."
      const fullFloorPlanPrompt =
        `Cinematic 9:16 vertical real-estate reel. 1080p photorealistic, magazine-quality. ` +
        `[0:00–0:01] Hold on the 2D architectural floor plan / axonometric drawing exactly as in the source. Drafting linework, room labels, dimension lines all visible. ` +
        `[0:01–0:04] The drawing transforms into a fully photorealistic interior of the same room. Drafting lines dissolve, walls gain texture and material, daylight floods through windows, floor materials reveal grain, furniture lifts and settles into final positions. ` +
        `[0:04–0:05] Transformation completes — the space is now a fully photoreal magazine-quality interior. No drafting marks, dimension lines, or labels remain. The space is fully resolved. ` +
        `[0:05–0:10] ${cameraHint} The camera moves through the now-photoreal interior, revealing the finished space. ` +
        `Architectural geometry from the drawing — wall positions, door and window placements, room proportions — stays anchored throughout. ` +
        `Smooth physically-plausible motion, single deliberate camera move. ${vibeLine}`

      console.log("[floor_plan_pan] kicking off SINGLE 10s Seedance morph+walkthrough")
      const result = await startSeedanceFromImage(
        floorPlanUrl,
        fullFloorPlanPrompt,
        10,
        REPLICATE_TOKEN
      )

      if (result.videoUrl) {
        let outputVideoPath: string | null = null
        try {
          const videoFetch = await fetch(result.videoUrl)
          const videoBuffer = await videoFetch.arrayBuffer()
          const videoPath = `listing-videos/${Date.now()}/floorplan.mp4`
          await supabase.storage.from("project-submissions").upload(videoPath, videoBuffer, {
            contentType: "video/mp4", upsert: true,
          })
          outputVideoPath = videoPath
        } catch (storageErr) {
          console.error("[floor_plan_pan] storage failed:", storageErr)
        }

        return new Response(JSON.stringify({
          status: "complete",
          category,
          video_url: result.videoUrl,
          clip_urls: [result.videoUrl],
          output_video_path: outputVideoPath,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      return new Response(JSON.stringify({
        status: "processing",
        prediction_id: result.predictionId,
        category,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    throw new Error("Unknown category")
  } catch (err) {
    const errorMsg = (err as Error).message || String(err)
    const errorStack = (err as Error).stack || ""
    console.error("[generate-listing-video] FAILED:", errorMsg)
    console.error("[generate-listing-video] STACK:", errorStack)
    console.error("[generate-listing-video] PAYLOAD WAS:", JSON.stringify(body).slice(0, 1000))
    return new Response(
      JSON.stringify({
        error: errorMsg,
        debug: {
          stack: errorStack.slice(0, 500),
          received: {
            category: body.category,
            photo_count: body.photo_urls?.length,
            shot_type: body.shot_type,
            effect_id: body.effect_id,
            effect_mode: body.effect_mode,
          },
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

// Helper: Kick off a Seedance 2.0 prediction WITHOUT awaiting completion.
// Single image input + descriptive prompt. Use for sun-cycles, sketch reveals,
// floor plan transformations — anything where Seedance's single-image cinematic
// motion handles the transformation better than Kling's start+end interpolation.
async function startSeedanceFromImage(
  imageUrl: string,
  prompt: string,
  duration: number,
  token: string
): Promise<{ videoUrl?: string; predictionId?: string }> {
  const res = await fetch(
    `${REPLICATE}/models/${MODEL_SEEDANCE}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({
        input: {
          prompt,
          image: imageUrl,
          duration,
          aspect_ratio: "9:16",
          resolution: "1080p",
        },
      }),
    }
  )

  const prediction = await res.json()
  if (!res.ok || !prediction.id) {
    const detail = prediction?.detail || prediction?.error?.message || JSON.stringify(prediction).slice(0, 400)
    throw new Error(`Seedance 2.0 rejected (HTTP ${res.status}): ${detail}`)
  }

  if (prediction.status === "succeeded" && prediction.output) {
    const out = prediction.output
    const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : null)
    if (url) return { videoUrl: url }
  }

  return { predictionId: prediction.id }
}

// Helper: Kick off a Kling start→end transition WITHOUT awaiting completion.
// Returns videoUrl if Replicate finished within the wait=60 window, otherwise
// predictionId so the client can poll. Mirrors startVideoGeneration's shape so
// it slots into the existing bundle-style poll flow.
async function startKlingTransitionPrediction(
  startImageUrl: string,
  endImageUrl: string,
  motionPrompt: string,
  duration: number,
  token: string
): Promise<{ videoUrl?: string; predictionId?: string }> {
  const prompt = `${motionPrompt} Cinematic real-estate listing reel. Photorealistic. Smooth physically-plausible transition between the two frames.`
  const negativePrompt = "Invented objects, added people or animals, geometry warping, jittery interpolation, flickering, motion artifacts, frame drops."

  const res = await fetch(
    `${REPLICATE}/models/${MODEL_KLING}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({
        input: {
          prompt,
          start_image: startImageUrl,
          end_image: endImageUrl,
          duration,
          aspect_ratio: "9:16",
          negative_prompt: negativePrompt,
        },
      }),
    }
  )

  const prediction = await res.json()
  if (!res.ok || !prediction.id) {
    const detail = prediction?.detail || prediction?.error?.message || JSON.stringify(prediction).slice(0, 400)
    throw new Error(`Kling transition rejected (HTTP ${res.status}): ${detail}`)
  }

  if (prediction.status === "succeeded" && prediction.output) {
    const out = prediction.output
    const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : null)
    if (url) return { videoUrl: url }
  }

  return { predictionId: prediction.id }
}

// Helper: Animate transition between two photos using Kling (synchronous — waits for completion)
async function animatePhotoTransition(
  startImageUrl: string,
  endImageUrl: string,
  motionPrompt: string,
  duration: number,
  token: string
): Promise<string> {
  const prompt = `${motionPrompt} Cinematic real-estate listing reel. Photorealistic. Smooth physically-plausible transition between the two frames.`
  const negativePrompt = "Invented objects, added people or animals, geometry warping, jittery interpolation, flickering, motion artifacts, frame drops."

  const res = await fetch(
    "https://api.replicate.com/v1/models/kwaivgi/kling-v2.5-turbo-pro/predictions",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({
        input: {
          prompt,
          start_image: startImageUrl,
          end_image: endImageUrl,
          duration,
          aspect_ratio: "9:16",
          negative_prompt: negativePrompt,
        },
      }),
    }
  )

  const prediction = await res.json()
  if (!res.ok || !prediction.id) {
    throw new Error(`Kling failed: ${JSON.stringify(prediction)}`)
  }

  if (prediction.status === "succeeded") {
    return typeof prediction.output === "string"
      ? prediction.output
      : prediction.output?.[0]
  }

  return await pollReplicate(prediction.id)
}
