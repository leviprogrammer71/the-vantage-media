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

async function generateWithGptImage(
  imageUrl: string,
  effectPrompt: string,
  token: string
): Promise<string> {
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
          input_images: [imageUrl],
          prompt: effectPrompt,
          aspect_ratio: "2:3", // 9:16 mapped to 2:3 for gpt-image-2
        },
      }),
    }
  )

  const prediction = await res.json()
  if (!res.ok || !prediction.id) {
    const detail = prediction?.detail || prediction?.error?.message || JSON.stringify(prediction).slice(0, 400)
    throw new Error(`gpt-image-2 rejected the request (HTTP ${res.status}): ${detail}`)
  }

  if (prediction.status === "succeeded") {
    return typeof prediction.output === "string"
      ? prediction.output
      : prediction.output?.[0]
  }

  return await pollReplicate(prediction.id)
}

async function generateVideo(
  imageUrl: string,
  shotType: string,
  duration: number,
  token: string
): Promise<string> {
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

  if (prediction.status === "succeeded") {
    return typeof prediction.output === "string"
      ? prediction.output
      : prediction.output?.[0]
  }

  return await pollReplicate(prediction.id)
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
      category: body.category,
      photo_count: body.photo_urls?.length,
      shot_type: body.shot_type,
      effect_id: body.effect_id,
      effect_mode: body.effect_mode,
      duration: body.duration,
      has_listing: !!body.listing,
    }))

    const {
      category,
      photo_urls,
      shot_type,
      effect_id,
      effect_mode,
      listing,
      duration,
      credits_cost,
    } = body

    // Validate
    if (!category || !photo_urls || photo_urls.length === 0) {
      throw new Error(`category and photo_urls required. Received: category="${category}", photo_urls.length=${photo_urls?.length}`)
    }

    if (!["animate_single", "sun_to_sun", "listing_bundle"].includes(category)) {
      throw new Error(`category must be animate_single, sun_to_sun, or listing_bundle. Received: "${category}"`)
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

      // Apply effect if realistic
      if (effect_id !== "none" && effect_mode === "realistic") {
        const effectPrompt = EFFECT_PROMPTS[effect_id]
        if (!effectPrompt) throw new Error(`Unknown effect: ${effect_id}`)
        sourceImageUrl = await generateWithGptImage(
          sourceImageUrl,
          effectPrompt,
          REPLICATE_TOKEN
        )
      }

      // Generate single video
      const videoUrl = await generateVideo(
        sourceImageUrl,
        shot_type,
        duration || 8,
        REPLICATE_TOKEN
      )

      // Store permanently
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

      const response: any = {
        category,
        video_url: videoUrl,
        clip_urls: [videoUrl],
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

    // Category: sun_to_sun
    if (category === "sun_to_sun") {
      const firstPhotoUrl = photo_urls[0]

      // Generate 4 time-of-day variants with gpt-image-2
      const sunsetPrompt = `Render this same scene at golden hour magic light, the late afternoon sun low on the horizon, warm orange glow on the building, long shadows cast across the lawn, sky in soft amber and pink. Keep all building geometry and landscaping identical.`

      const goldenUrl = await generateWithGptImage(
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

    // Category: listing_bundle
    if (category === "listing_bundle") {
      const clipUrls: string[] = []
      const shotRotation = ["slow_push", "parallax_pan", "reveal_rise", "architectural", "establishing", "drone_orbit"]
      const clipPrompts = [
        "Slow dolly camera push-in, cinematic listing video, photorealistic, smooth motion",
        "Lateral parallax pan with depth shift, cinematic real estate property, smooth motion",
        "Camera rises vertically revealing the space, listing video, photorealistic",
        "Clean architectural slider pan, horizontal precision, real estate, cinematic",
        "Slow pull-back establishing shot, wide reveal, property listing, cinematic",
        "Slow aerial orbit around the subject, drone motion, listing property, cinematic",
      ]

      // Generate one video per photo
      for (let i = 0; i < photo_urls.length && i < 6; i++) {
        let photoUrl = photo_urls[i]

        // Apply effect to first photo only
        if (i === 0 && effect_id !== "none" && effect_mode === "realistic") {
          const effectPrompt = EFFECT_PROMPTS[effect_id]
          if (effectPrompt) {
            photoUrl = await generateWithGptImage(photoUrl, effectPrompt, REPLICATE_TOKEN)
          }
        }

        const shotIdx = i % shotRotation.length
        const clipPrompt = clipPrompts[shotIdx]

        try {
          const clipUrl = await generateVideo(
            photoUrl,
            shotRotation[shotIdx] as any,
            3,
            REPLICATE_TOKEN
          )
          clipUrls.push(clipUrl)
        } catch (clipErr) {
          console.error(`Clip ${i} failed:`, clipErr)
        }
      }

      if (clipUrls.length === 0) {
        throw new Error("Failed to generate any video clips")
      }

      // Store all clips
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

      // Return first clip as primary video URL for UI
      const response: any = {
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
