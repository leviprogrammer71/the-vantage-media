/**
 * Vantage reel-generation orchestration — asynchronous job model.
 *
 * Reel rendering takes 1-3 minutes, which is far longer than an MCP connector
 * will hold a single tool call open (calls are cut at ~30s). So generation is
 * split into two fast steps:
 *
 *   startReel(...)  → kicks off the render, returns a compact job token in a
 *                     few seconds. Pre-checks credits but does not charge yet.
 *   checkReel(...)  → polls the render for up to ~20s and returns either
 *                     "processing" or the finished reel. On completion it
 *                     records the submission and deducts credits idempotently.
 *
 * The job token is a base64url blob of the Replicate prediction id(s) plus the
 * caption context. It carries no secrets — the user is re-resolved from the
 * connector token on every checkReel call.
 */

import { createHash } from "node:crypto";
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  REEL_FUNCTION,
  REEL_CATEGORY,
  REEL_CREDIT_COST,
  REEL_DURATION_SECONDS,
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

// Timeouts (ms). Generous so we never abort a slow edge response prematurely
// — the 30s default was cutting the start call and surfacing as a fake outage.
const START_TIMEOUT_MS = 90_000;
const POLL_TIMEOUT_MS = 30_000;
// How long a single checkReel call polls before returning "processing".
const CHECK_POLL_MS = 4_000;
const CHECK_POLL_ATTEMPTS = 5; // 5 × 4s ≈ 20s, safely under the 30s tool limit

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

