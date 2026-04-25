import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

const REPLICATE = "https://api.replicate.com/v1"

// ── Shot-type model routing ───────────────────────────────────────────────
// Mirrors src/lib/shot-types.ts on the client. Standard shots run on Kling
// 2.5 Turbo Pro; premium shots run on ByteDance Seedance 2.0 for higher
// quality drone-style and architectural moves.
type ShotType =
  | "slow_push"
  | "drone_orbit"
  | "parallax_pan"
  | "reveal_rise"
  | "architectural"
  | "establishing"

interface ShotConfig {
  model: "kling-2.5-turbo" | "seedance-2"
  motionHint: string
}

const SHOT_CONFIG: Record<ShotType, ShotConfig> = {
  slow_push:     { model: "kling-2.5-turbo", motionHint: "Slow dolly camera push-in on the subject, steady and cinematic." },
  drone_orbit:   { model: "seedance-2",      motionHint: "Slow aerial orbit 60° around the subject at elevated angle, smooth drone motion." },
  parallax_pan:  { model: "kling-2.5-turbo", motionHint: "Lateral parallax pan moving slowly left to right with foreground/background depth shift." },
  reveal_rise:   { model: "kling-2.5-turbo", motionHint: "Camera rises vertically from low to eye height, revealing the composition." },
  architectural: { model: "seedance-2",      motionHint: "Clean architectural slider pan, perfectly horizontal." },
  establishing:  { model: "seedance-2",      motionHint: "Slow pull-back dolly from tight composition to wide establishing shot." },
}

function resolveShot(shotType?: string | null): ShotConfig {
  if (!shotType || !(shotType in SHOT_CONFIG)) return SHOT_CONFIG.slow_push
  return SHOT_CONFIG[shotType as ShotType]
}

/**
 * Downloads video from URL and stores it in Supabase storage.
 * Returns the storage path or null on failure.
 */
async function storeVideo(
  supabase: ReturnType<typeof createClient>,
  videoUrl: string,
  storageId: string
): Promise<string | null> {
  try {
    const videoFetch = await fetch(videoUrl)
    const videoBuffer = await videoFetch.arrayBuffer()
    const videoPath = `${storageId}/generated/video.mp4`

    await supabase.storage
      .from("project-submissions")
      .upload(videoPath, videoBuffer, {
        contentType: "video/mp4",
        upsert: true,
      })

    return videoPath
  } catch (storageErr) {
    console.error("Failed to store video permanently:", storageErr)
    return null
  }
}

/**
 * Extracts the video URL from Replicate prediction output.
 */
function extractVideoUrl(output: unknown): string {
  if (typeof output === "string") return output
  if (Array.isArray(output) && output.length > 0) return output[0]
  throw new Error("Unexpected output format")
}

/**
 * Handles a completed prediction: stores video, updates submission, returns response.
 */
