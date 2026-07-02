/**
 * Small fetch wrapper with a timeout and consistent error surfacing.
 * Uses the global fetch available in Node >= 18.
 */

import { HTTP_TIMEOUT_MS } from "../constants.js";

export interface HttpResponse {
  ok: boolean;
  status: number;
  text: string;
  json: <T = unknown>() => T;
}

/** A network/HTTP failure with a status code where available. */
export class HttpError extends Error {
  readonly status: number;
  readonly body: string;
  constructor(message: string, status: number, body = "") {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
  }
}

/**
 * Perform an HTTP request with an abort-based timeout.
 * @throws {HttpError} on timeout or network failure (not on non-2xx — inspect `ok`).
 */
export async function httpRequest(
  url: string,
  init: RequestInit = {},
  timeoutMs: number = HTTP_TIMEOUT_MS,
): Promise<HttpResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      text,
      json: <T = unknown>() => JSON.parse(text) as T,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new HttpError(`Request to ${url} timed out after ${timeoutMs}ms`, 0);
    }
    throw new HttpError(
      `Network error requesting ${url}: ${error instanceof Error ? error.message : String(error)}`,
      0,
    );
  } finally {
    clearTimeout(timer);
  }
}
