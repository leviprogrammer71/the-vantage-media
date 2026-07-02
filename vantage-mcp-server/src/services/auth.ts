/**
 * Auth resolution for the Vantage MCP server.
 *
 * A caller presents their Vantage *connector token* (vtg_live_…), minted from
 * the Vantage dashboard and tied to their account. We accept it, in priority
 * order, from:
 *   1. The `Authorization: Bearer <token>` header (set by the MCP client), or
 *      the `x-vantage-token` header.
 *   2. The `VANTAGE_TOKEN` environment variable (for local/stdio runs).
 *
 * The token is opaque here; it is resolved to a user id server-side via the
 * service-role `resolve_mcp_token` RPC (see services/supabase.ts).
 */

import type { IncomingHttpHeaders } from "node:http";

/** Thrown when no connector token is available for a request. */
export class MissingAuthError extends Error {
  constructor() {
    super(
      "No Vantage connector token found. Connect the MCP with your token " +
        "(Authorization: Bearer vtg_live_… or the x-vantage-token header), or " +
        "set VANTAGE_TOKEN for local runs. Generate a token from the Vantage " +
        "dashboard under Settings → Connect to Claude.",
    );
    this.name = "MissingAuthError";
  }
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Extract a connector token from request headers, if present. */
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
 * Resolve the connector token string for a request. Header wins; falls back to
 * env. Does not validate the token — that happens server-side at resolve time.
 * @throws {MissingAuthError} if no token can be found.
 */
export function resolveToken(headers?: IncomingHttpHeaders): string {
  const headerToken = headers ? tokenFromHeaders(headers) : undefined;
  const token = headerToken ?? process.env.VANTAGE_TOKEN ?? "";
  if (!token) throw new MissingAuthError();
  return token;
}
