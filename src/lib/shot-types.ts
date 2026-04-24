export type ShotType =
  | "slow_push"       // 🎬 Slow Push In
  | "drone_orbit"     // 🛸 Drone Orbit
  | "parallax_pan"    // 📐 Parallax Pan
  | "reveal_rise"     // ⬆️ Rise & Reveal
  | "architectural"   // 🏛️ Architectural Pan
  | "establishing";   // 🏞️ Wide Establishing

export interface ShotTypeConfig {
  id: ShotType;
  label: string;              // e.g. "Slow Push"
  tagline: string;            // e.g. "Cinematic & calm"
  description: string;        // 1 sentence
  previewVideo?: string;      // /videos/shot-*.mp4
  posterImage?: string;       // poster
  recommendedFor: string[];   // ["listing", "exterior", "pool"]
  model: "kling-2.5-turbo" | "seedance-2" | "nano-banana";
  motionPrompt: string;       // the prompt snippet to inject for this shot
  isPremium: boolean;         // whether it costs more credits
  creditCost: number;         // credits per 5s video at this shot type
}

export const SHOT_TYPES: ShotTypeConfig[] = [
  {
    id: "slow_push",
    label: "Slow Push",
    tagline: "Cinematic & calm",
    description: "Slow dolly-in. Calm and cinematic.",
    recommendedFor: ["listing", "interior", "detail"],
    model: "kling-2.5-turbo",
    motionPrompt: "Slow dolly camera push-in on the subject, steady and cinematic, ending framing the full composition.",
    isPremium: false,
    creditCost: 20,
  },
  {
    id: "drone_orbit",
    label: "Drone Orbit",
    tagline: "Aerial reveals",
    description: "Slow arc around subject, aerial feel.",
    recommendedFor: ["exterior", "landscape", "property"],
    model: "seedance-2",
    motionPrompt: "Slow aerial orbit 60° around the subject at elevated angle, smooth drone motion, revealing depth and scale of the space.",
    isPremium: true,
    creditCost: 35,
  },
  {
    id: "parallax_pan",
    label: "Parallax Pan",
    tagline: "Depth through motion",
    description: "Lateral pan with foreground-background depth shift.",
    recommendedFor: ["interior", "retail", "dining"],
    model: "kling-2.5-turbo",
    motionPrompt: "Lateral parallax pan moving slowly left to right, foreground elements moving faster than background to create depth, cinematic 24fps feel.",
    isPremium: false,
    creditCost: 25,
  },
  {
    id: "reveal_rise",
    label: "Rise & Reveal",
    tagline: "Uplifting discovery",
    description: "Camera rises from low to reveal subject.",
    recommendedFor: ["interior", "exterior", "architectural"],
    model: "kling-2.5-turbo",
    motionPrompt: "Camera rises vertically from low angle at ground level to eye height, revealing the full composition with soft upward motion.",
    isPremium: false,
    creditCost: 25,
  },
  {
    id: "architectural",
    label: "Architectural Pan",
    tagline: "Precision linear motion",
    description: "Crisp horizontal pan as if on a slider.",
    recommendedFor: ["architectural", "property", "modern"],
    model: "seedance-2",
    motionPrompt: "Clean architectural slider pan, perfectly horizontal, showcasing the linear design language of the space without rotation.",
    isPremium: true,
    creditCost: 30,
  },
  {
    id: "establishing",
    label: "Wide Establishing",
    tagline: "From wide to tight",
    description: "Pull-back to wide master shot.",
    recommendedFor: ["property", "exterior", "landscape"],
    model: "seedance-2",
    motionPrompt: "Slow pull-back dolly from tight composition to wide establishing shot, revealing context and surroundings.",
    isPremium: true,
    creditCost: 35,
  },
];

export function getShotConfig(id: ShotType): ShotTypeConfig {
  const config = SHOT_TYPES.find((s) => s.id === id);
  if (!config) throw new Error(`Unknown shot type: ${id}`);
  return config;
}
