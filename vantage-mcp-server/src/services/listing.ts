/**
 * Listing fetcher — extracts photos + property details from a Zillow or Airbnb
 * listing URL.
 *
 * Strategy (most reliable first):
 *   1. Parse embedded structured data (JSON-LD, Next.js __NEXT_DATA__,
 *      Apollo/redux state blobs) — this is where both sites keep the real data.
 *   2. Fall back to OpenGraph / <meta> tags for a headline image + title.
 *
 * These pages are bot-protected and their markup changes often, so every
 * failure path returns an actionable message telling the agent to upload
 * photos directly instead.
 */

import { parse } from "node-html-parser";
import { BROWSER_UA, MAX_GALLERY } from "../constants.js";
import type { ListingData, ListingPlatform } from "../types.js";
import { httpRequest, HttpError } from "./http.js";
import { apifyConfigured, fetchZillowViaApify, fetchAirbnbViaApify } from "./apify.js";

/** A listing fetch failure the agent can act on. */
export class ListingFetchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ListingFetchError";
  }
}

/** Identify the platform from the URL host. */
export function detectPlatform(url: string): ListingPlatform {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "unknown";
  }
  if (host.includes("zillow.")) return "zillow";
  if (host.includes("airbnb.")) return "airbnb";
  return "unknown";
}

/** Recursively collect image URLs from an arbitrary JSON blob. */
function collectImageUrls(node: unknown, out: Set<string>, depth = 0): void {
  if (depth > 12 || out.size >= MAX_GALLERY * 3) return;
  if (typeof node === "string") {
    if (/^https?:\/\/[^\s"']+\.(?:jpe?g|png|webp)(?:\?[^\s"']*)?$/i.test(node)) out.add(node);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) collectImageUrls(item, out, depth + 1);
    return;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node as Record<string, unknown>)) {
      collectImageUrls(value, out, depth + 1);
    }
  }
}

/** Pull a numeric value from common bed/bath field names in a JSON blob. */
function findNumber(node: unknown, keys: string[], depth = 0): number | null {
  if (depth > 12 || !node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (keys.includes(key.toLowerCase())) {
      const v = obj[key];
      const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
      if (Number.isFinite(n) && n > 0 && n < 100) return n;
    }
  }
  for (const value of Object.values(obj)) {
    if (value && typeof value === "object") {
      const found = findNumber(value, keys, depth + 1);
      if (found != null) return found;
    }
  }
  return null;
}

interface ParsedStructured {
  photos: string[];
  address: string;
  price: string;
  beds: number | null;
  baths: number | null;
  description: string;
}

/** Try to read structured data out of one JSON object (JSON-LD or state blob). */
function readFromJson(data: unknown): Partial<ParsedStructured> {
  const result: Partial<ParsedStructured> = {};
  const images = new Set<string>();
  collectImageUrls(data, images);
  if (images.size) result.photos = Array.from(images);

  // JSON-LD real-estate / product shapes.
  const asObj = (data ?? {}) as Record<string, unknown>;
  const address = asObj.address;
  if (typeof address === "string") result.address = address;
  else if (address && typeof address === "object") {
    const a = address as Record<string, unknown>;
    const parts = [a.streetAddress, a.addressLocality, a.addressRegion, a.postalCode]
      .filter((p) => typeof p === "string" && p) as string[];
    if (parts.length) result.address = parts.join(", ");
  }
  if (typeof asObj.name === "string" && !result.address) result.address = asObj.name;
  if (typeof asObj.description === "string") result.description = asObj.description;

  const offers = asObj.offers as Record<string, unknown> | undefined;
  const price = offers?.price ?? asObj.price;
  if (typeof price === "number") result.price = `$${price.toLocaleString("en-US")}`;
  else if (typeof price === "string" && price.trim()) result.price = price.trim().startsWith("$") ? price.trim() : `$${price.trim()}`;

  const beds = findNumber(data, ["bedrooms", "beds", "numberofrooms", "numberofbedrooms"]);
  if (beds != null) result.beds = beds;
  const baths = findNumber(data, ["bathrooms", "baths", "numberofbathroomstotal", "numberofbathrooms"]);
  if (baths != null) result.baths = baths;

  return result;
}