async function callFunction(body: unknown, timeoutMs: number): Promise<ReelFunctionResponse> {
  const res = await httpRequest(
    FUNCTION_URL,
    { method: "POST", headers: functionHeaders(), body: JSON.stringify(body) },
    timeoutMs,
  );
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

/** Stable UUID-shaped id from a seed, for idempotent submission + billing. */
function deterministicUuid(seed: string): string {
  const h = createHash("sha1").update(`vantage-reel:${seed}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

// ── Job token ──────────────────────────────────────────────────────────────
interface ReelJob {
  /** prediction id(s) to poll; empty if the render returned synchronously. */
  pred?: string;
  preds?: string[];
  quick?: unknown;
  doneUrl?: string; // set when the start call already returned a video
  style: ReelStyle;
  address?: string;
  price?: string;
  features?: string;
  description?: string;
  beds?: number | null;
  baths?: number | null;
}

function encodeJob(job: ReelJob): string {
  return Buffer.from(JSON.stringify(job), "utf8").toString("base64url");
}
function decodeJob(token: string): ReelJob {
  try {
    return JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as ReelJob;
  } catch {
    throw new ReelError("That job id is invalid or corrupted. Start a new reel.");
  }
}

async function resolveUserOrThrow(token: string): Promise<string> {
  let userId: string | null;
  try {
    userId = await resolveTokenToUser(token);
  } catch (error) {
    if (error instanceof AdminConfigError) throw new ReelError(error.message);
    throw new ReelError(`Could not validate the connector token: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!userId) {
    throw new ReelError(
      "That connector token is invalid or has been revoked. Generate a fresh token in the Vantage dashboard under Settings → Connect to Claude and reconnect.",
    );
  }
  return userId;
}

/**
 * Start a reel render. Validates input + credits, kicks off generation, and
 * returns a job token to poll with checkReel. Fast (a few seconds).
 * @throws {ReelError}
 */
export async function startReel(req: ReelRequest, token: string): Promise<{ jobId: string }> {
  const photos = (req.photos ?? []).filter((p) => typeof p === "string" && p.trim().length > 0);
  if (photos.length < MIN_PHOTOS) {
    throw new ReelError(
      `A reel needs at least ${MIN_PHOTOS} photos; received ${photos.length}. Provide more listing photos (image URLs or base64) and try again.`,
    );
  }
  const trimmed = photos.slice(0, MAX_PHOTOS);
  const style = normalizeStyle(req.style);
  const effectiveReq: ReelRequest = { ...req, photos: trimmed, style };

  const userId = await resolveUserOrThrow(token);

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

  let started: ReelFunctionResponse;
  try {
    started = await callFunction(buildBody(effectiveReq, style), START_TIMEOUT_MS);
  } catch (error) {
    if (error instanceof ReelError) throw error;
    if (error instanceof AdminConfigError) throw new ReelError(error.message);
    if (error instanceof HttpError) throw new ReelError(`Could not reach The Vantage reel generator: ${error.message}`);
    throw new ReelError(`Unexpected error starting reel generation: ${String(error)}`);
  }

  const job: ReelJob = {
    style,
    address: req.address,
    price: req.price,
    features: req.features,
    description: req.description,
    beds: req.beds ?? null,
    baths: req.baths ?? null,
    quick: started.quick_effect ?? null,
  };
  if (started.video_url) {
    job.doneUrl = started.video_url;
  } else if (Array.isArray(started.prediction_ids) && started.prediction_ids.length) {
    job.preds = started.prediction_ids.map(String);
  } else if (started.prediction_id) {
    job.pred = String(started.prediction_id);
  } else {
    throw new ReelError(
      started.error || "The reel generator did not start a render. Please try again, or upload the photos directly.",
    );
  }

  return { jobId: encodeJob(job) };
}

/** Finalize a completed render: record submission + charge credits (idempotent). */
async function finalize(job: ReelJob, token: string, videoUrl: string): Promise<ReelResult> {
  const userId = await resolveUserOrThrow(token);
  const seed = job.preds?.join(",") || job.pred || job.doneUrl || videoUrl;
  const submissionId = deterministicUuid(seed);

  try {
    await insertSubmission({
      id: submissionId,
      userId,
      email: "",
      businessName: "Claude connector",
      description: (job.address ? `${job.address} — ` : "") + "reel via Claude",
      category: REEL_CATEGORY,
      videoUrl,
      videoStyle: job.style,
    });
  } catch {
    /* history insert is best-effort */
  }

  try {
    await deductCredits(userId, REEL_CREDIT_COST, "Reel via Claude connector", submissionId);
  } catch (error) {
    console.error("[vantage] credit deduction failed:", error);
  }

  const { caption, hashtags } = buildCaption({
    photos: [],
    address: job.address,
    price: job.price,
    features: job.features,
    description: job.description,
    beds: job.beds,
    baths: job.baths,
    style: job.style,
  });
  return { reel_url: videoUrl, caption, hashtags };
}

export type CheckResult =
  | { status: "processing" }
  | ({ status: "complete" } & ReelResult);

/**
 * Poll a reel job for up to ~20s. Returns the finished reel (with caption) once
 * ready, or {status:"processing"} to poll again. Charges credits on completion.
 * @throws {ReelError}
 */
export async function checkReel(jobId: string, token: string): Promise<CheckResult> {
  const job = decodeJob(jobId);

  // Synchronous completion captured at start.
  if (job.doneUrl) {
    return { status: "complete", ...(await finalize(job, token, job.doneUrl)) };
  }

  const pollBody =
    job.preds && job.preds.length
      ? { prediction_ids: job.preds, quick_effect: job.quick ?? null }
      : { prediction_id: job.pred, quick_effect: job.quick ?? null };

  for (let attempt = 0; attempt < CHECK_POLL_ATTEMPTS; attempt++) {
    let res: ReelFunctionResponse;
    try {
      res = await callFunction(pollBody, POLL_TIMEOUT_MS);
    } catch (error) {
      if (error instanceof ReelError) throw error;
      throw new ReelError(`Could not check render status: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (res.status === "complete" && res.video_url) {
      return { status: "complete", ...(await finalize(job, token, res.video_url)) };
    }
    if (res.status === "failed") {
      throw new ReelError(res.error || "Reel generation failed while rendering. Please try again.");
    }
    if (attempt < CHECK_POLL_ATTEMPTS - 1) await sleep(CHECK_POLL_MS);
  }

  return { status: "processing" };
}
