// ── SHOT TYPES (research-validated against Rendy.io, StagerGo, and the
// most-requested moves in the @maxfernandez.mp4 spec-ad comment thread).
//
// Coverage analysis (Apify scrape, May 2026):
//   • Rendy exposes 5 moves: Push In, Slide L/R, Parallax L/R
//   • StagerGo exposes 9: Push-In, Pull-Out, Pan L/R, Tilt U/D, Orbit L/R,
//     Parallax L/R, Dolly Forward
//   • Real-estate creator community most-requested: Slide L/R, Orbit L/R,
//     Push-in, Parallax L/R, "real dolly"
//
// The Vantage previously exposed only 6 generic moves. This expands to 13
// with explicit direction options (left/right mirrors) — research shows
// direction control is a top user-request signal across competitors.

export type ShotType =
  // Linear (forward / reverse)
  | "push_in"             // 🎬 Push In — cinematic forward dolly (default)
  | "pull_out"            // ◀️ Pull Out — reveal-by-retreat
  | "establishing"        // 🏞️ Wide Establishing — pull back to master shot
  // Lateral (truck slides + pans + parallax, both directions)
  | "truck_left"          // ⬅️ Truck Left — body slides laterally
  | "truck_right"         // ➡️ Truck Right
  | "slide_left"          // alias of truck_left
  | "slide_right"         // alias of truck_right
  | "pan_left"            // ↩️ Pan Left — rotation while stationary
  | "pan_right"           // ↪️ Pan Right
  | "parallax_left"       // ◀️📐 Parallax Left — depth-revealing pan
  | "parallax_right"      // 📐▶️ Parallax Right
  // Vertical (rises + tilts + pedestals)
  | "reveal_rise"         // ⬆️ Rise & Reveal — crane up
  | "tilt_up"             // ⤴️ Tilt Up — ceiling / sky reveal (rotation only)
  | "tilt_down"           // ⤵️ Tilt Down — top-down sweep (rotation only)
  | "pedestal_up"         // 🛗 Pedestal Up — vertical camera translation (no tilt)
  | "pedestal_down"       // 🛗 Pedestal Down — vertical descent (no tilt)
  // Rotational (orbits, ground + roll)
  // drone_orbit deleted May 12, 2026 — Seedance interpreted "drone" literally
  // and rendered a flying drone object in residential listings. Users hated
  // it. Removed entirely rather than hidden.
  | "orbit_left"          // ↺ Orbit Left — ground-level subject orbit
  | "orbit_right"         // ↻ Orbit Right
  | "camera_roll"         // 🌀 Camera Roll — rotation around lens axis
  // Architectural (precision slider)
  | "architectural";      // 🏛️ Architectural Slider — perfectly level lateral

export type ShotCategory = "linear" | "lateral" | "vertical" | "rotational" | "architectural";

export interface ShotTypeConfig {
  id: ShotType;
  label: string;              // e.g. "Push In"
  tagline: string;            // e.g. "Cinematic & calm"
  description: string;        // 1 sentence
  category: ShotCategory;     // UI grouping
  previewVideo?: string;      // /videos/shot-*.mp4
  posterImage?: string;       // poster
  recommendedFor: string[];   // ["listing", "exterior", "pool"]
  model: "kling-2.5-turbo" | "seedance-2" | "nano-banana";
  motionPrompt: string;       // the prompt snippet to inject for this shot
  isPremium: boolean;         // whether it costs more credits
  creditCost: number;         // credits per 5s video at this shot type
}

