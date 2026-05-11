import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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

// ── SHOT LIBRARY (upgraded) ──
// Each motionHint now packs:
//   • named camera + rig (dolly, gimbal, drone, slider, jib, crane)
//   • lens character (focal length + DoF, anamorphic where relevant)
//   • shutter / frame-rate cues for cinematic motion blur (24fps · 180°)
//   • specific arc geometry (degrees, direction, height) — vague "around the
//     subject" produces drifting wobble; named geometry produces stable arcs
//   • composition rule the shot is built around
//
// Pacing now controls TEMPO of continuous motion. Both "slow" and "medium"
// keep the camera in motion the entire duration; only the distance covered
// changes. No "settle" beat anywhere.
const SHOT_CONFIG: Record<string, { model: "kling" | "seedance"; motionHint: string; pacing: "slow" | "medium" }> = {
  slow_push: {
    model: "kling",
    motionHint:
      "Slow continuous dolly push-in along the subject's centerline — 35mm spherical prime at f/2.8, gimbal-stabilized, no rotation, no roll, no tilt drift. Compose on the rule of thirds: subject anchored at the lower-third intersection as the camera pushes in. 24fps with a 180° shutter for natural cinematic motion blur. The camera moves one continuous unit of distance across the full clip — no stops, no acceleration ramps.",
    pacing: "slow",
  },
  drone_orbit: {
    model: "seedance",
    motionHint:
      "Slow aerial orbit — drone arcs 60 degrees clockwise around the subject at a consistent elevated altitude, gimbal-locked on the subject's centroid, smooth circular path with no radius drift. 24mm wide field of view at f/4. Composition holds the subject at frame center with the property anchored against a clearly framed horizon. The orbit speed stays uniform — no acceleration, no deceleration mid-arc, no altitude bobbing.",
    pacing: "slow",
  },
  parallax_pan: {
    model: "kling",
    motionHint:
      "Lateral parallax tracking shot moving slowly left to right — 50mm prime at f/2 on a slider rig, camera at eye level, gimbal-stabilized. Foreground elements drift roughly twice as fast as background elements, revealing depth through parallax separation. Leading-line composition: the subject's strongest horizontal line is held parallel to the frame edge across the move. 24fps with a 180° shutter.",
    pacing: "medium",
  },
  reveal_rise: {
    model: "kling",
    motionHint:
      "Continuous crane rise — camera lifts vertically from ankle height to eye level on a motorized jib, 28mm lens at f/4, no horizontal drift, no rotation. The composition reveals the subject from the bottom up: ground / threshold / mid-body / canopy unfolds as the lens rises. 24fps with a 180° shutter, gimbal-locked horizon. The rise speed is uniform across the full clip.",
    pacing: "medium",
  },
  architectural: {
    model: "seedance",
    motionHint:
      "Architectural slider track — perfectly horizontal lateral move on a precision dolly, 50mm prime at f/5.6 for sharp edge-to-edge resolution, gimbal-locked, no rotation, no tilt, no vertical drift. Frame is composed around the building's strongest vertical or horizontal symmetry line, held centered across the entire track. 24fps with a 180° shutter for clean architectural motion.",
    pacing: "slow",
  },
  establishing: {
    model: "seedance",
    motionHint:
      "Slow continuous pull-back dolly-out — starts from a tight feature detail and reveals the wider environment as the camera retreats. 24mm wide prime at f/4, gimbal-stabilized, no rotation. The retreat speed is uniform; the framing opens up gradually with foreground elements drifting in to frame the wider scene. 24fps with a 180° shutter.",
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
}

function buildClipPrompt(
  motionHint: string,
  duration: number,
  vibeLine: string,
  pacing: "slow" | "medium" = "slow",
  context?: ClipContext,
): string {
  // Pacing controls tempo of continuous motion, not the position of a freeze
  // beat. Both modes keep the camera moving across the full duration.
  const tempoCue = pacing === "slow"
    ? "The camera moves at a gentle, slow tempo — the full move unfolds gradually across the entire clip"
    : "The camera moves at a steady, measured tempo — the full move flows continuously across the entire clip"

  // Per-clip narrative position. Each beat gets a slightly different register:
  // an opener is wider and cooler; a hero shot tightens and warms; a closer
  // decelerates into a resolution without freezing. This lets stitched
  // bundles read as a deliberate sequence, not 5 unrelated clips glued
  // together.
  let beatRegister = ""
  const beat = context?.beat?.toLowerCase()
  if (beat === "establishing" || beat === "opener") {
    beatRegister = "This shot opens the reel — wider framing, cooler register, generous negative space, the cinematic register of a Sotheby's flagship opener. "
  } else if (beat === "hero" || beat === "feature") {
    beatRegister = "This shot is the hero of the reel — slightly tighter framing, warmer color register, hero-light on the strongest architectural feature, the cinematic register of an Architectural Digest cover spread. "
  } else if (beat === "detail" || beat === "texture") {
    beatRegister = "This shot is a detail beat — closer framing on a material story, raking light to reveal texture, the cinematic register of a Kinfolk close-up on a single named finish. "
  } else if (beat === "closing" || beat === "resolution" || beat === "closer") {
    beatRegister = "This shot is the closer of the reel — composed framing that decelerates into a magazine-grade resolution, warm closing light, the cinematic register of a final spread before the back cover. "
  } else if (beat === "transition" || beat === "bridge") {
    beatRegister = "This shot bridges between scenes — medium framing, neutral register, designed to connect the previous and next beats without competing with them. "
  }

  const positionHeader = context?.index && context?.total
    ? `This is shot ${context.index} of ${context.total} in a stitched cinematic listing reel${context.beat ? ` — narrative beat: ${context.beat.toUpperCase()}` : ""}. ${beatRegister}Render with extreme attention to detail: every material finish, every light interaction, every shadow physically plausible. `
    : ""

  return (
    positionHeader +
    `Cinematic 9:16 vertical real-estate listing reel, ${duration} seconds total at 24fps with a 180° shutter for natural film-grade motion blur. 1080p photorealistic, magazine-quality, Sotheby's-listing-grade finish — no compromise on detail. ` +
    // ── MOTION GRAMMAR (continuous, no freeze) ──
    `${motionHint} ${tempoCue}, gimbal-stabilized, one deliberate uninterrupted move from the opening frame through to the closing frame. The camera is in motion from frame one. Motion is continuous throughout — no held frames, no pauses, no static segments. ` +
    // ── ATMOSPHERE & DEPTH CUES ──
    `Atmosphere reads photographically: fine particulates catch any light source — dust motes drift through sun shafts, pollen or warm haze threads the air, condensation softens hard reflections in window glass. Depth is built by parallax between near and far elements, by lens compression, and by light falloff into shadows. ` +
    // ── MATERIAL MICRO-PHYSICS ──
    `Material textures stay legible as the camera passes them: wood grain pulls focus along its length, fabric weave catches raking light, stone veining is read as one continuous physical pattern, metal finishes (brushed, polished, satin, lacquered) each reflect light according to their named surface — never plastic, never CGI-flat. ` +
    // ── DECELERATION INSTEAD OF STOP ──
    `Across the final second the move eases out gracefully — a smooth deceleration to a gentle resolution, never a hard stop. The camera keeps drifting at a fraction of its earlier speed all the way to the last frame. The closing composition reads as magazine-grade, but as a frame inside a continuing movement, not a frozen still. ` +
    // ── ARCHITECTURAL ANCHORS ──
    `Throughout the move the architecture stays exactly identical to the source photo — no morphing, no invented rooms, no weather change, no added objects, no rearranged furniture, no impossible reflections. The room is anchored; the camera is what moves. ` +
    // ── STABILITY ──
    `Stability: avoid jitter, avoid camera shake, avoid handheld micro-wobble, avoid sudden direction changes, avoid speed-ramps, avoid flickering, avoid motion blur artifacts beyond the natural 180° shutter. Avoid fish-eye distortion. Avoid plastic AI sheen on surfaces. Avoid banded skies. Avoid over-saturated grading. ` +
    // ── NO HUMANS (legal/MLS-critical) ──
    `Property is empty and unoccupied: absolutely no people, no humans, no human figures, no faces, no body parts, no hands, no arms, no legs, no torsos, no children, no occupants, no agents, no realtors, no homeowners, no visitors, no shadows of people, no human silhouettes, no reflections of people in glass or mirrors, no movement of any human, the entire frame is empty of all human presence. ` +
    // ── VIBE (carries lens, color science, film-stock, aesthetic anchor) ──
    `${vibeLine} ` +
    // ── ANTI-FREEZE NEGATIVE CAP (research-validated tail) ──
    `Motion sustains continuously through every single frame — no freeze frames, no held frames, no static moments, no stop-and-hold, no frozen establishing shot, no frozen closing shot, no pauses on any frame at any time.`
  )
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

// ── Vibe → cinematic suffix (upgraded) ──
// Each suffix is now an eight-element brief:
//   1. Camera + lens + f-stop + shutter + frame rate
//   2. Color science / film-stock emulation (Kodak Vision3, Fuji Eterna, etc.)
//   3. Light qualities (Kelvin, direction, falloff, motivation)
//   4. Specularity + how light reads on named materials
//   5. Atmospheric particulates (dust motes, haze, breath, foliage drift)
//   6. Aesthetic reference anchor (a named publication or filmmaker style)
//   7. Composition rule the vibe leans on
//   8. Negative aesthetic (what NOT to look like)
//
// Concrete optical and color targets produce visibly different output than
// vague mood words. Seedance + Kling are demonstrably stronger when given
// named film stocks ("Kodak Vision3 250D") than when given "warm tones."
function vibeSuffix(vibe: string): string {
  switch (vibe) {
    case "luxury":
      return "Shot on an Arri Alexa-class digital cinema body with a 35mm spherical prime at f/2, 24fps, 180° shutter — shallow depth of field, creamy circular bokeh on backgrounds. Color science: Kodak Vision3 250D film emulation, graded Rec.709 with a deep navy-and-amber split-tone. Light: golden-hour 3200K rakes from low and side, deep saturated shadows in the cool quadrant, controlled specular highlights on unlacquered brass, honed marble veining, and lacquered stone. Atmosphere: a fine warm haze catches every light source — pollen drift, faint dust motes in the sun shafts. Aesthetic anchor: an Architectural Digest cover spread, a Sotheby's flagship listing reel. Composition: golden-ratio negative space, subject at the lower-left third. Avoid plastic AI sheen, banded skies, over-saturation, flat AI lighting."
    case "cozy":
      return "Shot on a Sony VENICE-class body with a 50mm Cooke S4 prime at f/2.8, 24fps, 180° shutter — natural depth of field, faces and textures in tactile focus. Color science: Fuji Eterna 250D emulation, gentle filmic shadow rolloff, slight warm shift in midtones. Light: motivated tungsten interior at 2700K from practical lamps, soft long shadows, low-key fill, golden bounce off pale linen. Specularity reads as warm halations on lacquered wood and softened glints on ceramic glazes. Atmosphere: drifting steam from a mug, dust catching evening light, slight film grain. Aesthetic anchor: a Kinfolk Magazine interior, a Nancy Meyers kitchen. Composition: rule of thirds with a strong leading line toward a focal lamp. Avoid clinical lighting, hard daylight, flat AI rendering."
    case "modern":
      return "Shot on an Arri Mini LF-class body with a 24mm Zeiss Supreme wide prime at f/4, 24fps, 180° shutter — sharp edge-to-edge, architectural lines crisp without barrel distortion. Color science: Arri Alexa LogC graded to a cool Rec.709 with neutral skin and steel-blue shadows. Light: cool diffuse daylight at 5600K — almost shadowless, gallery-bright, clean white balance. Specularity is restrained: brushed nickel, satin lacquer, honed concrete read with precise micro-contrast, no glare. Atmosphere: minimal — clean cool air, faint paper-thin haze for depth. Aesthetic anchor: a Dwell Magazine spread, a Tadao Ando residence reveal. Composition: symmetric framing built around the strongest architectural vertical. Avoid warm color cast, film grain, hard shadows, decorative clutter."
    case "family":
      return "Shot on a Canon C500-class body with a 35mm prime at f/2.8, 24fps, 180° shutter — natural eye-level perspective, gentle depth of field. Color science: Kodak Vision3 500T tungsten balanced to daylight, friendly midtone warmth. Light: bright midday natural sun at 5000K through clean windows, soft fill from off-camera bounce, no harsh shadows. Specularity is gentle — softened reflections on wood floors, warm bounce on cream walls. Atmosphere: light air drift through screen doors, slight outdoor warmth pouring inward. Aesthetic anchor: a contemporary Better Homes & Gardens cover, a relaxed Magnolia-network reveal. Composition: rule of thirds with the family-room hearth or kitchen island as the anchor. Avoid over-stylized contrast, moody shadows, AI-fake bokeh."
    case "investment":
      return "Shot on a Sony FX6-class body with a 28mm prime at f/5.6, 24fps, 180° shutter — deep depth of field so every detail of the layout reads. Color science: neutral Rec.709 with no creative grade, true white balance at 5200K, MLS-compliant clean rendering. Light: bright even daylight, no directional drama, no warm or cool cast. Specularity is precise and uncreative — every surface is read as itself, no flourishes. Atmosphere: clean air, no haze, no particulates. Aesthetic anchor: a top-shelf realtor.com / Zillow flagship video. Composition: centered architectural framing, every door and window clearly legible, rule-of-thirds only when it improves spatial readability. Avoid film grain, color flourishes, moody lighting, anamorphic flares."
    case "vacation":
      return "Shot on an Arri Alexa Mini-class body with a 35mm anamorphic at f/2 (2× squeeze where supported), 24fps, 180° shutter — shallow depth of field, oval bokeh, signature horizontal lens flares from any direct light source. Color science: Fuji 8553-style golden-hour grade, warm midtones, deep cyan in the shadows. Light: sunset 3000K with a hot horizon glow, side-rim on foliage and water, soft amber bounce from sand or stone. Atmosphere: gentle haze catching the sun, salt spray or pollen drift, light breeze visible in leaves, fronds, or sheer curtains. Aesthetic anchor: a Conde Nast Traveler spread, an Aman Resorts promotional reel. Composition: rule of thirds with the horizon on the upper line and a foreground anchor like a pool edge or stone deck. Avoid clinical mid-day light, cool color casts, hard sharpness."
    default:
      return "Shot on a Sony FX6-class body with a 35mm prime at f/2.8, 24fps, 180° shutter — natural depth of field. Color science: Kodak Vision3 250D emulation graded Rec.709, gentle filmic rolloff in highlights and shadows. Light: warm diffuse natural light at 3800K, soft shadows, motivated direction. Specularity reads as photographic, not plastic. Aesthetic anchor: a Dwell Magazine listing reel. Composition: rule of thirds, leading lines into the subject. Avoid plastic AI sheen, flat lighting, over-saturation."
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
          output_format: "jpg",
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
      throw new Error("nano-banana succeeded but returned no URL")
    }
    if (pollData.status === "failed" || pollData.status === "canceled") {
      throw new Error(`nano-banana failed: ${pollData.error || "unknown"}`)
    }
  }
  throw new Error("nano-banana sketch generation timed out")
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
            output_format: "jpg",
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
            output_format: "jpg", // Kling/Seedance reject webp downstream
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
          input: { prompt: effectPrompt, image_input: [imageUrl], output_format: "jpg" },
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

// Returns either { videoUrl } if Replicate finished within wait window,
// or { predictionId } if still processing — caller can poll.
async function startVideoGeneration(
  imageUrl: string,
  shotType: string,
  duration: number,
  token: string,
  context?: ClipContext,
): Promise<{ videoUrl?: string; predictionId?: string }> {
  const config = SHOT_CONFIG[shotType]
  if (!config) throw new Error(`Unknown shot type: ${shotType}`)

  // Auto-promote long-form clips to Seedance 2.0 even when the shot type defaults to Kling
  const useSeedance = config.model === "seedance" || duration >= LONG_FORM_THRESHOLD_SECONDS

  // Timeline-prompted: explicit [0:00–0:0N] beats guide Seedance/Kling to a
  // controlled open → move → settle structure. Per-clip context (if provided)
  // tells the model where this clip sits in the larger reel so it leans into
  // the appropriate cinematic register.
  const prompt = buildClipPrompt(config.motionHint, duration, vibeSuffix("luxury"), config.pacing, context)
  // The no-humans stack is intentionally exhaustive — listing reels with
  // invented occupants are unusable for legal-disclosure reasons, so we
  // repeat the constraint in many forms to maximize negative-prompt strength.
  const negativePrompt = "people, humans, human figures, faces, body parts, hands, arms, legs, torsos, children, occupants, agents, realtors, homeowners, visitors, shadows of people, human silhouettes, reflections of people, human movement, invented rooms, new objects, added animals, pets, weather changes, morphing or warping geometry, flickering, motion blur, floating objects, lighting changes, added reflections, ghost trails, duplicated surfaces, fast motion, jitter, camera shake, low resolution, soft focus, blurry edges, compression artifacts."

  const endpoint = useSeedance
    ? `${REPLICATE}/models/${MODEL_SEEDANCE}/predictions`
    : `${REPLICATE}/models/${MODEL_KLING}/predictions`

  // Kling accepts start_image/end_image + negative_prompt.
  // Seedance Pro accepts `image` only.
  const modelInput: Record<string, unknown> = useSeedance
    ? {
        prompt,
        image: imageUrl,
        duration,
        aspect_ratio: "9:16",
        resolution: "1080p",
      }
    : {
        prompt,
        start_image: imageUrl,
        duration,
        aspect_ratio: "9:16",
        negative_prompt: negativePrompt,
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
        // Persist
        const clipPaths: string[] = []
        for (let i = 0; i < clipUrls.length; i++) {
          try {
            const clipFetch = await fetch(clipUrls[i])
            const clipBuffer = await clipFetch.arrayBuffer()
            const clipPath = `listing-videos/${Date.now()}/clip-${i}.mp4`
            await supabase.storage.from("project-submissions").upload(clipPath, clipBuffer, {
              contentType: "video/mp4", upsert: true,
            })
            clipPaths.push(clipPath)
          } catch (storageErr) {
            console.error(`[bundle-poll] storage clip ${i} failed:`, storageErr)
          }
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
        let outputVideoPath: string | null = null
        try {
          const videoFetch = await fetch(videoUrl)
          const videoBuffer = await videoFetch.arrayBuffer()
          const videoPath = `listing-videos/${Date.now()}/video.mp4`
          await supabase.storage.from("project-submissions").upload(videoPath, videoBuffer, {
            contentType: "video/mp4",
            upsert: true,
          })
          outputVideoPath = videoPath
        } catch (storageErr) {
          console.error("[poll] storage failed:", storageErr)
        }

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
    } = body

    // Validate
    if (!category || !photo_urls || photo_urls.length === 0) {
      throw new Error(`category and photo_urls required. Received: category="${category}", photo_urls.length=${photo_urls?.length}`)
    }

    if (!["animate_single", "sun_to_sun", "listing_bundle", "virtual_staging", "sketch_to_real", "floor_plan_pan"].includes(category)) {
      throw new Error(`category must be animate_single, sun_to_sun, listing_bundle, virtual_staging, sketch_to_real, or floor_plan_pan. Received: "${category}"`)
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
      const result = await startVideoGeneration(
        sourceImageUrl,
        shot_type,
        duration || 5,
        REPLICATE_TOKEN
      )

      // Synchronous success
      if (result.videoUrl) {
        let outputVideoPath: string | null = null
        try {
          const videoFetch = await fetch(result.videoUrl)
          const videoBuffer = await videoFetch.arrayBuffer()
          const videoPath = `listing-videos/${Date.now()}/video.mp4`
          await supabase.storage.from("project-submissions").upload(videoPath, videoBuffer, {
            contentType: "video/mp4",
            upsert: true,
          })
          outputVideoPath = videoPath
        } catch (storageErr) {
          console.error("[animate_single] storage failed:", storageErr)
        }

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

      // Async path — client polls
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

      // Upgraded day-cycle prompt — film-stock grade, named atmospheric
      // cues, continuous light evolution. Camera is intentionally locked
      // (this is a time-lapse; the SKY moves, not the camera) — so the
      // anti-freeze rules apply to the sky/shadows, not the frame itself.
      const dayCyclePrompt =
        "Cinematic 9:16 vertical real-estate time-lapse, 10 seconds total at 24fps with a 180° shutter. 1080p photorealistic, magazine-quality, Architectural Digest exterior-cover finish. " +
        "Camera: locked tripod composition on a 28mm prime at f/5.6, gimbal-stabilized to zero motion — the camera does not move, does not zoom, does not parallax, does not bob. The entire frame composition stays exact. Time-lapse motion lives in the SKY and SHADOWS, never in the camera. " +
        "Color science: Kodak Vision3 250D emulation graded Rec.709, with a deliberate cool-shadow / warm-highlight split-tone that evolves across the day cycle. " +
        // ── Continuous light evolution from sunrise → dusk ──
        "Time-of-day evolution is continuous across the clip — the sun's position, the sky color, and the shadow direction all evolve smoothly from frame one to frame one-hundred-and-twenty. No abrupt jumps, no flicker, no stepping. " +
        "[0:00–0:02] SUNRISE: soft pink-and-amber sky above the eastern horizon, sun just clearing the tree line, long cool blue cast shadows pointing west across the lawn. Light has the soft scatter of dawn humidity. " +
        "[0:02–0:05] Sun arcs continuously toward the south. Light warms into GOLDEN HOUR — orange and amber tones rake across the building, shadows compress and warm, sky transitions through amber into deep gold. Foliage glows backlit. " +
        "[0:05–0:08] Late golden hour continuously transitions into BLUE HOUR / DUSK — sky deepens through cyan into cobalt, with a sustained warm horizon glow. Ambient light cools while the building face still catches warmth on its western elevation. " +
        "[0:08–0:10] Full dusk — interior windows glow warm 2700K tungsten from inside, exterior reads as a deep cobalt silhouette with the warm interior reading through every window. Stars begin to faintly emerge in the upper sky. " +
        // ── Atmosphere & specificity ──
        "Atmosphere reads photographically: fine air particulates catch the low sun across sunrise and golden hour, evening haze warms the horizon at dusk, foliage drifts subtly in a gentle ambient breeze. " +
        // ── Anchors ──
        "Architecture, landscaping, foliage, framing, lens choice, and camera position all stay exactly identical to the source photo throughout — only sky, sun, light direction, shadow direction, and interior window glow evolve. " +
        // ── Stability ──
        "Sun motion is continuous and physically accurate — no jump cuts, no flicker, no banding in the sky, no impossible reflections, no plastic surfaces. " +
        // ── No humans ──
        "The property is empty and unoccupied: absolutely no people, no humans, no human figures, no faces, no body parts, no children, no occupants, no agents, no homeowners, no visitors, no shadows of people, no human silhouettes, no reflections of people, the entire frame is empty of all human presence throughout. " +
        // ── Anti-freeze (sky/light must continuously evolve) ──
        "Sky color, sun position, light direction, and shadow geometry evolve continuously through every single frame — no held sky color, no static shadow segment, no stepping, no flicker, no pauses in the time-lapse evolution."

      console.log("[sun_to_sun] kicking off single Seedance 2.0 day-cycle prediction (10s)")
      const result = await startSeedanceFromImage(
        exteriorUrl,
        dayCyclePrompt,
        10,
        REPLICATE_TOKEN
      )

      // Synchronous success
      if (result.videoUrl) {
        let outputVideoPath: string | null = null
        try {
          const videoFetch = await fetch(result.videoUrl)
          const videoBuffer = await videoFetch.arrayBuffer()
          const videoPath = `listing-videos/${Date.now()}/sun-cycle.mp4`
          await supabase.storage.from("project-submissions").upload(videoPath, videoBuffer, {
            contentType: "video/mp4",
            upsert: true,
          })
          outputVideoPath = videoPath
        } catch (storageErr) {
          console.error("[sun_to_sun] storage failed:", storageErr)
        }

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

    // Category: listing_bundle — fire N Seedance predictions in parallel, return prediction_ids
    if (category === "listing_bundle") {
      const shotRotation = ["slow_push", "parallax_pan", "reveal_rise", "architectural", "establishing", "drone_orbit"]
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
      const NARRATIVE_BEATS = [
        "establishing wide — set the property in its world",
        "hero push — the strongest single frame, give it weight",
        "architectural detail — read the materials, finishes, and craft",
        "interior reveal — open up the space, suggest scale",
        "atmospheric beat — light, texture, mood",
        "closing pull-back — leave the viewer with the whole picture",
      ]
      console.log(`[listing_bundle] kicking off ${photos.length} INDIVIDUAL Seedance 2.0 calls @ 5s each (one image per request)`)
      const startResults = await Promise.all(
        photos.map(async (url, i) => {
          try {
            const result = await startVideoGeneration(
              url,
              shotRotation[i % shotRotation.length],
              5,
              REPLICATE_TOKEN,
              {
                index: i + 1,
                total: photos.length,
                beat: NARRATIVE_BEATS[i % NARRATIVE_BEATS.length],
              },
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
        // Store
        const clipPaths: string[] = []
        for (let i = 0; i < clipUrls.length; i++) {
          try {
            const clipFetch = await fetch(clipUrls[i])
            const clipBuffer = await clipFetch.arrayBuffer()
            const clipPath = `listing-videos/${Date.now()}/clip-${i}.mp4`
            await supabase.storage
              .from("project-submissions")
              .upload(clipPath, clipBuffer, { contentType: "video/mp4", upsert: true })
            clipPaths.push(clipPath)
          } catch (storageErr) {
            console.error(`Failed to store clip ${i}:`, storageErr)
          }
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

      if (!staging_style || !STAGING_STYLES[staging_style]) {
        throw new Error(`virtual_staging requires valid staging_style. Received: "${staging_style}"`)
      }

      if (!vibe) {
        throw new Error(`All categories require vibe. Received: "${vibe}"`)
      }

      const emptyRoomUrl = photo_urls[0]
      const stylePrompt = STAGING_STYLES[staging_style]
      const vibePromptSuffix = vibeSuffix(vibe)
      // Single Seedance call handles the entire transformation — no separate
      // gpt-image-2 staging step. The style prompt drives the furnishing.

      // SINGLE 10s Seedance 2.0 clip — continuous-motion grammar, no freeze
      // beats. Earlier versions used [0:00–0:01] Hold + "every object
      // settles" + "No further objects move" which produced 1-second freezes
      // at the seams. Now the dressing phase RESOLVES (not "settles") by
      // 0:04 and the camera is already in motion as the room fills — the
      // back-half walkthrough flows out of the front-half transformation
      // without any pause.
      const fullTransformPrompt =
        `Cinematic 9:16 vertical real-estate virtual-staging reel, 10 seconds total at 24fps with a 180° shutter for natural film motion blur. 1080p photorealistic, magazine-quality interior styling, Architectural Digest cover-grade finish. ` +
        // ── Already-in-motion opening — camera begins a gentle drift inward AS the dressing starts ──
        `From the opening frame the camera is already easing into a slow continuous drift forward through the empty source room on a gimbal-stabilized 35mm prime at f/2.8. The architecture — walls, windows, doors, floors, ceiling — stays exactly anchored to the source frame throughout the clip. ` +
        // ── Dressing phase (continuous, resolves by 0:04, named furniture physics) ──
        `Across the first four seconds the room fills with its final styling: furniture, area rug, lamps, art, throw pillows, and decor each lift smoothly into their final positions with believable weight and gravity — heavy pieces settle low, soft goods compress under their own weight, fabric drapes naturally, lamps cast their own light as they land. ${stylePrompt} By 0:04 the styling is fully resolved — no further objects appear or move into place — but the camera never stops; it continues uninterrupted into a steady walkthrough push-in across the back six seconds. ` +
        // ── Material micro-physics during the camera move ──
        `As the camera passes through the now-styled space, named material finishes read photographically: wood grain pulls focus along its length, fabric weaves catch raking light, stone veining reads as one continuous physical pattern, metal finishes (brushed, polished, satin, lacquered, unlacquered brass) each reflect light according to their named surface. ` +
        // ── Atmosphere ──
        `Atmosphere reads photographically: fine dust motes drift through window light, slight warm haze threads the room, soft natural light bounces off pale surfaces, depth is built by parallax and lens compression. ` +
        // ── Deceleration ──
        `Across the final second the dolly eases out gracefully — smooth deceleration to a gentle resolution, never a hard stop. The camera keeps drifting at a fraction of its earlier speed all the way to the last frame. The closing composition reads as a magazine cover, but as a frame inside a continuing movement, not a frozen still. ` +
        // ── Anchors ──
        `Walls, windows, doors, floors, ceiling, and all architectural features stay anchored exactly as in the source throughout the entire 10 seconds — only the styling layer evolves. No morphed geometry, no invented rooms, no rearranged architecture. ` +
        // ── Stability ──
        `Stability: avoid jitter, avoid camera shake, avoid handheld micro-wobble, avoid sudden direction changes, avoid speed-ramps, avoid flickering, avoid plastic AI sheen on fabric, avoid banded skies through windows, avoid impossible reflections. ` +
        // ── No humans ──
        `The room is empty and unoccupied: absolutely no people, no humans, no human figures, no faces, no body parts, no hands, no children, no occupants, no agents, no homeowners, no visitors, no shadows of people, no human silhouettes, no reflections of people in glass or mirrors, the entire frame is empty of all human presence throughout. ${vibePromptSuffix} ` +
        // ── Anti-freeze cap ──
        `Motion sustains continuously through every single frame — no freeze frames, no held frames, no static moments, no stop-and-hold, no frozen establishing shot, no frozen closing shot, no pauses on any frame at any time.`

      console.log("[virtual_staging] kicking off SINGLE 10s Seedance dressing+walkthrough")
      const result = await startSeedanceFromImage(
        emptyRoomUrl,
        fullTransformPrompt,
        10,
        REPLICATE_TOKEN
      )

      // Single-clip path — same shape as animate_single
      if (result.videoUrl) {
        let outputVideoPath: string | null = null
        try {
          const videoFetch = await fetch(result.videoUrl)
          const videoBuffer = await videoFetch.arrayBuffer()
          const videoPath = `listing-videos/${Date.now()}/staging.mp4`
          await supabase.storage.from("project-submissions").upload(videoPath, videoBuffer, {
            contentType: "video/mp4", upsert: true,
          })
          outputVideoPath = videoPath
        } catch (storageErr) {
          console.error("[virtual_staging] storage failed:", storageErr)
        }

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
        ? `Generate a photograph: a sheet of warm-cream 90gsm A3 architectural drafting paper sits on a polished walnut desk, oriented landscape, positioned slightly off-centre toward the lower-left. ` +
          `On the paper is a clean architectural sketch in 2H graphite pencil of the interior room shown in the reference image — same room, same proportions, same window placements, same wall lengths, same key furniture positions. ` +
          `Sketch style: a confident architect's hand. Single-weight crisp pencil lines for the room outline, light directional cross-hatching for shadow on the back wall, soft converging perspective lines fading at the edges of the page, faint construction guidelines barely visible. No colour anywhere on the page. Paper has the slightest natural warm tone of real drafting stock. ` +
          `A bare, relaxed right hand enters from the bottom-right of the frame, holding a hexagonal-shafted graphite pencil with the tip currently touching one of the lines as if mid-stroke. The hand is photographed sharply with skin texture visible. ` +
          `Desk surroundings: a ceramic mug of coffee softly out of focus in the upper-left, a small brushed-aluminum architect's scale ruler running along the top edge of the paper, a vintage brass desk lamp camera-left casting warm 2900K motivated directional light onto the paper. Faint warm-toned shadow falls right of the pencil tip. ` +
          `Camera: top-down 3/4 angle, 50mm full-frame equivalent at f/2.5, shallow depth of field with the pencil tip in razor focus, paper edges still sharp, desk softly defocused, mug fully blurred. Photoreal background with hand-drawn pencil sketch on the paper. Kodak Vision3 250D color science. ` +
          `Anti-AI: no plastic AI sheen on the desk or hand, no doubled lines on the sketch, no impossible perspective, no smudged graphite.`
        : `Generate a photograph: a sheet of warm-cream 90gsm A3 architectural drafting paper sits on a polished walnut desk, oriented landscape, positioned slightly off-centre toward the lower-left. ` +
          `On the paper is a clean architectural sketch in 2H graphite pencil of the building exterior shown in the reference image — same façade, same proportions, same window and door placements, same rooflines, same massing. ` +
          `Sketch style: a confident architect's hand. Single-weight crisp pencil lines for the building outline and openings, light directional cross-hatching for siding or stone texture, perspective lines fading at the edges of the page, faint construction guidelines barely visible. No colour anywhere. Paper has the natural warm tone of real drafting stock. ` +
          `A bare, relaxed right hand enters from the bottom-right of the frame, holding a hexagonal-shafted graphite pencil with the tip currently touching one of the rooflines as if mid-stroke. The hand is photographed sharply with skin texture visible. ` +
          `Desk surroundings: a ceramic mug of coffee softly out of focus in the upper-left, a small brushed-aluminum architect's scale ruler running along the top edge of the paper, a vintage brass desk lamp camera-left casting warm 2900K motivated directional light onto the paper. Faint warm-toned shadow falls right of the pencil tip. ` +
          `Camera: top-down 3/4 angle, 50mm full-frame equivalent at f/2.5, shallow depth of field with the pencil tip in razor focus, paper edges still sharp, desk softly defocused. Photoreal background with hand-drawn pencil sketch on the paper. Kodak Vision3 250D color science. ` +
          `Anti-AI: no plastic AI sheen on the desk or hand, no doubled lines on the sketch, no impossible perspective, no smudged graphite.`

      console.log("[sketch_to_real] generating sketch-on-desk via nano-banana")
      const sketchOnDeskUrl = await generateSketchWithNanoBanana(propertyPhotoUrl, sketchPrompt, REPLICATE_TOKEN)

      // SINGLE 10s Seedance 2.0 clip — timeline-prompted to FORCE the sketch-
      // to-real morph to complete by 0:04. The user's previous complaint was
      // "transition was too slow" — that was the model improvising pacing. By
      // marking the morph as complete at a specific beat, the model commits
      // to the transformation and gives us a clean reveal in the back half.
      const ANTI_FREEZE_CAP = `Motion sustains continuously through every single frame — no freeze frames, no held frames, no static moments, no stop-and-hold, no frozen establishing shot, no frozen closing shot, no pauses on any frame at any time.`
      const fullSketchPrompt = sketch_intent === "interior"
        ? `Cinematic 9:16 vertical real-estate sketch-to-real reveal, 10 seconds total at 24fps with a 180° shutter for natural film motion blur. 1080p photorealistic, magazine-quality, Architectural Digest cover-grade finish. ` +
          // ── Already-in-motion opening ──
          `From the opening frame the camera is already in a slow continuous push-in toward the architectural pencil sketch resting on the warm walnut desk, on a gimbal-stabilized 50mm prime at f/2.8. The artist's right hand is mid-stroke at the edge of the paper. Warm 2900K motivated desk lighting from a brass lamp camera-left, soft fill bouncing off the pale paper. ` +
          // ── Morph phase ──
          `Across the first four seconds the sketch on the paper transforms continuously into the photorealistic interior it depicts — pencil shading dissolves into real surfaces with weight and depth, walls gain texture and material, daylight floods in through window openings, floors reveal wood grain or stone veining, furniture lifts up out of the page into final positions with gravity-believable settle motion. The desk and the drawing hand fade out smoothly during the morph. By 0:04 the morph is fully resolved — no trace of pencil, paper, desk, or hand remains anywhere in frame. ` +
          // ── Continuous walkthrough back-half ──
          `The camera never stops — the push-in transitions seamlessly into a slow continuous dolly walkthrough through the now-photoreal interior across the back six seconds. ` +
          // ── Material micro-physics ──
          `As the camera passes through the resolved interior, named material finishes read photographically: wood grain on floors, fabric weave on upholstery, stone veining on counters, metal finishes (brushed, polished, satin, unlacquered brass) each reflect light according to their named surface. ` +
          // ── Atmosphere ──
          `Atmosphere: fine dust motes drift through window light, slight warm haze threads the room, soft daylight bounces off pale surfaces, depth is built by parallax and lens compression. ` +
          // ── Deceleration ──
          `Across the final second the dolly eases out gracefully — smooth deceleration to a gentle resolution, never a hard stop. The camera keeps drifting at a fraction of its earlier speed all the way to the last frame. ` +
          // ── Anchors ──
          `Architectural geometry from the original drawing — wall lines, window placements, room proportions, ceiling height — stays anchored exactly throughout. The geometry of the sketch IS the geometry of the resolved interior. ` +
          // ── Stability ──
          `Stability: avoid jitter, avoid camera shake, avoid speed-ramps, avoid flickering, avoid plastic AI sheen on materials, avoid banded skies, avoid impossible reflections. ` +
          // ── No humans (after 0:04) ──
          `From 0:04 onward the resolved interior is empty and unoccupied — absolutely no people, no humans, no faces, no body parts beyond the artist's hand which has fully dissolved by 0:04, no children, no occupants, no shadows of people, no human silhouettes, no reflections of people in glass or mirrors during the photoreal reveal phase. ${vibeLine} ${ANTI_FREEZE_CAP}`
        : `Cinematic 9:16 vertical real-estate sketch-to-real reveal, 10 seconds total at 24fps with a 180° shutter. 1080p photorealistic, magazine-quality, Architectural Digest exterior-cover finish. ` +
          // ── Already-in-motion opening ──
          `From the opening frame the camera is already in a slow continuous push-in toward the architectural pencil sketch resting on the warm walnut desk, on a gimbal-stabilized 50mm prime at f/2.8. The artist's right hand is mid-stroke at the edge of the paper. Warm 2900K motivated desk lighting from a brass lamp camera-left. ` +
          // ── Morph phase ──
          `Across the first four seconds the sketch transforms continuously into the photorealistic exterior it depicts — pencil shading dissolves into siding texture, brick coursing, glass refraction, and roof material, sky fills with realistic color and depth, foliage gains believable leaf detail, landscaping settles into place. The desk and the drawing hand fade out smoothly during the morph. By 0:04 the morph is fully resolved — no trace of pencil, paper, desk, or hand remains anywhere in frame. ` +
          // ── Continuous parallax back-half ──
          `The camera never stops — the push-in transitions seamlessly into a slow continuous parallax tracking shot across the now-photoreal exterior in the back six seconds. Foreground elements (a landscape edge, a fence line, a tree branch) drift roughly twice as fast as background elements, revealing depth through parallax. ` +
          // ── Material micro-physics ──
          `As the camera passes the façade, named exterior finishes read photographically: brick coursing reads as physical pattern, wood siding reveals grain, painted finishes (matte, satin, gloss) each catch light according to their named surface, glass panes show real refraction with no impossible double-reflections. ` +
          // ── Atmosphere ──
          `Atmosphere: gentle breeze in foliage, soft natural light bounces off the façade, depth built by lens compression and parallax. Sky has a subtle gradient (no banding). ` +
          // ── Deceleration ──
          `Across the final second the parallax move eases out gracefully — smooth deceleration to a gentle resolution, never a hard stop. The camera keeps drifting at a fraction of its earlier speed all the way to the last frame. ` +
          // ── Anchors ──
          `Façade geometry from the original drawing — window placements, rooflines, massing, door positions — stays anchored exactly throughout. The geometry of the sketch IS the geometry of the resolved exterior. ` +
          // ── Stability ──
          `Stability: avoid jitter, avoid camera shake, avoid speed-ramps, avoid flickering, avoid plastic AI sheen, avoid banded skies, avoid impossible reflections, avoid fish-eye distortion. ` +
          // ── No humans (after 0:04) ──
          `From 0:04 onward the resolved exterior is empty and unoccupied — absolutely no people, no humans, no faces, no body parts beyond the artist's hand which has fully dissolved by 0:04, no children, no occupants, no shadows of people, no human silhouettes during the photoreal reveal phase. ${vibeLine} ${ANTI_FREEZE_CAP}`

      console.log("[sketch_to_real] kicking off SINGLE 10s Seedance morph+reveal")
      const result = await startSeedanceFromImage(
        sketchOnDeskUrl,
        fullSketchPrompt,
        10,
        REPLICATE_TOKEN
      )

      if (result.videoUrl) {
        let outputVideoPath: string | null = null
        try {
          const videoFetch = await fetch(result.videoUrl)
          const videoBuffer = await videoFetch.arrayBuffer()
          const videoPath = `listing-videos/${Date.now()}/sketch.mp4`
          await supabase.storage.from("project-submissions").upload(videoPath, videoBuffer, {
            contentType: "video/mp4", upsert: true,
          })
          outputVideoPath = videoPath
        } catch (storageErr) {
          console.error("[sketch_to_real] storage failed:", storageErr)
        }

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

      // Timeline-prompted floor plan morph. The drawing → photoreal transition
      // is resolved by 0:04 so the camera move owns the back half. Drafting
      // lines that linger past 0:04 ruin the magic — by fixing a hard
      // completion beat we get a clean, fully-realized interior reveal.
      const cameraHint = SHOT_CONFIG[selectedShotType]?.motionHint || "Slow continuous dolly push-in, gimbal-stabilized."
      const fullFloorPlanPrompt =
        `Cinematic 9:16 vertical real-estate floor-plan-to-interior reveal, 10 seconds total at 24fps with a 180° shutter. 1080p photorealistic, magazine-quality, Architectural Digest cover-grade finish. ` +
        // ── Already-in-motion opening ──
        `From the opening frame the camera is already in a gentle continuous drift across the 2D architectural floor plan / axonometric drawing on a gimbal-stabilized 35mm prime at f/2.8. Drafting linework, room labels, dimension lines, and architectural symbols all clearly visible at the start. ` +
        // ── Morph phase (continuous, resolves by 0:04) ──
        `Across the first four seconds the drawing transforms continuously into a fully photorealistic interior of the same room — drafting lines dissolve into wall edges with believable depth, flat plan symbols extrude into 3D objects with proper weight, daylight floods in through window symbols as they become real glass, floor materials reveal grain and texture, furniture lifts up out of the plan into final positions with gravity-believable settle motion. The camera continues its drift uninterrupted throughout the morph. By 0:04 the transformation is fully resolved and no drafting marks, dimension lines, room labels, or technical symbols remain anywhere in frame. ` +
        // ── Continuous walkthrough back-half ──
        `The camera never stops — the morph drift transitions seamlessly into ${cameraHint} through the now-photoreal interior across the back six seconds. ` +
        // ── Material micro-physics ──
        `As the camera passes through the now-photoreal space, named material finishes read photographically: wood grain on floors, fabric weave on upholstery, stone veining on counters, metal finishes (brushed, polished, satin) each reflect light according to their named surface. ` +
        // ── Atmosphere ──
        `Atmosphere: fine dust motes drift through window light, slight warm haze threads the room, soft daylight bounces off pale surfaces, depth is built by parallax and lens compression. ` +
        // ── Deceleration ──
        `Across the final second the move eases out gracefully — smooth deceleration to a gentle resolution, never a hard stop. The camera keeps drifting at a fraction of its earlier speed all the way to the last frame. ` +
        // ── Anchors ──
        `Architectural geometry from the drawing — wall positions, door and window placements, room proportions, ceiling height — stays anchored exactly throughout. The geometry from the plan IS the geometry of the resolved interior. ` +
        // ── Stability ──
        `Stability: avoid jitter, avoid camera shake, avoid handheld micro-wobble, avoid speed-ramps, avoid flickering, avoid plastic AI sheen on materials, avoid banded skies through windows, avoid impossible reflections. ` +
        // ── No humans ──
        `The resolved interior is empty and unoccupied — absolutely no people, no humans, no faces, no body parts, no children, no occupants, no agents, no homeowners, no visitors, no shadows of people, no human silhouettes, no reflections of people in glass or mirrors, the entire frame is empty of all human presence throughout. ${vibeLine} ` +
        // ── Anti-freeze cap ──
        `Motion sustains continuously through every single frame — no freeze frames, no held frames, no static moments, no stop-and-hold, no frozen establishing shot, no frozen closing shot, no pauses on any frame at any time.`

      console.log("[floor_plan_pan] kicking off SINGLE 10s Seedance morph+walkthrough")
      const result = await startSeedanceFromImage(
        floorPlanUrl,
        fullFloorPlanPrompt,
        10,
        REPLICATE_TOKEN
      )

      if (result.videoUrl) {
        let outputVideoPath: string | null = null
        try {
          const videoFetch = await fetch(result.videoUrl)
          const videoBuffer = await videoFetch.arrayBuffer()
          const videoPath = `listing-videos/${Date.now()}/floorplan.mp4`
          await supabase.storage.from("project-submissions").upload(videoPath, videoBuffer, {
            contentType: "video/mp4", upsert: true,
          })
          outputVideoPath = videoPath
        } catch (storageErr) {
          console.error("[floor_plan_pan] storage failed:", storageErr)
        }

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
async function startSeedanceFromImage(
  imageUrl: string,
  prompt: string,
  duration: number,
  token: string
): Promise<{ videoUrl?: string; predictionId?: string }> {
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
  const prompt = `${motionPrompt} Cinematic real-estate listing reel. Photorealistic. Smooth physically-plausible transition between the two frames.`
  const negativePrompt = "people, humans, human figures, faces, body parts, hands, arms, legs, children, occupants, agents, realtors, homeowners, visitors, shadows of people, human silhouettes, reflections of people, human movement, invented objects, added animals, pets, geometry warping, jittery interpolation, flickering, motion artifacts, frame drops, low resolution, soft focus, blurry edges, compression artifacts."

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
          negative_prompt: negativePrompt,
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
  const prompt = `${motionPrompt} Cinematic real-estate listing reel. Photorealistic. Smooth physically-plausible transition between the two frames.`
  const negativePrompt = "people, humans, human figures, faces, body parts, hands, arms, legs, children, occupants, agents, realtors, homeowners, visitors, shadows of people, human silhouettes, reflections of people, human movement, invented objects, added animals, pets, geometry warping, jittery interpolation, flickering, motion artifacts, frame drops, low resolution, soft focus, blurry edges, compression artifacts."

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
          negative_prompt: negativePrompt,
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
