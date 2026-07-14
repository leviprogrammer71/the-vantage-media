/**
 * Tool: vantage_create_reel_from_url
 * The primary entry point: fetch a Zillow/Airbnb listing, auto-curate photos,
 * and START a reel render — returning a job id to poll with vantage_check_reel.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MAX_PHOTOS } from "../constants.js";
import { CreateReelFromUrlInput } from "../schemas.js";
import { fetchListing, selectReelPhotos, ListingFetchError } from "../services/listing.js";
import { startReel, ReelError } from "../services/vantage.js";
import { curateReel } from "../services/curate.js";
import type { ReelStyle } from "../types.js";
import { currentToken, MissingAuthError, toErrorResult, toJsonResult } from "./shared.js";

const OutputSchema = {
  job_id: z.string(),
  status: z.string(),
  message: z.string(),
  address: z.string(),
  price: z.string(),
  platform: z.string(),
  photo_count: z.number(),
  photos_available: z.number(),
  curated_by: z.string(),
};

const DESCRIPTION = `Create a reel directly from a Zillow or Airbnb listing URL. Fetches + curates + starts the render, returning a job id to poll.

This is the PRIMARY tool for agents. Give it a listing URL and it: (1) fetches the full photo gallery and details (Zillow is pulled via a proxy scraper that bypasses bot-blocking), (2) auto-curates a balanced 9-photo set (keeps the hero shot and evenly samples across the gallery for variety), (3) STARTS the render and returns a job_id. Rendering takes 1-3 minutes, so then call vantage_check_reel with the job_id every ~20 seconds until it returns status "complete" with the reel URL, caption, and hashtags. Don't ask the agent for extra information first unless the URL is invalid.

If the agent wants to hand-pick which rooms appear, use vantage_fetch_listing to review the full gallery first, then vantage_generate_reel with your chosen photos.

Args:
  - listing_url (string): A Zillow or Airbnb listing URL.
  - style ('luxury'|'family'|'airbnb'|'snappy'|'creative', optional): defaults to 'airbnb' for Airbnb links, 'snappy' otherwise.

Returns (JSON):
  {
    "job_id": string,          // pass to vantage_check_reel to poll
    "status": "processing",
    "message": string,         // tells you to poll vantage_check_reel
    "address": string,
    "price": string,
    "platform": "zillow" | "airbnb",
    "photo_count": number,     // photos used in the reel
    "photos_available": number // total photos found in the gallery
  }

Error handling:
  - If the listing can't be fetched, returns an actionable error suggesting the
    agent upload photos directly and use vantage_generate_reel instead.
  - Also surfaces auth/credit errors with next steps.`;

export function registerCreateReelFromUrl(server: McpServer): void {
  server.registerTool(
    "vantage_create_reel_from_url",
    {
      title: "Create Reel from Listing URL (start)",
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
    async ({ listing_url, style, scene_prompt, resolution }) => {
      try {
        const token = currentToken();

        // 1) Fetch the listing (full gallery, up to 40 shots).
        const listing = await fetchListing(listing_url);

        // 2) Curate. First choice: Claude vision picks + orders the best shots
        //    and infers a style (the "creative director"). If that's
        //    unavailable for any reason, fall back to the deterministic
        //    hero + even-sample selection. Never blocks the render.
        const evenSample = selectReelPhotos(listing.photos, MAX_PHOTOS);
        const platformStyle: ReelStyle = listing.platform === "airbnb" ? "airbnb" : "snappy";

        const curation = await curateReel(listing.photos, {
          price: listing.price,
          address: listing.address,
          description: listing.description,
          platform: listing.platform,
        });

        const chosenPhotos = curation?.photos?.length ? curation.photos : evenSample;
        // Explicit caller style wins; else Claude's inferred style; else platform default.
        const chosenStyle: ReelStyle = style ?? curation?.style ?? platformStyle;

        // 4) Start the render — returns a job id to poll.
        const { jobId } = await startReel(
          {
            photos: chosenPhotos,
            address: listing.address,
            price: listing.price,
            beds: listing.beds,
            baths: listing.baths,
            description: listing.description,
            style: chosenStyle,
            scenePrompt: scene_prompt,
            resolution,
          },
          token,
        );

        return toJsonResult({
          job_id: jobId,
          status: "processing",
          message:
            "Fetched the listing and started rendering. Call vantage_check_reel with this job_id in ~20 seconds, and keep polling until status is \"complete\".",
          address: listing.address,
          price: listing.price,
          platform: listing.platform,
          photo_count: chosenPhotos.length,
          photos_available: listing.photos.length,
          curated_by: curation?.photos?.length ? "claude-vision" : "even-sample",
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