export const SHOT_TYPES: ShotTypeConfig[] = [
  // ── LINEAR ──────────────────────────────────────────────────────────
  {
    id: "push_in",
    label: "Push In",
    tagline: "Cinematic & calm",
    description: "Slow forward dolly into the subject. The most-requested real-estate move.",
    category: "linear",
    recommendedFor: ["listing", "interior", "hero"],
    model: "kling-2.5-turbo",
    motionPrompt: "Camera dollies steadily forward into the subject at a uniform walking pace, gimbal-locked horizon, ending on a tighter framing of the strongest architectural feature.",
    isPremium: false,
    creditCost: 20,
  },
  {
    id: "pull_out",
    label: "Pull Out",
    tagline: "Reveal by retreat",
    description: "Camera retreats backward, revealing context the viewer didn't see at frame zero.",
    category: "linear",
    recommendedFor: ["interior", "kitchen", "feature"],
    model: "kling-2.5-turbo",
    motionPrompt: "Camera pulls back steadily from a tight composition, retreating in a straight line at a uniform pace, revealing the wider context of the room as foreground elements drift into frame.",
    isPremium: false,
    creditCost: 20,
  },
  {
    id: "establishing",
    label: "Wide Establishing",
    tagline: "From tight to master",
    description: "Pull back from a detail to a full property master shot.",
    category: "linear",
    recommendedFor: ["property", "exterior", "landscape"],
    model: "seedance-2",
    motionPrompt: "Camera pulls back uniformly from a tight feature detail to a wide establishing master frame, gimbal-stabilized, revealing the full property and its surroundings.",
    isPremium: true,
    creditCost: 30,
  },
  // ── LATERAL ─────────────────────────────────────────────────────────
  // "truck" is the canonical cinematography term — Seedance responds best
  // to "slow camera truck" per A/B testing. slide_* IDs kept as aliases.
  {
    id: "truck_left",
    label: "Truck Left",
    tagline: "Body slides sideways",
    description: "Camera body slides right-to-left on a precision slider — the move user-tested as Seedance's cleanest lateral.",
    category: "lateral",
    recommendedFor: ["interior", "kitchen", "feature", "exterior"],
    model: "seedance-2",
    motionPrompt: "Slow camera truck right to left across the subject — pure horizontal translation, gimbal-locked horizon, no rotation.",
    isPremium: false,
    creditCost: 20,
  },
  {
    id: "truck_right",
    label: "Truck Right",
    tagline: "Body slides sideways",
    description: "Camera body slides left-to-right on a precision slider — Seedance-clean lateral move.",
    category: "lateral",
    recommendedFor: ["interior", "kitchen", "feature", "exterior"],
    model: "seedance-2",
    motionPrompt: "Slow camera truck left to right across the subject — pure horizontal translation, gimbal-locked horizon, no rotation.",
    isPremium: false,
    creditCost: 20,
  },
  {
    id: "slide_left",
    label: "Slide Left",
    tagline: "Smooth lateral track",
    description: "Camera slides smoothly from right to left across the scene.",
    category: "lateral",
    recommendedFor: ["interior", "kitchen", "feature"],
    model: "kling-2.5-turbo",
    motionPrompt: "Camera tracks laterally right-to-left at a steady pace on a precision slider, gimbal-locked horizon, no rotation, revealing each element of the composition in sequence.",
    isPremium: false,
    creditCost: 20,
  },
  {
    id: "slide_right",
    label: "Slide Right",
    tagline: "Smooth lateral track",
    description: "Camera slides smoothly from left to right across the scene.",
    category: "lateral",
    recommendedFor: ["interior", "kitchen", "feature"],
    model: "kling-2.5-turbo",
    motionPrompt: "Camera tracks laterally left-to-right at a steady pace on a precision slider, gimbal-locked horizon, no rotation, revealing each element of the composition in sequence.",
    isPremium: false,
    creditCost: 20,
  },
  // Pan = rotation while stationary (yaw axis only — body stays put)
  {
    id: "pan_left",
    label: "Pan Left",
    tagline: "Rotate, don't slide",
    description: "Camera rotates right-to-left while the body stays still — pure yaw rotation.",
    category: "lateral",
    recommendedFor: ["interior", "landscape", "establishing"],
    model: "seedance-2",
    motionPrompt: "Slow camera pan right to left across the subject — rotation only, body fixed in place.",
    isPremium: false,
    creditCost: 20,
  },
  {
    id: "pan_right",
    label: "Pan Right",
    tagline: "Rotate, don't slide",
    description: "Camera rotates left-to-right while the body stays still — pure yaw rotation.",
    category: "lateral",
    recommendedFor: ["interior", "landscape", "establishing"],
    model: "seedance-2",
    motionPrompt: "Slow camera pan left to right across the subject — rotation only, body fixed in place.",
    isPremium: false,
    creditCost: 20,
  },
  {
    id: "parallax_left",
    label: "Parallax Left",
    tagline: "Depth through motion",
    description: "Lateral pan right-to-left where foreground drifts faster than background.",
    category: "lateral",
    recommendedFor: ["exterior", "interior", "pool"],
    model: "kling-2.5-turbo",
    motionPrompt: "Camera tracks laterally right-to-left at eye level with foreground elements moving roughly twice as fast as background elements, revealing depth through parallax separation, 24fps cinematic feel.",
    isPremium: false,
    creditCost: 25,
  },
  {
    id: "parallax_right",
    label: "Parallax Right",
    tagline: "Depth through motion",
    description: "Lateral pan left-to-right where foreground drifts faster than background.",
    category: "lateral",
    recommendedFor: ["exterior", "interior", "pool"],
    model: "kling-2.5-turbo",
    motionPrompt: "Camera tracks laterally left-to-right at eye level with foreground elements moving roughly twice as fast as background elements, revealing depth through parallax separation, 24fps cinematic feel.",
    isPremium: false,
    creditCost: 25,
  },
  // ── VERTICAL ────────────────────────────────────────────────────────
  {
    id: "reveal_rise",
    label: "Rise & Reveal",
    tagline: "Uplifting discovery",
    description: "Camera rises vertically from low to eye level, revealing the subject from below.",
    category: "vertical",
    recommendedFor: ["architectural", "exterior", "double-height"],
    model: "kling-2.5-turbo",
    motionPrompt: "Camera rises uniformly from ankle height to eye level on a motorized jib, gimbal-locked horizon, no horizontal drift, revealing the composition from ground to canopy.",
    isPremium: false,
    creditCost: 25,
  },
  {
    id: "tilt_up",
    label: "Tilt Up",
    tagline: "Ceiling or sky reveal",
    description: "Camera tilts from eye level upward, revealing height (vaulted ceiling, skyline).",
    category: "vertical",
    recommendedFor: ["interior", "exterior", "double-height"],
    model: "kling-2.5-turbo",
    motionPrompt: "Camera tilts uniformly from eye level upward at a steady angular rate, anchored to a fixed pivot point, revealing the upward composition (vaulted ceiling, skyline, tall feature) without horizontal drift.",
    isPremium: false,
    creditCost: 20,
  },
  {
    id: "tilt_down",
    label: "Tilt Down",
    tagline: "Top-down reveal",
    description: "Camera tilts from upper composition down toward floor or amenity (pool, deck).",
    category: "vertical",
    recommendedFor: ["pool", "amenity", "outdoor"],
    model: "kling-2.5-turbo",
    motionPrompt: "Camera tilts uniformly from an elevated composition downward at a steady angular rate, anchored to a fixed pivot, revealing the lower composition (pool, deck, ground-level amenity) without horizontal drift.",
    isPremium: false,
    creditCost: 20,
  },
  {
    id: "pedestal_up",
    label: "Pedestal Up",
    tagline: "Lift, don't tilt",
    description: "Camera lifts straight up without rotating — pure vertical translation. User-tested clean output.",
    category: "vertical",
    recommendedFor: ["exterior", "feature", "double-height"],
    model: "seedance-2",
    motionPrompt: "Slow camera pedestal up on the subject — pure vertical translation, no rotation, no tilt.",
    isPremium: false,
    creditCost: 25,
  },
  {
    id: "pedestal_down",
    label: "Pedestal Down",
    tagline: "Lower, don't tilt",
    description: "Camera descends straight down without rotating — pure vertical translation downward.",
    category: "vertical",
    recommendedFor: ["pool", "exterior", "amenity"],
    model: "seedance-2",
    motionPrompt: "Slow camera pedestal down on the subject — pure vertical translation downward, no rotation, no tilt.",
    isPremium: false,
    creditCost: 25,
  },
  // ── ROTATIONAL ──────────────────────────────────────────────────────
  {
    id: "orbit_left",
    label: "Orbit Left",
    tagline: "Subject-locked arc",
    description: "Ground-level arc counter-clockwise around the subject (kitchen island, feature).",
    category: "rotational",
    recommendedFor: ["kitchen", "feature", "sculpture"],
    model: "kling-2.5-turbo",
    motionPrompt: "Camera arcs uniformly 45 degrees counter-clockwise around the subject at a steady radius, gimbal locked on the subject centroid, eye-level height, smooth circular path with no radius drift.",
    isPremium: false,
    creditCost: 25,
  },
  {
    id: "orbit_right",
    label: "Orbit Right",
    tagline: "Subject-locked arc",
    description: "Ground-level arc clockwise around the subject (kitchen island, feature).",
    category: "rotational",
    recommendedFor: ["kitchen", "feature", "sculpture"],
    model: "kling-2.5-turbo",
    motionPrompt: "Camera arcs uniformly 45 degrees clockwise around the subject at a steady radius, gimbal locked on the subject centroid, eye-level height, smooth circular path with no radius drift.",
    isPremium: false,
    creditCost: 25,
  },
  // Aerial Orbit / drone_orbit was removed on May 12, 2026. Seedance read
  // "drone" literally and rendered a flying drone object over residential
  // listings. The entry is gone from the picker and the SHOT_CONFIG.
  {
    id: "camera_roll",
    label: "Camera Roll",
    tagline: "Cinematic rotation",
    description: "Subtle rotation around the lens axis — a signature cinematic flourish. User-tested clean output.",
    category: "rotational",
    recommendedFor: ["exterior", "hero", "feature"],
    model: "seedance-2",
    motionPrompt: "Slow camera roll of the subject — gentle rotation around the lens axis.",
    isPremium: false,
    creditCost: 25,
  },
  // ── ARCHITECTURAL ───────────────────────────────────────────────────
  {
    id: "architectural",
    label: "Architectural Slider",
    tagline: "Precision linear",
    description: "Perfectly level horizontal track. Best for modern architectural lines.",
    category: "architectural",
    recommendedFor: ["architectural", "modern", "exterior"],
    model: "seedance-2",
    motionPrompt: "Camera tracks horizontally on a precision dolly at a steady pace, gimbal-locked horizon, level horizontal trajectory, composed around the building's primary symmetry line.",
    isPremium: true,
    creditCost: 30,
  },
];

