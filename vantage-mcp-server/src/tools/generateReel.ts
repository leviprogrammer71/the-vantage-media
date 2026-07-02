/**
 * Tool: vantage_generate_reel
 * Send photos + property details to The Vantage reel generator, wait for the
 * finished reel, and return it with a ready-to-post caption + hashtags.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GenerateReelInput } from "../schemas.js";
import { generateReel, ReelError } from "../services/vantage.js";
import { currentToken, MissingAuthError, toErrorResult, toJsonResult } from "./shared.js";

const OutputSchema = {
  reel_url: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()),
};

const DESCRIPTION = `Generate a short-form video reel from listing photos, then return the finished reel with caption copy.

Use this for the photo-upload path: when the agent provides their own listing photos directly. This call blocks until the reel is fully rendered (typically 1-3 minutes) and returns a ready-to-post caption and hashtags. If you have a Zillow/Airbnb URL instead, use vantage_create_reel_from_url.

Only ask the agent for the address and price if they haven't provided them; everything else is optional.

Args:
  - photos (string[]): 2-9 listing photos as public image URLs or base64 data URIs. Order = order shown in the reel.
  - address (string, optional): Property address.
  - price (string, optional): Listing price display string, e.g. "$1,250,000".
  - features (string, optional): Key selling features to highlight.
  - style ('luxury'|'family'|'airbnb'|'snappy'|'creative', optional): Reel style preset (default 'snappy').
  - beds (number, optional), baths (number, optional).

Returns (JSON):
  {
    "reel_url": string,      // URL of the finished reel video
    "caption": string,       // ready-to-post social caption
    "hashtags": string[]     // relevant hashtags (without '#')
  }

Error handling:
  - Returns an actionable error if fewer than 2 photos are given, the session
    token is missing/expired, credits are insufficient, or rendering fails.`;

export function registerGenerateReel(server: McpServer): void {
  server.registerTool(
    "vantage_generate_reel",
    {
      title: "Generate Reel from Photos",
      description: DESCRIPTION,
      inputSchema: GenerateReelInput.shape,
      outputSchema: OutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (input) => {
      try {
        const token = currentToken();
        const result = await generateReel(
          {
            photos: input.photos,
            address: input.address,
            price: input.price,
            features: input.features,
            style: input.style,
            beds: input.beds ?? null,
            baths: input.baths ?? null,
          },
          token,
        );
        return toJsonResult({ ...result });
      } catch (error) {
        if (error instanceof MissingAuthError || error instanceof ReelError) {
          return toErrorResult(error.message);
        }
        return toErrorResult(`Unexpected error generating reel: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  );
}
