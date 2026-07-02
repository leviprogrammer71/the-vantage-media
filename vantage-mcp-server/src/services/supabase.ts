/**
 * Supabase admin service — server-side operations the MCP performs on behalf
 * of the connecting user, using the SERVICE ROLE key (never exposed to the
 * client). This is where the "burden" lives: token resolution, credit
 * deduction, and submission history.
 */

import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "../constants.js";
import { httpRequest } from "./http.js";

/** Raised when the server isn't configured to act on a user's behalf. */
export class AdminConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminConfigError";
  }
}

function serviceHeaders(): Record<string, string> {
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

/** Call a Postgres RPC via PostgREST with the service role. */
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const res = await httpRequest(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: serviceHeaders(),
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    let detail = `status ${res.status}`;
    try {
      const j = res.json<{ message?: string; error?: string }>();
      detail = j.message || j.error || detail;
    } catch {
      if (res.text) detail = res.text.slice(0, 200);
    }
    throw new Error(`${fn} failed: ${detail}`);
  }
  return res.json<T>();
}

/**
 * Resolve a connector token (vtg_live_…) to a user id. Returns null if the
 * token is unknown or revoked. Also bumps last_used_at server-side.
 */
export async function resolveToken(token: string): Promise<string | null> {
  const result = await rpc<string | null>("resolve_mcp_token", { p_token: token });
  return result && typeof result === "string" ? result : null;
}

/** A user's current credit balance. */
export async function getCreditBalance(userId: string): Promise<number> {
  const res = await httpRequest(
    `${SUPABASE_URL}/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=credits_balance`,
    { method: "GET", headers: serviceHeaders() },
  );
  if (!res.ok) throw new Error(`Could not read credit balance (status ${res.status})`);
  const rows = res.json<{ credits_balance: number }[]>();
  return rows.length ? rows[0].credits_balance : 0;
}

/**
 * Deduct credits atomically via the deduct_credits RPC. Returns the new
 * balance. Throws on insufficient funds.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  description: string,
  submissionId?: string,
): Promise<number> {
  return rpc<number>("deduct_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_description: description,
    p_submission_id: submissionId ?? null,
    p_transaction_type: "video_generation",
  });
}

export interface SubmissionInput {
  userId: string;
  email: string;
  businessName: string;
  description: string;
  category: string;
  videoUrl: string;
  videoStyle: string;
}

/** Insert a delivered submission row so the reel shows in the user's gallery. */
export async function insertSubmission(input: SubmissionInput): Promise<string | null> {
  const res = await httpRequest(`${SUPABASE_URL}/rest/v1/submissions`, {
    method: "POST",
    headers: { ...serviceHeaders(), Prefer: "return=representation" },
    body: JSON.stringify({
      user_id: input.userId,
      full_name: input.email || "user",
      email: input.email || "noreply@thevantage.media",
      business_name: input.businessName || "Self",
      project_description: input.description,
      transformation_type: input.category,
      transformation_category: null,
      video_type: "listing",
      video_style: input.videoStyle || "cinematic",
      status: "delivered",
      prompt_status: "complete",
      output_video_url: input.videoUrl,
    }),
  });
  if (!res.ok) {
    // Non-fatal — the reel exists even if history insert fails.
    return null;
  }
  try {
    const rows = res.json<{ id: string }[]>();
    return rows.length ? rows[0].id : null;
  } catch {
    return null;
  }
}
