/**
 * Shared TypeScript interfaces for the Vantage MCP server.
 */

/** Supported listing platforms. `mls` is planned (Path 3) but not built yet. */
export type ListingPlatform = "zillow" | "airbnb" | "unknown";

/** Structured listing data extracted from a Zillow or Airbnb page. */
export interface ListingData {
  photos: string[];
  address: string;
  price: string;
  beds: number | null;
  baths: number | null;
  description: string;
  platform: ListingPlatform;
  /** The source URL the data was fetched from. */
  source_url: string;
}

/** Reel style presets the generator understands. */
export type ReelStyle = "luxury" | "family" | "airbnb" | "snappy" | "creative";

/** Everything needed to render a reel. */
export interface ReelRequest {
  photos: string[];
  address?: string;
  price?: string;
  features?: string;
  style?: ReelStyle;
  /** Extra description used to enrich the caption. */
  description?: string;
  beds?: number | null;
  baths?: number | null;
}

/** Result of a completed reel generation. */
export interface ReelResult {
  reel_url: string;
  caption: string;
  hashtags: string[];
}

/**
 * Raw response shape from the generate-listing-video edge function. The
 * function is async: the first call returns prediction id(s) with
 * status "processing"; subsequent poll calls return status "complete" with a
 * video_url, or "failed" with an error.
 */
export interface ReelFunctionResponse {
  status?: "processing" | "complete" | "failed";
  video_url?: string;
  clip_urls?: string[];
  prediction_id?: string;
  prediction_ids?: unknown[];
  quick_effect?: unknown;
  error?: string;
}

/** Per-request auth resolved from headers or environment. */
export interface VantageAuth {
  /** Supabase user JWT (the Vantage session token). */
  token: string;
  /** Supabase anon key sent alongside the bearer token. */
  anonKey: string;
}
