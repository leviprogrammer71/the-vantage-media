/**
 * Tool: vantage_sketch_to_real
 * Bring an architectural sketch / floor plan / 3D render to photoreal life.
 * Async: returns a job_id; poll with vantage_check_reel.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SketchToRealInput } from "../schemas.js";
import { startGeneration, ReelError } from "../services/vantage.js";
import { CATEGORY_SKETCH_TO_REAL, SKETCH_TO_REAL_CREDIT_COST } from "../constants.js";
import { currentToken, MissingAuthError, toErrorResult, toJsonResult } from "./shared.js";

const OutputSchema = { job_id: z.string(), status: z.string(), message: z.string() };

const DESCRIPTION = `Turn ONE architectural sketch, floor plan, or 3D render into a photoreal reveal — great for pre-construction, renovations, and spec homes. Costs ${SKETCH_TO_REAL_CREDIT_COST} credits.

Starts the render and returns a job_id (~1-2 min); poll vantage_check_reel until "complete".

Args:
  - photo (string): ONE sketch / render / floor plan (URL or base64).
  - intent: 'interior' or 'exterior' (default 'exterior').
  - resolution: '1080p' (default) or '4k'.`;

export function registerSketchToReal(server: McpServer): void {
  server.registerTool(
    "vantage_sketch_to_real",
    {
      title: "Sketch-to-Real (start)",
      description: DESCRIPTION,
      inputSchema: SketchToRealInput.shape,
      outputSchema: OutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      try {
        const token = currentToken();
        const { jobId } = await startGeneration({
          category: CATEGORY_SKETCH_TO_REAL,
          label: "sketch-to-real",
          cost: SKETCH_TO_REAL_CREDIT_COST,
          resolution: input.resolution,
          caption: { address: input.address, price: input.price, style: "creative" },
          token,
          body: {
            category: CATEGORY_SKETCH_TO_REAL,
            photo_urls: [input.photo],
            sketch_intent: input.intent,
            generate_audio: true,
            duration: 5,
            credits_cost: SKETCH_TO_REAL_CREDIT_COST,
          },
        });
        return toJsonResult({
          job_id: jobId,
          status: "processing",
          message: "Rendering sketch-to-real (usually 1-2 min). Poll vantage_check_reel with this job_id until status \"complete\".",
        });
      } catch (error) {
        if (error instanceof MissingAuthError || error instanceof ReelError) return toErrorResult(error.message);
        return toErrorResult(`Unexpected error starting sketch-to-real: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  );
}
