import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

const REPLICATE = "https://api.replicate.com/v1"

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
  just_listed: "A realistic 'JUST LISTED' real estate yard sign on a metal frame, planted in the lawn or grass area in the foreground of the scene, photorealistic, weathered finish, in scale with the building, evenly lit.",
  open_house: "A realistic 'OPEN HOUSE' real estate sandwich-board sign positioned near the front entrance walkway of the property, photorealistic, weathered finish, in scale with the scene.",
  for_sale: "A realistic 'FOR SALE' real estate yard sign on a metal frame, planted in the lawn or grass area in front of the building, photorealistic, weathered finish, in scale with the scene.",
  sold: "A realistic 'SOLD' real estate yard sign with a SOLD sticker across it, planted in the lawn or grass area, photorealistic, weathered finish, in scale with the scene.",
}

const QUICK_EFFECT_BADGES: Record<string, { label: string; color: string }> = {
  just_listed: { label: "JUST LISTED", color: "#8C3F2E" },
  open_house: { label: "OPEN HOUSE THIS WEEKEND", color: "#0E0E0C" },
  for_sale: { label: "FOR SALE", color: "#8C3F2E" },
  sold: { label: "SOLD", color: "#0E0E0C" },
}

const STAGING_STYLES: Record<string, string> = {
  modern: "Clean lines, neutral palette, brushed metal accents, mid-tone wood floors.",
  mid_century: "Walnut tones, low-profile furniture, atomic-era accents, mustard and teal.",
  coastal: "White linen, weathered wood, soft blues and sandy beiges, woven textures.",
  farmhouse: "Shiplap accents, distressed wood furniture, vintage iron fixtures, cream and forest green.",
  luxury_modern: "Marble and brass, velvet sofa, sculptural lighting, deep navy and gold.",
  scandinavian: "White walls, blonde wood, layered wool throws, minimal furniture, lots of light.",
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

  const prompt = `${config.motionHint} Listing video for a real estate property. Cinematic, photorealistic, smooth motion, no flicker, no morphing.`
  const negativePrompt = "No hallucinations, no invented rooms, no new objects, no people, no animals, no weather, no morphing, no warping, no flickering, no artifacts, no blurry motion, no floating objects, no distortion, no changes to lighting, no added reflections, no ghost trails, no duplicate surfaces."

  const endpoint =
    config.model === "kling"
      ? `${REPLICATE}/models/kwaivgi/kling-v2.5-turbo-pro/predictions`
      : `${REPLICATE}/models/bytedance/seedance-1-pro/predictions`

  // Kling accepts start_image/end_image + negative_prompt.
  // Seedance Pro accepts `image` only.
  const modelInput: Record<string, unknown> =
    config.model === "kling"
      ? {
          prompt,
          start_image: imageUrl,
          duration,
          aspect_ratio: "9:16",
          negative_prompt: negativePrompt,
        }
      : {
          prompt,
          image: imageUrl,
          duration,
          aspect_ratio: "9:16",
          resolution: "1080p",
        }

  console.log(`[generateVideo] model=${config.model} endpoint=${endpoint}`)

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

    // Category: sun_to_sun
    if (category === "sun_to_sun") {
      const firstPhotoUrl = photo_urls[0]

      // Generate 4 time-of-day variants with gpt-image-2
      const sunsetPrompt = `Render this same scene at golden hour magic light, the late afternoon sun low on the horizon, warm orange glow on the building, long shadows cast across the lawn, sky in soft amber and pink. Keep all building geometry and landscaping identical.`

      const goldenUrl = await generateWithNanoBanana(
        firstPhotoUrl,
        sunsetPrompt,
        REPLICATE_TOKEN
      )

      // Use Kling 2.5 Turbo Pro to animate from original to golden hour
      const videoUrl = await animatePhotoTransition(
        firstPhotoUrl,
        goldenUrl,
        "slow drift, cinematic lighting transition, 12 seconds",
        12,
        REPLICATE_TOKEN
      )

      // Store
      let outputVideoPath: string | null = null
      try {
        const videoFetch = await fetch(videoUrl)
        const videoBuffer = await videoFetch.arrayBuffer()
        const videoPath = `listing-videos/${Date.now()}/video.mp4`
        await supabase.storage
          .from("project-submissions")
          .upload(videoPath, videoBuffer, { contentType: "video/mp4", upsert: true })
        outputVideoPath = videoPath
      } catch (storageErr) {
        console.error("Failed to store video:", storageErr)
      }

      return new Response(
        JSON.stringify({
          category,
          video_url: videoUrl,
          clip_urls: [videoUrl],
          output_video_path: outputVideoPath,
          listing,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
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
      console.log(`[listing_bundle] kicking off ${photos.length} parallel Seedance predictions`)
      const startResults = await Promise.all(
        photos.map(async (url, i) => {
          try {
            const result = await startVideoGeneration(
              url,
              shotRotation[i % shotRotation.length],
              3,
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

      // Build furnishing prompt
      const stylePrompt = STAGING_STYLES[staging_style]
      const furnishingPrompt = `Furnish this empty room in a ${staging_style} style. Add appropriately scaled furniture: sectional sofa in neutral fabric, low-profile coffee table, area rug, floor lamp, wall art, indoor plant. Match the existing room's lighting and architectural style. Keep walls, windows, doors, floors, and ceiling identical. Photorealistic. ${stylePrompt}`

      // Generate staged version with gpt-image-2
      const stagedImageUrl = await generateWithNanoBanana(
        emptyRoomUrl,
        furnishingPrompt,
        REPLICATE_TOKEN
      )

      // Kick off video from staged image using slow_push + vibe
      const vibePromptSuffix = vibe === "luxury" ? "Luxury aesthetic, golden hour warm light, shallow depth of field, slow deliberate motion, editorial magazine cinematic quality."
        : vibe === "cozy" ? "Cozy intimate atmosphere, warm interior tungsten light, soft shadows, lived-in feel, gentle camera movement."
        : vibe === "modern" ? "Modern minimalist aesthetic, cool daylight, crisp architectural lines, contemporary design language, clean motion."
        : vibe === "family" ? "Bright friendly atmosphere, midday natural light, family-oriented warmth, welcoming, approachable cinematic feel."
        : vibe === "investment" ? "Practical real-estate showcase, neutral even lighting, emphasis on layout and space, professional documentary style."
        : "Vacation resort aesthetic, sunset warm palette, light breeze in foliage, escapist holiday mood, smooth gimbal-style motion."

      const result = await startVideoGeneration(
        stagedImageUrl,
        "slow_push",
        8,
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
          console.error("[virtual_staging] storage failed:", storageErr)
        }

        return new Response(JSON.stringify({
          status: "complete",
          category,
          video_url: result.videoUrl,
          clip_urls: [result.videoUrl],
          output_video_path: outputVideoPath,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      // Async path — client polls
      return new Response(JSON.stringify({
        status: "processing",
        prediction_id: result.predictionId,
        category,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Category: sketch_to_real
    if (category === "sketch_to_real") {
      const { sketch_intent, vibe: selectedVibe } = body

      if (!sketch_intent || !["interior", "exterior"].includes(sketch_intent)) {
        throw new Error(`sketch_to_real requires sketch_intent: "interior" | "exterior". Received: "${sketch_intent}"`)
      }

      if (!selectedVibe) {
        throw new Error(`sketch_to_real requires vibe. Received: "${selectedVibe}"`)
      }

      const sketchImageUrl = photo_urls[0]

      // Build rendering prompt based on intent
      const vibePromptSuffix = selectedVibe === "luxury" ? "Luxury aesthetic, golden hour warm light, shallow depth of field, slow deliberate motion, editorial magazine cinematic quality."
        : selectedVibe === "cozy" ? "Cozy intimate atmosphere, warm interior tungsten light, soft shadows, lived-in feel, gentle camera movement."
        : selectedVibe === "modern" ? "Modern minimalist aesthetic, cool daylight, crisp architectural lines, contemporary design language, clean motion."
        : selectedVibe === "family" ? "Bright friendly atmosphere, midday natural light, family-oriented warmth, welcoming, approachable cinematic feel."
        : selectedVibe === "investment" ? "Practical real-estate showcase, neutral even lighting, emphasis on layout and space, professional documentary style."
        : "Vacation resort aesthetic, sunset warm palette, light breeze in foliage, escapist holiday mood, smooth gimbal-style motion."

      const renderPrompt = sketch_intent === "interior"
        ? `Transform this architectural or designer sketch into a photorealistic interior render. Match the room layout, dimensions, and architectural intent of the drawing. Apply ${selectedVibe} aesthetic with appropriate furniture, materials, lighting, and finishes. Photorealistic 8K render quality, golden hour or warm interior light, magazine-grade composition. ${vibePromptSuffix}`
        : `Transform this architectural sketch into a photorealistic exterior render of the building. Match the building's form, proportions, and architectural intent. Apply ${selectedVibe} aesthetic with appropriate landscaping, materials, time-of-day lighting, and surroundings. Photorealistic 8K render quality, magazine-grade composition. ${vibePromptSuffix}`

      // Step 1: Render sketch to photoreal with gpt-image-2
      const photorealImageUrl = await generateWithNanoBanana(
        sketchImageUrl,
        renderPrompt,
        REPLICATE_TOKEN
      )

      // Step 2: Animate the photoreal with Kling slow_push
      const result = await startVideoGeneration(
        photorealImageUrl,
        "slow_push",
        8,
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
          console.error("[sketch_to_real] storage failed:", storageErr)
        }

        return new Response(JSON.stringify({
          status: "complete",
          category,
          video_url: result.videoUrl,
          clip_urls: [result.videoUrl],
          output_video_path: outputVideoPath,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      // Async path
      return new Response(JSON.stringify({
        status: "processing",
        prediction_id: result.predictionId,
        category,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Category: floor_plan_pan
    if (category === "floor_plan_pan") {
      const { shot_type: selectedShotType, vibe: selectedVibe } = body

      if (!selectedShotType || !SHOT_CONFIG[selectedShotType]) {
        throw new Error(`floor_plan_pan requires valid shot_type. Received: "${selectedShotType}"`)
      }

      if (!selectedVibe) {
        throw new Error(`floor_plan_pan requires vibe. Received: "${selectedVibe}"`)
      }

      const floorPlanUrl = photo_urls[0]
      const shotConfig = SHOT_CONFIG[selectedShotType]

      // Build vibe suffix
      const vibePromptSuffix = selectedVibe === "luxury" ? "Luxury aesthetic, golden hour warm light, shallow depth of field, slow deliberate motion, editorial magazine cinematic quality."
        : selectedVibe === "cozy" ? "Cozy intimate atmosphere, warm interior tungsten light, soft shadows, lived-in feel, gentle camera movement."
        : selectedVibe === "modern" ? "Modern minimalist aesthetic, cool daylight, crisp architectural lines, contemporary design language, clean motion."
        : selectedVibe === "family" ? "Bright friendly atmosphere, midday natural light, family-oriented warmth, welcoming, approachable cinematic feel."
        : selectedVibe === "investment" ? "Practical real-estate showcase, neutral even lighting, emphasis on layout and space, professional documentary style."
        : "Vacation resort aesthetic, sunset warm palette, light breeze in foliage, escapist holiday mood, smooth gimbal-style motion."

      const panPrompt = `Cinematic camera move across this 2D architectural floor plan. ${shotConfig.motionHint}. Maintain the floor plan's clarity and 2D drafting aesthetic — do not transform it into 3D or photoreal. Slow, deliberate, magazine-grade animation suitable for a luxury real estate listing. ${vibePromptSuffix}`

      // Kick off video directly (no image generation)
      const result = await startVideoGeneration(
        floorPlanUrl,
        selectedShotType,
        5,
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
          console.error("[floor_plan_pan] storage failed:", storageErr)
        }

        return new Response(JSON.stringify({
          status: "complete",
          category,
          video_url: result.videoUrl,
          clip_urls: [result.videoUrl],
          output_video_path: outputVideoPath,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      // Async path
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

// Helper: Animate transition between two photos using Kling
async function animatePhotoTransition(
  startImageUrl: string,
  endImageUrl: string,
  motionPrompt: string,
  duration: number,
  token: string
): Promise<string> {
  const prompt = `${motionPrompt} Cinematic real estate listing video. Photorealistic. Smooth transition.`
  const negativePrompt = "No hallucinations, no invented objects, no people, no animals, no morphing, no flicker"

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
