/**
 * Tool: vantage_create_reel_from_url
 * The primary end-to-end tool: fetch a Zillow/Airbnb listing, then generate a
 * finished reel with caption copy in a single call.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CreateReelFromUrlInput } from "../schemas.js";
import { fetchListing, ListingFetchError } from "../services/listing.js";
import { generateReel, ReelError } from "../services/vantage.js";
import type { ReelStyle } from "../types.js";
import { currentAuth, MissingAuthError, toErrorResult, toJsonResult } from "./shared.js";

const OutputSchema = {
  reel_url: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
  address: z.string(),
  price: z.string(),
  platform: z.string(),
  photo_count: z.number(),
};

const DESCRIPTION = `Create a finished reel directly from a Zillow or Airbnb listing URL — fetch + generate in one call.

This is the PRIMARY tool for agents. Give it a listing URL and it: (1) fetches the listing photos and details, (2) generates the reel, (3) returns the reel URL with a ready-to-post caption and hashtags. It blocks until the reel is fully rendered (typically 1-3 minutes). Don't ask the agent for extra information first unless the URL is invalid.

Args:
  - listing_url (string): A Zillow or Airbnb listing URL.
  - style ('luxury'|'family'|'airbnb'|'snappy'|'creative', optional): Reel style. Defaults to 'airbnb' for Airbnb links and 'snappy' otherwise.

Returns (JSON):
  {
    "reel_url": string,       // URL of the finished reel video
    "caption": string,        // ready-to-post social caption
    "hashtags": string[],     // relevant hashtags (without '#')
    "address": string,        // detected property address
    "price": string,          // detected price
    "platform": "zillow" | "airbnb",
    "photo_count": number     // photos used in the reel
  }

Error handling:
  - If the listing can't be fetched (bot protection, no photos, invalid URL),
    returns an actionable error suggesting the agent upload photos directly and
    use vantage_generate_reel instead.
  - Also surfaces auth/credit/render errors from the generator with next steps.`;

export function registerCreateReelFromUrl(server: McpServer): void {
  server.registerTool(
    "vantage_create_reel_from_url",
    {
      title: "Create Reel from Listing URL",
      description: DESCRIPTION,
      inputSchema: CreateReelFromUrlInput.shape,
      outputSchema: OutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async ({ listing_url, style }) => {
      try {
        const auth = currentAuth();

        // 1) Fetch the listing.
        const listing = await fetchListing(listing_url);

        // 2) Choose a sensible default style by platform if not specified.
        const chosenStyle: ReelStyle = style ?? (listing.platform === "airbnb" ? "airbnb" : "snappy");

        // 3) Generate the reel from the fetched materials.
        const result = await generateReel(
          {
            photos: listing.photos,
            address: listing.address,
            price: listing.price,
            beds: listing.beds,
            baths: listing.baths,
            description: listing.description,
            style: chosenStyle,
          },
          auth,
        );

        return toJsonResult({
          ...result,
          address: listing.address,
          price: listing.price,
          platform: listing.platform,
          photo_count: listing.photos.length,
        });
      } catch (error) {
        if (
          error instanceof ListingFetchError ||
          error instanceof ReelError ||
          error instanceof MissingAuthError
        ) {
          return toErrorResult(error.message);
        }
        return toErrorResult(`Unexpected error creating reel: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  );
}
