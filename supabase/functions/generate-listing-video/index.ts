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
    throw new Error(`GPT-Image-2 failed: ${JSON.stringify(prediction)}`)
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

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      input: {
        prompt,
        start_image: imageUrl,
        duration,
        aspect_ratio: "9:16",
        negative_prompt: negativePrompt,
      },
    }),
  })

  const prediction = await res.json()
  if (!res.ok || !prediction.id) {
    throw new Error(`Video generation failed: ${JSON.stringify(prediction)}`)
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

  try {
    const {
      mode,
      photo_urls,
      shot_type,
      effect_id,
      effect_mode,
      duration,
      credits_cost,
    } = await req.json()

    // Validate
    if (!mode || !photo_urls || photo_urls.length === 0) {
      throw new Error("mode and photo_urls required")
    }

    if (mode !== "single" && mode !== "compilation") {
      throw new Error("mode must be 'single' or 'compilation'")
    }

    if (mode === "single" && photo_urls.length !== 1) {
      throw new Error("single mode requires exactly 1 photo")
    }

    if (mode === "compilation" && (photo_urls.length < 3 || photo_urls.length > 6)) {
      throw new Error("compilation mode requires 3-6 photos")
    }

    // Start with the first photo
    let sourceImageUrl = photo_urls[0]

    // Step 1: Apply effect with GPT-Image-2 if realistic mode
    if (effect_id !== "none" && effect_mode === "realistic") {
      const effectPrompt = EFFECT_PROMPTS[effect_id]
      if (!effectPrompt) throw new Error(`Unknown effect: ${effect_id}`)
      sourceImageUrl = await generateWithGptImage(
        sourceImageUrl,
        effectPrompt,
        REPLICATE_TOKEN
      )
    }

    // Step 2: Generate video
    const videoUrl = await generateVideo(
      sourceImageUrl,
      shot_type,
      duration,
      REPLICATE_TOKEN
    )

    // Step 3: Download and store video permanently
    let outputVideoPath: string | null = null
    try {
      const videoFetch = await fetch(videoUrl)
      const videoBuffer = await videoFetch.arrayBuffer()
      const videoPath = `listing-videos/${Date.now()}/video.mp4`

      await supabase.storage
        .from("project-submissions")
        .upload(videoPath, videoBuffer, {
          contentType: "video/mp4",
          upsert: true,
        })

      outputVideoPath = videoPath
    } catch (storageErr) {
      console.error("Failed to store video permanently:", storageErr)
    }

    // Build response
    const response: any = {
      video_url: videoUrl,
      output_video_path: outputVideoPath,
      mode,
      shot_type,
      effect_id,
      effect_mode,
    }

    if (effect_id !== "none" && effect_mode === "quick") {
      response.quick_effect = QUICK_EFFECT_BADGES[effect_id]
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("Error:", err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
