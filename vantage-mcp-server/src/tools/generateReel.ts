/**
 * Tool: vantage_generate_reel
 * Start a reel render from uploaded photos and return a job id to poll with
 * vantage_check_reel. Returns in a few seconds (rendering runs in the
 * background), so it never hits the connector's ~30s tool-call limit.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GenerateReelInput } from "../schemas.js";
import { startReel, ReelError } from "../services/vantage.js";
import { currentToken, MissingAuthError, toErrorResult, toJsonResult } from "./shared.js";

const OutputSchema = {
  job_id: z.string(),
  status: z.string(),
  message: z.string(),
};

const DESCRIPTION = `Start rendering a short-form video reel from listing photos. Returns quickly with a job id — the reel renders in the background.

Use this for the photo-upload path: when the agent provides their own listing photos directly. Because rendering takes 1-3 minutes (longer than a single tool call can stay open), this tool only STARTS the job and returns a job_id. Then call vantage_check_reel with that job_id every ~20 seconds until it reports "complete", which returns the finished reel URL, caption, and hashtags. If you have a Zillow/Airbnb URL instead, use vantage_create_reel_from_url.

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
    "job_id": string,     // pass to vantage_check_reel to poll
    "status": "processing",
    "message": string     // tells you to poll vantage_check_reel
  }

Error handling:
  - Returns an actionable error if fewer than 2 photos are given, the connector
    token is invalid/revoked, or credits are insufficient (checked up front).`;

export function registerGenerateReel(server: McpServer): void {
  server.registerTool(
    "vantage_generate_reel",
    {
      title: "Generate Reel from Photos (start)",
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
        const { jobId } = await startReel(
          {
            photos: input.photos,
            address: input.address,
            price: input.price,
            features: input.features,
            style: input.style,
            scenePrompt: input.scene_prompt,
            resolution: input.resolution,
            beds: input.beds ?? null,
            baths: input.baths ?? null,
          },
          token,
        );
        return toJsonResult({
          job_id: jobId,
          status: "processing",
          message:
            "Reel is rendering (usually 1-3 min). Call vantage_check_reel with this job_id in ~20 seconds, and keep polling until it returns status \"complete\".",
        });
      } catch (error) {
        if (error instanceof MissingAuthError || error instanceof ReelError) {
          return toErrorResult(error.message);
        }
        return toErrorResult(`Unexpected error starting reel: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  );
}