/** Extract all candidate JSON blobs from the HTML (JSON-LD + __NEXT_DATA__). */
function extractJsonBlobs(html: string): unknown[] {
  const root = parse(html);
  const blobs: unknown[] = [];

  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      blobs.push(JSON.parse(script.text));
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  const nextData = root.querySelector("#__NEXT_DATA__");
  if (nextData) {
    try {
      blobs.push(JSON.parse(nextData.text));
    } catch {
      /* ignore */
    }
  }
  // Zillow embeds a hydration cache in a script assigned to a JS var.
  const cacheMatch = html.match(/"apiCache":"(.+?)","/);
  if (cacheMatch) {
    try {
      blobs.push(JSON.parse(cacheMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\")));
    } catch {
      /* ignore */
    }
  }
  return blobs;
}

/** Read OpenGraph/meta fallbacks for a headline image + title/price. */
function readMetaFallback(html: string): Partial<ParsedStructured> {
  const root = parse(html);
  const result: Partial<ParsedStructured> = {};
  const images = new Set<string>();
  for (const m of root.querySelectorAll('meta[property="og:image"], meta[name="og:image"]')) {
    const c = m.getAttribute("content");
    if (c) images.add(c);
  }
  if (images.size) result.photos = Array.from(images);
  const title = root.querySelector('meta[property="og:title"]')?.getAttribute("content");
  if (title) result.address = title;
  const desc = root.querySelector('meta[property="og:description"], meta[name="description"]')?.getAttribute("content");
  if (desc) result.description = desc;
  return result;
}

/** Merge partials, preferring already-set (earlier / higher-confidence) values. */
function merge(base: Partial<ParsedStructured>, next: Partial<ParsedStructured>): Partial<ParsedStructured> {
  return {
    photos: (base.photos && base.photos.length ? base.photos : next.photos) ?? [],
    address: base.address || next.address,
    price: base.price || next.price,
    beds: base.beds ?? next.beds ?? null,
    baths: base.baths ?? next.baths ?? null,
    description: base.description || next.description,
  };
}

/** De-duplicate + clean image URLs, preferring higher-resolution variants. */
function cleanPhotos(urls: string[], limit: number = MAX_GALLERY): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = raw.replace(/&amp;/g, "&").trim();
    // Skip obvious sprites/icons/avatars.
    if (/(sprite|icon|logo|avatar|profile|badge|placeholder)/i.test(url)) continue;
    // Normalize Zillow size tokens to a large variant for a cleaner reel.
    const norm = url.replace(/-cc_ft_\d+\./, "-cc_ft_1536.").replace(/_\d+x\d+\./, "_1536x864.");
    const key = norm.split("?")[0];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(norm);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Pick a balanced set of `count` photos from a full gallery for a reel.
 *
 * Listing galleries are ordered like a tour (hero exterior first, then rooms),
 * so rather than take the first N consecutive shots — which can be nine angles
 * of the same kitchen — we keep the hero and then evenly sample across the
 * whole gallery. That yields variety (exterior → living → kitchen → beds →
 * yard) and a more intentional-feeling reel. Order is preserved.
 *
 * @param photos Full gallery in listing order.
 * @param count  Target number of photos (e.g. Seedance's 9-image cap).
 */
export function selectReelPhotos(photos: string[], count: number): string[] {
  if (count <= 0) return [];
  if (photos.length <= count) return [...photos];

  const chosenIdx = new Set<number>([0]); // always keep the hero
  const remaining = count - 1;
  const step = (photos.length - 1) / remaining;
  for (let i = 1; i <= remaining; i++) {
    const idx = Math.min(photos.length - 1, Math.max(1, Math.round(i * step)));
    chosenIdx.add(idx);
  }
  // De-dup from rounding collisions may leave us short — backfill in order.
  for (let i = 1; i < photos.length && chosenIdx.size < count; i++) chosenIdx.add(i);

  return Array.from(chosenIdx)
    .sort((a, b) => a - b)
    .slice(0, count)
    .map((i) => photos[i]);
}

/**
 * Fetch and parse a Zillow or Airbnb listing.
 * @throws {ListingFetchError} with an actionable message on any failure.
 */
export async function fetchListing(url: string): Promise<ListingData> {
  const platform = detectPlatform(url);
  if (platform === "unknown") {
    throw new ListingFetchError(
      `That URL isn't a recognized Zillow or Airbnb listing. Paste a Zillow (zillow.com/homedetails/...) or Airbnb (airbnb.com/rooms/...) link, or upload the listing photos directly and I'll build the reel from those.`,
    );
  }

  // ── Zillow / Airbnb via Apify (residential proxies) ──
  // Both sites block direct datacenter fetches, so when Apify is configured we
  // pull the listing through it. This is the reliable path; the direct fetch
  // below is only a fallback (and usually blocked).
  if (apifyConfigured() && (platform === "zillow" || platform === "airbnb")) {
    try {
      const viaApify =
        platform === "zillow" ? await fetchZillowViaApify(url) : await fetchAirbnbViaApify(url);
      if (viaApify && viaApify.photos.length) {
        return { ...viaApify, photos: cleanPhotos(viaApify.photos) };
      }
    } catch {
      // fall through to direct fetch
    }
  }

  let res;
  try {
    res = await httpRequest(url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
  } catch (error) {
    const msg = error instanceof HttpError ? error.message : String(error);
    throw new ListingFetchError(
      `Couldn't reach the ${platform} listing (${msg}). The page may be temporarily unavailable — try again in a moment, or upload the listing photos directly.`,
    );
  }

  if (!res.ok) {
    const hint =
      res.status === 403 || res.status === 429
        ? `${platform} is blocking automated access to this page`
        : `the page returned HTTP ${res.status}`;
    throw new ListingFetchError(
      `Couldn't read the ${platform} listing — ${hint}. This is common with ${platform}'s bot protection. Upload the listing photos directly (with the address and price) and I'll build the reel from those instead.`,
    );
  }

  // Parse structured data, then fill gaps with meta fallbacks.
  let parsed: Partial<ParsedStructured> = {};
  for (const blob of extractJsonBlobs(res.text)) {
    parsed = merge(parsed, readFromJson(blob));
  }
  parsed = merge(parsed, readMetaFallback(res.text));

  const photos = cleanPhotos(parsed.photos ?? []);
  if (photos.length === 0) {
    throw new ListingFetchError(
      `I reached the ${platform} listing but couldn't extract any usable photos from it (the page likely rendered its gallery behind a login or bot check). Upload the listing photos directly and I'll build the reel — you can include the address and price too.`,
    );
  }

  return {
    photos,
    address: (parsed.address ?? "").trim(),
    price: (parsed.price ?? "").trim(),
    beds: parsed.beds ?? null,
    baths: parsed.baths ?? null,
    description: (parsed.description ?? "").trim(),
    platform,
    source_url: url,
  };
}
