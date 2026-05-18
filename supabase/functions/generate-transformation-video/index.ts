// ──────────────────────────────────────────────────────────────────────────
//  generate-transformation-video
//  ──────────────────────────────────────────────────────────────────────────
//
//  Setup / Cleanup / Transformation flows.
//
//  May 16, 2026 — REVERTED to Kling 2.5 Turbo Pro from Seedance 2.0.
//  Why:
//    • Seedance is image-to-video only (start frame). Without an end-frame
//      anchor, the transformation never reliably resolved to the target
//      state — jobs "didn't complete by the time the video is done".
//    • Kling 2.5 Turbo Pro on Replicate (kwaivgi/kling-v2.5-turbo-pro)
//      accepts BOTH start_image AND end_image, so the model is anchored
//      at both endpoints — the BEFORE photo at t=0 and the AFTER photo at
//      t=duration. That's the only correct architecture for a forced
//      transformation morph.
//    • Kling caps at 10s — perfect, since user is reverting the duration
//      picker to 5s/10s for these flows too.
//    • Removed the webhook + extended-cut split logic. Those were
//      Seedance-era workarounds that were also throwing 422s on the
//      Replicate webhook param. Going back to plain prediction_id polling.
//
//  Seedance is still used for animate_single and other listing-video flows
//  where it works (those don't need end-frame anchoring). This function
//  only handles the transformation flows.
// ──────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  streamReplicateToStorage,
  markStorageError,
} from "../_shared/store-video.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

const REPLICATE = "https://api.replicate.com/v1"
const MODEL_KLING = "kwaivgi/kling-v2.5-turbo-pro"

// ── Shot-type → motion hint ──
// Short prompts only. Kling 2.5 respects natural motion language without
// needing the full directorial grammar Seedance preferred.
type ShotType =
  | "slow_push"
  | "drone_orbit"
  | "parallax_pan"
  | "architectural"
  | "establishing"
  | "pedestal_up"

const SHOT_HINT: Record<ShotType, string> = {
  slow_push:     "Slow cinematic dolly forward",
  drone_orbit:   "Smooth elevated orbit around the subject",
  parallax_pan:  "Slow parallax pan from left to right",
  architectural: "Slow architectural slider across the scene",
  establishing:  "Slow dolly pulling back to a wider establishing view",
  pedestal_up:   "Slow camera pedestal rising upward",
}

function resolveShotHint(shotType?: string | null): string {
  if (!shotType || !(shotType in SHOT_HINT)) return SHOT_HINT.slow_push
  return SHOT_HINT[shotType as ShotType]
}

// Negative prompt for Kling — gates the recurring failure modes we saw
// on transformations (faces, distortion, jitter, watermarks).
const KLING_NEGATIVE_PROMPT =
  "blurry, low quality, distortion, deformed, watermark, text overlay, " +
  "jitter, flicker, ghosting, doubled objects, melting walls, warped " +
  "architecture, hallucinated furniture, people, faces, hands, signature"

function extractVideoUrl(output: unknown): string {
  if (typeof output === "string") return output
  if (Array.isArray(output) && output.length > 0 && typeof output[0] === "string") {
    return output[0]
  }
  if (output && typeof output === "object") {
    const u = (output as any).url
    if (typeof u === "string") return u
  }
  throw new Error("Unexpected Kling output format")
}

/**
 * Streams a Replicate video into Supabase Storage. Suffix lets multi-clip
 * callers distinguish their outputs; default is the standard single path.
 * Returns null only on terminal failure — callers MUST handle null.
 */
async function storeVideo(
  supabase: ReturnType<typeof createClient>,
  videoUrl: string,
  storageId: string,
  suffix?: string,
): Promise<string | null> {
  const path = suffix
    ? `${storageId}/generated/video-${suffix}.mp4`
    : `${storageId}/generated/video.mp4`
  try {
    const r = await streamReplicateToStorage(supabase, videoUrl, path, {
      logTag: "transformation-store",
    })
    return r.path
  } catch (err) {
    console.error("[transformation-store] terminal failure:", err)
    return null
  }
}

/**
 * Handles a completed prediction: persists the MP4 and updates the row.
 */
