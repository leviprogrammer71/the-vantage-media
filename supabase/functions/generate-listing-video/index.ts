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

// Long-form (≥6s) clips always route to Seedance for cleaner physics + sharper
// architectural pans. Short clips (3s bundle clips) can use Kling for snap.
const LONG_FORM_THRESHOLD_SECONDS = 6

const SHOT_CONFIG: Record<string, { model: "kling" | "seedance"; motionHint: string }> = {
  slow_push: {
    model: "kling",
    motionHint: "Slow dolly camera push-in on the subject, steady and cinematic.",
  },
  drone_orbit: {
    model: "seedance",
    motionHint: "Slow aerial orbit 60° around the subject at elevated angle, smooth drone motion.",
  },
  parallax_pan: {
    model: "kling",
    motionHint: "Lateral parallax pan moving slowly left to right with foreground/background depth shift.",
  },
  reveal_rise: {
    model: "kling",
    motionHint: "Camera rises vertically from low to eye height, revealing the composition.",
  },
  architectural: {
    model: "seedance",
    motionHint: "Clean architectural slider pan, perfectly horizontal, no rotation.",
  },
  establishing: {
    model: "seedance",
    motionHint: "Slow pull-back dolly from tight composition to wide establishing shot.",
  },
}

const EFFECT_PROMPTS: Record<string, string> = {
  none: "",
  just_listed: "Add a clean, professional 'JUST LISTED' real estate yard sign on a metal post, planted upright in the lawn or grass in front of the property. White panel, dark serif text, in scale with the building. Photorealistic, evenly lit, sharp lettering.",
  open_house: "Add a clean, professional 'OPEN HOUSE' sandwich-board sign on the entrance walkway. White panel, dark serif text, in scale with the property. Photorealistic, evenly lit, sharp lettering.",
  for_sale: "Add a clean, professional 'FOR SALE' real estate yard sign on a metal post, planted upright in the lawn in front of the property. White panel, dark serif text, in scale with the building. Photorealistic, evenly lit, sharp lettering.",
  sold: "Add a clean, professional 'SOLD' real estate yard sign — white panel with dark serif text and a bold red 'SOLD' banner across it — planted upright in the lawn. In scale with the building. Photorealistic, evenly lit, sharp lettering.",
}

const QUICK_EFFECT_BADGES: Record<string, { label: string; color: string }> = {
  just_listed: { label: "JUST LISTED", color: "#8C3F2E" },
  open_house: { label: "OPEN HOUSE THIS WEEKEND", color: "#0E0E0C" },
  for_sale: { label: "FOR SALE", color: "#8C3F2E" },
  sold: { label: "SOLD", color: "#0E0E0C" },
}

