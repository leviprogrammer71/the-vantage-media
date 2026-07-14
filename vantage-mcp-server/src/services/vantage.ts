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
  reelCreditCost,
  REEL_DURATION_SECONDS,
  MAX_PHOTOS,
  MIN_PHOTOS,
} from "../constants.js";
import type { ReelRequest, ReelResult, ReelFunctionResponse, ReelStyle, ReelResolution } from "../types.js";
import { buildCaption } from "./caption.js";
import { httpRequest, HttpError } from "./http.js";
import {
  resolveToken as resolveTokenToUser,
  getCreditBalance,
  deductCredits,
  insertSubmission,
  persistSubmissionVideo,
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

// Seedance 2.0 renders best from SHORT, plain prompts and honors NO negative
// prompts — long, clause-heavy prompts degrade quality and consistency. Each
// of these is one clean motion/mood line; the reference photos carry the
// actual content, so the prompt only sets camera + tone. Do not add negatives,
// material lists, or per-shot instructions here.
const STYLE_PROMPTS: Record<ReelStyle, string> = {
  luxury: "Cinematic luxury real estate reel. Slow, smooth camera glides through the home. Warm, elegant tone.",
  family: "Warm real estate reel. Bright natural light. Smooth, steady walk-through of the home.",
  airbnb: "Upbeat vacation rental reel. Smooth camera moves. Bright, vibrant, lively tone.",
  snappy: "Fast, clean real estate reel. Quick smooth transitions between rooms. High energy.",
  creative: "Stylish editorial real estate reel. Smooth, confident camera moves. Distinctive cinematic look.",
};

function normalizeStyle(style?: string): ReelStyle {
  const s = (style ?? "").toLowerCase();
  if (s === "luxury" || s === "family" || s === "airbnb" || s === "snappy" || s === "creative") return s;
  return "snappy";
}

function normalizeResolution(r?: string): ReelResolution {
  return (r ?? "").toLowerCase() === "4k" ? "4k" : "1080p";
}

/** Short, Seedance-friendly prompt: just the style line. Content comes from the
 *  reference photos, so we deliberately keep this simple. */
function buildReelPrompt(_req: ReelRequest, style: ReelStyle): string {
  return STYLE_PROMPTS[style];
}

function buildBody(req: ReelRequest, style: ReelStyle) {
  // An image-adapted scene_prompt (written by the connecting Claude after
  // seeing the photos) takes precedence over the fixed style prompt.
  const prompt = req.scenePrompt?.trim() || buildReelPrompt(req, style);
  return {
    category: REEL_CATEGORY,
    photo_urls: req.photos,
    dfy_style: style,
    dfy_prompt: prompt,
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
  /** Pipeline stage: "gen" = polling Seedance, "upscale" = polling the upscaler. */
  stage: "gen" | "upscale";
  /** prediction id(s) to poll; empty if the render returned synchronously. */
  pred?: string;
  preds?: string[];
  /** Upscale prediction id (stage "upscale"). */
  upPred?: string;
  quick?: unknown;
  doneUrl?: string; // set when the start call already returned a video
  style: ReelStyle;
  resolution: ReelResolution;
  cost: number;
  /** Generation category (done_for_you_reel, virtual_staging, animate_single…). */
  category?: string;
  /** Human label used in the submission history + credit ledger note. */
  label?: string;
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
  const resolution = normalizeResolution(req.resolution);
  const cost = reelCreditCost(resolution);
  const effectiveReq: ReelRequest = { ...req, photos: trimmed, style, resolution };

  const userId = await resolveUserOrThrow(token);

  let balance: number;
  try {
    balance = await getCreditBalance(userId);
  } catch (error) {
    throw new ReelError(`Could not check your credit balance: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (balance < cost) {
    throw new ReelError(
      `Not enough credits: this ${resolution} reel costs ${cost} and your balance is ${balance}. Top up in the Vantage dashboard and try again.`,
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
    stage: "gen",
    style,
    resolution,
    cost,
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

/**
 * Generic start for any non-DFY generative category (virtual_staging,
 * animate_single, …). Validates credits, calls the edge function with the
 * category-specific body, and returns a job token that checkReel can poll and
 * finalize — same async/upscale machinery as reels, but with the right
 * category, cost, and history label threaded through.
 * @throws {ReelError}
 */
export async function startGeneration(opts: {
  category: string;
  label: string;
  body: Record<string, unknown>;
  cost: number;
  resolution?: ReelResolution;
  caption?: {
    style?: ReelStyle;
    address?: string;
    price?: string;
    features?: string;
    description?: string;
    beds?: number | null;
    baths?: number | null;
  };
  token: string;
}): Promise<{ jobId: string }> {
  const resolution = normalizeResolution(opts.resolution);
  const style = normalizeStyle(opts.caption?.style);
  const userId = await resolveUserOrThrow(opts.token);

  let balance: number;
  try {
    balance = await getCreditBalance(userId);
  } catch (error) {
    throw new ReelError(`Could not check your credit balance: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (balance < opts.cost) {
    throw new ReelError(
      `Not enough credits: this ${opts.label} costs ${opts.cost} and your balance is ${balance}. Top up in the Vantage dashboard and try again.`,
    );
  }

  let started: ReelFunctionResponse;
  try {
    started = await callFunction(opts.body, START_TIMEOUT_MS);
  } catch (error) {
    if (error instanceof ReelError) throw error;
    if (error instanceof AdminConfigError) throw new ReelError(error.message);
    if (error instanceof HttpError) throw new ReelError(`Could not reach The Vantage generator: ${error.message}`);
    throw new ReelError(`Unexpected error starting ${opts.label}: ${String(error)}`);
  }

  const job: ReelJob = {
    stage: "gen",
    style,
    resolution,
    cost: opts.cost,
    category: opts.category,
    label: opts.label,
    address: opts.caption?.address,
    price: opts.caption?.price,
    features: opts.caption?.features,
    description: opts.caption?.description,
    beds: opts.caption?.beds ?? null,
    baths: opts.caption?.baths ?? null,
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
      started.error || `The generator did not start the ${opts.label}. Please try again.`,
    );
  }
  return { jobId: encodeJob(job) };
}

/** Resolve the caller's account: credit balance + friendly capacity estimates. */
export async function getAccountStatus(token: string): Promise<{
  credits: number;
  approx_reels: number;
  approx_staging: number;
  approx_animations: number;
}> {
  const userId = await resolveUserOrThrow(token);
  let credits: number;
  try {
    credits = await getCreditBalance(userId);
  } catch (error) {
    throw new ReelError(`Could not read your credit balance: ${error instanceof Error ? error.message : String(error)}`);
  }
  return {
    credits,
    approx_reels: Math.floor(credits / REEL_CREDIT_COST),
    approx_staging: Math.floor(credits / 15),
    approx_animations: Math.floor(credits / 10),
  };
}

/** Finalize a completed render: record submission + charge credits (idempotent). */
async function finalize(job: ReelJob, token: string, videoUrl: string): Promise<ReelResult> {
  const userId = await resolveUserOrThrow(token);
  const seed = job.preds?.join(",") || job.pred || job.doneUrl || videoUrl;
  const submissionId = deterministicUuid(seed);

  const label = job.label || "reel";
  try {
    await insertSubmission({
      id: submissionId,
      userId,
      email: "",
      businessName: "Claude connector",
      description: (job.address ? `${job.address} — ` : "") + `${label} via Claude`,
      category: job.category || REEL_CATEGORY,
      videoUrl,
      videoStyle: job.style,
    });
  } catch {
    /* history insert is best-effort */
  }

  try {
    await deductCredits(userId, job.cost ?? REEL_CREDIT_COST, `${label} via Claude connector (${job.resolution})`, submissionId);
  } catch (error) {
    console.error("[vantage] credit deduction failed:", error);
  }

  // Persist the reel into permanent Storage so it survives past Replicate's
  // ~24h URL expiry and shows in the gallery. Fire-and-forget: Render is a
  // long-lived process, so this finishes in the background without delaying
  // the response. Only runs when we actually recorded a submission row.
  if (submissionId) {
    void persistSubmissionVideo(submissionId).catch((err) =>
      console.error("[vantage] video persist (backfill) failed:", err),
    );
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
  | { status: "processing"; jobId: string; note?: string }
  | ({ status: "complete" } & ReelResult);

interface PollOutcome {
  done: boolean;
  failed: boolean;
  videoUrl?: string;
  error?: string;
}

/** Poll a prediction for up to ~20s (safely under the 30s tool-call limit). */
async function pollLoop(pollBody: unknown): Promise<PollOutcome> {
  for (let attempt = 0; attempt < CHECK_POLL_ATTEMPTS; attempt++) {
    let res: ReelFunctionResponse;
    try {
      res = await callFunction(pollBody, POLL_TIMEOUT_MS);
    } catch (error) {
      if (error instanceof ReelError) throw error;
      throw new ReelError(`Could not check render status: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (res.status === "complete" && res.video_url) return { done: true, failed: false, videoUrl: res.video_url };
    if (res.status === "failed") return { done: false, failed: true, error: res.error };
    if (attempt < CHECK_POLL_ATTEMPTS - 1) await sleep(CHECK_POLL_MS);
  }
  return { done: false, failed: false };
}

/** Kick off an upscale of a finished 720p reel. Returns a prediction to poll. */
async function startUpscale(videoUrl: string, resolution: ReelResolution): Promise<{ upPred?: string; doneUrl?: string }> {
  const res = await callFunction({ mode: "upscale", video_url: videoUrl, resolution }, START_TIMEOUT_MS);
  if (res.video_url) return { doneUrl: res.video_url };
  if (res.prediction_id) return { upPred: String(res.prediction_id) };
  throw new ReelError("The upscaler did not start.");
}

/**
 * Poll a reel job for up to ~20s. Two stages: "gen" (Seedance 720p) then
 * "upscale" (to 1080p or 4K). Returns the finished reel once ready, or
 * {status:"processing", jobId} to poll again — ALWAYS poll with the returned
 * jobId, which may change when the render advances to the upscale stage.
 * @throws {ReelError}
 */
export async function checkReel(jobId: string, token: string): Promise<CheckResult> {
  const job = decodeJob(jobId);

  // ── Stage 2: upscale ──
  if (job.stage === "upscale") {
    const res = await pollLoop({ prediction_id: job.upPred });
    if (res.done && res.videoUrl) return { status: "complete", ...(await finalize(job, token, res.videoUrl)) };
    if (res.failed) {
      // Upscale failed — deliver the base 720p render so the reel isn't lost.
      if (job.doneUrl) return { status: "complete", ...(await finalize(job, token, job.doneUrl)) };
      throw new ReelError(res.error || "Upscale failed while rendering.");
    }
    return { status: "processing", jobId, note: `Enhancing to ${job.resolution}…` };
  }

  // ── Stage 1: generation ──
  let baseUrl = job.doneUrl ?? null; // sync completion captured at start
  if (!baseUrl) {
    const pollBody = job.preds && job.preds.length
      ? { prediction_ids: job.preds, quick_effect: job.quick ?? null }
      : { prediction_id: job.pred, quick_effect: job.quick ?? null };
    const res = await pollLoop(pollBody);
    if (res.failed) throw new ReelError(res.error || "Reel generation failed while rendering. Please try again.");
    if (!res.done || !res.videoUrl) return { status: "processing", jobId };
    baseUrl = res.videoUrl;
  }

  // Base 720p is ready → start the upscale and hand back a NEW jobId to poll.
  // If the upscaler can't start, deliver the base render rather than fail.
  try {
    const up = await startUpscale(baseUrl, job.resolution);
    if (up.doneUrl) return { status: "complete", ...(await finalize(job, token, up.doneUrl)) };
    const upJob: ReelJob = { ...job, stage: "upscale", upPred: up.upPred, doneUrl: baseUrl };
    return { status: "processing", jobId: encodeJob(upJob), note: `Enhancing to ${job.resolution}…` };
  } catch (err) {
    console.error("[vantage] upscale start failed, delivering base render:", err);
    return { status: "complete", ...(await finalize(job, token, baseUrl)) };
  }
}