async function handleCompleted(
  supabase: ReturnType<typeof createClient>,
  prediction: { output: unknown; id?: string },
  submissionId: string | null,
) {
  const videoUrl = extractVideoUrl(prediction.output)
  const storageId = submissionId || `direct-${Date.now()}`
  const path = await storeVideo(supabase, videoUrl, storageId)

  if (submissionId) {
    if (path) {
      await supabase
        .from("submissions")
        .update({
          output_video_url: videoUrl,
          output_video_path: path,
          status: "delivered",
          prompt_status: "complete",
        })
        .eq("id", submissionId)
    } else {
      await supabase
        .from("submissions")
        .update({
          output_video_url: videoUrl,
          status: "delivered",
          prompt_status: "storage_error",
          prompt_error:
            "Generated successfully, but the permanent copy failed to save. Download soon — the source URL expires in 24 hours.",
        })
        .eq("id", submissionId)
    }
  }

  return {
    video_url: videoUrl,
    output_video_path: path,
    submission_id: submissionId || null,
    prediction_id: prediction.id ?? null,
    status: "complete",
    storage_error: !path,
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  )

  try {
    const body = await req.json()

    // ── POLL MODE: single prediction_id ──
    if (body.prediction_id && !body.video_prompt && !body.generated_video_prompt) {
      const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
      const r = await fetch(`${REPLICATE}/predictions/${body.prediction_id}`, {
        headers: { Authorization: `Token ${TOKEN}` },
      })
      const data = await r.json()

      if (data.status === "succeeded") {
        const result = await handleCompleted(
          supabase,
          { output: data.output, id: data.id },
          body.submission_id || null,
        )
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      if (data.status === "failed" || data.status === "canceled") {
        const errMsg = data.error || "Video generation failed"
        if (body.submission_id) {
          await supabase
            .from("submissions")
            .update({ prompt_status: "error", prompt_error: String(errMsg).slice(0, 500) })
            .eq("id", body.submission_id)
        }
        return new Response(
          JSON.stringify({ status: "failed", error: errMsg }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
      }

      // Still processing — keep prediction_id around so client keeps polling.
      return new Response(
        JSON.stringify({ status: "processing", prediction_id: body.prediction_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      )
    }

    // ── START MODE ──
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

    const userPrompt = video_prompt || generated_video_prompt
    if (!userPrompt) throw new Error("video prompt required")

    // Sign URLs from storage paths if needed.
    let beforeUrl = before_image_url
    if (!beforeUrl && generated_before_image_path) {
      const { data: signed } = await supabase.storage
        .from("project-submissions")
        .createSignedUrl(generated_before_image_path, 3600)
      beforeUrl = signed?.signedUrl
    }
    let afterUrl = after_image_url
    if (!afterUrl && after_photo_paths?.length) {
      const { data: afterSigned } = await supabase.storage
        .from("project-submissions")
        .createSignedUrl(after_photo_paths[0], 3600)
      afterUrl = afterSigned?.signedUrl
    }

    if (!beforeUrl) throw new Error("before image URL required")
    if (!afterUrl) throw new Error("after image URL required (Kling needs both endpoints)")

    // WebP guard — Kling rejects webp inputs with a cryptic error.
    for (const [label, url] of [["before", beforeUrl], ["after", afterUrl]] as const) {
      try {
        const head = await fetch(url, { method: "HEAD" })
        const ct = (head.headers.get("content-type") || "").toLowerCase()
        if (ct.includes("webp")) {
          throw new Error(
            `The ${label} photo is in WebP format, which video models don't support. Re-upload it as JPEG or PNG.`,
          )
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("WebP")) throw e
        // HEAD failure for another reason → let the Replicate call fail naturally
      }
    }

    // Mark submission as generating
    if (submission_id) {
      await supabase
        .from("submissions")
        .update({ status: "in progress", prompt_status: "generating" })
        .eq("id", submission_id)
    }

    // ── DURATION — Kling caps at 10s. Default 5s. ──
    const rawDuration = typeof duration === "string" ? parseInt(duration, 10) : (duration || 5)
    const durationSeconds = rawDuration >= 10 ? 10 : 5

    // ── PROMPT ASSEMBLY ──
    // Short, declarative, image-anchored. The shot hint sets the camera
    // language; the user's prompt describes the transformation content.
    // We explicitly call out the transformation completion so Kling commits
    // to the AFTER state by the final frame (it already has end_image as
    // an anchor — this just reinforces the contract).
    const motion = resolveShotHint(shot_type)
    const finalPrompt =
      `${motion}. ${userPrompt}. Cinematic real estate transformation. ` +
      `The scene smoothly transitions from the starting frame to the ending frame, ` +
      `reaching the final state by the final second of the clip. Photorealistic, no jitter.`

    const modelEndpoint = `${REPLICATE}/models/${MODEL_KLING}/predictions`
    const modelInput: Record<string, unknown> = {
      prompt: finalPrompt,
      start_image: beforeUrl,
      end_image: afterUrl,
      duration: durationSeconds,
      aspect_ratio: aspect_ratio || "9:16",
      negative_prompt: KLING_NEGATIVE_PROMPT,
      cfg_scale: 0.7,
    }

    console.log(
      `[generate-transformation-video] shot=${shot_type || "slow_push"} model=kling-2.5-turbo-pro duration=${durationSeconds}s`,
    )

    const r = await fetch(modelEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Token ${Deno.env.get("REPLICATE_API_TOKEN")}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({ input: modelInput }),
    })
    const prediction = await r.json()

    if (!prediction.id) {
      const detail =
        prediction?.detail ||
        prediction?.error?.message ||
        JSON.stringify(prediction).slice(0, 400)
      throw new Error(
        `Kling rejected the start request (HTTP ${r.status}): ${detail}`,
      )
    }

    // Synchronous completion (wait=60 caught it)
    if (prediction.status === "succeeded" && prediction.output) {
      const result = await handleCompleted(supabase, prediction, submission_id || null)
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Async — return prediction_id and let the client poll
    return new Response(
      JSON.stringify({
        prediction_id: prediction.id,
        submission_id: submission_id || null,
        status: "processing",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    )
  } catch (err) {
    // Mark the submission row as errored so the frontend can surface it
    try {
      const bodyClone = await req.clone().json().catch(() => ({}))
      if (bodyClone.submission_id) {
        await supabase
          .from("submissions")
          .update({
            prompt_status: "error",
            prompt_error: (err as Error).message.slice(0, 500),
          })
          .eq("id", bodyClone.submission_id)
      }
    } catch (_) {}

    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    )
  }
})
