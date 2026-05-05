import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

const REPLICATE = "https://api.replicate.com/v1"

// Replicate FFmpeg model: lucataco/ffmpeg-api
// Accepts media_files (array of URLs) + command (FFmpeg command string)
const MODEL_FFMPEG = "lucataco/ffmpeg-api"

interface ListingMetadata {
  price?: number
  realtor_name?: string
  location?: string
  brokerage?: string
  show_price?: boolean
}

interface StitchRequest {
  clip_urls: string[]
  listing: ListingMetadata
  watermark?: boolean
  submission_id?: string
}

interface StitchResponse {
  stitched_url: string
  stitched_path: string
  duration_seconds: number
}

// Escape any character that has special meaning inside an FFmpeg drawtext value.
// FFmpeg parses ': , [ ] ; \ \\ inside filter args. The safest approach:
// strip anything dangerous, then keep ASCII letters, digits, basic punctuation.
function escapeDrawtext(text: string): string {
  return text
    .replace(/['":\\,\[\];%@]/g, "") // remove characters that break the drawtext parser
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 64) // hard cap so a long realtor name can't blow up the filter graph
}

// Build FFmpeg drawtext filter for text overlay
// Font fallback: uses system default if fontfile unavailable
function buildDrawtextFilter(
  listing: ListingMetadata,
  videoWidth: number = 1080,
  videoHeight: number = 1920
): string {
  const smallFontsize = Math.floor(videoHeight / 50)
  const largeFontsize = Math.floor(videoHeight / 20)

  const filters: string[] = []

  // Top-left: LOCATION
  if (listing.location) {
    const t = escapeDrawtext(listing.location.toUpperCase())
    if (t) filters.push(
      `drawtext=text='${t}':fontsize=${smallFontsize}:fontcolor=white@0.85:x=24:y=24:box=1:boxcolor=black@0.45:boxborderw=10`
    )
  }

  // Bottom-left: PRICE — only if show_price
  if (listing.show_price && listing.price) {
    const t = escapeDrawtext(`$${listing.price.toLocaleString()}`)
    if (t) filters.push(
      `drawtext=text='${t}':fontsize=${largeFontsize}:fontcolor=white:x=24:y=${videoHeight - largeFontsize - 80}:shadowx=2:shadowy=2:shadowcolor=black@0.7`
    )
  }

  // Bottom-right: REALTOR + BROKERAGE
  if (listing.realtor_name) {
    const r = escapeDrawtext(listing.realtor_name.toUpperCase())
    if (r) filters.push(
      `drawtext=text='${r}':fontsize=${smallFontsize}:fontcolor=white:x=w-tw-24:y=${videoHeight - smallFontsize * 2 - 80}:shadowx=1:shadowy=1:shadowcolor=black@0.6`
    )
    if (listing.brokerage) {
      const b = escapeDrawtext(listing.brokerage.toUpperCase())
      if (b) filters.push(
        `drawtext=text='${b}':fontsize=${smallFontsize - 4}:fontcolor=white@0.85:x=w-tw-24:y=${videoHeight - smallFontsize - 40}:shadowx=1:shadowy=1:shadowcolor=black@0.6`
      )
    }
  }

  // Bottom-right watermark
  filters.push(
    `drawtext=text='AI VANTAGE':fontsize=${Math.max(smallFontsize - 8, 16)}:fontcolor=white@0.45:x=w-tw-24:y=h-th-12`
  )

  return filters.join(",")
}

// Single Replicate poll — caller (the client) drives the loop. Returns one of:
//   { status: "complete", url }
//   { status: "processing" }
//   { status: "failed", error }
async function pollFFmpegOnce(
  predictionId: string
): Promise<{ status: "complete" | "processing" | "failed"; url?: string; error?: string }> {
  const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
  const res = await fetch(`${REPLICATE}/predictions/${predictionId}`, {
    headers: { Authorization: `Token ${TOKEN}` },
  })
  const data = await res.json()

  if (data.status === "succeeded") {
    const out = data.output
    const url = typeof out === "string" ? out : (Array.isArray(out) && out.length > 0 ? out[0] : null)
    if (url) return { status: "complete", url }
    return { status: "failed", error: "FFmpeg succeeded but returned no URL" }
  }
  if (data.status === "failed" || data.status === "canceled") {
    return { status: "failed", error: data.error || "FFmpeg prediction failed" }
  }
  return { status: "processing" }
}

// Kick off the FFmpeg prediction (no awaiting completion).
// Returns prediction_id which the client polls back into us.
async function startFFmpegStitch(
  clipUrls: string[],
  listing: ListingMetadata
): Promise<{ predictionId?: string; videoUrl?: string }> {
  const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
  if (!TOKEN) throw new Error("Missing REPLICATE_API_TOKEN")
  if (!clipUrls?.length) throw new Error("No clip URLs provided")

  const numClips = clipUrls.length
  const concatInputs = clipUrls.map((_, i) => `-i ${clipUrls[i]}`).join(" ")
  let concatChain = ""
  for (let i = 0; i < numClips; i++) concatChain += `[${i}:v][${i}:a]`
  concatChain += `concat=n=${numClips}:v=1:a=1[outv][outa]`

  const textFilter = buildDrawtextFilter(listing, 1080, 1920)
  const filterComplex = `${concatChain};[outv]${textFilter}[final]`

  // Note: -aspect 9:16 + -s 1080x1920 forces a consistent vertical canvas even
  // if the source clips have slight aspect drift.
  const ffmpegCommand =
    `${concatInputs} -filter_complex "${filterComplex}" ` +
    `-map "[final]" -map "[outa]" ` +
    `-c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p ` +
    `-c:a aac -b:a 128k -s 1080x1920 -aspect 9:16 ` +
    `output.mp4`

  console.log("[stitch] starting FFmpeg prediction, clips:", numClips)

  const res = await fetch(`${REPLICATE}/models/${MODEL_FFMPEG}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Token ${TOKEN}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      input: { media_files: clipUrls, command: ffmpegCommand },
    }),
  })

  const prediction = await res.json()
  if (!res.ok || !prediction.id) {
    const detail = prediction?.detail || prediction?.error?.message || JSON.stringify(prediction).slice(0, 400)
    throw new Error(`FFmpeg API rejected (HTTP ${res.status}): ${detail}`)
  }

  // Synchronous success?
  if (prediction.status === "succeeded" && prediction.output) {
    const out = prediction.output
    const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : null)
    if (url) return { videoUrl: url }
  }

  return { predictionId: prediction.id }
}

// Persist a finished stitched URL to Supabase storage and return the signed URL.
async function persistStitched(
  supabase: ReturnType<typeof createClient>,
  stitchedUrl: string,
  submissionId: string | undefined
): Promise<{ stitched_url: string; stitched_path: string }> {
  const stitchedFetch = await fetch(stitchedUrl)
  if (!stitchedFetch.ok) {
    throw new Error(`Failed to download stitched video: HTTP ${stitchedFetch.status}`)
  }
  const stitchedBuffer = await stitchedFetch.arrayBuffer()
  const stitchedPath = `listing-videos/${Date.now()}/stitched.mp4`

  await supabase.storage
    .from("project-submissions")
    .upload(stitchedPath, stitchedBuffer, { contentType: "video/mp4", upsert: true })

  const { data: urlData, error: signedUrlError } = await supabase.storage
    .from("project-submissions")
    .createSignedUrl(stitchedPath, 604800)
  if (signedUrlError || !urlData?.signedUrl) {
    throw new Error(`Failed to create signed URL: ${signedUrlError?.message}`)
  }
  const stitchedSignedUrl = urlData.signedUrl

  if (submissionId) {
    try {
      await supabase
        .from("submissions")
        .update({ output_video_url: stitchedSignedUrl, output_video_path: stitchedPath })
        .eq("id", submissionId)
    } catch (updateErr) {
      console.error("[stitch] non-fatal: submission update failed:", updateErr)
    }
  }

  return { stitched_url: stitchedSignedUrl, stitched_path: stitchedPath }
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

    // ── POLL MODE: client passes prediction_id back to us ──
    if (body.prediction_id) {
      const result = await pollFFmpegOnce(body.prediction_id)
      if (result.status === "complete" && result.url) {
        const persisted = await persistStitched(supabase, result.url, body.submission_id)
        return new Response(
          JSON.stringify({
            status: "complete",
            stitched_url: persisted.stitched_url,
            stitched_path: persisted.stitched_path,
            duration_seconds: (body.clip_count || 0) * 5,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
      if (result.status === "failed") {
        return new Response(
          JSON.stringify({ status: "failed", error: result.error }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
      }
      return new Response(
        JSON.stringify({ status: "processing", prediction_id: body.prediction_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ── START MODE: kick off the FFmpeg prediction ──
    console.log("[stitch] start payload:", {
      clip_count: body.clip_urls?.length,
      has_listing: !!body.listing,
    })

    if (!body.clip_urls?.length) throw new Error("clip_urls array is required and must not be empty")
    if (!body.listing) throw new Error("listing metadata is required")

    const start = await startFFmpegStitch(body.clip_urls, body.listing)

    // Synchronous success — Replicate finished within wait=60 window
    if (start.videoUrl) {
      const persisted = await persistStitched(supabase, start.videoUrl, body.submission_id)
      return new Response(
        JSON.stringify({
          status: "complete",
          stitched_url: persisted.stitched_url,
          stitched_path: persisted.stitched_path,
          duration_seconds: body.clip_urls.length * 5,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Async path — return prediction_id, client polls
    return new Response(
      JSON.stringify({
        status: "processing",
        prediction_id: start.predictionId,
        clip_count: body.clip_urls.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    const errorMsg = (err as Error).message || String(err)
    const errorStack = (err as Error).stack || ""
    console.error("[stitch] FAILED:", errorMsg)
    console.error("[stitch] STACK:", errorStack.slice(0, 500))

    return new Response(
      JSON.stringify({
        error: errorMsg,
        debug: { clip_count: body.clip_urls?.length, stack: errorStack.slice(0, 300) },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
