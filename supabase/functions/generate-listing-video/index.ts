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

// ── Model registry ──
// Replicate model slugs. Centralised so we can swap a model in one place.
// Seedance 2.0 ("seedance-1-pro" is ByteDance's current Seedance Pro release on
// Replicate; the marketing name is Seedance 2.0).
const MODEL_KLING = "kwaivgi/kling-v2.5-turbo-pro"
const MODEL_SEEDANCE = "bytedance/seedance-1-pro"

// Force Seedance 2.0 for every clip. Quality over snap — users complained about
// Kling output and we standardise on the higher-quality model.
const LONG_FORM_THRESHOLD_SECONDS = 0

// ── KLING NEGATIVE PROMPT (research-validated) ──
// Kling 2.5 Turbo Pro HONORS the negative_prompt API field. Seedance 2.0 does
// NOT — its docs literally state "negative prompts do not work" so we never
// send them to Seedance. This single stack is the documented community-tested
// recipe from VEED, Ambience AI, and klingaio.com, plus real-estate-specific
// occupancy + geometry-drift terms.
const KLING_NEGATIVE_PROMPT =
  // Community-tested anti-defect stack
  "motion blur, compression artifacts, pixelation, jittery movement, " +
  "low quality, watermark, text overlay, morphing faces, smooth plastic skin, " +
  "sliding feet, text morphing, 3D render, cartoonish, " +
  // Drone hallucinations — Seedance + Kling both interpret "aerial" /
  // "drone" motion hints by adding an actual drone object in the sky.
  // Real-estate users hate this. Explicit negatives keep the camera HIGH
  // without putting a flying object in the frame.
  "drone visible in frame, flying drone, quadcopter, hovering drone, aircraft, helicopter, airplane, " +
  // Anti-plastic stack (Civitai / Stable-Diffusion community-validated terms
  // — collected from architectural + interior prompt corpora)
  "airbrushed blur, over-smoothing, AI smoothing, doll-like finish, " +
  "invented distortion, CGI look, stylization, plastic surface sheen, " +
  // Sky / surface defects
  "banded skies, impossible reflections, blown-out highlights, " +
  // Real-estate-specific occupancy (must stay empty)
  "people, humans, person, figures, hands, faces, body parts, " +
  "children, occupants, agents, realtors, homeowners, visitors, " +
  "shadows of people, human silhouettes, reflection of person in window or mirror, " +
  // Geometry stability for architectural shots
  "morphing geometry, warping walls, drifting perspective, invented rooms, " +
  "changed furniture, added animals, pets, weather changes, fish-eye distortion, " +
  // Frame-level defects
  "duplicated surfaces, ghost trails, flickering, frame drops, frozen frames"

// ── NAMED MATERIAL VOCABULARY (with light-interaction phrases) ──
// Each entry pairs the named material with the SPECIFIC way light interacts
// with it. Research finding: community-validated anti-plastic prompts ALWAYS
// stack material + light-interaction as a single phrase ("warm spotlight
// reflecting off wet paint surfaces", "raking light catching every vein of
// the Calacatta marble"). Material name alone is half the lift; the
// light-behavior verb is the other half. This atomic unit travels into the
// prompt as one coherent token and addresses plastic AI sheen at the same
// time it anchors morph-resistance.
const NAMED_MATERIALS = {
  // Stone
  marble_white: "honed Carrara marble with mineral veining and surface micro-pitting, raking sunlight catching every vein as the camera passes",
  marble_dark: "ink-veined Calacatta with cool grey threads on a milky base, directional light revealing the veining as one continuous pattern",
  travertine: "honed travertine with natural pitting and warm cream tones, warm afternoon light grazing across the textured surface",
  limestone: "honed limestone with subtle fossil texture, soft daylight pooling evenly across the uniform cool grey",
  concrete: "honed concrete with hairline seams, grazing light reading every micro-bevel along the matte surface",
  granite: "leathered granite with tactile mineral grain, low-angle light catching the matte specular response",
  // Wood
  oak_white: "wide-plank white oak with grain figuration and a matte oil finish, warm directional light pulling focus along the grain",
  oak_european: "European oak floor with matte oil finish, motivated daylight raking across the long-grain figuration",
  walnut: "walnut with figured grain and an oiled finish, warm key light bringing out the depth of the figure",
  teak: "teak with tight straight grain and warm honeyed tone, raking sunlight catching the sheen on each board",
  reclaimed_pine: "reclaimed pine with knots and nail holes, soft side-light revealing the satin patina",
  cedar: "vertical-grain cedar with natural color variation, warm afternoon light raking across the matte oiled finish",
  // Metal
  brass_unlacquered: "unlacquered brass with pull-up patina, warm directional light catching the satin sheen on contact areas",
  brass_satin: "satin-brushed brass with directional grain, raking light revealing the brushwork striations",
  steel_brushed: "brushed stainless steel with fine directional grain, cool ambient light catching the anisotropic reflection",
  iron_matte: "matte black powder-coated iron, grazing light reading the subtle surface texture",
  copper_aged: "aged copper with hand-rubbed patina, warm side-light bringing out the verdigris in the seams",
  // Fabric
  leather_full_grain: "full-grain leather with natural creasing and pull-up patina, soft directional light catching the subtle sheen on contact surfaces",
  boucle_wool: "boucle cream wool weave with looped texture, raking light bringing out every loop of the weave",
  linen_belgian: "Belgian linen with visible weave and natural slubs, soft afternoon light catching the matte texture",
  velvet_navy: "deep navy channel-tufted velvet, low-angle light catching the pile with deep saturated shadow in the recesses",
  raw_silk: "raw silk with subtle slub variation, soft window light catching the warm dry hand of the weave",
  // Glass / ceramic
  glass_clear: "low-iron clear glass with real refraction, light passing through with minimal greenish tint",
  ceramic_handmade: "hand-thrown ceramic with slight irregularity, soft ambient light catching the matte stoneware glaze",
  porcelain_satin: "satin-finish porcelain with depth of glaze, raking light catching the subtle reflection across the surface",
  // Plaster / paint
  plaster_lime: "lime-plaster wall with hand-troweled texture, soft ambient light revealing the warm-white tone",
  paint_matte: "matte chalky paint with deep light absorption, soft fill producing zero glare across the surface",
  paint_satin: "satin paint with low-sheen response, raking light producing a consistent gentle highlight across the wall",
  // Outdoor
  brick_clinker: "hand-laid clinker brick with mortar joints and varied face color, warm side-light revealing the texture of each course",
  bluestone_pavers: "honed bluestone pavers with cool blue-grey color, grazing light catching the matte stone surface",
} as const

/** Pick a named material palette for a given context (interior / exterior / kitchen / bath). */
function materialPalette(context: "interior" | "exterior" | "kitchen" | "bath" | "default" = "default"): string[] {
  const m = NAMED_MATERIALS
  if (context === "kitchen") return [m.marble_white, m.oak_white, m.brass_unlacquered, m.steel_brushed, m.ceramic_handmade]
  if (context === "bath")    return [m.marble_dark, m.brass_unlacquered, m.porcelain_satin, m.bluestone_pavers, m.plaster_lime]
  if (context === "exterior") return [m.brick_clinker, m.cedar, m.bluestone_pavers, m.iron_matte, m.glass_clear]
  if (context === "interior") return [m.oak_white, m.linen_belgian, m.marble_white, m.brass_unlacquered, m.leather_full_grain]
  return [m.oak_white, m.marble_white, m.brass_unlacquered, m.linen_belgian, m.glass_clear]
}

// ── SHOT LIBRARY (empirically-validated minimal Seedance prompts) ──
// User-verified May 11, 2026: simple "slow camera [movement] of still
// [subject]" prompts produce clean Seedance output; rich 150-word prompts
// produce glitches. Pattern proven on three test renders:
//   "slow camera roll of still house"      → clean
//   "slow camera dolly as if cameraman     → clean
//    stepping towards still house"
//   "slow camera pedestal on still house"  → clean
//
// motionHint for Seedance is the SHORT phrase that gets dropped into
// buildSeedanceClipPrompt as `${motionHint} of still subject`.
//
// motionHint for Kling stays richer — Kling does benefit from longer prompts
// (fal/Higgsfield-validated up to 2,500 chars) and pairs with a separate
// negative_prompt API field.
// ── SEEDANCE 2.0 MOTION HINTS — USER A/B-TESTED EXACT STRINGS ──
//
// DO NOT ADD WORDS. The user empirically tested these prompts on Seedance 2.0
// (bytedance/seedance-1-pro) and they produced clean, non-glitchy output
// every time. Earlier versions added "smooth", "gracefully", "cinematic"
// modifiers — every modifier ADDED was a regression in output quality and
// re-introduced the hallucination/extension failure mode.
//
// Tested winning patterns (verbatim from user testing screenshots):
//   "slow camera roll of still house"
//   "slow camera dolly as if cameraman stepping towards still house"
//   "slow camera pedestal on still house"
//   "slow camera truck on still house"
//
// Pattern: "${motionHint} ${subject}" where subject = "still house" (or a
// minimally-modified equivalent for non-exterior contexts). Total prompt
// length: 6-10 words. No padding. No filler. No quality adjectives.
const SHOT_CONFIG: Record<string, { model: "kling" | "seedance"; motionHint: string; pacing: "slow" | "medium" }> = {
  // ── LINEAR (forward / reverse / wide reveal) ──
  push_in: {
    model: "seedance",
    motionHint: "slow camera dolly as if cameraman stepping towards",
    pacing: "slow",
  },
  // Legacy alias
  slow_push: {
    model: "seedance",
    motionHint: "slow camera dolly as if cameraman stepping towards",
    pacing: "slow",
  },
  pull_out: {
    model: "seedance",
    motionHint: "slow camera dolly as if cameraman stepping back from",
    pacing: "slow",
  },
  establishing: {
    model: "seedance",
    motionHint: "slow camera dolly pulling back wide from",
    pacing: "slow",
  },
  // ── LATERAL (truck slides + parallax, both directions) ──
  truck_left: {
    model: "seedance",
    motionHint: "slow camera truck right to left across",
    pacing: "slow",
  },
  truck_right: {
    model: "seedance",
    motionHint: "slow camera truck left to right across",
    pacing: "slow",
  },
  slide_left: {
    model: "seedance",
    motionHint: "slow camera truck right to left across",
    pacing: "slow",
  },
  slide_right: {
    model: "seedance",
    motionHint: "slow camera truck left to right across",
    pacing: "slow",
  },
  pan_left: {
    model: "seedance",
    motionHint: "slow camera pan right to left across",
    pacing: "slow",
  },
  pan_right: {
    model: "seedance",
    motionHint: "slow camera pan left to right across",
    pacing: "slow",
  },
  parallax_left: {
    model: "seedance",
    motionHint: "slow parallax pan right to left across",
    pacing: "medium",
  },
  parallax_right: {
    model: "seedance",
    motionHint: "slow parallax pan left to right across",
    pacing: "medium",
  },
  // Legacy alias
  parallax_pan: {
    model: "seedance",
    motionHint: "slow parallax pan left to right across",
    pacing: "medium",
  },
  // ── VERTICAL (tilts + pedestal moves) ──
  // "reveal_rise" REMOVED May 15, 2026 — Seedance interpreted the crane
  // prompt as "show different parts of the room" and produced jump-cut
  // output instead of a clean vertical crane. Pedestal Up/Down cover the
  // same use case correctly.
  tilt_up: {
    model: "seedance",
    motionHint: "slow camera tilt up on",
    pacing: "slow",
  },
  tilt_down: {
    model: "seedance",
    motionHint: "slow camera tilt down on",
    pacing: "slow",
  },
  // user-verified working: "slow camera pedestal on still house"
  pedestal_up: {
    model: "seedance",
    motionHint: "slow camera pedestal on",
    pacing: "slow",
  },
  pedestal_down: {
    model: "seedance",
    motionHint: "slow camera pedestal down on",
    pacing: "slow",
  },
  // ── ROTATIONAL (orbits + roll) ──
  orbit_left: {
    model: "seedance",
    motionHint: "slow camera orbit left around",
    pacing: "slow",
  },
  orbit_right: {
    model: "seedance",
    motionHint: "slow camera orbit right around",
    pacing: "slow",
  },
  // drone_orbit was REMOVED on May 12, 2026 — Seedance read "drone"
  // literally and rendered a flying drone object in residential listings.
  // The key has been deleted from both this config and the frontend
  // shot-types union, so any client request with shot_type="drone_orbit"
  // will now fall through to the "Unknown shot type" error.
  // user-verified working: "slow camera roll of still house"
  camera_roll: {
    model: "seedance",
    motionHint: "slow camera roll of",
    pacing: "slow",
  },
  // ── ARCHITECTURAL ──
  architectural: {
    model: "seedance",
    motionHint: "slow architectural slider across",
    pacing: "slow",
  },
}

