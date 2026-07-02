/**
 * Shared helpers for MCP tool handlers: response formatting and per-request
 * auth propagation.
 *
 * Because the Streamable HTTP transport is stateless (a fresh transport per
 * request), we use AsyncLocalStorage to carry the caller's resolved Vantage
 * auth from the Express handler into the tool handlers without threading it
 * through every function signature.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { CHARACTER_LIMIT } from "../constants.js";
import { resolveToken, MissingAuthError } from "../services/auth.js";
import type { IncomingHttpHeaders } from "node:http";

interface RequestContext {
  headers?: IncomingHttpHeaders;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Run `fn` with the given request headers available to tool handlers. */
export function withRequestContext<T>(ctx: RequestContext, fn: () => Promise<T>): Promise<T> {
  return storage.run(ctx, fn);
}

/**
 * Resolve the connector token for the current request (headers first, env
 * fallback).
 * @throws {MissingAuthError} if no token is available.
 */
export function currentToken(): string {
  const ctx = storage.getStore();
  return resolveToken(ctx?.headers);
}

export { MissingAuthError };

/** Standard MCP tool result shape. */
type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

/** Format a successful structured result as both JSON text and structuredContent. */
export function toJsonResult(data: object): ToolResult {
  let text = JSON.stringify(data, null, 2);
  if (text.length > CHARACTER_LIMIT) {
    text = text.slice(0, CHARACTER_LIMIT) + "\n… (truncated)";
  }
  return { content: [{ type: "text", text }], structuredContent: data as Record<string, unknown> };
}

/** Format an actionable error message as a (non-throwing) tool error result. */
export function toErrorResult(message: string): ToolResult {
  return { content: [{ type: "text", text: `Error: ${message}` }], isError: true };
}
