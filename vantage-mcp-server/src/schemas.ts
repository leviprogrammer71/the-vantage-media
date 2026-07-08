/**
 * Zod input schemas for the Vantage MCP tools.
 */

import { z } from "zod";
import { MAX_PHOTOS, MIN_PHOTOS } from "./constants.js";

export const ReelStyleEnum = z
  .enum(["luxury", "family", "airbnb", "snappy", "creative"])
  .describe("Reel style preset. 'luxury' for high-end homes, 'family' for residential, 'airbnb' for short-term rentals, 'snappy' for fast-cut social, 'creative' for editorial.");

export const ReelResolutionEnum = z
  .enum(["1080p", "4k"])
  .describe("Output resolution. '1080p' (default, 50 credits) or '4k' (premium, 80 credits, sharper). ASK the agent which they want before generating.");

export const FetchListingInput = z
  .object({
    listing_url: z
      .string()
      .url("listing_url must be a valid URL")
      .describe("A Zillow (zillow.com/homedetails/...) or Airbnb (airbnb.com/rooms/...) listing URL."),
  })
  .strict();
export type FetchListingInput = z.infer<typeof FetchListingInput>;

export const GenerateReelInput = z
  .object({
    photos: z
      .array(z.string().min(1))
      .min(MIN_PHOTOS, `Provide at least ${MIN_PHOTOS} photos.`)
      .max(MAX_PHOTOS, `At most ${MAX_PHOTOS} photos are used per reel; extra photos are ignored.`)
      .describe("Listing photos as public image URLs or base64 data URIs. Order = order shown in the reel."),
    address: z.string().optional().describe("Property address, e.g. '123 Oak St, Austin, TX 78704'."),
    price: z.string().optional().describe("Listing price as a display string, e.g. '$1,250,000'."),
    features: z.string().optional().describe("Key selling features, e.g. 'chef's kitchen, pool, walk to downtown'."),
    style: ReelStyleEnum.optional().describe("Reel style preset (default 'snappy')."),
    resolution: ReelResolutionEnum.optional().describe("Output resolution '1080p' (default) or '4k' (premium). Ask the agent which they want."),
    beds: z.number().int().min(0).max(50).optional().describe("Number of bedrooms."),
    baths: z.number().min(0).max(50).optional().describe("Number of bathrooms."),
  })
  .strict();
export type GenerateReelInput = z.infer<typeof GenerateReelInput>;

export const CreateReelFromUrlInput = z
  .object({
    listing_url: z
      .string()
      .url("listing_url must be a valid URL")
      .describe("A Zillow or Airbnb listing URL. The tool fetches photos + details, then generates the reel."),
    style: ReelStyleEnum.optional().describe("Reel style preset (default: inferred from platform — 'airbnb' for Airbnb, else 'snappy')."),
    resolution: ReelResolutionEnum.optional().describe("Output resolution '1080p' (default) or '4k' (premium). Ask the agent which they want."),
  })
  .strict();
export type CreateReelFromUrlInput = z.infer<typeof CreateReelFromUrlInput>;

export const CheckReelInput = z
  .object({
    job_id: z
      .string()
      .min(1)
      .describe("The job_id returned by vantage_generate_reel or vantage_create_reel_from_url."),
  })
  .strict();
export type CheckReelInput = z.infer<typeof CheckReelInput>;
