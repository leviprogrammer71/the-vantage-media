import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

const REPLICATE = "https://api.replicate.com/v1"
const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions"

// ── Image format guard ────────────────────────────────────────────────────
const ACCEPTED_VISION_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
])

async function validateImageUrl(url: string): Promise<{ url: string; mime: string }> {
  // HEAD first to grab content-type without downloading the whole file
  let mime = "unknown"
  try {
    const head = await fetch(url, { method: "HEAD" })
    if (head.ok) {
      mime = (head.headers.get("content-type") || "").split(";")[0].trim().toLowerCase()
    }
  } catch (_) {}

  if (!ACCEPTED_VISION_MIMES.has(mime)) {
    // Fall back to a byte sniff in case the server lies about content-type
    try {
      const get = await fetch(url)
      const buf = new Uint8Array(await get.arrayBuffer().then(b => b.slice(0, 32)))
      const head = String.fromCharCode(...buf)
      if (head.includes("ftyp") && (head.includes("heic") || head.includes("heix") || head.includes("mif1"))) {
        throw new Error(
          `This photo is in HEIC format, which AI models don't support. Open the photo in iPhone Photos, tap Edit → Done (this re-saves as JPEG), then re-upload. Or change iPhone Settings → Camera → Formats → "Most Compatible".`
        )
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("HEIC")) throw e
    }
    throw new Error(
      `Image format "${mime}" is not supported. Please re-upload as JPEG, PNG, or WebP.`
    )
  }
  return { url, mime: mime === "image/jpg" ? "image/jpeg" : mime }
}

// ── Replicate helpers ─────────────────────────────────────────────────────
async function pollReplicate(predictionId: string, maxAttempts = 90): Promise<unknown> {
  const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const res = await fetch(`${REPLICATE}/predictions/${predictionId}`, {
      headers: { Authorization: `Token ${TOKEN}` },
    })
    const data = await res.json()
    if (data.status === "succeeded") return data.output
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(data.error || "Replicate prediction failed")
    }
  }
  throw new Error("Replicate prediction timed out")
}

function extractFirstUrl(output: unknown): string {
  if (typeof output === "string") return output
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0]
    if (typeof first === "string") return first
    // Replicate sometimes returns objects with a url() function or .url property
    if (typeof first === "object" && first !== null) {
      const obj = first as Record<string, unknown>
      if (typeof obj.url === "string") return obj.url
    }
  }
  if (typeof output === "object" && output !== null) {
    const obj = output as Record<string, unknown>
    if (typeof obj.url === "string") return obj.url
  }
  throw new Error(`Could not extract URL from output: ${JSON.stringify(output).slice(0, 200)}`)
}

/**
 * Map any user-requested aspect ratio to one gpt-image-2 actually accepts.
 * gpt-image-2 only supports "1:1", "3:2", "2:3".
 */
function mapToGptImage2Ratio(requested: string): "1:1" | "3:2" | "2:3" {
  const r = (requested || "").trim()
  // Portrait → 2:3
  if (["9:16", "4:5", "2:3", "3:4", "9:18"].includes(r)) return "2:3"
  // Square
  if (r === "1:1") return "1:1"
  // Landscape → 3:2
  if (["16:9", "3:2", "4:3", "21:9"].includes(r)) return "3:2"
  // Default safe fallback for unknown — vertical, since most listing reels are 9:16
  return "2:3"
}

/**
 * Run openai/gpt-image-2 on Replicate.
 * Takes a textual prompt + an input image and produces an edited WebP image.
 */
async function runGptImage2(
  token: string,
  prompt: string,
  inputImageUrl: string,
  aspectRatio: string = "9:16"
): Promise<string> {
  const validRatio = mapToGptImage2Ratio(aspectRatio)
  console.log(`[runGptImage2] requested=${aspectRatio} mapped=${validRatio}`)

  // Force JPEG output — Kling 2.5 and Seedance 2.0 reject webp inputs ("mime type image/webp is not supported").
  // We'd rather pay the small quality hit than break the entire pipeline downstream.
  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: validRatio,
    input_images: [inputImageUrl],
    output_format: "jpg",
  }

  const res = await fetch(`${REPLICATE}/models/openai/gpt-image-2/predictions`, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({ input }),
  })

  const prediction = await res.json()
  if (!res.ok || !prediction.id) {
    throw new Error(`gpt-image-2 failed to start: ${JSON.stringify(prediction).slice(0, 400)}`)
  }

  if (prediction.status === "succeeded" && prediction.output) {
    return extractFirstUrl(prediction.output)
  }

  // Otherwise poll until done
  const output = await pollReplicate(prediction.id)
  return extractFirstUrl(output)
}

