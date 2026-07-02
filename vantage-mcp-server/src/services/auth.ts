/**
 * Auth resolution for the Vantage MCP server.
 *
 * A Vantage session token (a Supabase user JWT) identifies the agent's account
 * and is what gets billed for credits. We accept it, in priority order, from:
 *   1. The incoming MCP request's `Authorization: Bearer <jwt>` header
 *      (set by the MCP client / connector config), or a `x-vantage-token` header.
 *   2. The `VANTAGE_TOKEN` environment variable (useful for local/stdio runs).
 *
 * The Supabase anon key is a public key read from the environment.
 */

import type { IncomingHttpHeaders } from "node:http";
import { SUPABASE_ANON_KEY } from "../constants.js";
import type { VantageAuth } from "../types.js";

/** Thrown when no usable Vantage token is available for a request. */
export class MissingAuthError extends Error {
  constructor() {
    super(
      "No Vantage session token found. Connect the MCP with your Vantage " +
        "account token (Authorization: Bearer <token> or the x-vantage-token " +
        "header), or set the VANTAGE_TOKEN environment variable. You can copy " +
        "your token from the Vantage dashboard under Settings → Connections.",
    );
    this.name = "MissingAuthError";
  }
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Extract a bearer token from request headers, if present. */
export function tokenFromHeaders(headers: IncomingHttpHeaders): string | undefined {
  const explicit = firstHeader(headers["x-vantage-token"]);
  if (explicit && explicit.trim()) return explicit.trim();

  const auth = firstHeader(headers["authorization"]);
  if (auth && auth.trim()) {
    const match = auth.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
    return auth.trim();
  }
  return undefined;
}

/**
 * Resolve the auth for a request. Header token wins; falls back to env.
 * @throws {MissingAuthError} if no token can be found.
 */
export function resolveAuth(headers?: IncomingHttpHeaders): VantageAuth {
  const headerToken = headers ? tokenFromHeaders(headers) : undefined;
  const token = headerToken ?? process.env.VANTAGE_TOKEN ?? "";
  if (!token) throw new MissingAuthError();

  // Anon key: env is the source of truth, but if a caller only has their
  // bearer token and the server has no anon key configured, Supabase will
  // still accept the bearer as the apikey for authenticated function calls.
  const anonKey = SUPABASE_ANON_KEY || token;
  return { token, anonKey };
}
