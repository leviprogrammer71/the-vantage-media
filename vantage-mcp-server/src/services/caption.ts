/**
 * Caption + hashtag generation.
 *
 * The reel generator returns a video, not marketing copy, so the MCP composes
 * a ready-to-post caption and a set of relevant hashtags itself. This is done
 * locally (no extra API dependency) with style-aware templates so the output
 * is instant and deterministic.
 */

import type { ReelRequest, ReelStyle } from "../types.js";

interface CaptionParts {
  hook: string[];
  closer: string[];
  baseTags: string[];
}

const STYLE_COPY: Record<ReelStyle, CaptionParts> = {
  luxury: {
    hook: ["An extraordinary offering.", "Refined living, redefined.", "Where architecture meets art."],
    closer: ["Private showings available.", "Serious inquiries welcome.", "DM for the full portfolio."],
    baseTags: ["luxuryrealestate", "luxuryhomes", "dreamhome", "realestate", "justlisted"],
  },
  family: {
    hook: ["Room to grow, space to gather.", "The one you've been waiting for.", "Home is where the story starts."],
    closer: ["Book your tour today.", "Let's get you home.", "DM to schedule a walkthrough."],
    baseTags: ["familyhome", "homesweethome", "realestate", "justlisted", "movein"],
  },
  airbnb: {
    hook: ["Your next getaway starts here.", "Book the stay, keep the memories.", "Wake up somewhere better."],
    closer: ["Check availability at the link.", "Reserve your dates now.", "DM for booking details."],
    baseTags: ["airbnb", "shorttermrental", "vacationrental", "travel", "staycation"],
  },
  snappy: {
    hook: ["Stop scrolling. This one's special.", "Blink and it's gone.", "New listing alert."],
    closer: ["DM before it's gone.", "Tap to tour.", "Who's ready to move?"],
    baseTags: ["justlisted", "realestate", "newlisting", "hometour", "forsale"],
  },
  creative: {
    hook: ["Every frame tells a story.", "Some spaces just move you.", "Picture your life here."],
    closer: ["Let's make it yours.", "DM to see it in person.", "Tour available this week."],
    baseTags: ["realestate", "hometour", "interiordesign", "justlisted", "dreamhome"],
  },
};

/** Deterministically pick an item from a list based on a seed string. */
function pick<T>(items: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) & 0x7fffffff;
  return items[hash % items.length];
}

/** Turn a location string into a location hashtag, e.g. "Austin, TX" -> "austintx". */
function locationTag(address?: string): string | null {
  if (!address) return null;
  // Prefer the "City, ST" chunk if present.
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  const cityState = parts.slice(-2).join("");
  const cleaned = cityState.replace(/[^a-zA-Z]/g, "").toLowerCase();
  return cleaned.length >= 3 ? cleaned : null;
}

/** Build a short, human specs line: "3 bed · 2 bath · $1,250,000". */
function specsLine(req: ReelRequest): string {
  const bits: string[] = [];
  if (req.beds != null) bits.push(`${req.beds} bed`);
  if (req.baths != null) bits.push(`${req.baths} bath`);
  if (req.price) bits.push(req.price);
  return bits.join(" · ");
}

export interface GeneratedCaption {
  caption: string;
  hashtags: string[];
}

/**
 * Compose a ready-to-post caption and hashtag set for a reel.
 *
 * @param req The reel request (address, price, features, style, description).
 * @returns caption text and a de-duplicated hashtag array (each without '#').
 */
export function buildCaption(req: ReelRequest): GeneratedCaption {
  const style: ReelStyle = req.style ?? "snappy";
  const parts = STYLE_COPY[style] ?? STYLE_COPY.snappy;
  const seed = `${req.address ?? ""}|${req.price ?? ""}|${style}`;

  const lines: string[] = [];
  lines.push(pick(parts.hook, seed));

  if (req.address) lines.push(`📍 ${req.address}`);

  const specs = specsLine(req);
  if (specs) lines.push(specs);

  if (req.features && req.features.trim()) {
    lines.push(req.features.trim());
  } else if (req.description && req.description.trim()) {
    // Trim a long listing description to one punchy sentence.
    const sentence = req.description.trim().split(/(?<=[.!?])\s+/)[0];
    if (sentence && sentence.length <= 180) lines.push(sentence);
  }

  lines.push("");
  lines.push(pick(parts.closer, seed));

  // Hashtags: style base + a location tag if we can derive one.
  const tags = [...parts.baseTags];
  const loc = locationTag(req.address);
  if (loc) tags.unshift(loc);
  const hashtags = Array.from(new Set(tags)).slice(0, 10);

  return { caption: lines.join("\n"), hashtags };
}