// ── Templated BEFORE prompts (tight, decisive, model-friendly) ────────────
// Rule of thumb: <120 words, one core directive, one preservation directive,
// one lighting directive. Let the model interpret rather than over-describing.
function buildBeforePrompt(category: string, transformationType: string): string {
  const lock = `Lock the camera angle, the framing, the sky, neighbouring structures, and lighting direction to match the source photo. Photorealistic. Slightly desaturated. Flat midday light. Output a single still image.`

  if (category === "cleanup") {
    return `Show this exact same space BEFORE the cleanup — heavily neglected. Add patchy dead grass, weeds along every edge, leaves and debris drifting across 60% of the ground, dirt in paving joints, moss on shaded surfaces, cobwebs in corners, and a few abandoned objects (a broken pot against the fence, a rusted tool, scattered bricks) — distributed naturally, never piled. Keep all permanent structures, fences, established trees, and the building shell exactly as they appear. Remove only the finish and cleanliness. The before must read as hopeless, so the after lands as a miracle. ${lock}

Project type: ${transformationType}.`
  }

  if (category === "setup") {
    return `Show this exact same space BEFORE the setup — completely empty. Remove every placed element: furniture, tables, chairs, linens, centrepieces, decor, styling props, hung artwork, draping, planters, candles, serveware, and any added lighting. Show bare floors, bare walls, and the raw architectural shell. Keep all permanent structure: walls, ceilings, floors, fixed cabinetry, doors, windows, the building itself, and any neighbouring structures. The before must read as utterly empty so the dressed after feels transformed. ${lock}

Project type: ${transformationType}.`
  }

  // Default: construction
  return `Show this exact location BEFORE any construction. Remove every built or finished element installed by this project: walls, decking, paving, retaining walls, fences, pools, outdoor kitchens, sheds, landscaping, plants, lawn, mulch, lighting, hardscape. Replace with the raw pre-build ground: bare earth, cracked clay, churned mud, dead grass tufts, scattered rubble, demolition debris, and one or two authentic site details (a survey peg, a pile of broken concrete, a portaloo in the corner, temporary fencing). Keep only the camera angle, neighbouring background structures, trees on adjacent properties, and the sky. ${lock}

Project type: ${transformationType}.`
}

