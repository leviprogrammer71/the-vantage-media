/**
 * Tool: vantage_account_status
 * Return the connected account's credit balance and roughly how many of each
 * asset type that buys — so Claude can plan a job it can afford.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { NoInput } from "../schemas.js";
import { getAccountStatus, ReelError } from "../services/vantage.js";
import { currentToken, MissingAuthError, toErrorResult, toJsonResult } from "./shared.js";

const OutputSchema = {
  credits: z.number(),
  approx_reels: z.number(),
  approx_staging: z.number(),
  approx_animations: z.number(),
};

const DESCRIPTION = `Check the connected Vantage account's credit balance and how many assets it can afford. Call this before planning a multi-asset job so you don't start work the account can't pay for. Read-only — never charges.

Returns (JSON): { credits, approx_reels (@50cr), approx_staging (@15cr), approx_animations (@10cr) }.`;

export function registerAccountStatus(server: McpServer): void {
  server.registerTool(
    "vantage_account_status",
    {
      title: "Account & Credit Status",
      description: DESCRIPTION,
      inputSchema: NoInput.shape,
      outputSchema: OutputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const token = currentToken();
        const status = await getAccountStatus(token);
        return toJsonResult(status);
      } catch (error) {
        if (error instanceof MissingAuthError || error instanceof ReelError) return toErrorResult(error.message);
        return toErrorResult(`Unexpected error reading account status: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  );
}
