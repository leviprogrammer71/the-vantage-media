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
  // Lateral (slides + parallax, both directions)
  | "slide_left"          // ⬅️ Slide Left — smooth lateral track
  | "slide_right"         // ➡️ Slide Right
  | "parallax_left"       // ◀️📐 Parallax Left — depth-revealing pan
  | "parallax_right"      // 📐▶️ Parallax Right
  // Vertical (rises + tilts)
  | "reveal_rise"         // ⬆️ Rise & Reveal — crane up
  | "tilt_up"             // ⤴️ Tilt Up — ceiling / sky reveal
  | "tilt_down"           // ⤵️ Tilt Down — top-down sweep
  // Rotational (orbits, ground + drone)
  | "orbit_left"          // ↺ Orbit Left — ground-level subject orbit
  | "orbit_right"         // ↻ Orbit Right
  | "drone_orbit"         // 🛸 Aerial Orbit — drone-style elevated arc
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
  {
    id: "drone_orbit",
    label: "Aerial Orbit",
    tagline: "Drone-style arc",
    description: "Elevated 60° aerial arc around the property — premium drone feel.",
    category: "rotational",
    recommendedFor: ["exterior", "landscape", "property"],
    model: "seedance-2",
    motionPrompt: "Camera arcs uniformly 60 degrees clockwise around the subject at a steady elevated altitude, drone-style gimbal locked on the subject centroid, smooth circular path with no radius drift.",
    isPremium: true,
    creditCost: 35,
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
  lateral: "Slides & Parallax",
  vertical: "Rises & Tilts",
  rotational: "Orbits",
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