// ── Templated VIDEO prompts (tight, decisive) ────────────────────────────
// Goal: ~90 words, three beats: (1) what physically happens, (2) how the
// camera moves, (3) the final landing. Avoid stacked adjectives; the video
// model gets confused when the prompt over-prescribes.
function buildVideoPrompt(opts: {
  category: string
  transformationType: string
  buildType: string
  motionStyle: string
  shotType: string
  description: string
}): string {
  const { category, transformationType, buildType, motionStyle, shotType, description } = opts

  const camera: Record<string, string> = {
    slow_push: "Camera dollies forward slowly at constant speed, framing widens to reveal the finished space.",
    drone_orbit: "Aerial drone orbits 60° around the subject in a smooth arc at elevated angle.",
    parallax_pan: "Camera slides left to right at a constant rate; foreground drifts faster than background for depth.",
    reveal_rise: "Camera rises from low to eye height in one smooth move, revealing the space.",
    architectural: "Camera moves on a perfectly horizontal slider, no rotation, showcasing architectural lines.",
    establishing: "Camera pulls back smoothly from a tight composition to a wide establishing shot.",
  }

  const action: Record<string, string> = {
    cleanup: `Named cleanup workers physically remove every piece of mess from the start frame — bagging debris, dragging it out, sweeping. Nothing vanishes on its own; each item is carried by a worker until the space is clean.`,
    setup: `Named stylists physically place every element of the finished setup — carrying tables, billowing linen down, setting centrepieces stem by stem, lighting candles, hanging string lights. Each item arrives in a worker's hands.`,
    construction: buildType === "diy"
      ? `Owner-builder hands always in frame — measuring, cutting, fastening, assembling. The build happens in their hands, one motion at a time.`
      : buildType === "full_build"
      ? `Named construction crew with a lead operator and named excavator physically build the transformation. Workers brace before lifts, machines rock as buckets bite ground, materials settle under gravity.`
      : `Named trade workers physically build the transformation. They lean into heavy work, boots leave prints, materials fall and stack with weight.`,
  }

  const tempo: Record<string, string> = {
    dramatic_push: "Energy is urgent. Quick rhythmic cuts every 1.5s.",
    fast_progression: "Time-compressed. Aggressive cuts every 1.5–2s.",
    slow_reveal: "Half-speed, long takes, deliberate and calm.",
    cinematic_orbit: "Slow arc with shallow depth of field and premium energy.",
  }

  const move = camera[shotType] || camera.slow_push
  const phys = action[category] || action.construction
  const pace = tempo[motionStyle] || tempo.slow_reveal

  return `${phys}

${move} ${pace}

Every change is physically caused — water flows downward from a visible source, loose materials fall and settle on impact, shadows track the sun. Final beat: workers step back, camera settles on warm light over the finished composition.

Type: ${transformationType}.${description ? ` Context: ${description}.` : ""}`.trim()
}

// ── Optional: GPT-4o text-only refinement (no images sent) ────────────────
async function refineVideoPromptIfPossible(base: string): Promise<string> {
  const KEY = Deno.env.get("OPENROUTER_API_KEY")
  if (!KEY) return base

  try {
    const res = await fetch(OPENROUTER, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://the-vantage-media.vercel.app",
        "X-Title": "The Vantage",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You polish video generation prompts for Kling 2.5 Turbo Pro and ByteDance Seedance Pro 1.0. Tighten the writing, preserve every camera move and physics rule, output ONLY the polished prompt, 100–130 words maximum, no preamble.",
          },
          { role: "user", content: base },
        ],
        max_tokens: 400,
        temperature: 0.5,
      }),
    })
    if (!res.ok) return base
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim()
    return text && text.length > 60 ? text : base
  } catch (_) {
    return base
  }
}

