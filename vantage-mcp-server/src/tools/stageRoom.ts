/**
 * Tool: vantage_stage_room
 * Virtually stage a single room photo — furnish an empty room, or restyle an
 * existing one, into a chosen interior style with a locked-off camera reveal.
 * Async: returns a job_id; poll with vantage_check_reel.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { StageRoomInput } from "../schemas.js";
import { startGeneration, ReelError } from "../services/vantage.js";
import { CATEGORY_VIRTUAL_STAGING, STAGING_CREDIT_COST } from "../constants.js";
import { currentToken, MissingAuthError, toErrorResult, toJsonResult } from "./shared.js";

const OutputSchema = {
  job_id: z.string(),
  status: z.string(),
  message: z.string(),
};

const DESCRIPTION = `Virtually stage ONE room photo into a chosen interior-design style — a short, locked-camera clip where the room furnishes/redesigns itself (identical framing, so the "before" and "after" line up). Great for empty listings, dated rooms, or showing a buyer the potential of a space. Costs ${STAGING_CREDIT_COST} credits.

This STARTS the render and returns a job_id (rendering takes ~1-2 min). Then poll vantage_check_reel with that job_id every ~20s until status "complete".

Args:
  - photo (string): ONE room photo (public image URL or base64). A clear, straight-on shot works best.
  - room_type: the room shown (e.g. 'living room', 'kitchen', 'master bedroom'). Default 'living room'.
  - style: target design style (e.g. 'luxury_minimalist', 'modern', 'scandinavian', 'coastal', 'farmhouse'). Default 'luxury_minimalist'.
  - is_empty (bool): true if the room is empty (it gets furnished); false to restyle existing furniture. Default true.
  - resolution: '1080p' (default) or '4k'.

Returns (JSON): { job_id, status: "processing", message }.`;

export function registerStageRoom(server: McpServer): void {
  server.registerTool(
    "vantage_stage_room",
    {
      title: "Virtually Stage a Room (start)",
      description: DESCRIPTION,
      inputSchema: StageRoomInput.shape,
      outputSchema: OutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      try {
        const token = currentToken();
        const { jobId } = await startGeneration({
          category: CATEGORY_VIRTUAL_STAGING,
          label: "virtual staging",
          cost: STAGING_CREDIT_COST,
          resolution: input.resolution,
          caption: { address: input.address, price: input.price, style: "luxury" },
          token,
          body: {
            category: CATEGORY_VIRTUAL_STAGING,
            photo_urls: [input.photo],
            shot_type: "push_in",
            staging_style: input.style,
            staging_mode: "single",
            staging_styles: [input.style],
            staging_ai_pick: false,
            staging_room_type: input.room_type,
            staging_is_empty: input.is_empty,
            generate_audio: true,
            duration: 5,
            credits_cost: STAGING_CREDIT_COST,
          },
        });
        return toJsonResult({
          job_id: jobId,
          status: "processing",
          message:
            "Staging is rendering (usually 1-2 min). Call vantage_check_reel with this job_id in ~20 seconds and keep polling until status \"complete\".",
        });
      } catch (error) {
        if (error instanceof MissingAuthError || error instanceof ReelError) return toErrorResult(error.message);
        return toErrorResult(`Unexpected error starting staging: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  );
}