// Build a continuous-motion clip prompt. Earlier versions used explicit
// [0:00–0:01] + [settle–end] freeze beats to "anchor" the source frame and
// "settle" the final composition — but Seedance / Kling treat any time
// interval starting at 0:00 as "produce a static frame for that duration"
// and any "hold still / settle" beat as a literal freeze. Stitched reels
// landed with 1-second freezes at the head AND tail of every clip, which
// users perceived as "random pauses on a frame."
//
// Research-backed rewrite (Seedance 2.0, Kling 2.5 Turbo Pro, Veo 3):
//   - No timestamped 0:00 beat → motion begins immediately from the source.
//   - No "hold" / "settle" / "no motion" anywhere in the prompt.
//   - Motion sustained continuously across the full duration.
//   - Final phase = "smooth deceleration" not "settle" — the camera keeps
//     moving at half-speed and eases out of the move, never stopping cold.
//   - Architectural anchors ("walls stay locked", "framing stays anchored")
//     are still here — those describe what STAYS still while the camera
//     moves, and they don't trigger freezes.
//   - Explicit anti-freeze negative cap at the tail: "no freeze frames,
//     no held frames, no static moments, no stop-and-hold."
interface ClipContext {
  /** 1-indexed position in the bundle reel */
  index?: number
  /** total clips in the bundle */
  total?: number
  /** narrative beat for this clip — "establishing", "hero", "detail", "closing" etc */
  beat?: string
  /**
   * Optional verbatim atmospheric/time-of-day lock injected into every clip
   * in a stitched bundle. Research finding: repeating the SAME lighting
   * phrase token-for-token across multiple Seedance calls anchors the
   * model's color grading and time-of-day decision, giving stitched reels
   * cohesion that they otherwise lack when each clip independently picks
   * a grade. Set this once at the bundle level and pass it into every clip.
   */
  atmosphericLock?: string
  /**
   * Burn-in title overlay. Seedance 2.0 can render text directly into the
   * frame and even respect named Google fonts ("font: Tangerine + Noto Sans").
   * Empirically validated May 11, 2026 — see screenshots in repo notes.
   *
   * fontStyle examples:
   *   "scribble"                       → handwritten cursive
   *   "san-serif"                      → clean Helvetica-style
   *   "font: Tangerine + Noto Sans,"   → luxury cursive heading + clean
   *                                      subheading (BEST FOR REAL ESTATE)
   *   "elegant serif"                  → editorial display
   *
   * timing:
   *   "intro"     → appears at the opening
   *   "middle"    → appears halfway through (default)
   *   "outro"     → appears at the closing beat
   */
  textOverlay?: {
    text: string
    fontStyle?: string
    timing?: "intro" | "middle" | "outro"
  }
}

function buildClipPrompt(
  motionHint: string,
  duration: number,
  vibeLine: string,
  pacing: "slow" | "medium" = "slow",
  context?: ClipContext,
  model: "seedance" | "kling" = "seedance",
): string {
  // ── BRANCH: Seedance gets compressed (~60 words), Kling gets richer
  // (~140 words). Seedance auto-expands prompts and rewards brevity per
  // ByteDance docs; Kling 2.5 Turbo Pro accepts up to 2,500 chars and
  // performs better with shot-list grammar. The shared inputs (motionHint,
  // vibe, beat) get assembled into different paragraph shapes.
  if (model === "seedance") {
    return buildSeedanceClipPrompt(motionHint, duration, vibeLine, pacing, context)
  }
  return buildKlingClipPrompt(motionHint, duration, vibeLine, pacing, context)
}