const STAGING_STYLES: Record<string, string> = {
  modern: "Clean architectural lines, neutral palette of warm white and grey, brushed metal and matte black accents, mid-tone oak floors. Low-profile sofa in linen, glass coffee table, sculptural floor lamp, framed abstract art, one large potted fiddle-leaf fig.",
  mid_century: "Walnut tones throughout, low-profile teak credenza, tapered legs, atomic-era ceramics, mustard and teal accents. Boucle armchair, geometric area rug, sunburst wall clock, rounded ceramic table lamp.",
  coastal: "White linen, weathered driftwood, soft sea blues and sandy beiges, woven jute textures. White slipcovered sofa, rope-and-glass pendant, framed shoreline photography, ceramic vase with dried beach grass.",
  farmhouse: "Shiplap walls, distressed reclaimed wood, vintage iron fixtures, cream-and-forest-green palette. Slipcovered linen sofa, barn-wood coffee table, woven basket, mason-jar lighting, simple cotton throw.",
  luxury_modern: "Marble and unlacquered brass, deep velvet sofa, sculptural pendant lighting, deep navy and warm gold palette, lacquered surfaces. Black-veined marble coffee table, Italian leather lounge chair, oversized abstract canvas, fluted wood console.",
  scandinavian: "White walls, blonde oak floors, layered wool throws, minimal furnishings, abundant natural light. Cream linen sofa, oak nesting tables, simple paper-shade pendant, framed graphic prints, one large monstera in a stoneware pot.",
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
function vibeSuffix(vibe: string): string {
  switch (vibe) {
    case "luxury":
      return "Luxury aesthetic, golden-hour warm light, shallow depth of field, slow deliberate motion, editorial magazine cinematic quality."
    case "cozy":
      return "Cozy intimate atmosphere, warm interior tungsten light, soft shadows, lived-in feel, gentle camera movement."
    case "modern":
      return "Modern minimalist aesthetic, cool daylight, crisp architectural lines, contemporary design language, clean motion."
    case "family":
      return "Bright friendly atmosphere, midday natural light, family-oriented warmth, welcoming, approachable cinematic feel."
    case "investment":
      return "Practical real-estate showcase, neutral even lighting, emphasis on layout and space, professional documentary style."
    case "vacation":
      return "Vacation resort aesthetic, sunset warm palette, light breeze in foliage, escapist holiday mood, smooth gimbal-style motion."
    default:
      return "Editorial magazine cinematic quality, warm natural light, slow deliberate motion."
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

  // Tight prompt: camera move + scene = listing reel. Locked subject (no morphing,
  // no invented rooms) is the most important constraint — keep it last so the
  // model weights it heavily.
  const prompt = `${config.motionHint} Cinematic 9:16 vertical real-estate listing reel. Photorealistic, magazine-quality. Smooth physically-plausible camera motion only. Subject, architecture, and lighting stay locked exactly as in the source frame.`
  const negativePrompt = "Invented rooms, new objects, added people or animals, weather changes, morphing or warping geometry, flickering, motion blur, floating objects, lighting changes, added reflections, ghost trails, duplicated surfaces."

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
    if (category === "sun_to_sun") {
      const firstPhotoUrl = photo_urls[0]

      const sunrisePrompt = `Render this same scene at SUNRISE — sun just above the eastern horizon, warm pink-and-amber sky, long cool shadows pointing west, soft rosy light on east-facing surfaces. Lock all architecture, landscaping, and the camera angle exactly as in the source.`
      const goldenPrompt = `Render this same scene at GOLDEN HOUR — late afternoon, sun low in the west, warm orange light on the building, long shadows across the lawn, sky in amber-to-pink. Lock all architecture, landscaping, and the camera angle exactly as in the source.`
      const duskPrompt = `Render this same scene at DUSK / BLUE HOUR — sun just set, sky in deep cobalt with warm horizon glow, interior windows glowing warm from inside, exterior lights coming on. Lock all architecture, landscaping, and the camera angle exactly as in the source.`

      // 3 parallel image renders (~30-45s)
      console.log("[sun_to_sun] rendering sunrise + golden + dusk in parallel")
      const [sunriseUrl, goldenUrl, duskUrl] = await Promise.all([
        generateWithNanoBanana(firstPhotoUrl, sunrisePrompt, REPLICATE_TOKEN),
        generateWithNanoBanana(firstPhotoUrl, goldenPrompt, REPLICATE_TOKEN),
        generateWithNanoBanana(firstPhotoUrl, duskPrompt, REPLICATE_TOKEN),
      ])

      // KICK OFF both Kling transitions in parallel without awaiting completion.
      // Use start_image + end_image; return prediction_ids in the bundle-style
      // response shape so the client's existing poll loop handles it.
      console.log("[sun_to_sun] kicking off morning + evening Kling predictions")
      const [morningStart, eveningStart] = await Promise.all([
        startKlingTransitionPrediction(
          sunriseUrl,
          goldenUrl,
          "Smooth cinematic time-lapse from sunrise into late afternoon golden hour. Sun arcs across the sky, light warms gradually. No camera movement.",
          6,
          REPLICATE_TOKEN
        ),
        startKlingTransitionPrediction(
          goldenUrl,
          duskUrl,
          "Smooth cinematic time-lapse from golden hour into dusk and blue hour. Sun sets, sky shifts amber to cobalt, interior windows glow warm. No camera movement.",
          6,
          REPLICATE_TOKEN
        ),
      ])

      // If both happened to complete during Replicate's wait window, return synchronously
      if (morningStart.videoUrl && eveningStart.videoUrl) {
        const clipUrls = [morningStart.videoUrl, eveningStart.videoUrl]
        const clipPaths: string[] = []
        for (let i = 0; i < clipUrls.length; i++) {
          try {
            const clipFetch = await fetch(clipUrls[i])
            const clipBuffer = await clipFetch.arrayBuffer()
            const clipPath = `listing-videos/${Date.now()}/sun-clip-${i}.mp4`
            await supabase.storage
              .from("project-submissions")
              .upload(clipPath, clipBuffer, { contentType: "video/mp4", upsert: true })
            clipPaths.push(clipPath)
          } catch (storageErr) {
            console.error(`[sun_to_sun] storage clip ${i} failed:`, storageErr)
          }
        }
        return new Response(JSON.stringify({
          status: "complete",
          category,
          video_url: clipUrls[0],
          clip_urls: clipUrls,
          output_clip_paths: clipPaths,
          listing,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      // Async path — return prediction_ids array, client polls (mirrors bundle shape)
      return new Response(JSON.stringify({
        status: "processing",
        category,
        prediction_ids: [
          { index: 0, prediction_id: morningStart.predictionId, video_url: morningStart.videoUrl || null },
          { index: 1, prediction_id: eveningStart.predictionId, video_url: eveningStart.videoUrl || null },
        ],
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

      // Build furnishing prompt — the style descriptor drives the furniture
      // selection. Avoid hardcoding pieces (a sectional fights a luxury_modern
      // brief) — let the model pick what fits the aesthetic + room scale.
      const stylePrompt = STAGING_STYLES[staging_style]
      const furnishingPrompt = `Furnish this empty room in the ${staging_style} aesthetic. ${stylePrompt} Pick furniture, art, lighting, and props that fit both the room's scale and the aesthetic above. Match the existing room's natural light. Keep walls, windows, doors, floors, ceiling, and architectural features identical. Photorealistic, magazine-quality interior styling.`

      // Generate staged version with gpt-image-2
      const stagedImageUrl = await generateWithNanoBanana(
        emptyRoomUrl,
        furnishingPrompt,
        REPLICATE_TOKEN
      )

      const vibePromptSuffix = vibeSuffix(vibe)

      // FIRE-AND-POLL: kick off both Kling predictions in parallel, return prediction_ids
      // Two clips:
      // (A) STAGING TRANSITION — empty room → fully furnished morph
      // (B) WALKTHROUGH — slow_push through the staged room
      const stagingTransitionPrompt = `An empty interior room becomes fully styled, matching the end frame exactly. Furniture and decor settle smoothly into their final positions as shown in the end image. Soft natural light warms the room. The space dresses itself. No camera movement, no zoom, no pan. ${vibePromptSuffix}`

      console.log("[virtual_staging] kicking off staging transition + walkthrough predictions")
      const [stageStart, walkStart] = await Promise.all([
        startKlingTransitionPrediction(
          emptyRoomUrl,
          stagedImageUrl,
          stagingTransitionPrompt,
          5,
          REPLICATE_TOKEN
        ),
        startVideoGeneration(
          stagedImageUrl,
          "slow_push",
          5,
          REPLICATE_TOKEN
        ),
      ])

      // Synchronous success
      if (stageStart.videoUrl && walkStart.videoUrl) {
        const clipUrls = [stageStart.videoUrl, walkStart.videoUrl]
        const clipPaths: string[] = []
        for (let i = 0; i < clipUrls.length; i++) {
          try {
            const clipFetch = await fetch(clipUrls[i])
            const clipBuffer = await clipFetch.arrayBuffer()
            const clipPath = `listing-videos/${Date.now()}/staging-${i}.mp4`
            await supabase.storage.from("project-submissions").upload(clipPath, clipBuffer, {
              contentType: "video/mp4", upsert: true,
            })
            clipPaths.push(clipPath)
          } catch (storageErr) {
            console.error(`[virtual_staging] storage clip ${i} failed:`, storageErr)
          }
        }
        return new Response(JSON.stringify({
          status: "complete",
          category,
          video_url: clipUrls[0],
          clip_urls: clipUrls,
          output_clip_paths: clipPaths,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      // Async — return prediction_ids array, client polls
      return new Response(JSON.stringify({
        status: "processing",
        category,
        prediction_ids: [
          { index: 0, prediction_id: stageStart.predictionId, video_url: stageStart.videoUrl || null },
          { index: 1, prediction_id: walkStart.predictionId, video_url: walkStart.videoUrl || null },
        ],
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

      // Step 1: nano-banana — generate the sketch-on-desk version of the property
      const sketchPrompt = sketch_intent === "interior"
        ? `Generate a version of the reference image as a pencil architectural sketch on a piece of paper sitting on a wooden desk, with a person's right hand holding a pencil drawing it. The sketch shows the same interior room from the reference image, in clean architectural pencil-sketch style with shading and perspective. Warm desk lighting, shallow depth of field, photorealistic — but the drawing on the paper is a hand-drawn pencil sketch.`
        : `Generate a version of the reference image as a pencil architectural sketch on a piece of paper sitting on a wooden desk, with a person's right hand holding a pencil drawing it. The sketch shows the same building exterior from the reference image, in clean architectural pencil-sketch style with shading and perspective. Warm desk lighting, shallow depth of field, photorealistic — but the drawing on the paper is a hand-drawn pencil sketch.`

      console.log("[sketch_to_real] generating sketch-on-desk via nano-banana")
      const sketchOnDeskUrl = await generateSketchWithNanoBanana(propertyPhotoUrl, sketchPrompt, REPLICATE_TOKEN)

      // Step 2: TRANSFORMATION CLIP — Kling animates sketch-on-desk → real photo
      // The pencil drawing comes alive and becomes the actual property.
      const transformPrompt = sketch_intent === "interior"
        ? `The pencil architectural sketch on the desk gradually fills with realistic colour, light, materials, and furniture, then opens up to fill the full frame as the actual photorealistic interior shown in the end image. Hand and desk fade gently to the edges. Smooth dreamlike crossfade — the drawing comes alive. No camera movement. ${vibeLine}`
        : `The pencil architectural sketch on the desk gradually fills with realistic materials, sky, landscaping, and natural light, then opens up to fill the full frame as the actual photorealistic building exterior shown in the end image. Hand and desk fade gently to the edges. Smooth dreamlike crossfade — the drawing comes alive. No camera movement. ${vibeLine}`

      // FIRE-AND-POLL: kick off both predictions, return prediction_ids
      console.log("[sketch_to_real] kicking off sketch-reveal + property-walk predictions")
      const [transformStart, revealStart] = await Promise.all([
        startKlingTransitionPrediction(
          sketchOnDeskUrl,       // start = the sketch-on-desk image
          propertyPhotoUrl,      // end   = the actual property photo (becomes real)
          transformPrompt,
          5,
          REPLICATE_TOKEN
        ),
        startVideoGeneration(
          propertyPhotoUrl,      // walk through the real property
          "slow_push",
          5,
          REPLICATE_TOKEN
        ),
      ])

      // Synchronous success
      if (transformStart.videoUrl && revealStart.videoUrl) {
        const clipUrls = [transformStart.videoUrl, revealStart.videoUrl]
        const clipPaths: string[] = []
        for (let i = 0; i < clipUrls.length; i++) {
          try {
            const clipFetch = await fetch(clipUrls[i])
            const clipBuffer = await clipFetch.arrayBuffer()
            const clipPath = `listing-videos/${Date.now()}/sketch-${i}.mp4`
            await supabase.storage.from("project-submissions").upload(clipPath, clipBuffer, {
              contentType: "video/mp4", upsert: true,
            })
            clipPaths.push(clipPath)
          } catch (storageErr) {
            console.error(`[sketch_to_real] storage clip ${i} failed:`, storageErr)
          }
        }
        return new Response(JSON.stringify({
          status: "complete",
          category,
          video_url: clipUrls[0],
          clip_urls: clipUrls,
          output_clip_paths: clipPaths,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      return new Response(JSON.stringify({
        status: "processing",
        category,
        prediction_ids: [
          { index: 0, prediction_id: transformStart.predictionId, video_url: transformStart.videoUrl || null },
          { index: 1, prediction_id: revealStart.predictionId, video_url: revealStart.videoUrl || null },
        ],
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

      // Step 1: Render the floor plan / axonometric drawing into a photorealistic
      // interior. flux-kontext preserves the layout while adding light + materials.
      const renderPrompt = `Render this floor plan or axonometric drawing as a photorealistic interior at natural eye level. Lock the room geometry, walls, window and door placements, and circulation from the drawing. Furnish naturally, add realistic materials, finishes, and soft daylight in a ${selectedVibe} aesthetic. Magazine-quality interior photography, soft shadows, depth of field. ${vibeLine}`

      const photorealUrl = await renderSketchToPhotoreal(
        floorPlanUrl,
        renderPrompt,
        REPLICATE_TOKEN
      )

      // Step 2 + 3 in parallel:
      // (A) TRANSFORMATION clip — Kling animates floor plan → photoreal interior
      //     This is the "magic moment" from the user's reference reels: the drawing
      //     becomes a real room before your eyes.
      // (B) WALKTHROUGH clip — chosen camera move through the photoreal interior.
      const transformPrompt = `The architectural floor plan / axonometric drawing in the start frame gradually fills with realistic colour, light, materials, and furniture, then opens up to fill the full frame as the photorealistic interior shown in the end frame. Drawing lines fade gracefully. Smooth dreamlike crossfade — the plan becomes real. No camera movement. ${vibeLine}`

      console.log("[floor_plan_pan] kicking off transformation + walkthrough predictions")
      const [transformStart, walkStart] = await Promise.all([
        startKlingTransitionPrediction(
          floorPlanUrl,
          photorealUrl,
          transformPrompt,
          5,
          REPLICATE_TOKEN
        ),
        startVideoGeneration(
          photorealUrl,
          selectedShotType,
          5,
          REPLICATE_TOKEN
        ),
      ])

      if (transformStart.videoUrl && walkStart.videoUrl) {
        const clipUrls = [transformStart.videoUrl, walkStart.videoUrl]
        const clipPaths: string[] = []
        for (let i = 0; i < clipUrls.length; i++) {
          try {
            const clipFetch = await fetch(clipUrls[i])
            const clipBuffer = await clipFetch.arrayBuffer()
            const clipPath = `listing-videos/${Date.now()}/floorplan-${i}.mp4`
            await supabase.storage.from("project-submissions").upload(clipPath, clipBuffer, {
              contentType: "video/mp4", upsert: true,
            })
            clipPaths.push(clipPath)
          } catch (storageErr) {
            console.error(`[floor_plan_pan] storage clip ${i} failed:`, storageErr)
          }
        }
        return new Response(JSON.stringify({
          status: "complete",
          category,
          video_url: clipUrls[0],
          clip_urls: clipUrls,
          output_clip_paths: clipPaths,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      return new Response(JSON.stringify({
        status: "processing",
        category,
        prediction_ids: [
          { index: 0, prediction_id: transformStart.predictionId, video_url: transformStart.videoUrl || null },
          { index: 1, prediction_id: walkStart.predictionId, video_url: walkStart.videoUrl || null },
        ],
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
