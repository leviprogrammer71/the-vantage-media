/**
 * Tool: vantage_fetch_listing
 * Fetch photos + property details from a Zillow or Airbnb URL (read-only).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FetchListingInput } from "../schemas.js";
import { fetchListing, ListingFetchError } from "../services/listing.js";
import { toErrorResult, toJsonResult } from "./shared.js";

const OutputSchema = {
  photos: z.array(z.string()),
  address: z.string(),
  price: z.string(),
  beds: z.number().nullable(),
  baths: z.number().nullable(),
  description: z.string(),
  platform: z.string(),
  source_url: z.string(),
};

const DESCRIPTION = `Fetch listing photos and property details from a Zillow or Airbnb URL.

Use this to pull the raw materials for a reel WITHOUT generating one yet — especially when you want to CURATE the photos first. It returns the FULL gallery (up to 40 shots) in listing order. Review them, pick the best 6-9 (a balanced tour: exterior/hero, living, kitchen, primary bedroom, bath, and any standout feature — avoid near-duplicate angles of the same room), then pass that ordered subset to vantage_generate_reel. For a fast, hands-off reel that auto-curates for you, use vantage_create_reel_from_url instead.

Args:
  - listing_url (string): A Zillow (zillow.com/homedetails/...) or Airbnb (airbnb.com/rooms/...) listing URL.

Returns (JSON):
  {
    "photos": string[],        // extracted image URLs, in listing order (up to 9)
    "address": string,         // property address (may be empty if not found)
    "price": string,           // listing price display string (may be empty)
    "beds": number | null,     // bedrooms
    "baths": number | null,    // bathrooms
    "description": string,     // listing description text
    "platform": "zillow" | "airbnb",
    "source_url": string       // the URL fetched
  }

Error handling:
  - If the URL isn't Zillow/Airbnb, or the page blocks automated access, or no
    photos can be extracted, returns an actionable error telling the agent to
    upload the photos directly instead.`;

export function registerFetchListing(server: McpServer): void {
  server.registerTool(
    "vantage_fetch_listing",
    {
      title: "Fetch Listing (Zillow / Airbnb)",
      description: DESCRIPTION,
      inputSchema: FetchListingInput.shape,
      outputSchema: OutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ listing_url }) => {
      try {
        const data = await fetchListing(listing_url);
        return toJsonResult(data);
      } catch (error) {
        if (error instanceof ListingFetchError) return toErrorResult(error.message);
        return toErrorResult(`Unexpected error fetching listing: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  );
}
