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
    scene_prompt: z
      .string()
      .max(500)
      .optional()
      .describe(
        "OPTIONAL image-adapted Seedance prompt. Look at the actual photos and write ONE short, plain motion+mood line adapted from The Vantage house style (smooth cinematic camera glide, warm elegant tone), naming what's really in the shots (e.g. 'Cinematic glide through the open modern kitchen and living room, warm golden light, smooth confident camera.'). No negatives, no lists, no per-shot instructions — the photos carry the content. If omitted, the style preset's prompt is used.",
      ),
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
    scene_prompt: z
      .string()
      .max(500)
      .optional()
      .describe("OPTIONAL image-adapted Seedance prompt (see vantage_generate_reel). Usually leave empty here — you haven't seen the photos yet on the URL path; fetch first with vantage_fetch_listing if you want to tailor the prompt."),
    resolution: ReelResolutionEnum.optional().describe("Output resolution '1080p' (default) or '4k' (premium). Ask the agent which they want."),
  })
  .strict();
export type CreateReelFromUrlInput = z.infer<typeof CreateReelFromUrlInput>;

export const CheckReelInput = z
  .object({
    job_id: z
      .string()
      .min(1)
      .describe("The job_id returned by any Vantage generation tool (reel, staging, or animate)."),
  })
  .strict();
export type CheckReelInput = z.infer<typeof CheckReelInput>;

// ── Virtual staging ────────────────────────────────────────────────────────
export const StagingStyleEnum = z
  .enum([
    "modern",
    "mid_century",
    "coastal",
    "farmhouse",
    "luxury_modern",
    "scandinavian",
    "luxury_minimalist",
    "bohemian",
    "mediterranean",
    "spanish",
  ])
  .describe("Interior design style the room is staged into.");

export const RoomTypeEnum = z
  .enum([
    "living room",
    "bedroom",
    "master bedroom",
    "kitchen",
    "dining room",
    "bathroom",
    "home office",
    "family room",
    "den",
    "sun room",
    "foyer",
    "patio",
    "nursery",
    "guest room",
  ])
  .describe("What room is in the photo — drives the staging prompt.");

export const StageRoomInput = z
  .object({
    photo: z
      .string()
      .min(1)
      .describe("ONE room photo as a public image URL or base64 data URI. Best results with a clear, straight-on shot."),
    room_type: RoomTypeEnum.default("living room").describe("The room shown in the photo (default 'living room')."),
    style: StagingStyleEnum.default("luxury_minimalist").describe("Target design style (default 'luxury_minimalist')."),
    is_empty: z
      .boolean()
      .default(true)
      .describe("true if the room is empty/unfurnished (it will be furnished); false to restyle existing furniture."),
    resolution: ReelResolutionEnum.optional().describe("Output resolution '1080p' (default) or '4k'."),
    address: z.string().optional().describe("Optional property address, for the caption."),
    price: z.string().optional().describe("Optional listing price display string, for the caption."),
  })
  .strict();
export type StageRoomInput = z.infer<typeof StageRoomInput>;

// ── Single-photo animation ─────────────────────────────────────────────────
export const ShotTypeEnum = z
  .enum([
    "push_in",
    "pull_out",
    "establishing",
    "truck_left",
    "truck_right",
    "pan_left",
    "pan_right",
    "parallax_left",
    "parallax_right",
    "tilt_up",
    "tilt_down",
    "pedestal_up",
    "pedestal_down",
    "orbit_left",
    "orbit_right",
  ])
  .describe("Camera move applied to the still photo. 'push_in' is the cinematic default.");

export const AnimatePhotoInput = z
  .object({
    photo: z
      .string()
      .min(1)
      .describe("ONE photo as a public image URL or base64 data URI to bring to life with a camera move."),
    shot_type: ShotTypeEnum.default("push_in").describe("Camera move (default 'push_in')."),
    resolution: ReelResolutionEnum.optional().describe("Output resolution '1080p' (default) or '4k'."),
    address: z.string().optional().describe("Optional property address, for the caption."),
    price: z.string().optional().describe("Optional listing price display string, for the caption."),
  })
  .strict();
export type AnimatePhotoInput = z.infer<typeof AnimatePhotoInput>;

// ── Sun-to-sun (golden-hour cycle) ─────────────────────────────────────────
export const SunToSunInput = z
  .object({
    photo: z
      .string()
      .min(1)
      .describe("ONE bright daytime EXTERIOR photo (public URL or base64). Rendered cycling through sunrise, golden hour, and dusk."),
    resolution: ReelResolutionEnum.optional().describe("Output resolution '1080p' (default) or '4k'."),
    address: z.string().optional().describe("Optional property address, for the caption."),
    price: z.string().optional().describe("Optional listing price display string, for the caption."),
  })
  .strict();
export type SunToSunInput = z.infer<typeof SunToSunInput>;

// ── Sketch-to-real (render/sketch → photoreal) ─────────────────────────────
export const SketchToRealInput = z
  .object({
    photo: z
      .string()
      .min(1)
      .describe("ONE architectural sketch, floor plan, or 3D render (public URL or base64) to bring to photoreal life."),
    intent: z
      .enum(["interior", "exterior"])
      .default("exterior")
      .describe("Whether the sketch is an interior space or an exterior/building (default 'exterior')."),
    resolution: ReelResolutionEnum.optional().describe("Output resolution '1080p' (default) or '4k'."),
    address: z.string().optional().describe("Optional property address, for the caption."),
    price: z.string().optional().describe("Optional listing price display string, for the caption."),
  })
  .strict();
export type SketchToRealInput = z.infer<typeof SketchToRealInput>;

// Tools that take no arguments (empty object).
export const NoInput = z.object({}).strict();
export type NoInput = z.infer<typeof NoInput>;