// ── Main handler ──────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const REPLICATE_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")
  if (!REPLICATE_TOKEN) {
    return new Response(JSON.stringify({ error: "REPLICATE_API_TOKEN not set" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  let submissionId: string | undefined

  try {
    const body = await req.json()
    const isDirect = Boolean(body.generate_before && body.after_photo_url)

    // ── DIRECT MODE ──
    if (isDirect) {
      const afterUrlRaw = body.after_photo_url
      const transformationType = body.transformation_type || "general"
      const buildType = body.build_type || "team_build"
      const motionStyle = body.motion_style || "slow_reveal"
      const description = body.description || ""
      const category = body.transformation_category || "construction"
      const shotType = body.shot_type || "slow_push"
      const aspectRatio = (body.aspect_ratio || "9:16") as string

      console.log(`[direct] start category=${category} type=${transformationType} shot=${shotType}`)

      // 1. Validate image format
      const { url: afterUrl } = await validateImageUrl(afterUrlRaw)

      // 2. Build templated before prompt
      const beforePrompt = buildBeforePrompt(category, transformationType)
      console.log(`[direct] beforePrompt=${beforePrompt.length} chars`)

      // 3. Generate before image with gpt-image-2
      console.log("[direct] calling Replicate openai/gpt-image-2")
      const beforeImageUrl = await runGptImage2(REPLICATE_TOKEN, beforePrompt, afterUrl, aspectRatio)
      console.log(`[direct] before image ready: ${beforeImageUrl.slice(0, 80)}`)

      // 4. Build templated video prompt
      const videoPromptBase = buildVideoPrompt({
        category, transformationType, buildType, motionStyle, shotType, description,
      })

      // 5. Optional GPT-4o text-only polish (no images)
      const videoPrompt = await refineVideoPromptIfPossible(videoPromptBase)
      console.log(`[direct] videoPrompt=${videoPrompt.length} chars`)

      // 6. If a submission_id was passed, PERSIST the before image to storage and
      // update the submissions row. Without this, the gallery shows "No before image"
      // because the AI-generated before never gets a stable storage path.
      let persistedBeforePath: string | null = null
      if (body.submission_id) {
        try {
          const beforeFetch = await fetch(beforeImageUrl)
          const beforeBuffer = await beforeFetch.arrayBuffer()
          const beforePath = `${body.submission_id}/generated/before.jpg`
          await supabase.storage
            .from("project-submissions")
            .upload(beforePath, beforeBuffer, {
              contentType: "image/jpeg",
              upsert: true,
            })
          persistedBeforePath = beforePath
          await supabase
            .from("submissions")
            .update({
              generated_before_image_path: beforePath,
              scene_analysis_prompt: beforePrompt,
              generated_video_prompt: videoPrompt,
              prompt_status: "ready",
              shot_type: shotType,
            })
            .eq("id", body.submission_id)
          console.log(`[direct] persisted before to ${beforePath} + updated submission row`)
        } catch (persistErr) {
          console.error("[direct] failed to persist before image:", persistErr)
          // Non-fatal — return the URL anyway, frontend still works for this generation
        }
      }

      return new Response(
        JSON.stringify({
          before_image_url: beforeImageUrl,
          before_image_path: persistedBeforePath,
          video_prompt: videoPrompt,
          flux_prompt: beforePrompt, // kept for backward compatibility w/ frontend
          shot_type: shotType,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // ── SUBMISSION MODE ──
    submissionId = body.submission_id
    const {
      after_photo_paths,
      transformation_type,
      transformation_category: bodyCategory,
      build_type: bodyBuildType,
      video_style,
      project_description,
      shot_type: bodyShotType,
    } = body

    if (!submissionId) throw new Error("submission_id required")
    if (!after_photo_paths?.length) throw new Error("at least one after photo path required")

    const buildType = bodyBuildType || "team_build"
    const category = bodyCategory || "construction"
    const motionStyle = video_style || "slow_reveal"
    const shotType = bodyShotType || "slow_push"

    // Sign after photo URL
    const { data: signed, error: signErr } = await supabase.storage
      .from("project-submissions")
      .createSignedUrl(after_photo_paths[0], 3600)

    if (signErr || !signed?.signedUrl) throw new Error("Could not sign after photo URL")

    const { url: afterUrl } = await validateImageUrl(signed.signedUrl)

    // Generate before image
    const beforePrompt = buildBeforePrompt(category, transformation_type || "")
    const beforeImageUrl = await runGptImage2(REPLICATE_TOKEN, beforePrompt, afterUrl, "9:16")

    // Persist before image into the submissions bucket
    const beforeFetch = await fetch(beforeImageUrl)
    const beforeBuffer = await beforeFetch.arrayBuffer()
    const beforePath = `${submissionId}/generated/before.jpg`

    await supabase.storage
      .from("project-submissions")
      .upload(beforePath, beforeBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      })

    // Build + polish video prompt
    const videoPromptBase = buildVideoPrompt({
      category,
      transformationType: transformation_type || "",
      buildType,
      motionStyle,
      shotType,
      description: project_description || "",
    })
    const videoPrompt = await refineVideoPromptIfPossible(videoPromptBase)

    await supabase
      .from("submissions")
      .update({
        generated_before_image_path: beforePath,
        scene_analysis_prompt: beforePrompt,
        generated_video_prompt: videoPrompt,
        prompt_status: "ready",
        shot_type: shotType,
      })
      .eq("id", submissionId)

    return new Response(
      JSON.stringify({
        submission_id: submissionId,
        before_image_path: beforePath,
        flux_prompt: beforePrompt,
        video_prompt: videoPrompt,
        status: "ready",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    const errorMsg = (err as Error).message || String(err)
    console.error(`[analyze-submission] ERROR: ${errorMsg}`)

    if (submissionId) {
      try {
        await supabase
          .from("submissions")
          .update({ prompt_status: "error", prompt_error: errorMsg })
          .eq("id", submissionId)
      } catch (_) {}
    }

    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
