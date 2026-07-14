/**
 * Shared constants for the Vantage MCP server.
 *
 * All values can be overridden via environment variables so the same build
 * runs against local, staging, or production Vantage backends.
 */

/** The Vantage Supabase project URL (edge functions live under /functions/v1). */
export const SUPABASE_URL =
  process.env.VANTAGE_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  "https://tsvmyjxnvdrwcdesiewv.supabase.co";

/**
 * Supabase anon (publishable) key. Required by the edge-function gateway on
 * every request in addition to the per-user bearer token. This is a public
 * key — safe to ship — but we still read it from the environment so it can be
 * rotated without a rebuild.
 */
export const SUPABASE_ANON_KEY = process.env.VANTAGE_SUPABASE_ANON_KEY ?? "";

/**
 * Supabase SERVICE ROLE key. This stays server-side on the hosted MCP server
 * and is NEVER exposed to a connecting client. It lets the server resolve a
 * caller's connector token to a user, deduct that user's credits, call the
 * reel generator, and record the submission — i.e. carry the whole burden so
 * the connecting Claude only needs the user's vtg_ token.
 */
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.VANTAGE_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Name of the edge function that runs reel generation. */
export const REEL_FUNCTION = "generate-listing-video";

/** Category the reel generator uses for a multi-photo "Done-For-You" reel. */
export const REEL_CATEGORY = "done_for_you_reel";

/** Category constants for the other generative flows the connector exposes. */
export const CATEGORY_VIRTUAL_STAGING = "virtual_staging";
export const CATEGORY_ANIMATE_SINGLE = "animate_single";
export const CATEGORY_SUN_TO_SUN = "sun_to_sun";
export const CATEGORY_SKETCH_TO_REAL = "sketch_to_real";

/** Credit cost of a sun-to-sun exterior cycle. */
export const SUN_TO_SUN_CREDIT_COST = 15;

/** Credit cost of a sketch-to-real render animation. */
export const SKETCH_TO_REAL_CREDIT_COST = 15;

/** Credit cost of a 1080p Done-For-You reel (720p generate + 1080p upscale). */
export const REEL_CREDIT_COST = 50;

/** Credit cost of a 4K reel (720p generate + 4K upscale) — premium tier. */
export const REEL_CREDIT_COST_4K = 80;

/** Credit cost of a virtual-staging clip (single empty room → furnished). */
export const STAGING_CREDIT_COST = 15;

/** Credit cost of a single-photo animation (one photo + a camera move). */
export const ANIMATE_CREDIT_COST = 10;

/** Credit cost for a given output resolution (reel flow). */
export function reelCreditCost(resolution: "1080p" | "4k"): number {
  return resolution === "4k" ? REEL_CREDIT_COST_4K : REEL_CREDIT_COST;
}

/** Default per-reel duration in seconds (single 15s Seedance reel). */
export const REEL_DURATION_SECONDS = 15;

/** Maximum photos Seedance 2.0 accepts as reference images in one reel. */
export const MAX_PHOTOS = 9;

/**
 * Maximum photos `vantage_fetch_listing` returns for review. A Zillow gallery
 * can have 30-60 shots; we surface the full curated set (up to this cap) so the
 * connecting Claude can pick the best ones itself before generating.
 */
export const MAX_GALLERY = 40;

/** Minimum photos needed to make a watchable reel. */
export const MIN_PHOTOS = 2;

// ── Async poll tuning ────────────────────────────────────────────────────
/** Delay between poll attempts, in ms. */
export const POLL_INTERVAL_MS = 4000;
/** Max poll attempts before giving up (90 × 4s = 6 min, matches the web app). */
export const POLL_MAX_ATTEMPTS = 90;

// ── HTTP tuning ──────────────────────────────────────────────────────────
/** Timeout for a single outbound HTTP request, in ms. */
export const HTTP_TIMEOUT_MS = 30000;
/** Cap on the size of any text response we return to the agent. */
export const CHARACTER_LIMIT = 25000;

/**
 * Browser-like User-Agent for listing fetches. Zillow/Airbnb return a bot
 * challenge (or an empty shell) to non-browser agents, so we present a real
 * desktop UA. This is a read-only public-page fetch.
 */
export const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// ── Apify (Zillow scraping via residential proxies) ───────────────────────
// Zillow blocks direct server-side fetches from datacenter IPs. When an Apify
// token is configured, Zillow listings are pulled through Apify's residential
// proxy actor instead — reliable, ~$0.004/listing. Falls back to direct fetch
// if unset or if the actor fails.
export const APIFY_TOKEN = process.env.APIFY_TOKEN ?? process.env.VANTAGE_APIFY_TOKEN ?? "";

/** Apify actor id for Zillow detail scraping (username~name form for the API). */
export const APIFY_ZILLOW_ACTOR = process.env.APIFY_ZILLOW_ACTOR ?? "maxcopell~zillow-detail-scraper";

/** Apify actor id for Airbnb room scraping (username~name form for the API). */
export const APIFY_AIRBNB_ACTOR = process.env.APIFY_AIRBNB_ACTOR ?? "tri_angle~airbnb-rooms-urls-scraper";

/** Timeout for an Apify run-sync call, in ms (the actor takes ~20-30s). */
export const APIFY_TIMEOUT_MS = 90000;
