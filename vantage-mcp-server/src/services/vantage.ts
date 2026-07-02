/**
 * Vantage reel-generation orchestration.
 *
 * This is where the MCP server carries the whole burden on behalf of the
 * connecting user:
 *   1. resolve the connector token → user id (service role)
 *   2. pre-check the user's credit balance
 *   3. start reel generation and poll the async job to completion
 *   4. record the submission in the user's gallery
 *   5. deduct credits atomically
 *   6. attach a ready-to-post caption + hashtags
 *
 * The generate-listing-video edge function runs as service role and does not
 * itself bind a user or bill credits, so the MCP server drives all of that.
 */

import {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  REEL_FUNCTION,
  REEL_CATEGORY,
  REEL_CREDIT_COST,
  REEL_DURATION_SECONDS,
  POLL_INTERVAL_MS,
  POLL_MAX_ATTEMPTS,
  MAX_PHOTOS,
  MIN_PHOTOS,
} from "../constants.js";
import type { ReelRequest, ReelResult, ReelFunctionResponse, ReelStyle } from "../types.js";
import { buildCaption } from "./caption.js";
import { httpRequest, HttpError } from "./http.js";
import {
  resolveToken as resolveTokenToUser,
  getCreditBalance,
  deductCredits,
  insertSubmission,
  AdminConfigError,
} from "./supabase.js";

/** A failure the agent can act on (bad input, out of credits, generation error). */
export class ReelError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReelError";
  }
}

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/${REEL_FUNCTION}`;

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

/** Service-role headers for calling the reel edge function. */
function functionHeaders(): Record<string, string> {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new AdminConfigError(
      "The Vantage MCP server is missing its service-role key (VANTAGE_SUPABASE_SERVICE_ROLE_KEY). The host operator must set it before the connector can generate reels.",
    );
  }
  return {
    "Content-Type": "application/json",
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };
}

async function callFunction(body: unknown): Promise<ReelFunctionResponse> {
  const res = await httpRequest(FUNCTION_URL, {
    method: "POST",
    headers: functionHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `status ${res.status}`;
    try {
      const parsed = res.json<{ error?: string }>();
      if (parsed?.error) detail = parsed.error;
    } catch {
      if (res.text) detail = res.text.slice(0, 300);
    }
    throw new ReelError(`The Vantage reel generator failed: ${detail}`);
  }
  return res.json<ReelFunctionResponse>();
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Poll the reel function until the video is ready. */
async function pollUntilComplete(start: ReelFunctionResponse): Promise<string> {
  const isBundle = Array.isArray(start.prediction_ids) && start.prediction_ids.length > 0;
  const pollBody = isBundle
    ? { prediction_ids: start.prediction_ids, quick_effect: start.quick_effect ?? null }
    : { prediction_id: start.prediction_id, quick_effect: start.quick_effect ?? null };

  for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);
    const res = await callFunction(pollBody);
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
 * Generate a reel end-to-end on behalf of the token's owner.
 *
 * @param req   The reel request (photos + optional details).
 * @param token The caller's Vantage connector token (vtg_live_…).
 * @throws {ReelError} with an actionable message on any failure.
 */
export async function generateReel(req: ReelRequest, token: string): Promise<ReelResult> {
  const photos = (req.photos ?? []).filter((p) => typeof p === "string" && p.trim().length > 0);
  if (photos.length < MIN_PHOTOS) {
    throw new ReelError(
      `A reel needs at least ${MIN_PHOTOS} photos; received ${photos.length}. Provide more listing photos (image URLs or base64) and try again.`,
    );
  }
  const trimmed = photos.slice(0, MAX_PHOTOS);
  const style = normalizeStyle(req.style);
  const effectiveReq: ReelRequest = { ...req, photos: trimmed, style };

  // 1) Resolve the connector token → user id.
  let userId: string | null;
  try {
    userId = await resolveTokenToUser(token);
  } catch (error) {
    if (error instanceof AdminConfigError) throw new ReelError(error.message);
    throw new ReelError(`Could not validate the connector token: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!userId) {
    throw new ReelError(
      "That connector token is invalid or has been revoked. Generate a fresh token from the Vantage dashboard under Settings → Connect to Claude and reconnect.",
    );
  }

  // 2) Pre-check credits so we never render a reel the user can't afford.
  let balance: number;
  try {
    balance = await getCreditBalance(userId);
  } catch (error) {
    throw new ReelError(`Could not check your credit balance: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (balance < REEL_CREDIT_COST) {
    throw new ReelError(
      `Not enough credits: this reel costs ${REEL_CREDIT_COST} and your balance is ${balance}. Top up in the Vantage dashboard and try again.`,
    );
  }

  // 3) Start generation and poll to completion.
  let started: ReelFunctionResponse;
  try {
    started = await callFunction(buildBody(effectiveReq, style));
  } catch (error) {
    if (error instanceof ReelError || error instanceof AdminConfigError) throw error instanceof ReelError ? error : new ReelError(error.message);
    if (error instanceof HttpError) throw new ReelError(`Could not reach The Vantage reel generator: ${error.message}`);
    throw new ReelError(`Unexpected error starting reel generation: ${String(error)}`);
  }

  let reelUrl: string | null = started.video_url ?? null;
  const isAsync = started.status === "processing" && (!!started.prediction_id || Array.isArray(started.prediction_ids));
  if (!reelUrl && isAsync) reelUrl = await pollUntilComplete(started);
  if (!reelUrl) {
    throw new ReelError(
      started.error ||
        "The reel generator returned no video and no job to poll. Please try again, or upload the photos directly.",
    );
  }

  // 4) Record the submission in the user's gallery (non-fatal on failure).
  let submissionId: string | null = null;
  try {
    submissionId = await insertSubmission({
      userId,
      email: "",
      businessName: "Claude connector",
      description: (req.address ? `${req.address} — ` : "") + "reel via Claude",
      category: REEL_CATEGORY,
      videoUrl: reelUrl,
      videoStyle: style,
    });
  } catch {
    /* history insert is best-effort */
  }

  // 5) Deduct credits atomically (idempotent per submission).
  try {
    await deductCredits(userId, REEL_CREDIT_COST, "Reel via Claude connector", submissionId ?? undefined);
  } catch (error) {
    // The reel was delivered; surface a soft warning rather than failing.
    console.error("[vantage] credit deduction failed:", error);
  }

  // 6) Caption + hashtags.
  const { caption, hashtags } = buildCaption(effectiveReq);
  return { reel_url: reelUrl, caption, hashtags };
}
