/**
 * Tool: vantage_list_capabilities
 * A machine-readable catalog of everything the connector can make, with credit
 * costs and a recommended agentic workflow. This is what lets Claude explain
 * The Vantage to a client and plan a full multi-asset listing package.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { NoInput } from "../schemas.js";
import { toJsonResult } from "./shared.js";
import {
  REEL_CREDIT_COST,
  REEL_CREDIT_COST_4K,
  STAGING_CREDIT_COST,
  ANIMATE_CREDIT_COST,
} from "../constants.js";

const OutputSchema = {
  brand: z.string(),
  tagline: z.string(),
  capabilities: z.array(z.record(z.any())),
  recommended_workflow: z.array(z.string()),
  styles: z.record(z.any()),
};

const CATALOG = {
  brand: "The Vantage",
  tagline: "The first agentic listing tool — it lives in your Claude and does the studio work for you.",
  capabilities: [
    {
      name: "Done-For-You Reel",
      tools: ["vantage_create_reel_from_url", "vantage_generate_reel"],
      input: "A Zillow/Airbnb URL, or 3-9 listing photos",
      output: "A finished 15s cinematic listing reel + caption + hashtags",
      credits: `${REEL_CREDIT_COST} (1080p) / ${REEL_CREDIT_COST_4K} (4K)`,
      best_for: "The hero social asset for any listing.",
    },
    {
      name: "Virtual Staging",
      tools: ["vantage_stage_room"],
      input: "ONE room photo + a design style",
      output: "A locked-camera clip of the room furnishing/restyling itself",
      credits: STAGING_CREDIT_COST,
      best_for: "Empty listings, dated rooms, showing a buyer a space's potential.",
    },
    {
      name: "Animate a Photo",
      tools: ["vantage_animate_photo"],
      input: "ONE photo + a camera move",
      output: "A short motion clip from a single still",
      credits: ANIMATE_CREDIT_COST,
      best_for: "Turning a standout shot (kitchen, view, facade) into a scroll-stopper.",
    },
    {
      name: "Fetch Listing",
      tools: ["vantage_fetch_listing"],
      input: "A Zillow/Airbnb URL",
      output: "The listing's photos + details for review before generating",
      credits: 0,
      best_for: "Curating the best shots yourself before building a reel.",
    },
    {
      name: "Account Status",
      tools: ["vantage_account_status"],
      input: "none",
      output: "Credit balance + how many assets it buys",
      credits: 0,
      best_for: "Planning a job the account can afford.",
    },
  ],
  recommended_workflow: [
    "1. Call vantage_account_status to see the credit budget.",
    "2. If the client gives a listing URL, call vantage_fetch_listing to see the gallery; propose a content plan (which assets, why).",
    "3. Confirm the plan + resolution with the client.",
    "4. Execute: the hero reel (vantage_create_reel_from_url or vantage_generate_reel), stage any weak/empty rooms (vantage_stage_room), and animate 1-2 standout stills (vantage_animate_photo).",
    "5. Poll each job with vantage_check_reel until complete.",
    "6. Deliver every video link + a ready-to-post caption + hashtags, and note the reels are saved in the client's Vantage gallery at thevantage.media.",
  ],
  styles: {
    reel: ["luxury", "family", "airbnb", "snappy", "creative"],
    staging: [
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
    ],
    camera_moves: [
      "push_in",
      "pull_out",
      "pan_left",
      "pan_right",
      "tilt_up",
      "tilt_down",
      "orbit_left",
      "orbit_right",
      "parallax_left",
      "parallax_right",
    ],
  },
};

const DESCRIPTION = `List everything The Vantage connector can make — every asset type, its tools, credit cost, and a recommended step-by-step workflow for building a full listing package. Read-only. Call this first when a client asks "what can you do?" or when planning a multi-asset job, so you know the full menu (it's much more than reels: virtual staging and single-photo animation too).`;

export function registerListCapabilities(server: McpServer): void {
  server.registerTool(
    "vantage_list_capabilities",
    {
      title: "List Vantage Capabilities",
      description: DESCRIPTION,
      inputSchema: NoInput.shape,
      outputSchema: OutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async () => toJsonResult(CATALOG),
  );
}