// ── SEEDANCE 2.0 — compressed (~60 words) ──
// ByteDance ModelArk canonical structure: Subject+Movement, Background+
// Movement, Camera+Movement. i2v rule: minimize static descriptions.
function buildSeedanceClipPrompt(
  motionHint: string,
  duration: number,
  vibeLine: string,
  pacing: "slow" | "medium" = "slow",
  context?: ClipContext,
): string {
  // ── EMPIRICAL FINDING — May 11, 2026 ──
  // User A/B tested rich (~150-word) prompts vs ultra-minimal prompts on
  // Seedance 2.0 (bytedance/seedance-1-pro). Minimal prompts won decisively:
  //   "slow camera roll of still house"            → clean glide, no glitches
  //   "slow camera dolly as if cameraman stepping  → clean push-in
  //    towards still house"
  //   "slow camera pedestal on still house"        → clean rise, no morph
  // The rich prompts produced glitchy outputs with the same source image.
  // This confirms ByteDance ModelArk's own guidance:
  //   "Simple and direct — the model will expand the prompt word according
  //    to our expression and understanding."
  // Seedance auto-expands; over-prompting fights its internal expansion.
  //
  // For Seedance we now pass JUST the camera-movement clause. Subject is
  // already provided by the input image; vibe/light/material is inferred
  // from the image; the model fills the rest.
  //
  // The `motionHint` for Seedance shots is now a SHORT directive
  // (~6-12 words), defined in SHOT_CONFIG. We DO NOT add vibe/material/
  // atmosphere/anchors — those choked the model on prior generations.
  //
  // Kling keeps the richer grammar via buildKlingClipPrompt — Kling does
  // benefit from longer prompts per fal/Higgsfield docs.
  //
  // The arguments duration/vibeLine/pacing/context are kept on the
  // signature for caller compatibility but most are unused on Seedance.
  void duration; void vibeLine; void pacing
  // motionHints in SHOT_CONFIG already end with their preposition ("of",
  // "towards", "across", "around", "on") so we append the subject directly.
  //
  // ── USER-EMPIRICAL SUBJECT ANCHOR ──
  // Every winning prompt the user tested used the EXACT phrase "still house"
  // as the subject — even for interior, amenity, hero, and detail shots.
  // The model handles the contextual interpretation itself; adding beat-
  // specific qualifiers ("the still interior detail", etc.) was a regression
  // that re-introduced extension/hallucination. Trust the image as context.
  // context is still used below for textOverlay, just not for subject anchoring
  const subject = "still house"
  let prompt = `${motionHint} ${subject}`

  // ── BURN-IN TITLE OVERLAY ──
  // Empirically validated May 11, 2026: Seedance 2.0 renders text directly
  // into the frame when the prompt names the typography style and the text.
  // The model even respects named Google fonts (Tangerine, Noto Sans).
  // Working pattern (user-tested):
  //   "slow camera truck on still house and then font: Tangerine + Noto
  //    Sans, title \"1487 N Echo, Fresno, CA\" in the middle halfway
  //    through the video"
  if (context?.textOverlay?.text) {
    const { text, fontStyle, timing } = context.textOverlay
    const styleClause = fontStyle?.trim() || "elegant"
    // Default timing → middle (this is what user A/B tested as the
    // strongest beat for property addresses).
    const timingClause = timing === "intro"
      ? "near the start of the video"
      : timing === "outro"
        ? "near the end of the video"
        : "in the middle halfway through the video"
    // Sanitize text — strip any double quotes the user might have typed
    // to prevent breaking the prompt grammar.
    const safeText = text.replace(/"/g, "'").trim()
    prompt += ` and then ${styleClause} title "${safeText}" ${timingClause}`
  }

  return prompt
}

// ── KLING 2.5 TURBO PRO — SIMPLIFIED (May 23, 2026) ──
// User report: camera-movement reels have hallucinations. User directive:
// "simple, no negatives". The previous 140-word Kling builder stacked named
// materials + atmospheric vocab + beat register language + tempo cues — every
// extra noun gave Kling another thing to render, and hallucinations crept in.
// Now Kling gets the same ultra-minimal grammar Seedance gets: motion verb
// + subject. Image conditioning carries the rest.
function buildKlingClipPrompt(
  motionHint: string,
  duration: number,
  vibeLine: string,
  pacing: "slow" | "medium" = "slow",
  context?: ClipContext,
): string {
  void duration; void vibeLine; void pacing; void context
  return `${motionHint} still house`
}

// Sign overlay prompts. gpt-image-2 (and the nano-banana fallback) handle
// typography reasoning best when given: subject, exact placement, sign anatomy
// (post + panel + frame), typography brief, scale anchor, lighting match,
// and what to leave unchanged. Order matters — placement first, look-and-feel
// after, "do not modify the rest of the image" last.
// Sign overlay prompts (upgraded). gpt-image-2 / nano-banana / flux-kontext
// render typography reasoning best when given: subject, exact placement,
// sign anatomy (post + panel + frame + grommets), typography brief with
// named typeface family, scale anchor, lighting MATCH to the source photo's
// existing sun direction + Kelvin + softness, micro-aging detail (subtle
// weathering on the post, grass interaction at the base), and an explicit
// "do not modify the rest of the image" cap.
const EFFECT_PROMPTS: Record<string, string> = {
  none: "",
  just_listed:
    "Add a single 'JUST LISTED' real estate yard sign in the lawn directly in front of the property, post planted upright in the grass, panel facing the camera squarely. " +
    "Sign anatomy: rigid white aluminum panel approximately 24 inches wide by 18 inches tall, mounted at the top of a 4-foot matte-black powder-coated metal post with a small rounded finial cap. Panel has two small grommet holes per side bolting it to the post. The post enters the grass cleanly — short blades of grass curve gently around its base where it meets the lawn. " +
    "Typography: 'JUST LISTED' set in a clean dark navy serif capital (Trajan Pro or comparable), evenly weighted, perfectly sharp letterforms, even kerning, no double letters, no AI smear. A smaller subhead placeholder line for the brokerage sits beneath in a thinner serif italic at one-third the height. " +
    "Scale: post height roughly equal to a fire hydrant. The sign sits naturally in the lawn, integrated — not floating, not over-large, not tilted unnaturally. " +
    "Light: cast a soft realistic shadow on the grass that exactly matches the existing sun direction, color temperature, and softness in the source photo. The sign's white panel picks up subtle ambient bounce from the surrounding lawn. " +
    "Micro-aging detail: the post shows a hint of real-world handling — a barely-visible scuff near the base, no rust. " +
    "Anti-AI: no plastic AI sheen on the panel, no doubled glyphs, no impossible shadow direction. " +
    "Critical: do not alter the building, landscaping, sky, lighting direction, or any other element of the source image — add only this sign.",
  open_house:
    "Add a single 'OPEN HOUSE' A-frame sandwich-board sign on the entrance walkway, just before the front door, panel angled 30° toward the camera. " +
    "Sign anatomy: matte-white-painted timber A-frame, sturdy two-board construction with visible brass hinge at the top, approximately 36 inches tall, both faces showing the same text. The frame sits flat on the walkway without floating. " +
    "Typography: 'OPEN HOUSE' in bold dark navy serif capitals (Trajan Pro or comparable) across the top, perfectly sharp letterforms with even kerning, no double glyphs. Beneath sits a thin narrow 'THIS WEEKEND' line in a lighter italic serif at half-height, sharp and crisp. " +
    "Scale: knee-high, fits naturally on the walkway without obstructing the front entrance. " +
    "Light: cast a soft realistic shadow on the path that exactly matches the existing sun direction, color temperature, and softness in the source photo. The white face of the sign picks up subtle warm bounce from the walkway material. " +
    "Micro-aging detail: hints of real-world use — a tiny chip in the paint near one corner, no major distress. " +
    "Anti-AI: no plastic AI sheen, no doubled glyphs, no impossible shadow direction, no warped letterforms. " +
    "Critical: do not alter the building, landscaping, sky, lighting direction, or any other element of the source image — add only this sign.",
  for_sale:
    "Add a single 'FOR SALE' real estate yard sign in the lawn in front of the property, post planted upright in the grass, panel facing the camera squarely. " +
    "Sign anatomy: rigid white aluminum panel approximately 24 inches wide by 18 inches tall, mounted at the top of a 4-foot matte-black powder-coated metal post with a small rounded finial cap. Two small grommet holes per side bolt the panel to the post. Short grass blades curve gently around the base where the post enters the lawn. " +
    "Typography: 'FOR SALE' in clean dark navy serif capitals (Trajan Pro or comparable), evenly weighted, perfectly sharp letterforms, even kerning, no double letters. A smaller brokerage placeholder line beneath in thinner italic serif at one-third the height. " +
    "Scale: post height roughly equal to a fire hydrant. The sign sits naturally in the lawn — integrated, not floating, not over-large. " +
    "Light: cast a soft realistic shadow on the grass that exactly matches the existing sun direction, color temperature, and softness in the source photo. " +
    "Micro-aging detail: a barely-visible scuff on the post, no rust, no graffiti, no weathering on the panel. " +
    "Anti-AI: no plastic AI sheen, no doubled glyphs, no impossible shadow direction. " +
    "Critical: do not alter the building, landscaping, sky, lighting direction, or any other element of the source image — add only this sign.",
  sold:
    "Add a single 'SOLD' real estate yard sign in the lawn in front of the property, post planted upright in the grass, panel facing the camera squarely. " +
    "Sign anatomy: rigid white aluminum panel approximately 24 inches wide by 18 inches tall on a 4-foot matte-black powder-coated metal post with a small rounded finial cap. A bold red diagonal 'SOLD' banner rides across the panel at a confident angle. Two grommet holes per side bolt the panel to the post. Short grass blades curve gently around the base of the post. " +
    "Typography: 'SOLD' in heavy white serif capitals (Trajan Pro Bold or comparable) on the red diagonal banner, perfectly crisp letterforms, even kerning, no doubled glyphs. A smaller brokerage placeholder line sits beneath the banner in a dark navy serif at one-third the height. " +
    "Scale: post height roughly equal to a fire hydrant. " +
    "Light: cast a soft realistic shadow on the grass that exactly matches the existing sun direction, color temperature, and softness in the source photo. The white panel picks up subtle ambient bounce from the surrounding lawn. " +
    "Micro-aging detail: a barely-visible scuff on the post; the SOLD banner is fresh and confident, not faded. " +
    "Anti-AI: no plastic AI sheen, no doubled glyphs, no impossible shadow direction. " +
    "Critical: do not alter the building, landscaping, sky, lighting direction, or any other element of the source image — add only this sign.",
}

const QUICK_EFFECT_BADGES: Record<string, { label: string; color: string }> = {
  just_listed: { label: "JUST LISTED", color: "#8C3F2E" },
  open_house: { label: "OPEN HOUSE THIS WEEKEND", color: "#0E0E0C" },
  for_sale: { label: "FOR SALE", color: "#8C3F2E" },
  sold: { label: "SOLD", color: "#0E0E0C" },
}

// Staging style libraries. Each preset names exact materials (with finish
// callouts), exact placement zones (center, against the longest wall, etc.),
// and a one-line lighting cue so Seedance can render the right diffuse vs.
// directional light. Specificity drives realism — vague descriptions read as
// AI slop, named materials read as a photographer's brief.
// Staging style libraries (upgraded). Each preset now packs:
//   • Named palette with specific finish callouts
//   • Specific furniture pieces with placement, finish, and material
//   • Named accent objects (decor, lighting, art) anchoring the style
//   • Light brief with Kelvin temperature + falloff + atmospheric quality
//   • Aesthetic anchor (publication / designer / film reference)
//   • Anti-AI line (banned generic descriptors)
// ── KEYWORD MAP (May 24, 2026) ──
// Short canonical keywords for the user's tested template. The simpler
// "redesign the room into a [keyword] style" pattern outperforms the long
// aesthetic-clause STAGING_STYLES on Seedance's layout-locking behaviour.
// STAGING_STYLES still gets exported for legacy callers.
const STAGING_STYLE_KEYWORDS: Record<string, string> = {
  modern: "modern",
  luxury_minimalist: "luxury minimalist",
  bohemian: "bohemian",
  mediterranean: "mediterranean",
  spanish: "spanish",
  mid_century: "mid-century",
  coastal: "coastal",
  farmhouse: "farmhouse",
  luxury_modern: "luxury modern",
  scandinavian: "scandinavian",
  empty: "empty",
}

const STAGING_STYLES: Record<string, string> = {
  modern:
    "Modern minimalist palette: warm-white plaster walls, mid-tone European oak floor with a matte oil finish, brushed nickel and matte-black accents, no warm wood tones beyond the floor. " +
    "Furniture: low-profile linen sofa with rounded arms centered against the longest wall, smoked-glass coffee table on a flat-weave undyed wool rug in front of it, sculptural matte-black arc floor lamp arching over the sofa, single large framed abstract canvas in soft greys above the sofa back. " +
    "Accents: one tall potted fiddle-leaf fig in a glazed stoneware pot in the corner, two ceramic vessels in pale ochre on the coffee table. " +
    "Light: cool diffuse 5400K daylight from the existing windows, soft fill, almost shadowless, gallery-bright. " +
    "Aesthetic anchor: a Dwell Magazine living-room spread, a Vincent Van Duysen residence. " +
    "Anti-AI: no plastic sheen on fabric, no AI-flat lighting, no impossible reflections, no warm color cast.",
  mid_century:
    "Mid-century modern palette: warm walnut tones throughout, mustard and teal accents on a cream backdrop, a single touch of forest green in a planter. " +
    "Furniture: low-profile teak credenza on tapered hairpin legs against the longest wall, boucle armchair upholstered in cream wool angled into the room with a small walnut side table beside it, geometric wool area rug in cream / teal / mustard centered under the seating. " +
    "Accents: sunburst brass wall clock above the credenza, rounded glazed-ceramic table lamp in mustard on the credenza, two atomic-era pottery pieces in teal, abstract geometric oil-paint canvas above the sofa. " +
    "Light: warm 3400K afternoon side light rakes across the walnut grain, exposing wood texture and ceramic glaze; soft cool fill from camera-left. " +
    "Aesthetic anchor: a Dwell Magazine mid-century revival spread, a Mad Men set design. " +
    "Anti-AI: no plastic AI sheen on teak, no flat lighting, no fish-eye distortion, no over-saturated color.",
  coastal:
    "Coastal palette: weathered driftwood, soft sea-blue, sandy beige, layered jute and white linen, with one accent of brushed brass. " +
    "Furniture: white slip-covered sofa in heavy linen weave centered against the longest wall, weathered-driftwood coffee table on a chunky woven jute rug, slim raffia accent chair angled into the room. " +
    "Accents: rope-and-clear-glass pendant overhead, framed black-and-white shoreline photography in a whitewashed timber frame above the sofa, ceramic vase with dried beach grass on the coffee table, two warm-white linen throw pillows. " +
    "Light: bright soft diffuse 5600K daylight with a slight sun-warm cast, gauzy linen sheers softening the windows, depth haze suggesting ocean air. " +
    "Aesthetic anchor: a Hamptons Magazine summer cover, a Nancy Meyers beach-house scene. " +
    "Anti-AI: no plastic AI sheen on linen, no AI-flat lighting, no impossible reflections in glass.",
  farmhouse:
    "Modern farmhouse palette: shiplap accent wall, distressed reclaimed-wood beams overhead, cream and forest green on a warm-white backdrop, vintage matte-iron fixtures throughout. " +
    "Furniture: slipcovered cream linen sofa centered against the longest wall, barn-wood coffee table on a hand-loomed cream-and-grey cotton rug, single woven-rush armchair angled in. " +
    "Accents: oversized woven seagrass basket beside the sofa, mason-jar pendant lighting with warm tungsten bulbs, simple cream cotton throw draped over the sofa arm, framed botanical print above the sofa. " +
    "Light: soft warm 2900K tungsten interior light supplemented by 5000K daylight, gentle long shadows on the shiplap, dust motes catching the warm rays. " +
    "Aesthetic anchor: a Studio McGee farmhouse reveal, a Magnolia Network living-room spread. " +
    "Anti-AI: no plastic AI sheen on linen or wood, no flat lighting, no banded skies, no over-saturated greens.",
  luxury_modern:
    "Luxury modern palette: deep navy, warm gold, ink-veined Calacatta marble, unlacquered brass, lacquered black surfaces, one accent of cognac leather. " +
    "Furniture: deep-navy channel-tufted velvet sofa centered against the longest wall, black-veined Calacatta marble coffee table on a high-pile cream wool rug, single Italian-leather lounge chair angled in cognac, fluted ribbed-wood console along the side wall. " +
    "Accents: sculptural alabaster pendant overhead, oversized abstract canvas in deep navy and gold above the sofa, unlacquered brass picture light, single hand-blown glass vessel in smoky amber on the marble table. " +
    "Light: low-angle warm 3200K side-rake illuminates the velvet pile, deep saturated shadows in the cool quadrant, controlled specular highlights on the marble veining and unlacquered brass, ambient cool 5600K from windows camera-right. " +
    "Aesthetic anchor: a Kelly Wearstler interior shoot, an Architectural Digest cover spread, a Sotheby's flagship listing. " +
    "Anti-AI: no plastic AI sheen on velvet, no AI-flat lighting on marble, no impossible reflections in glass, no over-saturation, no fish-eye distortion.",
  scandinavian:
    "Scandinavian palette: bright warm-white walls, blonde oak floors with a matte oil finish, soft greys, layered creamy wool, abundant natural light, one accent of pale forest green in a planter. " +
    "Furniture: cream linen sofa with rounded arms centered against the longest wall, two blonde-oak nesting tables in front, single boucle accent chair angled into the room, slim oak shelf along the side wall with three carefully placed objects. " +
    "Accents: tall paper-shade floor lamp beside the sofa, three framed graphic black-and-white prints in a clean grid above the sofa, one large monstera in a matte-stoneware pot, a single hand-thrown ceramic vessel on the nesting table. " +
    "Light: high-key 5800K diffuse daylight, almost shadowless, gentle warm bounce from the oak floor, soft fill from layered linen sheers. " +
    "Aesthetic anchor: a Kinfolk Magazine interior, a Norm Architects Stockholm apartment shoot. " +
    "Anti-AI: no plastic AI sheen on linen or oak, no flat lighting, no impossible reflections, no over-saturation.",
  // ── USER-TESTED STYLES (May 24, 2026) ──
  // Short prompt suffixes — the multi-style cycle templates rely on the
  // STAGING_STYLE_KEYWORDS map rather than these long aesthetic clauses,
  // but legacy single-style callers still consume the long form.
  luxury_minimalist:
    "Luxury minimalist palette: warm-white walls, oiled European oak floors, sculptural furniture, marble accents, restrained brass detailing, museum-grade negative space. " +
    "Furniture: low-profile linen sofa, single marble plinth coffee table, sculptural oak chair angled in. " +
    "Light: soft 5400K daylight, controlled shadows, gallery-bright. " +
    "Anti-AI: no plastic AI sheen, no over-saturation.",
  bohemian:
    "Bohemian palette: layered earth tones, terracotta and rust, brass accents, abundant indoor plants. " +
    "Furniture: low-slung velvet sofa, woven rattan armchair, layered Moroccan rug, brass coffee table. " +
    "Accents: macramé wall hangings, scattered floor cushions, fiddle-leaf fig in a glazed pot. " +
    "Light: warm 3200K filtered through linen curtains, golden hour glow. " +
    "Anti-AI: no plastic AI sheen, no flat lighting.",
  mediterranean:
    "Mediterranean palette: warm plaster walls, terracotta tile floor, olive and ochre, archway detailing. " +
    "Furniture: woven rattan and linen seating, dark walnut coffee table, ceramic vessels in earth tones. " +
    "Accents: hand-thrown pottery, dried herbs, linen drapes, wrought iron light fixtures. " +
    "Light: warm 3000K side-light through arched windows, painterly long shadows. " +
    "Anti-AI: no plastic AI sheen, no flat lighting, no over-saturation.",
  spanish:
    "Spanish-revival palette: warm white plaster, dark wood ceiling beams, wrought iron, deep terracotta and burgundy accents. " +
    "Furniture: leather club chairs, carved dark wood coffee table, layered hand-loomed wool rug. " +
    "Accents: mosaic tile inlays, wrought iron candle sconces, ceramic vessels, oil paintings in dark frames. " +
    "Light: warm 2900K interior light, deep shadows in the ceiling, motivated directional rakes. " +
    "Anti-AI: no plastic AI sheen, no AI-flat lighting.",
  empty:
    "Empty room — furniture and decor removed, bare floors and walls, only architectural shell remains. " +
    "Lighting matches the input photo's natural light. " +
    "Anti-AI: no ghost furniture, no shadow remnants of removed items.",
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

// ── Vibe → cinematic suffix (research-tuned) ──
// Research findings applied:
//   • Each vibe now PAIRS a film stock with a cinematographer/DP name —
//     this combo has the strongest documented effect in Kling/Seedance
//     prompt corpora (filmart.ai, klingaio.com).
//   • Dropped corpus-weak anchors (Sotheby's, Dwell, Conde Nast Traveler).
//     Promoted corpus-strong anchors (Architectural Digest, Aman Resorts,
//     Nancy Meyers, Cereal Magazine, Tadao Ando).
//   • Stripped every "Avoid X" / "no X" line — Seedance ignores negations.
//   • Added explicit "film grain present including in sky regions" to
//     suppress sky banding (Klingaio's documented anti-banding language).
//   • Replaced "polished" / "perfect" / "flawless" with named materials
//     (honed Carrara, full-grain leather, white oak with grain figuration).
//   • Compressed to roughly 60-70 words per vibe — Seedance sweet spot.
function vibeSuffix(vibe: string): string {
  switch (vibe) {
    case "luxury":
      return "ARRI Alexa Mini LF, 35mm anamorphic prime at T2.8 with practical lighting and negative fill from camera-right, 24fps, 180° shutter. Kodak Vision3 500T look with Roger Deakins natural-light treatment, occasionally Greig Fraser for high-contrast exterior cuts. Aman Resorts and Architectural Digest cover cinematography. Golden-hour warm 3200K key rakes from low and side, deep saturated shadows in the negative-fill quadrant, controlled specular highlights on honed Carrara marble veining and unlacquered brass patina. Fine warm haze through every light shaft, pollen drift in the air, 35mm film grain present throughout including in sky regions."
    case "cozy":
      return "RED Komodo with 50mm Cooke S4 anamorphic prime at T2.8, 24fps, 180° shutter. Kodak Vision3 500T look with Sofia Coppola natural-light interior treatment. Nancy Meyers warm domestic cinematography. Motivated tungsten 2700K from practical lamps, warm halations on white oak with grain figuration, soft glints on hand-thrown ceramic glaze, boucle wool weave catching directional light. Drifting steam from a mug, dust motes in evening light, 35mm film grain throughout the frame."
    case "modern":
      return "ARRI Alexa Mini LF, 24mm Zeiss Supreme at f/4, 24fps, 180° shutter. Fujifilm Eterna pastel grade with Hoyte van Hoytema clean-light treatment. Cereal Magazine and Tadao Ando architectural editorial cinematography. Cool diffuse 5600K daylight, gallery bright, restrained specular on brushed steel and honed-concrete surfaces with hairline seams. Faint cool atmospheric haze for depth, 35mm film grain present including in sky regions."
    case "family":
      return "Sony FX6 with 35mm prime at f/2.8, 24fps, 180° shutter. Kodak Vision3 250D daylight balance with Nancy Meyers warm-interior treatment. Architectural Digest residential cinematography. Bright 5000K midday sun through clean windows, warm bounce on cream linen and matte white walls, softened reflections on wide-plank oak floor with grain figuration. Light air drift through screen doors, fine 35mm grain throughout."
    case "investment":
      return "Sony FX6 with 28mm prime at f/5.6, 24fps, 180° shutter. Kodak Vision3 250D daylight balance, neutral Rec.709 documentary cinematography. Even 5200K daylight reads true across the entire layout, every surface rendered as itself. Faint atmospheric haze for depth, 35mm film grain present uniformly including in sky regions, no creative grade applied."
    case "vacation":
      return "ARRI Alexa Mini LF with 35mm anamorphic prime at T2, 2× squeeze, practical lighting from sun, 24fps, 180° shutter. Kodak Vision3 500T with sunset shift, Vittorio Storaro saturated golden-hour treatment. Aman Resorts hospitality cinematography. Magic-hour 3000K rim light on tropical foliage and water, signature horizontal anamorphic flare from direct sun, selective focus on a foreground anchor (pool edge, stone deck), gentle salt haze catching the warm air, breeze visible in fronds, 35mm film grain throughout."
    default:
      return "Sony FX6 with 35mm prime at f/2.8, 24fps, 180° shutter. Kodak Vision3 250D look, Roger Deakins natural-light style. Architectural Digest residential cinematography. Warm 3800K diffuse light with motivated direction, softened reflections on honed stone and white oak surfaces, fine atmospheric haze for depth, 35mm film grain throughout including in sky regions."
  }
}

// ── Property photo → "sketch on a desk" reference image ──
// Uses google/nano-banana on Replicate. Verified working: takes a photo as
// `image_input` reference, outputs a hand-drawing-on-desk sketch of the same
// subject in ~8s. Used for the Sketch to Reality reveal flow where the sketch
// then morphs back into the real photo via Kling.
async function generateSketchWithNanoBanana(
  referenceImageUrl: string,
  prompt: string,
  token: string
): Promise<string> {
  const res = await fetch(
    `${REPLICATE}/models/google/nano-banana/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({
        input: {
          prompt,
          image_input: [referenceImageUrl],
          // Use canonical "jpeg" — Replicate is standardizing across models.
          // gpt-image-2 already broke on "jpg" (May 13, 2026); nano-banana
          // may follow. "jpeg" is accepted everywhere.
          output_format: "jpeg",
        },
      }),
    }
  )

  const prediction = await res.json()
  if (!res.ok || !prediction.id) {
    const detail = prediction?.detail || prediction?.error?.message || JSON.stringify(prediction).slice(0, 400)
    throw new Error(`nano-banana sketch generation rejected (HTTP ${res.status}): ${detail}`)
  }

  if (prediction.status === "succeeded") {
    const out = prediction.output
    const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : (out?.url || ""))
    if (url) return url
  }

  // ── Bumped polling window (May 16, 2026) ──
  // nano-banana spikes to 60–90s on busy days. The old 48s ceiling produced
  // the non-2xx errors the user was seeing on sketch_to_real. Now 150s
  // (30 polls × 5s) with the actual Replicate detail surfaced on failure.
  const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 5000))
    const pollRes = await fetch(`${REPLICATE}/predictions/${prediction.id}`, {
      headers: { Authorization: `Token ${TOKEN}` },
    })
    const pollData = await pollRes.json()
    if (pollData.status === "succeeded") {
      const out = pollData.output
      const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : (out?.url || ""))
      if (url) return url
      throw new Error("nano-banana succeeded but returned no URL")
    }
    if (pollData.status === "failed" || pollData.status === "canceled") {
      const detail = pollData?.error || JSON.stringify(pollData).slice(0, 300)
      throw new Error(`nano-banana failed: ${detail}`)
    }
  }
  throw new Error("nano-banana sketch generation timed out after 150s (try again — it usually clears in a minute)")
}

// ── Sketch / Floor Plan → Photoreal renderer ──
// Uses flux-kontext-pro which is purpose-built for image-to-image style
// transformation (sketch → photoreal, line drawing → render). Falls back to
// gpt-image-2 if flux-kontext fails.
async function renderSketchToPhotoreal(
  sourceImageUrl: string,
  prompt: string,
  token: string
): Promise<string> {
  // PRIMARY: black-forest-labs/flux-kontext-pro — designed for transformations
  try {
    const res = await fetch(
      `${REPLICATE}/models/black-forest-labs/flux-kontext-pro/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait=60",
        },
        body: JSON.stringify({
          input: {
            prompt,
            input_image: sourceImageUrl,
            aspect_ratio: "match_input_image",
            // Canonical "jpeg" per Replicate's schema standardization.
            output_format: "jpeg",
            safety_tolerance: 2,
            prompt_upsampling: false,
          },
        }),
      }
    )
    const prediction = await res.json()
    if (!res.ok || !prediction.id) {
      const detail = prediction?.detail || prediction?.error?.message || JSON.stringify(prediction).slice(0, 400)
      throw new Error(`flux-kontext-pro rejected (HTTP ${res.status}): ${detail}`)
    }
    if (prediction.status === "succeeded") {
      const out = prediction.output
      const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : (out?.url || ""))
      if (url) return url
    }
    const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
    for (let i = 0; i < 18; i++) {
      await new Promise((r) => setTimeout(r, 4000))
      const pollRes = await fetch(`${REPLICATE}/predictions/${prediction.id}`, {
        headers: { Authorization: `Token ${TOKEN}` },
      })
      const pollData = await pollRes.json()
      if (pollData.status === "succeeded") {
        const out = pollData.output
        const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : (out?.url || ""))
        if (url) return url
        throw new Error("flux-kontext-pro succeeded but returned no URL")
      }
      if (pollData.status === "failed" || pollData.status === "canceled") {
        throw new Error(`flux-kontext-pro failed: ${pollData.error || "unknown"}`)
      }
    }
    throw new Error("flux-kontext-pro polling timed out")
  } catch (kontextErr) {
    console.error("[renderSketchToPhotoreal] flux-kontext-pro failed, trying gpt-image-2:", kontextErr)
    // Fallback: gpt-image-2
    return await generateWithNanoBanana(sourceImageUrl, prompt, token)
  }
}