async function handleCompleted(
  supabase: ReturnType<typeof createClient>,
  prediction: { output: unknown },
  submissionId: string | null
) {
  const videoUrl = extractVideoUrl(prediction.output)
  const storageId = submissionId || `direct-${Date.now()}`
  const outputVideoPath = await storeVideo(supabase, videoUrl, storageId)

  if (submissionId) {
    await supabase
      .from("submissions")
      .update({
        output_video_url: videoUrl,
        output_video_path: outputVideoPath,
        status: "delivered",
        prompt_status: "complete",
      })
      .eq("id", submissionId)
  }

  return {
    video_url: videoUrl,
    output_video_path: outputVideoPath,
    submission_id: submissionId || null,
    status: "complete",
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  try {
    const body = await req.json()

    // ── MODE B: Poll for status ──
    if (body.prediction_id && !body.video_prompt) {
      const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
      const res = await fetch(
        `${REPLICATE}/predictions/${body.prediction_id}`,
        { headers: { Authorization: `Token ${TOKEN}` } }
      )
      const data = await res.json()

      if (data.status === "succeeded") {
        const result = await handleCompleted(supabase, data, body.submission_id || null)
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      if (data.status === "failed" || data.status === "canceled") {
        const errMsg = data.error || "Video generation failed"
        if (body.submission_id) {
          await supabase
            .from("submissions")
            .update({ prompt_status: "error", prompt_error: errMsg })
            .eq("id", body.submission_id)
        }
        return new Response(
          JSON.stringify({ status: "failed", error: errMsg }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }

      // Still processing
      return new Response(
        JSON.stringify({ status: "processing", prediction_id: body.prediction_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ── MODE A: Start job ──
    const {
      submission_id,
      video_prompt,
      generated_video_prompt,
      generated_before_image_path,
      before_image_url,
      after_image_url,
      after_photo_paths,
      aspect_ratio,
      duration,
      shot_type,
    } = body

    const baseFinalPrompt = video_prompt || generated_video_prompt
    if (!baseFinalPrompt) throw new Error("video prompt required")

    // Inject shot-type motion hint at the front of the prompt so both Kling
    // and Seedance respect the requested camera move.
    const shot = resolveShot(shot_type)
    const finalPrompt = `${shot.motionHint} ${baseFinalPrompt}`

    // Sign before image URL if needed (submission pipeline)
    let beforeUrl = before_image_url
    if (!beforeUrl && generated_before_image_path) {
      const { data: signed } = await supabase.storage
        .from("project-submissions")
        .createSignedUrl(generated_before_image_path, 3600)
      beforeUrl = signed?.signedUrl
    }

    // Get after image URL
    let afterUrl = after_image_url
    if (!afterUrl && after_photo_paths?.length) {
      const { data: afterSigned } = await supabase.storage
        .from("project-submissions")
        .createSignedUrl(after_photo_paths[0], 3600)
      afterUrl = afterSigned?.signedUrl
    }

    // Mark submission as in progress
    if (submission_id) {
      await supabase
        .from("submissions")
        .update({
          status: "in progress",
          prompt_status: "generating",
        })
        .eq("id", submission_id)
    }

    const negativePrompt = "objects moving without human or machine cause, self-assembling structures, materials appearing from nowhere, floating objects with no support, water rising without inlet source, soil moving without excavation agent, concrete appearing without being poured, walls building without workers, plants growing in real time, tools moving without hands holding them, people teleporting between positions, physically impossible object trajectories, water flowing upward against gravity, shadows moving opposite to sun direction, materials passing through solid surfaces, duplicate workers or machines, artifacts, flickering, strobing, morphing faces or hands, blurry unresolved motion, ghost trails on moving objects, unrealistic collision physics, objects with no weight or mass, distorted proportions of workers or machines"

    const durationSeconds = typeof duration === "string" ? parseInt(duration) : (duration || 5)

    // ── Route to model based on shot type ──
    let modelEndpoint: string
    let modelInput: Record<string, any>

    if (shot.model === "seedance-2") {
      // ByteDance Seedance Pro 1.0 on Replicate
      modelEndpoint = `${REPLICATE}/models/bytedance/seedance-1-pro/predictions`
      modelInput = {
        prompt: finalPrompt,
        duration: durationSeconds,
        aspect_ratio: aspect_ratio || "9:16",
        resolution: "1080p",
      }
      // Seedance uses a single image when going from one frame
      if (beforeUrl) modelInput.image = beforeUrl
      else if (afterUrl) modelInput.image = afterUrl
    } else {
      // Kling 2.5 Turbo Pro (default for standard shots)
      modelEndpoint = `${REPLICATE}/models/kwaivgi/kling-v2.5-turbo-pro/predictions`
      modelInput = {
        prompt: finalPrompt,
        aspect_ratio: aspect_ratio || "9:16",
        duration: durationSeconds,
        negative_prompt: negativePrompt,
      }
      if (beforeUrl) modelInput.start_image = beforeUrl
      if (afterUrl) modelInput.end_image = afterUrl
    }

    console.log(`[generate-transformation-video] shot=${shot_type || "slow_push"} model=${shot.model} endpoint=${modelEndpoint}`)

    const createRes = await fetch(modelEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Token ${Deno.env.get("REPLICATE_API_TOKEN")}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({ input: modelInput }),
    })

    const prediction = await createRes.json()
    if (!prediction.id) {
      throw new Error(
        `${shot.model} prediction failed to start: ${JSON.stringify(prediction)}`
      )
    }

    // If it completed within the wait window, handle immediately
    if (prediction.status === "succeeded" && prediction.output) {
      const result = await handleCompleted(supabase, prediction, submission_id || null)
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Otherwise return prediction_id for client-side polling
    return new Response(
      JSON.stringify({
        prediction_id: prediction.id,
        submission_id: submission_id || null,
        status: "processing",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
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
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
