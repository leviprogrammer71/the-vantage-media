/**
 * Apify-backed Zillow scraping.
 *
 * Zillow serves a bot challenge to datacenter IPs, so the server's direct fetch
 * is blocked. When an APIFY_TOKEN is configured we run Apify's Zillow detail
 * actor (residential proxies) via the run-sync API and get back the full
 * listing — photos + price + beds/baths + address — in ~20-30s.
 */

import { APIFY_TOKEN, APIFY_ZILLOW_ACTOR, APIFY_AIRBNB_ACTOR, APIFY_TIMEOUT_MS } from "../constants.js";
import type { ListingData } from "../types.js";
import { httpRequest } from "./http.js";

/** Whether Apify scraping is available (token configured). */
export function apifyConfigured(): boolean {
  return APIFY_TOKEN.length > 0;
}

/** Run an Apify actor synchronously and return its dataset items. */
async function runActorSync<T>(actor: string, input: unknown): Promise<T[]> {
  const endpoint =
    `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items` +
    `?token=${encodeURIComponent(APIFY_TOKEN)}`;
  const res = await httpRequest(
    endpoint,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) },
    APIFY_TIMEOUT_MS,
  );
  if (!res.ok) throw new Error(`Apify actor ${actor} returned HTTP ${res.status}`);
  try {
    const items = res.json<T[]>();
    return Array.isArray(items) ? items : [];
  } catch {
    throw new Error("Apify returned an unparseable response");
  }
}

interface MixedSource {
  url?: string;
  width?: number;
}
interface ZPhoto {
  url?: string;
  mixedSources?: { jpeg?: MixedSource[]; webp?: MixedSource[] };
}
interface ZItem {
  responsivePhotos?: ZPhoto[];
  originalPhotos?: ZPhoto[];
  hiResImageLink?: string;
  desktopWebHdpImageLink?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  description?: string;
}

/** Highest-resolution URL available for one photo entry. */
function bestPhotoUrl(p: ZPhoto): string | undefined {
  if (p.url) return p.url;
  const widest = (arr?: MixedSource[]): string | undefined => {
    if (!arr || !arr.length) return undefined;
    return arr.reduce((a, b) => ((b.width ?? 0) > (a.width ?? 0) ? b : a)).url;
  };
  return widest(p.mixedSources?.jpeg) ?? widest(p.mixedSources?.webp);
}

/**
 * Fetch a Zillow listing via Apify. Returns null if the actor produced no
 * usable item; throws on transport/HTTP failure so the caller can fall back.
 */
export async function fetchZillowViaApify(url: string): Promise<ListingData | null> {
  if (!apifyConfigured()) return null;

  const items = await runActorSync<ZItem>(APIFY_ZILLOW_ACTOR, { startUrls: [{ url }] });
  if (items.length === 0) return null;

  const it = items[0];
  const source = it.responsivePhotos?.length ? it.responsivePhotos : it.originalPhotos;
  let photos = (source ?? []).map(bestPhotoUrl).filter((u): u is string => !!u);
  if (photos.length === 0) {
    photos = [it.hiResImageLink, it.desktopWebHdpImageLink].filter((u): u is string => !!u);
  }
  if (photos.length === 0) return null;

  const address = [it.streetAddress, it.city, it.state, it.zipcode].filter(Boolean).join(", ");
  const price =
    typeof it.price === "number" && it.price > 0 ? `$${it.price.toLocaleString("en-US")}` : "";

  return {
    photos,
    address,
    price,
    beds: typeof it.bedrooms === "number" ? it.bedrooms : null,
    baths: typeof it.bathrooms === "number" ? it.bathrooms : null,
    description: (it.description ?? "").trim(),
    platform: "zillow",
    source_url: url,
  };
}

// ── Airbnb ─────────────────────────────────────────────────────────────────
interface AItem {
  images?: { imageUrl?: string; caption?: string }[];
  title?: string;
  price?: { label?: string };
  locationSubtitle?: string;
  description?: string;
}

/**
 * Fetch an Airbnb room listing via Apify. Returns null if no usable item;
 * throws on transport/HTTP failure so the caller can fall back.
 */
export async function fetchAirbnbViaApify(url: string): Promise<ListingData | null> {
  if (!apifyConfigured()) return null;

  const items = await runActorSync<AItem>(APIFY_AIRBNB_ACTOR, {
    startUrls: [{ url }],
    locale: "en-US",
    currency: "USD",
  });
  if (items.length === 0) return null;

  const it = items[0];
  const photos = (it.images ?? []).map((i) => i.imageUrl).filter((u): u is string => !!u);
  if (photos.length === 0) return null;

  // Airbnb only returns a nightly price when check-in/out dates are supplied;
  // otherwise it's a placeholder sentence. Only keep a real-looking price.
  const label = (it.price?.label ?? "").trim();
  const price = label && !/specify check-in|to get prices/i.test(label) && /\d/.test(label) ? label : "";

  return {
    photos,
    address: (it.locationSubtitle ?? "").trim(),
    price,
    beds: null,
    baths: null,
    description: (it.description ?? "").trim(),
    platform: "airbnb",
    source_url: url,
  };
}
