/**
 * Fail-safe wrapper around the `curate-listing` edge function — the in-app
 * "creative director". Given a listing's photos, it asks a vision model to
 * pick + order the best shots and infer a style. On ANY problem it returns
 * null, and callers fall back to the deterministic even-sample curation. It
 * must never throw into the reel flow.
 */

import {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  MAX_PHOTOS,
} from "../constants.js";
import { httpRequest } from "./http.js";
import type { ReelStyle } from "../types.js";

const CURATE_URL = `${SUPABASE_URL}/functions/v1/curate-listing`;
const CURATE_TIMEOUT_MS = 45_000;
const STYLES: ReelStyle[] = ["luxury", "family", "airbnb", "snappy", "creative"];

export interface Curation {
  photos: string[];
  style: ReelStyle;
  vibe?: string;
  music?: string;
  staging?: { index: number; room: string; why: string }[];
  source: "claude" | "fallback";
}

/**
 * Ask Claude to curate + order a reel's photos. Returns null on any failure so
 * the caller can fall back. `listing` context sharpens the creative direction.
 */
export async function curateReel(
  photos: string[],
  listing: { price?: string; address?: string; description?: string; platform?: string } = {},
  max: number = MAX_PHOTOS,
): Promise<Curation | null> {
  if (!SUPABASE_SERVICE_ROLE_KEY || !Array.isArray(photos) || photos.length < 2) return null;
  try {
    const res = await httpRequest(
      CURATE_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ photo_urls: photos, max, listing }),
      },
      CURATE_TIMEOUT_MS,
    );
    if (!res.ok) return null;
    const data = res.json<{
      ordered_photo_urls?: unknown;
      style?: unknown;
      vibe?: unknown;
      music?: unknown;
      staging?: unknown;
      source?: unknown;
    }>();
    const ordered = Array.isArray(data?.ordered_photo_urls)
      ? (data.ordered_photo_urls as unknown[]).filter((u): u is string => typeof u === "string" && u.length > 0)
      : [];
    if (ordered.length < 2) return null;
    const style: ReelStyle = STYLES.includes(data?.style as ReelStyle) ? (data.style as ReelStyle) : "snappy";
    return {
      photos: ordered.slice(0, max),
      style,
      vibe: typeof data?.vibe === "string" ? data.vibe : undefined,
      music: typeof data?.music === "string" ? data.music : undefined,
      staging: Array.isArray(data?.staging) ? (data.staging as Curation["staging"]) : undefined,
      source: data?.source === "claude" ? "claude" : "fallback",
    };
  } catch {
    return null;
  }
}