async function generateWithNanoBanana(
  imageUrl: string,
  effectPrompt: string,
  token: string
): Promise<string> {
  // PRIMARY: openai/gpt-image-2 — best at rendering text-on-signs (real estate signage)
  // FALLBACK: google/nano-banana for non-text edits if gpt-image-2 fails
  // Function name kept for backwards compatibility.

  // gpt-image-2 only accepts 1:1, 3:2, 2:3 — listing photos are vertical so use 2:3
  try {
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
            prompt: effectPrompt,
            input_images: [imageUrl],
            aspect_ratio: "2:3",
            // ── API SCHEMA FIX (May 13, 2026) ──
            // openai/gpt-image-2 now requires "png" | "jpeg" | "webp" — it
            // rejects "jpg" with HTTP 422. This was a breaking change on
            // Replicate's side. Use canonical "jpeg".
            output_format: "jpeg",
          },
        }),
      }
    )

    const prediction = await res.json()
    if (!res.ok || !prediction.id) {
      const detail = prediction?.detail || prediction?.error?.message || JSON.stringify(prediction).slice(0, 400)
      throw new Error(`gpt-image-2 rejected (HTTP ${res.status}): ${detail}`)
    }

    if (prediction.status === "succeeded") {
      const out = prediction.output
      const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : (out?.url || ""))
      if (url) return url
    }

    // Bounded poll — gpt-image-2 usually finishes in 20-30s.
    const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 4000))
      const pollRes = await fetch(`${REPLICATE}/predictions/${prediction.id}`, {
        headers: { Authorization: `Token ${TOKEN}` },
      })
      const pollData = await pollRes.json()
      if (pollData.status === "succeeded") {
        const out = pollData.output
        const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : (out?.url || ""))
        if (url) return url
        throw new Error("gpt-image-2 succeeded but returned no URL")
      }
      if (pollData.status === "failed" || pollData.status === "canceled") {
        throw new Error(`gpt-image-2 failed: ${pollData.error || "unknown"}`)
      }
    }
    throw new Error("gpt-image-2 took longer than expected")
  } catch (gptErr) {
    console.error("[generateWithNanoBanana] gpt-image-2 failed, trying nano-banana fallback:", gptErr)
    // Fallback to nano-banana for non-text edits
    const res = await fetch(
      `${REPLICATE}/models/google/nano-banana/predictions`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
          Prefer: "wait=60",
        },
        body: JSON.stringify({
          // Canonical "jpeg" per Replicate's schema standardization.
          input: { prompt: effectPrompt, image_input: [imageUrl], output_format: "jpeg" },
        }),
      }
    )
    const prediction = await res.json()
    if (!res.ok || !prediction.id) {
      throw new Error(`Both gpt-image-2 and nano-banana failed. Last error: ${(gptErr as Error).message}`)
    }
    if (prediction.status === "succeeded") {
      const out = prediction.output
      return typeof out === "string" ? out : (Array.isArray(out) ? out[0] : "")
    }
    const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 4000))
      const pollRes = await fetch(`${REPLICATE}/predictions/${prediction.id}`, {
        headers: { Authorization: `Token ${TOKEN}` },
      })
      const pollData = await pollRes.json()
      if (pollData.status === "succeeded") {
        const out = pollData.output
        const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : "")
        if (url) return url
      }
      if (pollData.status === "failed" || pollData.status === "canceled") {
        throw new Error(`Both image models failed. gpt-image-2: ${(gptErr as Error).message}. nano-banana: ${pollData.error || "unknown"}`)
      }
    }
    throw new Error("Image generation timed out on both models")
  }
}

// ── PERMANENT VIDEO PERSISTENCE ──
// Replicate URLs expire ~24h after generation. Every video must be downloaded
// from Replicate and re-uploaded to Supabase storage before we can promise
// the user permanent access in their gallery.
//
// Pre-fix behavior: a single try/catch around the upload. ~5% of uploads
// failed silently (network blip, large buffer, transient storage hiccup),
// and the returned response carried ONLY the Replicate URL — which then died
// after a day and showed as a broken video in the gallery.
//
// Post-fix behavior: retry with exponential backoff (1s → 2s → 4s),
// validate the response body, validate the buffer is non-empty, and only
// return null after three full failures. Worst case we log loudly so the
// backfill function can pick it up later.
async function persistVideoToStorage(
  videoUrl: string,
  storagePath: string,
  supabase: any,
  label: string,
  maxRetries = 3,
): Promise<string | null> {
  // Streaming variant. Pipes Replicate's response body directly into
  // Supabase Storage instead of buffering the entire MP4 in Deno memory.
  // The old ArrayBuffer pattern was silently failing on larger files
  // (May 16, 2026 — user's "gallery struggles to save" report).
  try {
    const result = await streamReplicateToStorage(supabase, videoUrl, storagePath, {
      logTag: `persist:${label}`,
      maxRetries,
    })
    return result.path
  } catch (err) {
    console.error(`[persist:${label}] ALL ${maxRetries} attempts failed for ${storagePath}:`, (err as Error)?.message ?? err)
    return null
  }
}

