import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

const REPLICATE = "https://api.replicate.com/v1"

// ── Shot-type motion hint routing ──────────────────────────────────────────
// All transformations now run on ByteDance Seedance 2.0 — Kling was
// producing inconsistent end states that left customers thinking the
// process never completed. Seedance is faster, cheaper, and the user A/B
// tested it as cleaner. The simple-prompt grammar matches what wins on
// Seedance: short, image-anchored, no rich style language.
//
// "reveal_rise" REMOVED — Seedance interpreted the crane prompt as
// "show different parts of the room" and produced jump cuts.
type ShotType =
  | "slow_push"
  | "drone_orbit"
  | "parallax_pan"
  | "architectural"
  | "establishing"
  | "pedestal_up"

interface ShotConfig {
  motionHint: string
}

const SHOT_CONFIG: Record<ShotType, ShotConfig> = {
  slow_push:     { motionHint: "slow camera dolly as if cameraman stepping towards" },
  drone_orbit:   { motionHint: "slow elevated camera orbit from above around" },
  parallax_pan:  { motionHint: "slow parallax pan left to right across" },
  architectural: { motionHint: "slow architectural slider across" },
  establishing:  { motionHint: "slow camera dolly pulling back wide from" },
  pedestal_up:   { motionHint: "slow camera pedestal on" },
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

    // ── MODE C: Poll an extended-cut (15s split into two predictions) ──
    if (Array.isArray(body.prediction_ids) && body.prediction_ids.length > 0) {
      const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
      const updated = await Promise.all(
        body.prediction_ids.map(async (entry: any) => {
          if (entry.video_url) return entry
          if (!entry.prediction_id) return { ...entry, video_url: null, error: "missing prediction_id" }
          try {
            const r = await fetch(`${REPLICATE}/predictions/${entry.prediction_id}`, {
              headers: { Authorization: `Token ${TOKEN}` },
            })
            const d = await r.json()
            if (d.status === "succeeded") {
              const url = extractVideoUrl(d.output)
              return { ...entry, video_url: url }
            }
            if (d.status === "failed" || d.status === "canceled") {
              return { ...entry, video_url: null, error: d.error || "failed" }
            }
            return entry
          } catch (e) {
            return { ...entry, error: (e as Error).message }
          }
        })
      )

      const allDone = updated.every((e: any) => e.video_url || e.error)
      if (allDone) {
        const clipUrls = updated.filter((e: any) => e.video_url).map((e: any) => e.video_url)
        if (clipUrls.length === 0) {
          return new Response(
            JSON.stringify({
              status: "failed",
              error: "All extended-cut clips failed: " + updated.map((e: any) => e.error).join("; "),
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          )
        }
        // Both clips are ready — return the URLs so the client can concat
        // via ffmpeg.wasm. Per-clip storage paths are written for the
        // backfill flow to keep them recoverable.
        const stamp = Date.now()
        const clipPaths: string[] = []
        for (let i = 0; i < clipUrls.length; i++) {
          const path = await storeVideo(supabase, clipUrls[i], `${body.submission_id || `direct-${stamp}`}-ext${i}`)
          if (path) clipPaths.push(path)
        }
        // Update the submission row with the FIRST clip's URL/path so the
        // gallery has something to display while the user concats client-side.
        if (body.submission_id) {
          await supabase
            .from("submissions")
            .update({
              output_video_url: clipUrls[0],
              output_video_path: clipPaths[0] ?? null,
              status: "delivered",
              prompt_status: "complete",
            })
            .eq("id", body.submission_id)
        }
        return new Response(
          JSON.stringify({
            status: "complete",
            extended_cut: true,
            video_url: clipUrls[0],
            clip_urls: clipUrls,
            output_clip_paths: clipPaths,
            submission_id: body.submission_id || null,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
      return new Response(
        JSON.stringify({
          status: "processing",
          extended_cut: true,
          prediction_ids: updated,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ── MODE B: Poll a single prediction ──
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

    // Defensive guard: Kling 2.5 + Seedance 2.0 reject webp inputs.
    // Frontend converts webp → jpg before upload, but if a webp slips through
    // (old uploads, direct API calls), surface a clean error before we waste
    // a Replicate call with the cryptic "mime type image/webp is not supported".
    for (const [label, candidateUrl] of [["before", beforeUrl], ["after", afterUrl]] as const) {
      if (!candidateUrl) continue
      try {
        const head = await fetch(candidateUrl, { method: "HEAD" })
        const ct = (head.headers.get("content-type") || "").toLowerCase()
        if (ct.includes("webp")) {
          throw new Error(
            `The ${label} photo is in WebP format, which video models don't support. Re-upload it as JPEG or PNG. (We auto-convert WebP for new uploads — this looks like an older file.)`
          )
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("WebP")) throw e
        // HEAD failed for some other reason — let the downstream call fail naturally
      }
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

    // ── DURATION HANDLING ──
    // User-facing options are 10s and 15s. Seedance Pro on Replicate
    // officially supports 5 and 10 seconds; pass 15s through anyway so
    // we benefit if/when the platform extends support, and clamp to 10
    // on rejection in a future iteration if needed. Default = 10s.
    const rawDuration = typeof duration === "string" ? parseInt(duration) : (duration || 10)
    const durationSeconds = [5, 10, 12, 15].includes(rawDuration) ? rawDuration : 10

    // ── ALL TRANSFORMATIONS NOW USE SEEDANCE 2.0 ──
    // User direction May 15, 2026: "All video generation should use Seedance
    // 2.0 and offer 10 or 15 second duration options". Kling was producing
    // inconsistent end states. Seedance 2.0 (bytedance/seedance-1-pro) is
    // image-to-video — takes ONE image and a short motion prompt, no
    // start/end frame pair. We pass the BEFORE image and a prompt that
    // describes the transformation, including the target after-state.
    const modelEndpoint = `${REPLICATE}/models/bytedance/seedance-1-pro/predictions`
    const modelInput: Record<string, any> = {
      prompt: finalPrompt,
      duration: durationSeconds,
      aspect_ratio: aspect_ratio || "9:16",
      resolution: "1080p",
      fps: 24,
      camera_fixed: false,
    }
    // Image-to-video needs one anchor image. Prefer the BEFORE image so the
    // transformation starts from the empty / unfinished state and animates
    // toward the AFTER state described in the prompt. Fall back to AFTER
    // if no BEFORE was provided (rare — AI-generated before path).
    if (beforeUrl) modelInput.image = beforeUrl
    else if (afterUrl) modelInput.image = afterUrl

    console.log(`[generate-transformation-video] shot=${shot_type || "slow_push"} model=seedance-2 duration=${durationSeconds}s`)

    // Helper that fires ONE Seedance prediction with a given duration.
    // Returns { prediction, ok, error }. Doesn't throw — caller inspects.
    async function fireSeedance(seconds: number) {
      const input = { ...modelInput, duration: seconds }
      const r = await fetch(modelEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Token ${Deno.env.get("REPLICATE_API_TOKEN")}`,
          "Content-Type": "application/json",
          Prefer: "wait=60",
        },
        body: JSON.stringify({ input }),
      })
      const data = await r.json()
      return { data, ok: !!data.id, status: r.status }
    }

    const firstAttempt = await fireSeedance(durationSeconds)

    // ── GUARANTEED-15s FALLBACK (May 15, 2026) ──
    // Replicate's Seedance Pro has a hard duration cap of 12s. When a user
    // picks 15s and Seedance returns HTTP 422 "Must be less than or equal
    // to 12", split into a 10s + 5s parallel pair using the same source
    // image. Return both prediction IDs as a bundle-style response with
    // `extended_cut: true` — client concats via ffmpeg.wasm into one 15s.
    const isDurationRejection =
      !firstAttempt.ok &&
      durationSeconds > 12 &&
      /duration|number_lte|invalid_fields/i.test(JSON.stringify(firstAttempt.data))

    if (isDurationRejection) {
      console.log(`[generate-transformation-video] duration=${durationSeconds} rejected by Seedance, splitting into 10+5`)
      const [p10, p5] = await Promise.all([fireSeedance(10), fireSeedance(5)])
      if (!p10.ok || !p5.ok) {
        throw new Error(
          `seedance-2 split-fallback failed: 10s=${p10.ok ? "OK" : JSON.stringify(p10.data).slice(0, 200)} | 5s=${p5.ok ? "OK" : JSON.stringify(p5.data).slice(0, 200)}`
        )
      }
      // Both predictions started. Return both IDs for client to poll + concat.
      return new Response(
        JSON.stringify({
          extended_cut: true,
          prediction_ids: [
            { prediction_id: p10.data.id, index: 0, duration: 10 },
            { prediction_id: p5.data.id, index: 1, duration: 5 },
          ],
          submission_id: submission_id || null,
          status: "processing",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    const prediction = firstAttempt.data
    if (!prediction.id) {
      throw new Error(
        `seedance-2 prediction failed to start: ${JSON.stringify(prediction)}`
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
