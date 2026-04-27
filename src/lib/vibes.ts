export type Vibe = "luxury" | "cozy" | "modern" | "family" | "investment" | "vacation";

export interface VibeConfig {
  id: Vibe;
  label: string;
  description: string;
  promptSuffix: string;
}

export const VIBES: VibeConfig[] = [
  {
    id: "luxury",
    label: "Luxury",
    description: "Editorial, slow, golden hour, high-end magazine feel.",
    promptSuffix: "Luxury aesthetic, golden hour warm light, shallow depth of field, slow deliberate motion, editorial magazine cinematic quality.",
  },
  {
    id: "cozy",
    label: "Cozy",
    description: "Warm interior light, soft shadows, intimate inviting tone.",
    promptSuffix: "Cozy intimate atmosphere, warm interior tungsten light, soft shadows, lived-in feel, gentle camera movement.",
  },
  {
    id: "modern",
    label: "Modern",
    description: "Cool tones, sharp lines, contemporary minimalism.",
    promptSuffix: "Modern minimalist aesthetic, cool daylight, crisp architectural lines, contemporary design language, clean motion.",
  },
  {
    id: "family",
    label: "Family",
    description: "Bright, friendly, midday light, approachable.",
    promptSuffix: "Bright friendly atmosphere, midday natural light, family-oriented warmth, welcoming, approachable cinematic feel.",
  },
  {
    id: "investment",
    label: "Investment",
    description: "Practical, well-lit, neutral, focused on space and layout.",
    promptSuffix: "Practical real-estate showcase, neutral even lighting, emphasis on layout and space, professional documentary style.",
  },
  {
    id: "vacation",
    label: "Vacation",
    description: "Sunset palette, breeze, escapist, resort-grade.",
    promptSuffix: "Vacation resort aesthetic, sunset warm palette, light breeze in foliage, escapist holiday mood, smooth gimbal-style motion.",
  },
];

export function getVibeConfig(id: Vibe): VibeConfig {
  const vibe = VIBES.find((v) => v.id === id);
  if (!vibe) throw new Error(`Unknown vibe: ${id}`);
  return vibe;
}
