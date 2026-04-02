import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

const REPLICATE = "https://api.replicate.com/v1"

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
    } = body

    const finalPrompt = video_prompt || generated_video_prompt
    if (!finalPrompt) throw new Error("video prompt required")

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

    // Build Kling 2.5 Turbo Pro input
    const klingInput: Record<string, any> = {
      prompt: finalPrompt,
      aspect_ratio: aspect_ratio || "9:16",
      duration: typeof duration === "string" ? parseInt(duration) : (duration || 5),
      negative_prompt: "objects moving without human or machine cause, self-assembling structures, materials appearing from nowhere, floating objects with no support, water rising without inlet source, soil moving without excavation agent, concrete appearing without being poured, walls building without workers, plants growing in real time, tools moving without hands holding them, people teleporting between positions, physically impossible object trajectories, water flowing upward against gravity, shadows moving opposite to sun direction, materials passing through solid surfaces, duplicate workers or machines, artifacts, flickering, strobing, morphing faces or hands, blurry unresolved motion, ghost trails on moving objects, unrealistic collision physics, objects with no weight or mass, distorted proportions of workers or machines",
    }

    if (beforeUrl) {
      klingInput.start_image = beforeUrl
    }
    if (afterUrl) {
      klingInput.end_image = afterUrl
    }

    // Call Kling 2.5 Turbo Pro — use Prefer: wait for up to 60s
    const createRes = await fetch(
      `${REPLICATE}/models/kwaivgi/kling-v2.5-turbo-pro/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${Deno.env.get("REPLICATE_API_TOKEN")}`,
          "Content-Type": "application/json",
          Prefer: "wait=60",
        },
        body: JSON.stringify({ input: klingInput }),
      }
    )

    const prediction = await createRes.json()
    if (!prediction.id) {
      throw new Error(
        `Kling prediction failed to start: ${JSON.stringify(prediction)}`
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
