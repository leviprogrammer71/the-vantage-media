/**
 * Vantage reel-generation client.
 *
 * Wraps the `generate-listing-video` Supabase edge function and hides its
 * asynchronous nature: the first call returns Replicate prediction id(s) with
 * status "processing"; this client then polls until the reel is "complete"
 * (or "failed"), so a single MCP tool call returns a finished reel URL.
 */

import {
  SUPABASE_URL,
  REEL_FUNCTION,
  REEL_CATEGORY,
  REEL_CREDIT_COST,
  REEL_DURATION_SECONDS,
  POLL_INTERVAL_MS,
  POLL_MAX_ATTEMPTS,
  MAX_PHOTOS,
  MIN_PHOTOS,
} from "../constants.js";
import type { ReelRequest, ReelResult, ReelFunctionResponse, VantageAuth, ReelStyle } from "../types.js";
import { buildCaption } from "./caption.js";
import { httpRequest, HttpError } from "./http.js";

/** A failure the agent can act on (bad input, out of credits, generation error). */
export class ReelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReelError";
  }
}

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/${REEL_FUNCTION}`;

/** Map a user-facing style to the generator's dfy_style + a prompt seed. */
const STYLE_PROMPTS: Record<ReelStyle, string> = {
  luxury:
    "A cinematic luxury real-estate reel. Slow, deliberate camera moves through each space with elegant transitions, warm editorial color grade, unhurried and aspirational pacing.",
  family:
    "A warm, inviting real-estate reel. Bright natural light, smooth walk-through camera moves that emphasize livable space and flow, friendly and welcoming pacing.",
  airbnb:
    "An upbeat short-stay listing reel. Lifestyle-forward camera moves highlighting amenities and views, vibrant color, energetic vacation-rental pacing.",
  snappy:
    "A punchy, fast-cut real-estate reel. Quick reveals and snappy transitions between rooms, high-energy pacing that hooks in the first second.",
  creative:
    "A stylish, editorial real-estate reel. Creative camera moves and layered transitions with a distinctive look, confident cinematic pacing.",
};

function normalizeStyle(style?: string): ReelStyle {
  const s = (style ?? "").toLowerCase();
  if (s === "luxury" || s === "family" || s === "airbnb" || s === "snappy" || s === "creative") return s;
  return "snappy";
}

/** Build the shot-by-shot prompt sent to the generator. */
function buildReelPrompt(req: ReelRequest, style: ReelStyle): string {
  const base = STYLE_PROMPTS[style];
  const context: string[] = [];
  if (req.address) context.push(`Property: ${req.address}.`);
  const specs: string[] = [];
  if (req.beds != null) specs.push(`${req.beds} bed`);
  if (req.baths != null) specs.push(`${req.baths} bath`);
  if (specs.length) context.push(`${specs.join(", ")}.`);
  if (req.features) context.push(`Highlight: ${req.features}.`);
  context.push("Show the photos in the order provided, one shot per photo, with smooth transitions.");
  return `${base} ${context.join(" ")}`.trim();
}

/**
 * Build the request body for the reel function, mirroring the web app's
 * done_for_you_reel payload.
 */
function buildBody(req: ReelRequest, style: ReelStyle) {
  return {
    category: REEL_CATEGORY,
    photo_urls: req.photos,
    dfy_style: style,
    dfy_prompt: buildReelPrompt(req, style),
    generate_audio: true,
    duration: REEL_DURATION_SECONDS,
    credits_cost: REEL_CREDIT_COST,
    listing: {
      location: req.address || undefined,
      price: req.price || undefined,
      caption: undefined as string | undefined,
      music_vibe: undefined as string | undefined,
    },
  };
}

function authHeaders(auth: VantageAuth): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${auth.token}`,
    apikey: auth.anonKey,
  };
}

async function callFunction(body: unknown, auth: VantageAuth): Promise<ReelFunctionResponse> {
  const res = await httpRequest(FUNCTION_URL, {
    method: "POST",
    headers: authHeaders(auth),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Surface the edge function's own error text when present.
    let detail = `status ${res.status}`;
    try {
      const parsed = res.json<{ error?: string }>();
      if (parsed?.error) detail = parsed.error;
    } catch {
      if (res.text) detail = res.text.slice(0, 300);
    }
    if (res.status === 401 || res.status === 403) {
      throw new ReelError(
        `The Vantage rejected the request (${detail}). Your session token is missing, expired, or invalid — reconnect the MCP with a fresh token from the Vantage dashboard.`,
      );
    }
    if (res.status === 402 || /credit/i.test(detail)) {
      throw new ReelError(
        `Not enough credits to generate this reel (${detail}). Top up credits in the Vantage dashboard and try again.`,
      );
    }
    throw new ReelError(`The Vantage reel generator failed: ${detail}`);
  }

  return res.json<ReelFunctionResponse>();
}

/** Sleep helper. */
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Poll the reel function until the video is ready.
 * @throws {ReelError} on generation failure or timeout.
 */
async function pollUntilComplete(start: ReelFunctionResponse, auth: VantageAuth): Promise<string> {
  const isBundle = Array.isArray(start.prediction_ids) && start.prediction_ids.length > 0;
  const pollBody = isBundle
    ? { prediction_ids: start.prediction_ids, quick_effect: start.quick_effect ?? null }
    : { prediction_id: start.prediction_id, quick_effect: start.quick_effect ?? null };

  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);
    const res = await callFunction(pollBody, auth);
    if (res.status === "complete" && res.video_url) return res.video_url;
    if (res.status === "failed") {
      throw new ReelError(res.error || "Reel generation failed while rendering. Please try again.");
    }
  }
  throw new ReelError(
    "Reel generation is taking longer than expected (over 6 minutes). It may still finish — check the Vantage dashboard, or try again with fewer photos.",
  );
}

/**
 * Generate a reel end-to-end: validate input, kick off generation, poll to
 * completion, and attach a ready-to-post caption + hashtags.
 *
 * @throws {ReelError} with an actionable message on any failure.
 */
export async function generateReel(req: ReelRequest, auth: VantageAuth): Promise<ReelResult> {
  const photos = (req.photos ?? []).filter((p) => typeof p === "string" && p.trim().length > 0);
  if (photos.length < MIN_PHOTOS) {
    throw new ReelError(
      `A reel needs at least ${MIN_PHOTOS} photos; received ${photos.length}. Provide more listing photos (image URLs or base64) and try again.`,
    );
  }
  const trimmed = photos.slice(0, MAX_PHOTOS);
  const style = normalizeStyle(req.style);
  const effectiveReq: ReelRequest = { ...req, photos: trimmed, style };

  let started: ReelFunctionResponse;
  try {
    started = await callFunction(buildBody(effectiveReq, style), auth);
  } catch (error) {
    if (error instanceof ReelError) throw error;
    if (error instanceof HttpError) {
      throw new ReelError(`Could not reach The Vantage reel generator: ${error.message}`);
    }
    throw new ReelError(`Unexpected error starting reel generation: ${String(error)}`);
  }

  // Resolve the final URL — either returned synchronously or via polling.
  let reelUrl: string | null = started.video_url ?? null;
  const isAsync = started.status === "processing" && (!!started.prediction_id || Array.isArray(started.prediction_ids));
  if (!reelUrl && isAsync) {
    reelUrl = await pollUntilComplete(started, auth);
  }
  if (!reelUrl) {
    throw new ReelError(
      started.error ||
        "The reel generator returned no video and no job to poll. Please try again, or upload the photos directly.",
    );
  }

  const { caption, hashtags } = buildCaption(effectiveReq);
  return { reel_url: reelUrl, caption, hashtags };
}
