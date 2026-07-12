import { supabase } from "@/integrations/supabase/client";

export interface Curation {
  ordered_photo_urls: string[];
  order: number[];
  style: "luxury" | "family" | "airbnb" | "snappy" | "creative";
  vibe: string;
  music: string;
  staging: { index: number; room: string; why: string }[];
  reasoning: string;
  source: "claude" | "fallback";
}

/**
 * Ask the in-app "creative director" (Claude vision, via the curate-listing
 * edge function) to pick + order the best photos and infer a style/vibe.
 *
 * FAIL-SAFE: returns null on any error so callers keep their current order and
 * nothing breaks. Never throws.
 */
export async function claudeCurate(
  photoUrls: string[],
  listing: { price?: string; address?: string; description?: string; platform?: string } = {},
  max = 9,
): Promise<Curation | null> {
  try {
    const usable = (photoUrls || []).filter((u) => typeof u === "string" && u.length > 0);
    if (usable.length < 2) return null;
    const { data, error } = await supabase.functions.invoke("curate-listing", {
      body: { photo_urls: usable, max, listing },
    });
    if (error || !data) return null;
    const c = data as Curation;
    if (!Array.isArray(c.ordered_photo_urls) || c.ordered_photo_urls.length < 2) return null;
    return c;
  } catch {
    return null;
  }
}