export function getShotConfig(id: ShotType): ShotTypeConfig {
  const config = SHOT_TYPES.find((s) => s.id === id);
  if (!config) throw new Error(`Unknown shot type: ${id}`);
  return config;
}

/** Group shots by category for UI grouping. */
export function shotsByCategory(): Record<ShotCategory, ShotTypeConfig[]> {
  const groups: Record<ShotCategory, ShotTypeConfig[]> = {
    linear: [],
    lateral: [],
    vertical: [],
    rotational: [],
    architectural: [],
  };
  for (const s of SHOT_TYPES) groups[s.category].push(s);
  return groups;
}

export const SHOT_CATEGORY_LABELS: Record<ShotCategory, string> = {
  linear: "Forward & Back",
  lateral: "Trucks, Pans & Parallax",
  vertical: "Rises & Tilts",
  rotational: "Orbits & Roll",
  architectural: "Architectural",
};

export type StagingStyle = "modern" | "mid_century" | "coastal" | "farmhouse" | "luxury_modern" | "scandinavian";

export interface StagingStyleConfig {
  id: StagingStyle;
  label: string;
  description: string;
  promptSuffix: string;
}

export const STAGING_STYLES: StagingStyleConfig[] = [
  {
    id: "modern",
    label: "Modern",
    description: "Clean lines, neutral palette, brushed metal accents, mid-tone wood floors.",
    promptSuffix: "Clean lines, neutral palette, brushed metal accents, mid-tone wood floors.",
  },
  {
    id: "mid_century",
    label: "Mid-Century",
    description: "Walnut tones, low-profile furniture, atomic-era accents, mustard and teal.",
    promptSuffix: "Walnut tones, low-profile furniture, atomic-era accents, mustard and teal.",
  },
  {
    id: "coastal",
    label: "Coastal",
    description: "White linen, weathered wood, soft blues and sandy beiges, woven textures.",
    promptSuffix: "White linen, weathered wood, soft blues and sandy beiges, woven textures.",
  },
  {
    id: "farmhouse",
    label: "Farmhouse",
    description: "Shiplap accents, distressed wood furniture, vintage iron fixtures, cream and forest green.",
    promptSuffix: "Shiplap accents, distressed wood furniture, vintage iron fixtures, cream and forest green.",
  },
  {
    id: "luxury_modern",
    label: "Luxury Modern",
    description: "Marble and brass, velvet sofa, sculptural lighting, deep navy and gold.",
    promptSuffix: "Marble and brass, velvet sofa, sculptural lighting, deep navy and gold.",
  },
  {
    id: "scandinavian",
    label: "Scandinavian",
    description: "White walls, blonde wood, layered wool throws, minimal furniture, lots of light.",
    promptSuffix: "White walls, blonde wood, layered wool throws, minimal furniture, lots of light.",
  },
];

export function getStagingStyleConfig(id: StagingStyle): StagingStyleConfig {
  const style = STAGING_STYLES.find((s) => s.id === id);
  if (!style) throw new Error(`Unknown staging style: ${id}`);
  return style;
}
