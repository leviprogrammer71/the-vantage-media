import { supabase } from "@/integrations/supabase/client";

/**
 * Ensure the user's Supabase session is valid (not expired) before doing
 * anything that requires authorization — most importantly storage uploads.
 *
 * Background:
 *   Supabase access tokens (JWT) are valid for one hour by default. The
 *   client SDK auto-refreshes them — but only when an API call has time to
 *   complete the refresh round-trip BEFORE making the actual request. For
 *   long-running session inactivity (user uploads after sitting on the page
 *   for >1h), the access token can expire between the auto-refresh tick
 *   and the user's next action. The result is the storage upload going out
 *   with a stale JWT and the server rejecting it:
 *     "Upload failed: \"exp\" claim timestamp check failed"
 *
 * Strategy:
 *   1. Call getSession() to read the current token.
 *   2. If it's within REFRESH_THRESHOLD_SECONDS of expiry (or already
 *      expired), call refreshSession() to mint a fresh one.
 *   3. Return the fresh access token so callers can verify they're armed.
 *
 * Call this immediately before any supabase.storage call that runs after
 * a long idle, or wrap it in a retry-on-401 catch.
 */
const REFRESH_THRESHOLD_SECONDS = 120; // refresh if expiring within 2 minutes

export async function ensureFreshSession(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const expiresAt = (session as any).expires_at as number | undefined;
    const nowSec = Math.floor(Date.now() / 1000);
    if (expiresAt && expiresAt - nowSec < REFRESH_THRESHOLD_SECONDS) {
      const { data: refreshed, error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn("[auth] refreshSession failed:", error);
        return session.access_token;
      }
      return refreshed.session?.access_token ?? session.access_token;
    }
    return session.access_token;
  } catch (err) {
    console.warn("[auth] ensureFreshSession threw:", err);
    return null;
  }
}

/**
 * Run an async block, and if it throws an error matching the JWT-expired
 * signature, refresh the session and retry once.
 *
 * Use this for any storage upload or edge function call where a stale JWT
 * could land between session refresh ticks.
 */
export async function withFreshAuth<T>(fn: () => Promise<T>): Promise<T> {
  await ensureFreshSession();
  try {
    return await fn();
  } catch (err) {
    const msg = (err as Error)?.message ?? String(err);
    const isJwtExpired = /exp.*claim.*timestamp|jwt.*expired|invalid.*jwt|401/i.test(msg);
    if (!isJwtExpired) throw err;
    console.log("[auth] JWT expired mid-call, refreshing and retrying once");
    await supabase.auth.refreshSession();
    return await fn();
  }
}