// Returns either { videoUrl } if Replicate finished within wait window,
// or { predictionId } if still processing — caller can poll.
async function startVideoGeneration(
  imageUrl: string,
  shotType: string,
  duration: number,
  token: string,
  context?: ClipContext,
  forceModel?: "kling" | "seedance",
): Promise<{ videoUrl?: string; predictionId?: string }> {
  const config = SHOT_CONFIG[shotType]
  if (!config) throw new Error(`Unknown shot type: ${shotType}`)

  // Model selection:
  //   • forceModel="kling" overrides per-shot config — used by animate_single
  //     where source-image fidelity matters more than speed (Kling 2.5 Turbo
  //     Pro is documented as more faithful to start_image, which kills the
  //     hallucinated-furniture / leaves-the-room failure mode we saw on
  //     Seedance for single-photo animations).
  //   • Long-form clips auto-promote to Seedance regardless because Kling
  //     caps out at 10s and can't handle the bundle 5s clip pace at scale.
  //   • Default falls back to the per-shot config.model value.
  let useSeedance: boolean
  if (forceModel === "kling") {
    useSeedance = false
  } else if (forceModel === "seedance") {
    useSeedance = true
  } else {
    useSeedance = config.model === "seedance" || duration >= LONG_FORM_THRESHOLD_SECONDS
  }

  // Per-model prompt grammar:
  //   Seedance gets compressed (~60 words) per ByteDance docs.
  //   Kling gets longer (~140 words) with end-state guidance.
  const prompt = buildClipPrompt(
    config.motionHint,
    duration,
    vibeSuffix("luxury"),
    config.pacing,
    context,
    useSeedance ? "seedance" : "kling",
  )

  const endpoint = useSeedance
    ? `${REPLICATE}/models/${MODEL_SEEDANCE}/predictions`
    : `${REPLICATE}/models/${MODEL_KLING}/predictions`

  // ── May 23, 2026: SIMPLIFIED + NO NEGATIVES ──
  // User report: camera-movement reels have hallucinations. User directive:
  // "simple, no negatives". Kling's negative_prompt is removed entirely;
  // Seedance never used one. cfg_scale stays at 0.7 to keep good prompt
  // adherence without over-constraining the model.
  const modelInput: Record<string, unknown> = useSeedance
    ? {
        prompt,
        image: imageUrl,
        duration,
        aspect_ratio: "9:16",
        resolution: "1080p",
        fps: 24,
        camera_fixed: false,
      }
    : {
        prompt,
        start_image: imageUrl,
        duration,
        aspect_ratio: "9:16",
        cfg_scale: 0.7,
      }

  console.log(`[generateVideo] model=${useSeedance ? "seedance-2" : "kling"} endpoint=${endpoint} duration=${duration}s`)

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",
    },
    body: JSON.stringify({ input: modelInput }),
  })

  const prediction = await res.json()
  if (!res.ok || !prediction.id) {
    const detail = prediction?.detail || prediction?.error?.message || JSON.stringify(prediction).slice(0, 400)
    throw new Error(`${config.model} rejected the request (HTTP ${res.status}): ${detail}`)
  }

  if (prediction.status === "succeeded" && prediction.output) {
    const out = prediction.output
    const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : null)
    if (url) return { videoUrl: url }
  }

  // Not yet ready — return prediction_id for client polling
  return { predictionId: prediction.id }
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

    // ── BACKFILL MODE ──
    // Repairs gallery entries whose Replicate URL is dead / about to expire by
    // re-downloading the source video into permanent Supabase storage. The
    // client (Gallery) invokes this for any submission that has
    // output_video_url but no output_video_path (or output_clip_urls without
    // output_clip_paths). Returns the storage path(s) so the client can
    // update the submission row.
    //
    // Payload shape:
    //   { mode: "backfill", submission_id: "uuid" }
    //
    // Behavior:
    //   • Looks up the submission row.
    //   • If output_clip_urls is set (bundle), persists every clip in order.
    //   • Otherwise persists the single output_video_url.
    //   • Updates the submission row in place with the new storage path(s).
    //   • Returns { status: "complete", output_video_path?, output_clip_paths? }.
    if (body.mode === "backfill" && body.submission_id) {
      const subId = String(body.submission_id)
      console.log(`[backfill] starting for submission ${subId}`)
      const { data: sub, error: fetchErr } = await supabase
        .from("submissions")
        .select("id, output_video_url, output_video_path, output_clip_urls, output_clip_paths")
        .eq("id", subId)
        .single()
      if (fetchErr || !sub) {
        throw new Error(`backfill: submission ${subId} not found: ${fetchErr?.message ?? "unknown"}`)
      }

      const stamp = Date.now()
      const updates: Record<string, unknown> = {}
      let newPath: string | null = null
      let newClipPaths: string[] | null = null

      // Bundle case — clip array
      const clipUrls: string[] | null = Array.isArray((sub as any).output_clip_urls) && (sub as any).output_clip_urls.length > 0
        ? (sub as any).output_clip_urls
        : null
      if (clipUrls && (!Array.isArray((sub as any).output_clip_paths) || (sub as any).output_clip_paths.length === 0)) {
        const persisted: string[] = []
        for (let i = 0; i < clipUrls.length; i++) {
          const p = await persistVideoToStorage(
            clipUrls[i],
            `listing-videos/backfill-${stamp}/clip-${i}.mp4`,
            supabase,
            `backfill[${subId}:clip-${i}]`,
          )
          if (p) persisted.push(p)
        }
        if (persisted.length === 0) {
          throw new Error(`backfill: all ${clipUrls.length} clip URLs are dead — original Replicate links have expired`)
        }
        newClipPaths = persisted
        updates.output_clip_paths = persisted
      }

      // Single-video case
      if (!clipUrls && (sub as any).output_video_url && !(sub as any).output_video_path) {
        const p = await persistVideoToStorage(
          (sub as any).output_video_url,
          `listing-videos/backfill-${stamp}/video.mp4`,
          supabase,
          `backfill[${subId}:single]`,
        )
        if (!p) {
          throw new Error("backfill: video URL is dead — original Replicate link has expired")
        }
        newPath = p
        updates.output_video_path = p
      }

      if (Object.keys(updates).length === 0) {
        return new Response(JSON.stringify({
          status: "noop",
          message: "submission already has permanent storage paths",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      const { error: updErr } = await supabase
        .from("submissions")
        .update(updates)
        .eq("id", subId)
      if (updErr) {
        throw new Error(`backfill: failed to update submission ${subId}: ${updErr.message}`)
      }

      console.log(`[backfill] completed for ${subId}: ${JSON.stringify(updates)}`)
      return new Response(JSON.stringify({
        status: "complete",
        submission_id: subId,
        output_video_path: newPath ?? undefined,
        output_clip_paths: newClipPaths ?? undefined,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    console.log("[generate-listing-video] payload:", JSON.stringify({
      mode: body.prediction_id ? "poll" : "start",
      prediction_id: body.prediction_id,
      category: body.category,
      photo_count: body.photo_urls?.length,
      shot_type: body.shot_type,
      effect_id: body.effect_id,
      effect_mode: body.effect_mode,
    }))

    // ── POLL MODE B: bundle (array of prediction_ids) ──
    if (Array.isArray(body.prediction_ids) && body.prediction_ids.length > 0) {
      const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
      const updated = await Promise.all(
        body.prediction_ids.map(async (entry: any) => {
          if (entry.video_url) return entry // already done
          if (!entry.prediction_id) return { ...entry, video_url: null, error: "missing prediction_id" }
          try {
            const r = await fetch(`${REPLICATE}/predictions/${entry.prediction_id}`, {
              headers: { Authorization: `Token ${TOKEN}` },
            })
            const d = await r.json()
            if (d.status === "succeeded") {
              const out = d.output
              const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : null)
              return { ...entry, video_url: url }
            }
            if (d.status === "failed" || d.status === "canceled") {
              return { ...entry, video_url: null, error: d.error || "failed" }
            }
            return entry // still processing
          } catch (e) {
            return { ...entry, error: (e as Error).message }
          }
        })
      )

      const allDone = updated.every((e: any) => e.video_url || e.error)
      if (allDone) {
        const clipUrls = updated.filter((e: any) => e.video_url).map((e: any) => e.video_url)
        if (clipUrls.length === 0) {
          throw new Error("All bundle clips failed: " + updated.map((e: any) => e.error).join("; "))
        }
        // Persist — retry-backed so storage hiccups don't yield expiring links.
        const bundleStamp = Date.now()
        const clipPaths: string[] = []
        for (let i = 0; i < clipUrls.length; i++) {
          const path = await persistVideoToStorage(
            clipUrls[i],
            `listing-videos/${bundleStamp}/clip-${i}.mp4`,
            supabase,
            `bundle-poll[${i}]`,
          )
          if (path) clipPaths.push(path)
        }
        return new Response(JSON.stringify({
          status: "complete",
          video_url: clipUrls[0],
          clip_urls: clipUrls,
          output_clip_paths: clipPaths,
          quick_effect: body.quick_effect || null,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      const remaining = updated.filter((e: any) => !e.video_url && !e.error).length
      return new Response(JSON.stringify({
        status: "processing",
        prediction_ids: updated,
        remaining,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // ── POLL MODE A: single prediction_id ──
    if (body.prediction_id && !body.category) {
      const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
      const pollRes = await fetch(`${REPLICATE}/predictions/${body.prediction_id}`, {
        headers: { Authorization: `Token ${TOKEN}` },
      })
      const pollData = await pollRes.json()

      if (pollData.status === "succeeded") {
        const out = pollData.output
        const videoUrl = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : null)
        if (!videoUrl) {
          throw new Error(`Replicate succeeded but returned no URL: ${JSON.stringify(out).slice(0, 200)}`)
        }

        // Persist
        const outputVideoPath = await persistVideoToStorage(
          videoUrl,
          `listing-videos/${Date.now()}/video.mp4`,
          supabase,
          "poll",
        )

        return new Response(JSON.stringify({
          status: "complete",
          video_url: videoUrl,
          clip_urls: [videoUrl],
          output_video_path: outputVideoPath,
          quick_effect: body.quick_effect || null,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      if (pollData.status === "failed" || pollData.status === "canceled") {
        throw new Error(pollData.error || "Replicate prediction failed")
      }

      // Still processing
      return new Response(JSON.stringify({
        status: "processing",
        prediction_id: body.prediction_id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const {
      category,
      photo_urls,
      shot_type,
      staging_style,
      effect_id,
      effect_mode,
      vibe,
      listing,
      duration,
      credits_cost,
      // ── BURN-IN TITLE OVERLAY ──
      // Optional. Seedance 2.0 renders text directly into the frame.
      // Shape: { text: string, fontStyle?: string, timing?: "intro"|"middle"|"outro" }
      // Empirically validated May 11, 2026.
      text_overlay,
    } = body

    // Validate
    if (!category || !photo_urls || photo_urls.length === 0) {
      throw new Error(`category and photo_urls required. Received: category="${category}", photo_urls.length=${photo_urls?.length}`)
    }

    // ── May 25, 2026 — listing_bundle + floor_plan_pan kept in the enum ──
    // The picker no longer exposes these categories (removed May 24) but
    // cached frontends in users' browsers may still alias done_for_you_reel
    // to listing_bundle and submit it. Rejecting at validation breaks every
    // in-flight generation for stale clients. We accept both names; the
    // routing block below handles them.
    if (!["animate_single", "sun_to_sun", "done_for_you_reel", "listing_bundle", "virtual_staging", "sketch_to_real", "floor_plan_pan"].includes(category)) {
      throw new Error(`category must be animate_single, sun_to_sun, done_for_you_reel, virtual_staging, or sketch_to_real. Received: "${category}"`)
    }

    if (category === "animate_single" && !shot_type) {
      throw new Error(`animate_single requires shot_type. Received: shot_type="${shot_type}"`)
    }

    // Verify all photo URLs are reachable before calling Replicate
    for (let i = 0; i < photo_urls.length; i++) {
      try {
        const head = await fetch(photo_urls[i], { method: "HEAD" })
        if (!head.ok) {
          throw new Error(`Photo URL ${i} returned ${head.status}: ${photo_urls[i].slice(0, 80)}...`)
        }
      } catch (fetchErr) {
        throw new Error(`Photo URL ${i} unreachable: ${(fetchErr as Error).message}. URL: ${photo_urls[i].slice(0, 100)}...`)
      }
    }

    // Category: animate_single
    if (category === "animate_single") {
      let sourceImageUrl = photo_urls[0]

      // Apply effect if realistic (gpt-image-2 — typically 20-30s)
      if (effect_id !== "none" && effect_mode === "realistic") {
        const effectPrompt = EFFECT_PROMPTS[effect_id]
        if (!effectPrompt) throw new Error(`Unknown effect: ${effect_id}`)
        sourceImageUrl = await generateWithNanoBanana(sourceImageUrl, effectPrompt, REPLICATE_TOKEN)
      }

      // Kick off video generation. If it completes within wait window, return URL.
      // Otherwise return prediction_id so the client can poll without hitting edge timeout.
      // If the caller passed text_overlay, propagate it via context so the
      // prompt builder burns the title directly into the frame.
      const animateContext = text_overlay?.text
        ? { textOverlay: text_overlay as { text: string; fontStyle?: string; timing?: "intro" | "middle" | "outro" } }
        : undefined
      // ── SEEDANCE 2.0 + SIMPLE PROMPTS (May 12, 2026, user-empirical) ──
      // User A/B tested these EXACT prompts on Seedance 2.0 and they worked
      // beautifully with no extension / no hallucination.
      //
      // ── GUARANTEED-15s FALLBACK (May 15, 2026) ──
      // When duration: 15 is requested, try Seedance with duration=15 first.
      // If Replicate rejects it (most likely with HTTP 422 + a duration-
      // validation error message), fire two parallel predictions (10s + 5s)
      // using the same source image. Return both prediction IDs in the
      // bundle response shape with `extended_cut: true`. Client polls both,
      // then runs the existing ffmpeg.wasm stitch to concat them into a
      // single 15s MP4. 15s ALWAYS works regardless of Replicate's schema.
      const requestedDuration = duration || 5
      let result: { videoUrl?: string; predictionId?: string }
      let extendedCutMode = false
      try {
        result = await startVideoGeneration(
          sourceImageUrl,
          shot_type,
          requestedDuration,
          REPLICATE_TOKEN,
          animateContext,
        )
      } catch (firstErr) {
        const msg = (firstErr as Error)?.message ?? ""
        const isDurationRejection =
          requestedDuration === 15 && /duration|invalid_field|enum/i.test(msg)
        if (!isDurationRejection) throw firstErr

        // Replicate rejected duration: 15 — split into 10s + 5s parallel
        // predictions. Both use the same source image (the cinematic seam
        // at the 10s mark is acceptable for the guaranteed-15s feature;
        // most camera moves at 10s are still near the start of their arc).
        console.log("[animate_single] duration=15 rejected by Seedance, splitting into 10+5")
        extendedCutMode = true
        const [p10, p5] = await Promise.all([
          startVideoGeneration(sourceImageUrl, shot_type, 10, REPLICATE_TOKEN, animateContext),
          startVideoGeneration(sourceImageUrl, shot_type, 5, REPLICATE_TOKEN, animateContext),
        ])

        // If both finished within the wait window, persist and return.
        if (p10.videoUrl && p5.videoUrl) {
          const bundleStamp = Date.now()
          const clipPaths: string[] = []
          for (let i = 0; i < 2; i++) {
            const url = i === 0 ? p10.videoUrl : p5.videoUrl
            const path = await persistVideoToStorage(
              url,
              `listing-videos/${bundleStamp}/extcut-${i}.mp4`,
              supabase,
              `ext-15s[${i}]`,
            )
            if (path) clipPaths.push(path)
          }
          return new Response(JSON.stringify({
            status: "complete",
            category,
            extended_cut: true,
            video_url: p10.videoUrl,
            clip_urls: [p10.videoUrl, p5.videoUrl],
            output_clip_paths: clipPaths,
            listing,
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
        }

        // Async path for extended cut — return both prediction IDs in the
        // SAME shape POLL MODE B expects, so the existing poll-mode-B
        // handler already knows how to chase them.
        return new Response(JSON.stringify({
          status: "processing",
          category,
          extended_cut: true,
          prediction_ids: [
            { prediction_id: p10.predictionId, index: 0 },
            { prediction_id: p5.predictionId, index: 1 },
          ],
          listing,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      // Synchronous success — single-clip 10s or natively-supported 15s
      if (result.videoUrl) {
        const outputVideoPath = await persistVideoToStorage(
          result.videoUrl,
          `listing-videos/${Date.now()}/video.mp4`,
          supabase,
          "animate_single",
        )

        const response: any = {
          status: "complete",
          category,
          video_url: result.videoUrl,
          clip_urls: [result.videoUrl],
          output_video_path: outputVideoPath,
          listing,
        }
        if (effect_id !== "none" && effect_mode === "quick") {
          response.quick_effect = QUICK_EFFECT_BADGES[effect_id]
        }
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      // Async path — single prediction, client polls
      return new Response(JSON.stringify({
        status: "processing",
        prediction_id: result.predictionId,
        category,
        listing,
        quick_effect: (effect_id !== "none" && effect_mode === "quick") ? QUICK_EFFECT_BADGES[effect_id] : null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Category: sun_to_sun — true day cycle: sunrise → golden hour → dusk
    // FIRE-AND-POLL architecture: render 3 time-of-day frames synchronously
    // (~30-45s for 3 parallel gpt-image-2 calls), then KICK OFF the two Kling
    // transitions and immediately return prediction_ids for client-side polling.
    // Without this, total wall time exceeds the 60s edge timeout.
    // Category: sun_to_sun — single Seedance 2.0 day-cycle render.
    //
    // Old approach was 3 parallel gpt-image-2 frames + 2 Kling transitions = 5
    // Replicate calls and ~120s wall time, which kept hitting the 60s edge
    // timeout and burning credits even when it didn't fail. Seedance 2.0 can
    // animate a full sunrise→golden→dusk cycle from a single source photo with
    // a rich descriptive prompt — one call, higher quality, no timeout risk.
    if (category === "sun_to_sun") {
      const exteriorUrl = photo_urls[0]

      // Day-cycle prompt — Seedance-canonical, positive-only grammar.
      // Camera is intentionally locked (this is a time-lapse — the SKY
      // moves, not the camera). Sun + light evolution described as
      // continuous positive motion across the frame.
      // Minimal Seedance prompt — user-empirically-verified that short
      // prompts produce dramatically cleaner output than rich ones.
      // ── SUN-TO-SUN — SIMPLE PROMPT, FORCED END STATE ──
      // User principle: do not over-complicate. We keep the prompt as short
      // as Seedance allows while still forcing the FULL arc (the previous
      // 5-word version stopped midway because it had no end-state anchor).
      // The single trick: tell the model where to END. The duration anchor
      // ("10 seconds") gives Seedance the time budget; "ends at sunset"
      // gives it the target. Everything else the model fills in.
      const dayCyclePrompt =
        "time-lapse of still house, sunrise to sunset, locked camera, sun moves across the sky and ends at sunset"

      console.log("[sun_to_sun] kicking off single Seedance 2.0 day-cycle prediction (10s)")
      const result = await startSeedanceFromImage(
        exteriorUrl,
        dayCyclePrompt,
        10,
        REPLICATE_TOKEN
      )

      // Synchronous success
      if (result.videoUrl) {
        const outputVideoPath = await persistVideoToStorage(
          result.videoUrl,
          `listing-videos/${Date.now()}/sun-cycle.mp4`,
          supabase,
          "sun_to_sun",
        )

        return new Response(JSON.stringify({
          status: "complete",
          category,
          video_url: result.videoUrl,
          clip_urls: [result.videoUrl],
          output_video_path: outputVideoPath,
          listing,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      // Async path — single prediction_id, client polls
      return new Response(JSON.stringify({
        status: "processing",
        prediction_id: result.predictionId,
        category,
        listing,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // ── Category: done_for_you_reel (May 24, 2026 — single Seedance call) ──
    // User direction: no more stitching. We send the user-uploaded photos as
    // reference_images IN UPLOAD ORDER to Seedance 2.0, which produces one
    // 15s reel cycling through them. The prompt is one of four user-tested
    // edit styles (Snappy / Fast Cuts / Creative / Luxury Minimal). Native
    // audio is on by default; off when generate_audio === false.
    if (category === "done_for_you_reel") {
      const photos = photo_urls.slice(0, 9) // Seedance cap
      if (photos.length === 0) {
        throw new Error("done_for_you_reel requires at least one photo URL.")
      }
      const dfyPrompt: string =
        typeof body.dfy_prompt === "string" && body.dfy_prompt.trim().length > 0
          ? body.dfy_prompt.trim()
          : "cinematic reel of animated walk through of the house, edited with fast cuts and smooth transitions"
      // generate_audio reserved for when we wire it through a confirmed
      // Seedance input field — see helper note for rationale.
      const _generateAudio = body.generate_audio !== false

      console.log(`[done_for_you_reel] Seedance multi-ref — photos=${photos.length} style=${body.dfy_style || "snappy"}`)
      const result = await startSeedanceMultiReference(
        photos,
        dfyPrompt,
        15, // single 15s reel
        REPLICATE_TOKEN,
      )

      if (result.videoUrl) {
        const outputVideoPath = await persistVideoToStorage(
          result.videoUrl,
          `listing-videos/${Date.now()}/dfy-reel.mp4`,
          supabase,
          "done_for_you_reel",
        )
        return new Response(JSON.stringify({
          status: "complete",
          category,
          video_url: result.videoUrl,
          clip_urls: [result.videoUrl],
          output_video_path: outputVideoPath,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      return new Response(JSON.stringify({
        status: "processing",
        prediction_id: result.predictionId,
        category,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Category: listing_bundle — cached frontends still alias done_for_you_reel
    // to listing_bundle. Route them through the new Seedance-2 multi-reference
    // path when the new dfy_prompt field is present (= new frontend, just with
    // stale alias). Otherwise fall through to the legacy parallel-clips
    // pipeline for any truly old in-flight requests.
    if (category === "listing_bundle" && typeof body.dfy_prompt === "string" && body.dfy_prompt.trim().length > 0) {
      const photos = photo_urls.slice(0, 9)
      const dfyPrompt = (body.dfy_prompt as string).trim()
      console.log(`[listing_bundle→dfy] cached-alias route — photos=${photos.length} style=${body.dfy_style || "snappy"}`)
      const result = await startSeedanceMultiReference(photos, dfyPrompt, 15, REPLICATE_TOKEN)
      if (result.videoUrl) {
        const outputVideoPath = await persistVideoToStorage(
          result.videoUrl,
          `listing-videos/${Date.now()}/dfy-reel.mp4`,
          supabase,
          "done_for_you_reel",
        )
        return new Response(JSON.stringify({
          status: "complete",
          category: "done_for_you_reel",
          video_url: result.videoUrl,
          clip_urls: [result.videoUrl],
          output_video_path: outputVideoPath,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
      return new Response(JSON.stringify({
        status: "processing",
        prediction_id: result.predictionId,
        category: "done_for_you_reel",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Category: listing_bundle — legacy parallel-clips pipeline.
    // True legacy path. Only reachable when an old client submits without
    // the new dfy_prompt field. Returns prediction_ids the client polls.
    if (category === "listing_bundle") {
      // Narrative beat ORDER per research (Reels Ninja + Content-to-Closings):
      // establishing → hero → detail → HERO (not detail) → amenity → closing.
      // The detail-detail middle was a known engagement drop zone in
      // listing-reel data. Hero re-appears at slot 4 to inject energy.
      const shotRotation = [
        "establishing",   // 1. Wide opener — moving hook
        "push_in",        // 2. Hero — strongest interior feature
        "architectural",  // 3. Detail — read materials
        "pedestal_up",    // 4. Hero again — second signature space (vertical lift)
        "truck_right",    // 5. Amenity — outdoor / signature (clean lateral slide)
        "parallax_left",  // 6. Closing — composed parallax
      ]
      const photos = photo_urls.slice(0, 6)

      // Apply realistic effect to first photo only (nano-banana, ~10s)
      let firstPhoto = photos[0]
      if (effect_id !== "none" && effect_mode === "realistic") {
        const effectPrompt = EFFECT_PROMPTS[effect_id]
        if (effectPrompt) {
          firstPhoto = await generateWithNanoBanana(firstPhoto, effectPrompt, REPLICATE_TOKEN)
          photos[0] = firstPhoto
        }
      }

      // Kick off ALL clip predictions in parallel — each photo is sent to
      // Seedance INDIVIDUALLY (one image per request, never multiple at
      // once). Each call gets a unique narrative beat + position context
      // so the model treats it as a deliberate shot in a 6-shot story
      // instead of a generic clip from a batch.
      // Beat labels match the buildClipPrompt beat register names exactly so
      // the per-clip register language fires correctly.
      const NARRATIVE_BEATS = [
        "establishing",
        "hero",
        "detail",
        "hero",
        "amenity",
        "closing",
      ]
      // ── ATMOSPHERIC LOCK ──
      // Single time-of-day phrase repeated VERBATIM across every clip in
      // the bundle. Per research, token-for-token repetition anchors
      // Seedance's grade and time-of-day decision across separate calls,
      // giving stitched reels visual cohesion they otherwise lack.
      // Picked once per bundle from a small palette so different reels
      // still feel distinct from each other.
      const ATMOSPHERIC_STATES = [
        "late-afternoon golden-hour light, warm 3200K amber key from camera-left, cool blue ambient fill, long soft shadows; this exact lighting state holds across every clip in the reel",
        "soft mid-morning natural daylight, neutral 5400K key from large windows, gentle warm bounce on pale surfaces, faint atmospheric haze; this exact lighting state holds across every clip in the reel",
        "warm dusk interior with motivated 2700K practicals, lamps reading as warm hero light against cool 5200K residual daylight in shadows; this exact lighting state holds across every clip in the reel",
        "bright overcast diffuse daylight at 6500K, shadowless gallery brightness, clean white balance, all surfaces evenly lit; this exact lighting state holds across every clip in the reel",
      ]
      const atmosphericLock = ATMOSPHERIC_STATES[Math.floor(Math.random() * ATMOSPHERIC_STATES.length)]

      // ── TITLE OVERLAY ROUTING ──
      // If the caller provided text_overlay, attach it to the CLOSING clip
      // by default so the address/price burns into the reel's resolution
      // beat. Empirically tested winner: middle timing on the last clip
      // gives the title maximum dwell time without competing with the hero.
      // If the caller wants a different position, they can pass
      // text_overlay.clipIndex (0-based) to override.
      const overlayClipIndex = (text_overlay?.text && typeof text_overlay?.clipIndex === "number")
        ? text_overlay.clipIndex
        : photos.length - 1 // default: closing clip

      console.log(`[listing_bundle] kicking off ${photos.length} INDIVIDUAL Seedance 2.0 calls @ 5s each, atmospheric_lock="${atmosphericLock.slice(0, 60)}…", overlayOnClip=${text_overlay?.text ? overlayClipIndex : "none"}`)
      const startResults = await Promise.all(
        photos.map(async (url, i) => {
          try {
            const clipContext: ClipContext = {
              index: i + 1,
              total: photos.length,
              beat: NARRATIVE_BEATS[i % NARRATIVE_BEATS.length],
              atmosphericLock,
            }
            // Attach burn-in title to the chosen clip only.
            if (text_overlay?.text && i === overlayClipIndex) {
              clipContext.textOverlay = {
                text: text_overlay.text,
                fontStyle: text_overlay.fontStyle,
                timing: text_overlay.timing,
              }
            }
            const result = await startVideoGeneration(
              url,
              shotRotation[i % shotRotation.length],
              5,
              REPLICATE_TOKEN,
              clipContext,
            )
            return { index: i, ...result }
          } catch (err) {
            return { index: i, error: (err as Error).message }
          }
        })
      )

      const successful = startResults.filter((r) => !r.error)
      const failed = startResults.filter((r) => r.error)

      if (successful.length === 0) {
        throw new Error(`All ${photos.length} clips failed to start: ${failed[0]?.error}`)
      }

      // If ALL clips happened to complete during the wait window, return immediately
      const allDone = successful.every((r) => r.videoUrl)
      if (allDone) {
        const clipUrls = successful.map((r) => r.videoUrl!)
        // Persist — retry-backed so storage hiccups don't yield expiring links.
        const bundleStamp = Date.now()
        const clipPaths: string[] = []
        for (let i = 0; i < clipUrls.length; i++) {
          const path = await persistVideoToStorage(
            clipUrls[i],
            `listing-videos/${bundleStamp}/clip-${i}.mp4`,
            supabase,
            `bundle-sync[${i}]`,
          )
          if (path) clipPaths.push(path)
        }
        const response: any = {
          status: "complete",
          category,
          video_url: clipUrls[0],
          clip_urls: clipUrls,
          output_clip_paths: clipPaths,
          listing,
        }
        if (effect_id !== "none" && effect_mode === "quick") {
          response.quick_effect = QUICK_EFFECT_BADGES[effect_id]
        }
        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      // Async path — return prediction_ids array, client polls
      return new Response(JSON.stringify({
        status: "processing",
        category,
        prediction_ids: successful.map((r) => ({ index: r.index, prediction_id: r.predictionId, video_url: r.videoUrl || null })),
        listing,
        quick_effect: (effect_id !== "none" && effect_mode === "quick") ? QUICK_EFFECT_BADGES[effect_id] : null,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Category: virtual_staging
    if (category === "virtual_staging") {
      const { staging_style, vibe } = body
      // ── MULTI-STYLE STAGING (May 24, 2026) ──
      // User Replicate-tested the simple template
      //   "redesign the living room furniture decor into [s1] style then [s2],
      //    then [s3] style while keeping the layout and the room intact only
      //    changing furnitures and furniture placements, smooth transition
      //    between changes furnitures spin to change"
      // and a return-to-original variant. We now accept staging_styles[] and
      // staging_mode and build the prompt from that template. Falls back to
      // the legacy single staging_style for clients that haven't been updated.
      const stagingMode: "single" | "cycle" | "cycle_return" = (body.staging_mode === "cycle" || body.staging_mode === "cycle_return") ? body.staging_mode : "single"
      const stylesArr: string[] = Array.isArray(body.staging_styles) && body.staging_styles.length > 0
        ? body.staging_styles
        : (staging_style ? [staging_style] : [])

      if (!stylesArr.length) {
        throw new Error(`virtual_staging requires staging_styles[] or staging_style. Received: "${JSON.stringify(body.staging_styles)}" / "${staging_style}"`)
      }

      // Validate each style maps to a known keyword
      const unknownStyle = stylesArr.find((s) => !STAGING_STYLES[s])
      if (unknownStyle) {
        throw new Error(`virtual_staging: unknown style "${unknownStyle}". Valid: ${Object.keys(STAGING_STYLES).join(", ")}`)
      }

      if (!vibe) {
        throw new Error(`All categories require vibe. Received: "${vibe}"`)
      }

      const emptyRoomUrl = photo_urls[0]
      const vibePromptSuffix = vibeSuffix(vibe)

      // Build the user's tested-template prompt from the keyword list. We
      // prefer the short keyword ("luxury minimalist", "bohemian") over the
      // longer aesthetic clause because Seedance honors the layout-lock
      // language more reliably with a terse prompt.
      const keywordFor = (id: string) => STAGING_STYLE_KEYWORDS[id] || id.replace(/_/g, " ")
      const keywordList = stylesArr.map(keywordFor)
      const styleClause = keywordList.map((k, i) => i === 0 ? `into a ${k} style living room` : `then a ${k} style`).join(", ")

      // Template variants — each verbatim from the user's Replicate tests.
      let fullTransformPrompt: string
      if (stagingMode === "single") {
        fullTransformPrompt =
          `redesign the living room furniture decor ${styleClause} while keeping the layout and the room intact only changing furnitures and furniture placements`
      } else if (stagingMode === "cycle") {
        fullTransformPrompt =
          `redesign the living room furniture decor ${styleClause} while keeping the layout and the room intact only changing furnitures and furniture placements, smooth transition between changes furnitures spin to change`
      } else {
        // cycle_return
        fullTransformPrompt =
          `begin with original then redesign the living room furniture decor ${styleClause}, then back to original image while keeping the layout and the room intact only changing furnitures and furniture placements, smooth transition between changes furnitures spin to change`
      }

      // ── STATIC-CAMERA STAGING (May 16, 2026) ──
      // We keep camera_fixed:true so framing matches the input photo. The
      // multi-style prompt only changes the furniture — the room itself
      // and its perspective stay locked.

      console.log(`[virtual_staging] kicking off Seedance staging — mode=${stagingMode} styles=${stylesArr.join(",")}`)
      const result = await startSeedanceFromImage(
        emptyRoomUrl,
        fullTransformPrompt,
        10,
        REPLICATE_TOKEN,
        { cameraFixed: true }
      )

      // Single-clip path — same shape as animate_single
      if (result.videoUrl) {
        const outputVideoPath = await persistVideoToStorage(
          result.videoUrl,
          `listing-videos/${Date.now()}/staging.mp4`,
          supabase,
          "virtual_staging",
        )

        return new Response(JSON.stringify({
          status: "complete",
          category,
          video_url: result.videoUrl,
          clip_urls: [result.videoUrl],
          output_video_path: outputVideoPath,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      // Async — single prediction_id, client polls (single-clip shape)
      return new Response(JSON.stringify({
        status: "processing",
        prediction_id: result.predictionId,
        category,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Category: sketch_to_real
    // FLOW (nano-banana sketch reveal — verified working on Replicate):
    //   1. User uploads their PROPERTY PHOTO (the real subject, not a sketch).
    //   2. nano-banana takes that photo as `image_input` reference and produces
    //      a hand-drawing-on-desk image: pencil sketch of the same property,
    //      sitting on a wooden desk, with a person's hand drawing it.
    //   3. Kling animates: sketch-on-desk → actual property photo. The sketch
    //      "becomes real" — the magic moment from the reference reels.
    //   4. Kling slow_push reveal of the property photo as clip 2.
    if (category === "sketch_to_real") {
      const { sketch_intent, vibe: selectedVibe } = body

      if (!sketch_intent || !["interior", "exterior"].includes(sketch_intent)) {
        throw new Error(`sketch_to_real requires sketch_intent: "interior" | "exterior". Received: "${sketch_intent}"`)
      }

      if (!selectedVibe) {
        throw new Error(`sketch_to_real requires vibe. Received: "${selectedVibe}"`)
      }

      const propertyPhotoUrl = photo_urls[0]
      const vibeLine = vibeSuffix(selectedVibe)

      // Step 1: nano-banana — generate the sketch-on-desk version of the property.
      // Highly specific: paper grade, pencil grade, hand position, desk material,
      // and lighting all named. nano-banana renders sketch + photoreal hybrids
      // best when given an explicit physical-scene brief instead of an abstract
      // "architectural sketch" prompt.
      const sketchPrompt = sketch_intent === "interior"
        ? `Generate a photograph: a sheet of warm-cream 90gsm A3 architectural drafting paper sits on a walnut desk with oiled grain figuration, oriented landscape, positioned slightly off-centre toward the lower-left. ` +
          `On the paper is a clean architectural sketch in 2H graphite pencil of the interior room shown in the reference image — same room, same proportions, same window placements, same wall lengths, same key furniture positions. ` +
          `Sketch style: a confident architect's hand. Single-weight crisp pencil lines for the room outline, light directional cross-hatching for shadow on the back wall, soft converging perspective lines fading at the edges of the page, faint construction guidelines barely visible. No colour anywhere on the page. Paper has the slightest natural warm tone of real drafting stock. ` +
          `A bare, relaxed right hand enters from the bottom-right of the frame, holding a hexagonal-shafted graphite pencil with the tip currently touching one of the lines as if mid-stroke. The hand is photographed sharply with skin texture visible. ` +
          `Desk surroundings: a ceramic mug of coffee softly out of focus in the upper-left, a small brushed-aluminum architect's scale ruler running along the top edge of the paper, a vintage brass desk lamp camera-left casting warm 2900K motivated directional light onto the paper. Faint warm-toned shadow falls right of the pencil tip. ` +
          `Camera: top-down 3/4 angle, 50mm full-frame equivalent at f/2.5, shallow depth of field with the pencil tip in razor focus, paper edges still sharp, desk softly defocused, mug fully blurred. Photoreal background with hand-drawn pencil sketch on the paper. Kodak Vision3 250D color science. ` +
          `Anti-AI: no plastic AI sheen on the desk or hand, no doubled lines on the sketch, no impossible perspective, no smudged graphite.`
        : `Generate a photograph: a sheet of warm-cream 90gsm A3 architectural drafting paper sits on a walnut desk with oiled grain figuration, oriented landscape, positioned slightly off-centre toward the lower-left. ` +
          `On the paper is a clean architectural sketch in 2H graphite pencil of the building exterior shown in the reference image — same façade, same proportions, same window and door placements, same rooflines, same massing. ` +
          `Sketch style: a confident architect's hand. Single-weight crisp pencil lines for the building outline and openings, light directional cross-hatching for siding or stone texture, perspective lines fading at the edges of the page, faint construction guidelines barely visible. No colour anywhere. Paper has the natural warm tone of real drafting stock. ` +
          `A bare, relaxed right hand enters from the bottom-right of the frame, holding a hexagonal-shafted graphite pencil with the tip currently touching one of the rooflines as if mid-stroke. The hand is photographed sharply with skin texture visible. ` +
          `Desk surroundings: a ceramic mug of coffee softly out of focus in the upper-left, a small brushed-aluminum architect's scale ruler running along the top edge of the paper, a vintage brass desk lamp camera-left casting warm 2900K motivated directional light onto the paper. Faint warm-toned shadow falls right of the pencil tip. ` +
          `Camera: top-down 3/4 angle, 50mm full-frame equivalent at f/2.5, shallow depth of field with the pencil tip in razor focus, paper edges still sharp, desk softly defocused. Photoreal background with hand-drawn pencil sketch on the paper. Kodak Vision3 250D color science. ` +
          `Anti-AI: no plastic AI sheen on the desk or hand, no doubled lines on the sketch, no impossible perspective, no smudged graphite.`

      // ── SKETCH GENERATION + FALLBACK (May 16, 2026) ──
      // User report: sketch_to_real returns non-2xx. Root cause was
      // nano-banana timing out on busy days. We now (a) extend the
      // nano-banana polling window inside the helper, and (b) wrap the
      // call so that if it still fails, we fall back to a direct Seedance
      // run anchored on the property photo with a prompt that asks
      // Seedance to invent its own sketch-to-photo morph. That keeps the
      // category usable instead of erroring out the whole request.
      let sketchOnDeskUrl: string
      let useDirectMorph = false
      try {
        console.log("[sketch_to_real] generating sketch-on-desk via nano-banana")
        sketchOnDeskUrl = await generateSketchWithNanoBanana(propertyPhotoUrl, sketchPrompt, REPLICATE_TOKEN)
      } catch (sketchErr) {
        console.warn(`[sketch_to_real] nano-banana failed (${(sketchErr as Error).message}), falling back to direct Seedance morph from the property photo`)
        sketchOnDeskUrl = propertyPhotoUrl
        useDirectMorph = true
      }

      // SINGLE 10s Seedance 2.0 clip. Prompt verbatim from the user's
      // Replicate test (May 24, 2026):
      //   "a hand drawing Architectural drawing of the exact house in the
      //    exact position of the picture, with detail and precision then
      //    renders to the real house in the same placement"
      // We swap "house" → "interior" for interior sketches.
      const subject = sketch_intent === "interior" ? "room" : "house"
      const fullSketchPrompt = useDirectMorph
        ? `a hand drawing Architectural drawing of the exact ${subject} in the exact position of the picture, with detail and precision then renders to the real ${subject} in the same placement`
        : `a hand drawing Architectural drawing of the exact ${subject} in the exact position of the picture, with detail and precision then renders to the real ${subject} in the same placement`

      console.log(`[sketch_to_real] kicking off SINGLE 10s Seedance ${useDirectMorph ? "direct-morph" : "morph+reveal"}`)
      const result = await startSeedanceFromImage(
        sketchOnDeskUrl,
        fullSketchPrompt,
        10,
        REPLICATE_TOKEN
      )

      if (result.videoUrl) {
        const outputVideoPath = await persistVideoToStorage(
          result.videoUrl,
          `listing-videos/${Date.now()}/sketch.mp4`,
          supabase,
          "sketch_to_real",
        )

        return new Response(JSON.stringify({
          status: "complete",
          category,
          video_url: result.videoUrl,
          clip_urls: [result.videoUrl],
          output_video_path: outputVideoPath,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      return new Response(JSON.stringify({
        status: "processing",
        prediction_id: result.predictionId,
        category,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Category: floor_plan_pan — Floor plan / axonometric → photoreal walkthrough
    // (Match user's reference flow: drawing → animated photoreal interior)
    if (category === "floor_plan_pan") {
      const { shot_type: selectedShotType, vibe: selectedVibe } = body

      if (!selectedShotType || !SHOT_CONFIG[selectedShotType]) {
        throw new Error(`floor_plan_pan requires valid shot_type. Received: "${selectedShotType}"`)
      }

      if (!selectedVibe) {
        throw new Error(`floor_plan_pan requires vibe. Received: "${selectedVibe}"`)
      }

      const floorPlanUrl = photo_urls[0]
      const vibeLine = vibeSuffix(selectedVibe)

      // Minimal Seedance prompt — empirically-verified short prompts win.
      // User A/B tested: "slow camera roll of still house" produced clean output
      // while 150-word rich prompts caused glitching and frame pauses.
      void vibeLine // intentionally unused — rich style language confuses Seedance
      // Simple prompt — user principle: do not over-complicate.
      const cameraMove = SHOT_CONFIG[selectedShotType]?.motionHint || "slow camera dolly forward through"
      const fullFloorPlanPrompt = `2D floor plan transforms into a photoreal interior, then ${cameraMove} the room`

      console.log("[floor_plan_pan] kicking off SINGLE 10s Seedance morph+walkthrough")
      const result = await startSeedanceFromImage(
        floorPlanUrl,
        fullFloorPlanPrompt,
        10,
        REPLICATE_TOKEN
      )

      if (result.videoUrl) {
        const outputVideoPath = await persistVideoToStorage(
          result.videoUrl,
          `listing-videos/${Date.now()}/floorplan.mp4`,
          supabase,
          "floor_plan_pan",
        )

        return new Response(JSON.stringify({
          status: "complete",
          category,
          video_url: result.videoUrl,
          clip_urls: [result.videoUrl],
          output_video_path: outputVideoPath,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }

      return new Response(JSON.stringify({
        status: "processing",
        prediction_id: result.predictionId,
        category,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    throw new Error("Unknown category")
  } catch (err) {
    const errorMsg = (err as Error).message || String(err)
    const errorStack = (err as Error).stack || ""
    console.error("[generate-listing-video] FAILED:", errorMsg)
    console.error("[generate-listing-video] STACK:", errorStack)
    console.error("[generate-listing-video] PAYLOAD WAS:", JSON.stringify(body).slice(0, 1000))
    return new Response(
      JSON.stringify({
        error: errorMsg,
        debug: {
          stack: errorStack.slice(0, 500),
          received: {
            category: body.category,
            photo_count: body.photo_urls?.length,
            shot_type: body.shot_type,
            effect_id: body.effect_id,
            effect_mode: body.effect_mode,
          },
        },
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})

// Helper: Kick off a Seedance 2.0 prediction WITHOUT awaiting completion.
// Single image input + descriptive prompt. Use for sun-cycles, sketch reveals,
// floor plan transformations — anything where Seedance's single-image cinematic
// motion handles the transformation better than Kling's start+end interpolation.
/**
 * Seedance 2.0 multi-reference call. Used by Done-For-You reels: send up
 * to 9 reference images in upload order and Seedance produces ONE 15-second
 * reel that cycles through them — no client-side stitching, no parallel
 * predictions, no glue frames.
 *
 * `generateAudio: true` (default) lets Seedance produce a native music bed.
 * False ships a silent file.
 *
 * Verified working in the user's Replicate tests (May 24, 2026).
 */
async function startSeedanceMultiReference(
  imageUrls: string[],
  prompt: string,
  duration: number,
  token: string,
  _options: { generateAudio?: boolean } = {}
): Promise<{ videoUrl?: string; predictionId?: string }> {
  // Cap at 9 — Seedance 2.0 hard limit on reference_images.
  const refs = imageUrls.slice(0, 9)
  // ── May 25, 2026 — REMOVED `generate_audio` ──
  // Seedance 2.0 (`bytedance/seedance-1-pro`) does not accept a
  // `generate_audio` input field on its public Replicate schema. Sending
  // an unknown parameter caused Replicate to 400 every prediction,
  // surfacing as non-2xx errors across every generation flow. Audio is
  // on natively by default in Seedance 2.0 output anyway, so removing
  // the field restores generations without changing what users hear.
  // The frontend `includeAudio` toggle remains — we'll wire it back
  // through to a verified Seedance parameter once confirmed.
  const res = await fetch(
    `${REPLICATE}/models/${MODEL_SEEDANCE}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({
        input: {
          prompt,
          reference_images: refs,
          duration,
          aspect_ratio: "9:16",
          resolution: "1080p",
          fps: 24,
        },
      }),
    }
  )

  const prediction = await res.json()
  if (!res.ok || !prediction.id) {
    const detail = prediction?.detail || prediction?.error?.message || JSON.stringify(prediction).slice(0, 400)
    throw new Error(`Seedance 2.0 multi-ref rejected (HTTP ${res.status}): ${detail}`)
  }

  if (prediction.status === "succeeded" && prediction.output) {
    const out = prediction.output
    const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : null)
    if (url) return { videoUrl: url }
  }

  return { predictionId: prediction.id }
}

async function startSeedanceFromImage(
  imageUrl: string,
  prompt: string,
  duration: number,
  token: string,
  options: { cameraFixed?: boolean; generateAudio?: boolean } = {}
): Promise<{ videoUrl?: string; predictionId?: string }> {
  // ── May 25, 2026 — REMOVED `generate_audio` from input ──
  // See note in startSeedanceMultiReference: the field isn't on the public
  // Replicate schema for bytedance/seedance-1-pro and was causing every
  // image-to-video call to 400. Seedance 2.0 emits audio natively on the
  // output by default. The `generateAudio` option is intentionally still
  // accepted on the helper (we just don't forward it yet) so calling code
  // doesn't have to change once we wire it back through a confirmed param.
  void options.generateAudio
  const res = await fetch(
    `${REPLICATE}/models/${MODEL_SEEDANCE}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({
        input: {
          prompt,
          image: imageUrl,
          duration,
          aspect_ratio: "9:16",
          resolution: "1080p",
          fps: 24,
          camera_fixed: options.cameraFixed === true,
        },
      }),
    }
  )

  const prediction = await res.json()
  if (!res.ok || !prediction.id) {
    const detail = prediction?.detail || prediction?.error?.message || JSON.stringify(prediction).slice(0, 400)
    throw new Error(`Seedance 2.0 rejected (HTTP ${res.status}): ${detail}`)
  }

  if (prediction.status === "succeeded" && prediction.output) {
    const out = prediction.output
    const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : null)
    if (url) return { videoUrl: url }
  }

  return { predictionId: prediction.id }
}

// Helper: Kick off a Kling start→end transition WITHOUT awaiting completion.
// Returns videoUrl if Replicate finished within the wait=60 window, otherwise
// predictionId so the client can poll. Mirrors startVideoGeneration's shape so
// it slots into the existing bundle-style poll flow.
async function startKlingTransitionPrediction(
  startImageUrl: string,
  endImageUrl: string,
  motionPrompt: string,
  duration: number,
  token: string
): Promise<{ videoUrl?: string; predictionId?: string }> {
  const prompt = `${motionPrompt}, ending fully at the second image.`

  const res = await fetch(
    `${REPLICATE}/models/${MODEL_KLING}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({
        input: {
          prompt,
          start_image: startImageUrl,
          end_image: endImageUrl,
          duration,
          aspect_ratio: "9:16",
          cfg_scale: 1.0,
        },
      }),
    }
  )

  const prediction = await res.json()
  if (!res.ok || !prediction.id) {
    const detail = prediction?.detail || prediction?.error?.message || JSON.stringify(prediction).slice(0, 400)
    throw new Error(`Kling transition rejected (HTTP ${res.status}): ${detail}`)
  }

  if (prediction.status === "succeeded" && prediction.output) {
    const out = prediction.output
    const url = typeof out === "string" ? out : (Array.isArray(out) ? out[0] : null)
    if (url) return { videoUrl: url }
  }

  return { predictionId: prediction.id }
}

// Helper: Animate transition between two photos using Kling (synchronous — waits for completion)
async function animatePhotoTransition(
  startImageUrl: string,
  endImageUrl: string,
  motionPrompt: string,
  duration: number,
  token: string
): Promise<string> {
  const prompt = `${motionPrompt}, ending fully at the second image.`

  const res = await fetch(
    "https://api.replicate.com/v1/models/kwaivgi/kling-v2.5-turbo-pro/predictions",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait=60",
      },
      body: JSON.stringify({
        input: {
          prompt,
          start_image: startImageUrl,
          end_image: endImageUrl,
          duration,
          aspect_ratio: "9:16",
          cfg_scale: 1.0,
        },
      }),
    }
  )

  const prediction = await res.json()
  if (!res.ok || !prediction.id) {
    throw new Error(`Kling failed: ${JSON.stringify(prediction)}`)
  }

  if (prediction.status === "succeeded") {
    return typeof prediction.output === "string"
      ? prediction.output
      : prediction.output?.[0]
  }

  return await pollReplicate(prediction.id)
}
