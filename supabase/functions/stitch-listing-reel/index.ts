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

// Build FFmpeg drawtext filter for text overlay
// Font fallback: uses system default if fontfile unavailable
function buildDrawtextFilter(
  listing: ListingMetadata,
  videoWidth: number = 1080,
  videoHeight: number = 1920
): string {
  const fontsize = Math.floor(videoHeight / 30) // Scale font to video height
  const smallFontsize = Math.floor(videoHeight / 50)
  const largeFontsize = Math.floor(videoHeight / 20)

  const filters: string[] = []

  // Top-left: LOCATION (small, uppercase, white, slight opacity)
  if (listing.location) {
    const locationText = listing.location.toUpperCase()
    filters.push(
      `drawtext=text='${locationText}':fontsize=${smallFontsize}:fontcolor=white@0.8:x=20:y=20:shadowx=2:shadowy=2:shadowcolor=black@0.5`
    )
  }

  // Bottom-left: PRICE (large, white, drop shadow) — only if show_price
  if (listing.show_price && listing.price) {
    const priceText = `$${listing.price.toLocaleString()}`
    filters.push(
      `drawtext=text='${priceText}':fontsize=${largeFontsize}:fontcolor=white:x=20:y=${videoHeight - largeFontsize - 60}:shadowx=2:shadowy=2:shadowcolor=black`
    )
  }

  // Bottom-right: REALTOR_NAME + BROKERAGE (small, uppercase, white)
  if (listing.realtor_name) {
    const realtorText = listing.realtor_name.toUpperCase()
    const brokText = listing.brokerage ? `${listing.brokerage}`.toUpperCase() : ""

    // Realtor name
    filters.push(
      `drawtext=text='${realtorText}':fontsize=${smallFontsize}:fontcolor=white:x=${videoWidth - 200}:y=${videoHeight - smallFontsize * 2 - 80}:shadowx=1:shadowy=1:shadowcolor=black@0.5`
    )

    // Brokerage below realtor (if present)
    if (brokText) {
      filters.push(
        `drawtext=text='${brokText}':fontsize=${smallFontsize - 4}:fontcolor=white:x=${videoWidth - 200}:y=${videoHeight - smallFontsize - 40}:shadowx=1:shadowy=1:shadowcolor=black@0.5`
      )
    }
  }

  // Bottom-right corner watermark: "AI · THE VANTAGE" (very small, 0.5 opacity)
  filters.push(
    `drawtext=text='AI · THE VANTAGE':fontsize=${smallFontsize - 8}:fontcolor=white@0.5:x=${videoWidth - 160}:y=${videoHeight - 20}`
  )

  return filters.join(",")
}

// Poll Replicate until prediction completes
async function pollReplicateFFmpeg(
  predictionId: string,
  maxAttempts: number = 120
): Promise<string> {
  const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 4000))
    const res = await fetch(`${REPLICATE}/predictions/${predictionId}`, {
      headers: { Authorization: `Token ${TOKEN}` },
    })
    const data = await res.json()

    if (data.status === "succeeded") {
      // FFmpeg API returns output as a string URL or array
      if (typeof data.output === "string") return data.output
      if (Array.isArray(data.output) && data.output.length > 0) return data.output[0]
      throw new Error("FFmpeg succeeded but returned no URL")
    }

    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(data.error || "FFmpeg prediction failed")
    }
  }
  throw new Error("FFmpeg prediction timed out (exceeded 8 minutes)")
}

