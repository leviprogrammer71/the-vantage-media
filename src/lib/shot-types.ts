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
  // "reveal_rise" deleted May 15, 2026 — generated random parts of the
  // room instead of cleanly craning up. Removed entirely.
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
  // "reveal_rise" / "Rise & Reveal" REMOVED May 15, 2026 — Seedance
  // interpreted the prompt as "show different parts of the room" and
  // generated jump cuts between random angles instead of a clean vertical
  // crane move. Pedestal Up/Down replace this use case cleanly.
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

export type StagingStyle =
  | "modern"
  | "mid_century"
  | "coastal"
  | "farmhouse"
  | "luxury_modern"
  | "scandinavian"
  | "luxury_minimalist"   // user-tested on Replicate May 24
  | "bohemian"            // user-tested on Replicate May 24
  | "mediterranean"       // user-tested on Replicate May 24
  | "spanish";            // user-tested on Replicate May 24
// "empty" removed as a STYLE option (May 25, 2026) — it's now a separate
// photo-state toggle (empty vs already furnished), not a target aesthetic.

/**
 * Room type the user is staging. The chosen word is interpolated directly
 * into the user's tested prompt template, e.g. "redesign the {roomType}
 * furniture decor into [style]...". Defaults to "living room" because
 * that's what every one of the user's verified Replicate tests used.
 */
export type RoomType =
  | "living room"
  | "bedroom"
  | "master bedroom"
  | "kitchen"
  | "dining room"
  | "bathroom"
  | "home office"
  | "family room"
  | "den"
  | "sun room"
  | "foyer"
  | "patio"
  | "nursery"
  | "guest room";

export const ROOM_TYPES: { id: RoomType; label: string }[] = [
  { id: "living room",    label: "Living Room" },
  { id: "bedroom",        label: "Bedroom" },
  { id: "master bedroom", label: "Master Bedroom" },
  { id: "kitchen",        label: "Kitchen" },
  { id: "dining room",    label: "Dining Room" },
  { id: "bathroom",       label: "Bathroom" },
  { id: "home office",    label: "Home Office" },
  { id: "family room",    label: "Family Room" },
  { id: "den",            label: "Den" },
  { id: "sun room",       label: "Sun Room" },
  { id: "foyer",          label: "Foyer" },
  { id: "patio",          label: "Patio" },
  { id: "nursery",        label: "Nursery" },
  { id: "guest room",     label: "Guest Room" },
];

/**
 * Staging "mode" controls how many transformations the video shows and
 * whether it ends back at the original photo.
 *
 *  • single        — one transformation (original → chosen style)
 *  • cycle         — sequence through 2–3 styles in one video
 *  • cycle_return  — original → styles → back to original (loops cleanly)
 *
 * The cycle modes use the user's tested Replicate template:
 *   "redesign the living room furniture decor into [s1] style, then [s2],
 *    then [s3] while keeping the layout and the room intact only changing
 *    furnitures and furniture placements, smooth transition between
 *    changes furnitures spin to change"
 */
export type StagingMode = "single" | "cycle" | "cycle_return";

export interface StagingStyleConfig {
  id: StagingStyle;
  label: string;
  description: string;
  promptSuffix: string;
  /** A short keyword the prompt template uses (e.g. "luxury minimalist"). */
  promptKeyword: string;
}

export const STAGING_STYLES: StagingStyleConfig[] = [
  {
    id: "modern",
    label: "Modern",
    description: "Clean lines, neutral palette, brushed metal accents, mid-tone wood floors.",
    promptSuffix: "Clean lines, neutral palette, brushed metal accents, mid-tone wood floors.",
    promptKeyword: "modern",
  },
  {
    id: "luxury_minimalist",
    label: "Luxury Minimalist",
    description: "Sculptural furniture, marble and oak, restrained palette, museum-grade negative space.",
    promptSuffix: "Sculptural furniture, marble and oak, restrained palette, museum-grade negative space.",
    promptKeyword: "luxury minimalist",
  },
  {
    id: "bohemian",
    label: "Bohemian",
    description: "Layered textiles, low-slung sofas, brass accents, warm earth tones, indoor plants.",
    promptSuffix: "Layered textiles, low-slung sofas, brass accents, warm earth tones, indoor plants.",
    promptKeyword: "bohemian",
  },
  {
    id: "mediterranean",
    label: "Mediterranean",
    description: "Terracotta tile, plaster walls, woven rattan, olive and ochre, archways, linen drapes.",
    promptSuffix: "Terracotta tile, plaster walls, woven rattan, olive and ochre, archways, linen drapes.",
    promptKeyword: "mediterranean",
  },
  {
    id: "spanish",
    label: "Spanish",
    description: "Wrought iron, dark wood beams, mosaic tile, deep reds and warm whites, hacienda detailing.",
    promptSuffix: "Wrought iron, dark wood beams, mosaic tile, deep reds and warm whites, hacienda detailing.",
    promptKeyword: "spanish",
  },
  {
    id: "mid_century",
    label: "Mid-Century",
    description: "Walnut tones, low-profile furniture, atomic-era accents, mustard and teal.",
    promptSuffix: "Walnut tones, low-profile furniture, atomic-era accents, mustard and teal.",
    promptKeyword: "mid-century",
  },
  {
    id: "coastal",
    label: "Coastal",
    description: "White linen, weathered wood, soft blues and sandy beiges, woven textures.",
    promptSuffix: "White linen, weathered wood, soft blues and sandy beiges, woven textures.",
    promptKeyword: "coastal",
  },
  {
    id: "farmhouse",
    label: "Farmhouse",
    description: "Shiplap accents, distressed wood furniture, vintage iron fixtures, cream and forest green.",
    promptSuffix: "Shiplap accents, distressed wood furniture, vintage iron fixtures, cream and forest green.",
    promptKeyword: "farmhouse",
  },
  {
    id: "luxury_modern",
    label: "Luxury Modern",
    description: "Marble and brass, velvet sofa, sculptural lighting, deep navy and gold.",
    promptSuffix: "Marble and brass, velvet sofa, sculptural lighting, deep navy and gold.",
    promptKeyword: "luxury modern",
  },
  {
    id: "scandinavian",
    label: "Scandinavian",
    description: "White walls, blonde wood, layered wool throws, minimal furniture, lots of light.",
    promptSuffix: "White walls, blonde wood, layered wool throws, minimal furniture, lots of light.",
    promptKeyword: "scandinavian",
  },
];

export function getStagingStyleConfig(id: StagingStyle): StagingStyleConfig {
  const style = STAGING_STYLES.find((s) => s.id === id);
  if (!style) throw new Error(`Unknown staging style: ${id}`);
  return style;
}

/**
 * Default fallback used when the user toggles "let AI choose for me" or
 * doesn't pick a style. We default to luxury_minimalist for "single" mode
 * because user-tested Replicate output showed it converts best for hero
 * rooms, and to a 3-style cycle (modern → luxury_minimalist → bohemian)
 * for "cycle" mode because that's the literal cycle the user tested.
 */
export const AI_PICKED_STAGING_STYLES: Record<StagingMode, StagingStyle[]> = {
  single: ["luxury_minimalist"],
  cycle: ["modern", "luxury_minimalist", "bohemian"],
  cycle_return: ["modern", "luxury_minimalist", "bohemian"],
};
