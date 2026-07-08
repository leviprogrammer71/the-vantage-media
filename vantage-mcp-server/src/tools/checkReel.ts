/**
 * Tool: vantage_check_reel
 * Poll a reel render started by vantage_generate_reel / vantage_create_reel_from_url.
 * Returns "processing" (poll again) or the finished reel with caption + hashtags.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { CheckReelInput } from "../schemas.js";
import { checkReel, ReelError } from "../services/vantage.js";
import { currentToken, MissingAuthError, toErrorResult, toJsonResult } from "./shared.js";

const OutputSchema = {
  status: z.string(),
  job_id: z.string().optional(),
  reel_url: z.string().optional(),
  caption: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  message: z.string().optional(),
};

const DESCRIPTION = `Check the status of a reel render and, once ready, return the finished reel.

Call this with the job_id from vantage_generate_reel or vantage_create_reel_from_url. It polls for up to ~20 seconds, then returns:
  - status "processing": the reel is still rendering — wait ~15-20 seconds and call this again with the same job_id.
  - status "complete": includes reel_url, caption, and hashtags — you're done.

Keep polling until you get "complete" (typically 3-9 checks over 1-3 minutes). Credits are charged once, on completion.

Args:
  - job_id (string): The job id from the start tool.

Returns (JSON):
  Processing: { "status": "processing", "message": string }
  Complete:   { "status": "complete", "reel_url": string, "caption": string, "hashtags": string[] }

Error handling:
  - Returns an actionable error if the job id is invalid, the render failed, or
    the connector token is invalid/revoked.`;

export function registerCheckReel(server: McpServer): void {
  server.registerTool(
    "vantage_check_reel",
    {
      title: "Check Reel Status",
      description: DESCRIPTION,
      inputSchema: CheckReelInput.shape,
      outputSchema: OutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async ({ job_id }) => {
      try {
        const token = currentToken();
        const result = await checkReel(job_id, token);
        if (result.status === "processing") {
          return toJsonResult({
            status: "processing",
            job_id: result.jobId,
            message:
              (result.note ? result.note + " " : "") +
              "Still rendering — wait ~15-20 seconds and call vantage_check_reel again, using the job_id from THIS response (it can change when the render moves to the enhance stage).",
          });
        }
        return toJsonResult({
          status: "complete",
          reel_url: result.reel_url,
          caption: result.caption,
          hashtags: result.hashtags,
        });
      } catch (error) {
        if (error instanceof MissingAuthError || error instanceof ReelError) {
          return toErrorResult(error.message);
        }
        return toErrorResult(`Unexpected error checking reel: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  );
}