// Main stitch function
async function stitchClips(
  clipUrls: string[],
  listing: ListingMetadata,
  watermark: boolean = true
): Promise<{ stitched_url: string; duration_seconds: number }> {
  const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
  if (!TOKEN) {
    throw new Error("Missing REPLICATE_API_TOKEN")
  }

  if (!clipUrls || clipUrls.length === 0) {
    throw new Error("No clip URLs provided")
  }

  // For simplicity: assume all clips have matching codecs (H.264, yuv420p)
  // If they vary, FFmpeg will re-encode with the concat filter.
  // Build the concat demuxer command:
  // ffmpeg -i clip1.mp4 -i clip2.mp4 ... -filter_complex "[0:v][0:a][1:v][1:a]concat=n=N:v=1:a=1[outv][outa]" -map "[outv]" -map "[outa]" -c:v libx264 -c:a aac output.mp4

  const concatInputs = clipUrls.map((_, i) => `-i ${clipUrls[i]}`).join(" ")
  const numClips = clipUrls.length

  // Build concat filter chain: [0:v][0:a][1:v][1:a]...[n-1:v][n-1:a]concat=n=N:v=1:a=1[outv][outa]
  let concatChain = ""
  for (let i = 0; i < numClips; i++) {
    concatChain += `[${i}:v][${i}:a]`
  }
  concatChain += `concat=n=${numClips}:v=1:a=1[outv][outa]`

  // Build text overlay filter (drawtext)
  const textFilter = buildDrawtextFilter(listing, 1080, 1920)

  // Combine: concat → drawtext → H.264 encode
  const filterComplex = `${concatChain};[outv]${textFilter}[final]`

  // Full FFmpeg command for stitching with text overlays
  // Output: 1080p vertical, H.264, yuv420p, AAC audio
  const ffmpegCommand = `${concatInputs} -filter_complex "${filterComplex}" -map "[final]" -map "[outa]" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k -s 1080x1920 -aspect 9:16 output.mp4`

  console.log("[stitch-listing-reel] FFmpeg command:", ffmpegCommand.slice(0, 200) + "...")

  // Call Replicate's FFmpeg API
  const res = await fetch(`${REPLICATE}/models/${MODEL_FFMPEG}/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Token ${TOKEN}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({
      input: {
        media_files: clipUrls,
        command: ffmpegCommand,
      },
    }),
  })

  const prediction = await res.json()

  if (!res.ok || !prediction.id) {
    const detail = prediction?.detail || prediction?.error?.message || JSON.stringify(prediction).slice(0, 400)
    console.error("[stitch-listing-reel] FFmpeg API rejected:", detail)
    throw new Error(`FFmpeg API rejected (HTTP ${res.status}): ${detail}`)
  }

  console.log("[stitch-listing-reel] Prediction ID:", prediction.id)

  let stitchedUrl: string | null = null

  // Check if synchronous completion
  if (prediction.status === "succeeded" && prediction.output) {
    stitchedUrl = typeof prediction.output === "string" ? prediction.output : prediction.output[0]
    console.log("[stitch-listing-reel] Sync success, URL:", stitchedUrl?.slice(0, 80))
  } else {
    // Poll until completion
    console.log("[stitch-listing-reel] Polling for completion...")
    stitchedUrl = await pollReplicateFFmpeg(prediction.id)
  }

  if (!stitchedUrl) {
    throw new Error("FFmpeg stitching returned no URL")
  }

  // Estimate duration: 5s per clip
  const estimatedDuration = clipUrls.length * 5

  return { stitched_url: stitchedUrl, duration_seconds: estimatedDuration }
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

  let body: StitchRequest = {} as StitchRequest
  try {
    body = await req.json()
    console.log("[stitch-listing-reel] payload:", {
      clip_count: body.clip_urls?.length,
      listing: body.listing ? { location: body.listing.location, show_price: body.listing.show_price } : null,
      watermark: body.watermark,
    })

    // Validate
    if (!body.clip_urls || body.clip_urls.length === 0) {
      throw new Error("clip_urls array is required and must not be empty")
    }

    if (!body.listing) {
      throw new Error("listing metadata is required")
    }

    // Verify all clip URLs are reachable
    for (let i = 0; i < body.clip_urls.length; i++) {
      try {
        const head = await fetch(body.clip_urls[i], { method: "HEAD" })
        if (!head.ok) {
          throw new Error(`Clip ${i} returned HTTP ${head.status}`)
        }
      } catch (fetchErr) {
        throw new Error(`Clip URL ${i} unreachable: ${(fetchErr as Error).message}`)
      }
    }

    // Stitch the clips with text overlays
    const { stitched_url, duration_seconds } = await stitchClips(
      body.clip_urls,
      body.listing,
      body.watermark !== false
    )

    // Download stitched video and upload to Supabase storage
    console.log("[stitch-listing-reel] Downloading stitched video...")
    const stitchedFetch = await fetch(stitched_url)
    if (!stitchedFetch.ok) {
      throw new Error(`Failed to download stitched video: HTTP ${stitchedFetch.status}`)
    }
    const stitchedBuffer = await stitchedFetch.arrayBuffer()

    const stitchedPath = `listing-videos/${Date.now()}/stitched.mp4`
    console.log("[stitch-listing-reel] Uploading to Supabase at:", stitchedPath)

    await supabase.storage
      .from("project-submissions")
      .upload(stitchedPath, stitchedBuffer, {
        contentType: "video/mp4",
        upsert: true,
      })

    // Get signed URL for the stitched video
    const { data: urlData, error: signedUrlError } = await supabase.storage
      .from("project-submissions")
      .createSignedUrl(stitchedPath, 604800) // 7 days

    if (signedUrlError || !urlData?.signedUrl) {
      throw new Error(`Failed to create signed URL: ${signedUrlError?.message}`)
    }

    const stitchedSignedUrl = urlData.signedUrl

    // If submission_id provided, update the submission record
    if (body.submission_id) {
      try {
        await supabase
          .from("submissions")
          .update({
            output_video_url: stitchedSignedUrl,
            output_video_path: stitchedPath,
          })
          .eq("id", body.submission_id)
        console.log("[stitch-listing-reel] Updated submission:", body.submission_id)
      } catch (updateErr) {
        console.error("[stitch-listing-reel] Failed to update submission (non-fatal):", updateErr)
      }
    }

    const response: StitchResponse = {
      stitched_url: stitchedSignedUrl,
      stitched_path: stitchedPath,
      duration_seconds,
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    const errorMsg = (err as Error).message || String(err)
    const errorStack = (err as Error).stack || ""
    console.error("[stitch-listing-reel] FAILED:", errorMsg)
    console.error("[stitch-listing-reel] STACK:", errorStack.slice(0, 500))

    return new Response(
      JSON.stringify({
        error: errorMsg,
        debug: {
          clip_count: body.clip_urls?.length,
          stack: errorStack.slice(0, 300),
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
