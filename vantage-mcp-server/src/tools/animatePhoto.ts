/**
 * Tool: vantage_animate_photo
 * Bring a single still photo to life with one cinematic camera move.
 * Async: returns a job_id; poll with vantage_check_reel.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AnimatePhotoInput } from "../schemas.js";
import { startGeneration, ReelError } from "../services/vantage.js";
import { CATEGORY_ANIMATE_SINGLE, ANIMATE_CREDIT_COST } from "../constants.js";
import { currentToken, MissingAuthError, toErrorResult, toJsonResult } from "./shared.js";

const OutputSchema = {
  job_id: z.string(),
  status: z.string(),
  message: z.string(),
};

const DESCRIPTION = `Animate ONE still photo with a single cinematic camera move (push in, pull out, pan, tilt, orbit, parallax…). Turns a flat listing photo into a scroll-stopping motion clip. Costs ${ANIMATE_CREDIT_COST} credits.

This STARTS the render and returns a job_id (~1 min). Then poll vantage_check_reel with that job_id until status "complete".

Args:
  - photo (string): ONE photo (public image URL or base64).
  - shot_type: camera move — 'push_in' (default), 'pull_out', 'pan_left', 'pan_right', 'tilt_up', 'tilt_down', 'orbit_left', 'orbit_right', 'parallax_left', 'parallax_right', 'pedestal_up', 'pedestal_down', 'establishing', 'truck_left', 'truck_right'.
  - resolution: '1080p' (default) or '4k'.

Returns (JSON): { job_id, status: "processing", message }.`;

export function registerAnimatePhoto(server: McpServer): void {
  server.registerTool(
    "vantage_animate_photo",
    {
      title: "Animate a Single Photo (start)",
      description: DESCRIPTION,
      inputSchema: AnimatePhotoInput.shape,
      outputSchema: OutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      try {
        const token = currentToken();
        const { jobId } = await startGeneration({
          category: CATEGORY_ANIMATE_SINGLE,
          label: "photo animation",
          cost: ANIMATE_CREDIT_COST,
          resolution: input.resolution,
          caption: { address: input.address, price: input.price, style: "snappy" },
          token,
          body: {
            category: CATEGORY_ANIMATE_SINGLE,
            photo_urls: [input.photo],
            shot_type: input.shot_type,
            generate_audio: true,
            effect_id: "none",
            duration: 5,
            credits_cost: ANIMATE_CREDIT_COST,
          },
        });
        return toJsonResult({
          job_id: jobId,
          status: "processing",
          message:
            "Animation is rendering (usually ~1 min). Call vantage_check_reel with this job_id in ~20 seconds and keep polling until status \"complete\".",
        });
      } catch (error) {
        if (error instanceof MissingAuthError || error instanceof ReelError) return toErrorResult(error.message);
        return toErrorResult(`Unexpected error starting animation: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  );
}
