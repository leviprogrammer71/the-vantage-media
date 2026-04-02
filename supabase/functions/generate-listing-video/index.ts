import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

const REPLICATE = "https://api.replicate.com/v1"
const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions"

async function callAI(
  apiKey: string,
  systemPrompt: string,
  userText: string,
  imageUrls: string[] = []
): Promise<string> {
  let userContent: any
  if (imageUrls.length > 0) {
    const parts: any[] = []
    for (const url of imageUrls) {
      parts.push({ type: "image_url", image_url: { url } })
    }
    parts.push({ type: "text", text: userText })
    userContent = parts
  } else {
    userContent = userText
  }

  const res = await fetch(OPENROUTER, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://thevantage.co",
      "X-Title": "The Vantage"
    },
    body: JSON.stringify({
      model: "openai/gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      max_tokens: 600,
      temperature: 0.7
    })
  })

  const data = await res.json()
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${JSON.stringify(data)}`)
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error(`OpenRouter returned no content: ${JSON.stringify(data)}`)
  return text
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const REPLICATE_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")
  const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY")
  if (!REPLICATE_TOKEN || !OPENROUTER_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing API keys" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  try {
    const { image_url, scene_type, motion_style, format, duration, submission_id } = await req.json()

    if (!image_url) throw new Error("image_url required")

    // Mark submission as generating
    if (submission_id) {
      await supabase
        .from("submissions")
        .update({ status: "in progress", prompt_status: "generating" })
        .eq("id", submission_id)
    }

    // GPT-4o writes the Kling listing video prompt
    const listingSystemPrompt = `You write cinematic real estate showcase prompts for Kling 2.5 Turbo Pro image-to-video. The camera is the ONLY thing that moves. No people. No objects. No weather. No changes. Only the camera travels through the space.

WHAT THE CAMERA CAN DO:
  Move forward or backward along a straight path
  Pan left or right on a fixed axis
  Tilt up or down on a fixed axis
  Rise or descend on a vertical axis
  Travel along a curved arc path
  Dolly along a wall or counter

WHAT THE CAMERA CANNOT DO:
  Create rooms that do not exist in the photo
  Show spaces outside the frame of the photo
  Make objects appear, move, or disappear
  Bring people into the scene
  Change lighting beyond what exists in photo
  Add weather, wind, rain, or atmosphere
  Create reflections not already in the photo

PHYSICS OF CAMERA MOVEMENT:
  The camera has weight and momentum. It starts moving slowly, reaches full speed in the middle, and slows before stopping. It never jerks or changes direction suddenly. It passes objects at correct parallax speed: near objects pass faster than far objects. The frame never tilts unless intentionally described as a tilt move.

NEGATIVE PROMPT — always output this on a new line at the end, verbatim:
  "No hallucinations, no invented rooms, no new objects, no people, no animals, no weather, no morphing, no warping, no flickering, no artifacts, no blurry motion, no floating objects, no distortion, no changes to lighting, no added reflections, no ghost trails, no duplicate surfaces."

OUTPUT FORMAT:
  Prompt: [50-60 words describing the camera movement through the visible space only]
  Negative: [the full negative prompt above]

Output ONLY the prompt and negative prompt, nothing else.`

    const videoPrompt = await callAI(
      OPENROUTER_KEY,
      listingSystemPrompt,
      `Scene type: ${scene_type || "exterior"}
Motion style: ${motion_style || "slow_push"}
This is a real estate photo. Write a Kling prompt for a smooth cinematic camera move through this exact space. Only animate what is visible. No new content.`,
      [image_url]
    )

    const aspectRatio = format === "MLS" ? "16:9" : "9:16"
    const dur = parseInt(duration) || 5

    // Call Kling 2.5 Turbo Pro for listing video
    const res = await fetch(
      `${REPLICATE}/models/kwaivgi/kling-v2.5-turbo-pro/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${REPLICATE_TOKEN}`,
          "Content-Type": "application/json",
          Prefer: "wait",
        },
        body: JSON.stringify({
          input: {
            prompt: videoPrompt,
            start_image: image_url,
            duration: dur,
            aspect_ratio: aspectRatio,
            negative_prompt: "No hallucinations, no invented rooms, no new objects, no people, no animals, no weather, no morphing, no warping, no flickering, no artifacts, no blurry motion, no floating objects, no distortion, no changes to lighting, no added reflections, no ghost trails, no duplicate surfaces",
          },
        }),
      }
    )

    const prediction = await res.json()
    if (!res.ok || !prediction.id) {
      throw new Error(`Kling listing failed: ${JSON.stringify(prediction)}`)
    }

    let videoUrl: string
    if (prediction.status === "succeeded") {
      videoUrl = typeof prediction.output === "string"
        ? prediction.output
        : prediction.output?.[0]
    } else {
      videoUrl = await pollReplicate(prediction.id, 120)
    }

    // Download video and store permanently in Supabase storage
    let outputVideoPath: string | null = null
    const storageId = submission_id || `listing-${Date.now()}`
    try {
      const videoFetch = await fetch(videoUrl)
      const videoBuffer = await videoFetch.arrayBuffer()
      const videoPath = `${storageId}/generated/listing-video.mp4`

      await supabase.storage
        .from("project-submissions")
        .upload(videoPath, videoBuffer, {
          contentType: "video/mp4",
          upsert: true,
        })

      outputVideoPath = videoPath
    } catch (storageErr) {
      console.error("Failed to store listing video permanently:", storageErr)
    }

    // Update submission if provided
    if (submission_id) {
      await supabase
        .from("submissions")
        .update({
          output_video_url: videoUrl,
          output_video_path: outputVideoPath,
          generated_video_prompt: videoPrompt,
          status: "delivered",
          prompt_status: "complete",
        })
        .eq("id", submission_id)
    }

    return new Response(
      JSON.stringify({ video_url: videoUrl, output_video_path: outputVideoPath, prompt: videoPrompt }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    // Try to update submission on error
    try {
      const bodyClone = await req.clone().json().catch(() => ({}))
      if (bodyClone.submission_id) {
        await supabase
          .from("submissions")
          .update({
            prompt_status: "error",
            prompt_error: (err as Error).message,
          })
          .eq("id", bodyClone.submission_id)
      }
    } catch (_) {}

    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
