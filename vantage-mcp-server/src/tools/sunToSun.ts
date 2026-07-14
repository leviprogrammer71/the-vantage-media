/**
 * Tool: vantage_sun_to_sun
 * Take one daytime exterior photo and render it cycling through sunrise,
 * golden hour, and dusk. Async: returns a job_id; poll with vantage_check_reel.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SunToSunInput } from "../schemas.js";
import { startGeneration, ReelError } from "../services/vantage.js";
import { CATEGORY_SUN_TO_SUN, SUN_TO_SUN_CREDIT_COST } from "../constants.js";
import { currentToken, MissingAuthError, toErrorResult, toJsonResult } from "./shared.js";

const OutputSchema = { job_id: z.string(), status: z.string(), message: z.string() };

const DESCRIPTION = `Turn ONE bright daytime exterior photo into a golden-hour showcase — the same home rendered across sunrise, golden hour, and dusk. Makes an ordinary MLS exterior look aspirational. Costs ${SUN_TO_SUN_CREDIT_COST} credits.

Starts the render and returns a job_id (~1-2 min); poll vantage_check_reel until "complete".

Args:
  - photo (string): ONE bright daytime EXTERIOR photo (URL or base64).
  - resolution: '1080p' (default) or '4k'.`;

export function registerSunToSun(server: McpServer): void {
  server.registerTool(
    "vantage_sun_to_sun",
    {
      title: "Sun-to-Sun Exterior (start)",
      description: DESCRIPTION,
      inputSchema: SunToSunInput.shape,
      outputSchema: OutputSchema,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (input) => {
      try {
        const token = currentToken();
        const { jobId } = await startGeneration({
          category: CATEGORY_SUN_TO_SUN,
          label: "sun-to-sun exterior",
          cost: SUN_TO_SUN_CREDIT_COST,
          resolution: input.resolution,
          caption: { address: input.address, price: input.price, style: "luxury" },
          token,
          body: {
            category: CATEGORY_SUN_TO_SUN,
            photo_urls: [input.photo],
            generate_audio: true,
            duration: 5,
            credits_cost: SUN_TO_SUN_CREDIT_COST,
          },
        });
        return toJsonResult({
          job_id: jobId,
          status: "processing",
          message: "Rendering the golden-hour cycle (usually 1-2 min). Poll vantage_check_reel with this job_id until status \"complete\".",
        });
      } catch (error) {
        if (error instanceof MissingAuthError || error instanceof ReelError) return toErrorResult(error.message);
        return toErrorResult(`Unexpected error starting sun-to-sun: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  );
}
