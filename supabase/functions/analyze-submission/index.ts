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
 * Run openai/gpt-image-2 on Replicate.
 * Takes a textual prompt + an input image and produces an edited WebP image.
 */
async function runGptImage2(
  token: string,
  prompt: string,
  inputImageUrl: string,
  aspectRatio: "9:16" | "16:9" | "1:1" | "4:5" | "3:2" = "9:16"
): Promise<string> {
  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    input_images: [inputImageUrl],
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

// ── Templated BEFORE prompts (deterministic, no GPT-4o needed) ────────────
function buildBeforePrompt(category: string, transformationType: string): string {
  const baseClose = ` Pull perspective back 10–15% to show more sky and surrounding context. Keep the camera angle, neighbouring permanent structures, sky, and lighting direction identical. Photorealistic. Harsh flat midday light. Slightly desaturated. Output a single still image.`

  if (category === "cleanup") {
    return `Transform this finished after photo to show the same exact space BEFORE the cleanup. The space is heavily neglected and cluttered.
Add naturally distributed signs of long neglect across the entire scene: dead and dying patchy grass spread across all ground; weeds growing along every fence line, wall edge, and hard-surface seam; fallen leaves and small debris scattered across roughly 60–70% of the ground with slight accumulation in corners and against boundaries; dirt, mud and grime built into all paving joints; oil staining where vehicles or equipment sat; moss on shaded hard surfaces; cobwebs in upper corners; dust on every horizontal surface.
Add a few authentic abandoned items distributed across the space — never piled in one spot: a broken terracotta pot against one fence, a rusted tool leaning at the edge, scattered fasteners, broken bricks. Keep ALL permanent structures (buildings, fences, neighbouring walls, established trees) exactly the same. Remove only the cleanliness and finish.
The before must feel hopelessly neglected so the after feels miraculous.${baseClose}`
  }

  if (category === "setup") {
    return `Transform this finished after photo to show the same exact space BEFORE the setup project. Remove every single placed element: all furniture (tables, chairs, lounges, umbrellas), all decor and styling, all centerpieces, all linens and table settings, all decorative plants in pots, all installed lighting fixtures, all hung artwork, all curtains/draping, all serveware. Show the empty raw space — bare floors or ground, empty walls, no decoration whatsoever.
Keep ALL permanent structural elements: walls, ceilings, floors, doors, windows, built-in joinery, fixed cabinetry, the building shell itself, and any neighbouring structures. The space should feel completely unfurnished and unstyled — exactly as it was before any setup arrived.
The before must feel utterly empty so the dressed after feels transformed.${baseClose}`
  }

  // Default: construction
  return `Transform this finished after photo to show the same exact location BEFORE any construction began. Remove EVERY built or finished element: all structures, walls, decking, paving, retaining walls, fencing built by this project, pools, water features, outdoor kitchens, sheds, all landscaping (plants, lawn, mulch, garden beds), all installed lighting, all hardscape.
Replace with raw pre-construction ground state: bare compacted earth, cracked dry clay soil, churned mud, patchy dead grass tufts, scattered builder's rubble, and demolition debris. Add a few authentic pre-construction details — a survey peg, a pile of broken concrete, a portaloo in the corner, temporary site fencing.
Keep ONLY the camera angle, the surrounding background structures (neighbouring buildings, trees on adjacent properties, sky), and the basic spatial proportions. The before must look like an empty hopeless lot before anything was built.${baseClose}

Transformation type: ${transformationType}`
}

// ── Templated VIDEO prompts (deterministic, but GPT-4o can refine if available) ────
function buildVideoPrompt(opts: {
  category: string
  transformationType: string
  buildType: string
  motionStyle: string
  shotType: string
  description: string
}): string {
  const { category, transformationType, buildType, motionStyle, shotType, description } = opts

  const shotHint: Record<string, string> = {
    slow_push: "The camera dollies slowly forward into the scene at constant speed, framing widens to fully reveal the finished composition.",
    drone_orbit: "An aerial drone orbits 60° around the subject in a slow smooth arc at elevated angle, showing depth and scale.",
    parallax_pan: "The camera pans laterally left to right at a slow constant rate, foreground elements drift faster than background, producing cinematic depth.",
    reveal_rise: "The camera rises vertically from low ground level to eye height in one smooth move, gradually revealing the finished space.",
    architectural: "The camera moves on a perfectly horizontal slider, no rotation, showcasing the linear architecture of the space.",
    establishing: "The camera pulls back smoothly from a tight composition to a wide establishing shot, revealing context and surroundings.",
  }

  const camera = shotHint[shotType] || shotHint.slow_push

  const intros: Record<string, string> = {
    cleanup: `Named cleanup workers physically clear and bag every piece of mess and debris in the start frame, dragging full bags out the door, sweeping the floor, revealing the clean finished space of the end frame. Each removed item is carried by a named worker — nothing disappears on its own.`,
    setup: `Named event stylists physically place every piece of the finished setup — carrying tables and locking the legs into place, billowing fresh linen down over surfaces, placing centrepieces stem by stem, lighting candles, threading string lights overhead. Each placed item is positioned by a named worker — nothing appears on its own.`,
    construction: `Named ${buildType === "diy" ? "owner-builder" : buildType === "full_build" ? "construction crew with a lead operator and named excavator" : "trade workers in named roles"} physically build the transformation between the start and end frames. ${buildType === "diy" ? "Hands always in frame, close shots of one person measuring, cutting, fixing." : "Workers lean into heavy work, boots leave prints, machines rock as buckets bite ground, materials settle under gravity."}`,
  }

  const intro = intros[category] || intros.construction

  const motionLabel: Record<string, string> = {
    dramatic_push: "Cuts feel urgent and energetic with quick rhythmic edits.",
    slow_reveal: "The take is long and confident, the camera moves at half speed, deliberate and calm.",
    fast_progression: "Cuts compress time aggressively every 1.5–2 seconds.",
    cinematic_orbit: "Slow arc with shallow depth of field and premium energy.",
  }

  const motion = motionLabel[motionStyle] || motionLabel.slow_reveal

  return `${intro}

${camera} ${motion}

The transformation feels physically caused — every change in the scene is the visible result of a named worker, machine, tool, or hand. Water flows downward from a clear source. Loose materials fall and spread on impact. Workers brace before lifts. Shadows stay consistent with sun direction.

Final beat: workers step back. Camera settles. Warm light on the finished composition.

Transformation type: ${transformationType}. ${description ? `Project context: ${description}.` : ""}`.trim()
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
      const aspectRatio = (body.aspect_ratio || "9:16") as "9:16" | "16:9" | "1:1" | "4:5" | "3:2"

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

      return new Response(
        JSON.stringify({
          before_image_url: beforeImageUrl,
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
    const beforePath = `${submissionId}/generated/before.webp`

    await supabase.storage
      .from("project-submissions")
      .upload(beforePath, beforeBuffer, {
        contentType: "image/webp",
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
