// ──────────────────────────────────────────────────────────────────────────
//  Streaming Replicate → Supabase Storage uploader
//  ──────────────────────────────────────────────────────────────────────────
//
//  Replaces the ArrayBuffer-buffered storeVideo()/persistVideoToStorage()
//  pattern across the video edge functions. The old pattern fully buffered
//  the MP4 in Deno memory before uploading, which produced silent failures
//  under memory pressure on larger files (the user's "gallery struggles to
//  save the video" report — May 16, 2026).
//
//  This helper:
//    • Streams the Replicate response body directly into Supabase Storage
//      with no in-memory copy of the video bytes.
//    • Retries with exponential backoff on transient 5xx / network errors.
//    • Throws on terminal failure so callers can mark the submission row
//      `prompt_status: "storage_error"` and surface the error to the user
//      instead of silently dropping the permanent copy (which left the
//      gallery showing a Replicate URL that died in 24h).
//
//  Used by:
//    • generate-listing-video           (persistVideoToStorage replacement)
//    • generate-transformation-video    (storeVideo replacement)
//    • store-replicate-result           (webhook receiver, async path)
// ──────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

type Supa = ReturnType<typeof createClient>

export interface StreamStoreOptions {
  /** Bucket name. Defaults to "project-submissions". */
  bucket?: string
  /** Content-Type for the stored object. Defaults to "video/mp4". */
  contentType?: string
  /** Max retry attempts on transient failure. Defaults to 3. */
  maxRetries?: number
  /** Optional logger prefix for console output. */
  logTag?: string
}

export interface StreamStoreResult {
  /** Storage path written (e.g. "<submission>/generated/video.mp4"). */
  path: string
  /** Public signed URL valid for 24h. */
  signedUrl: string | null
}

/**
 * Streams a Replicate video URL into Supabase Storage with retries.
 *
 * Throws on terminal failure. Callers MUST catch and update the submission
 * row's prompt_status — silent nulls are how we lost videos before.
 */
export async function streamReplicateToStorage(
  supabase: Supa,
  replicateUrl: string,
  storagePath: string,
  opts: StreamStoreOptions = {}
): Promise<StreamStoreResult> {
  const bucket = opts.bucket ?? "project-submissions"
  const contentType = opts.contentType ?? "video/mp4"
  const maxRetries = opts.maxRetries ?? 3
  const tag = opts.logTag ? `[${opts.logTag}]` : "[stream-store]"

  let lastErr: unknown = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`${tag} attempt ${attempt}/${maxRetries} → ${storagePath}`)

      // Fetch the video. We don't buffer — we hand the ReadableStream to
      // Supabase Storage and let the upload pump bytes through directly.
      const resp = await fetch(replicateUrl)
      if (!resp.ok) {
        throw new Error(`replicate fetch ${resp.status} ${resp.statusText}`)
      }
      if (!resp.body) {
        throw new Error("replicate response has no body")
      }

      // Supabase JS supports passing a ReadableStream to upload(). The
      // `duplex: "half"` hint is required when the body is a stream so
      // fetch (under the hood) doesn't try to buffer the request body.
      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(storagePath, resp.body, {
          contentType,
          upsert: true,
          duplex: "half",
        } as any)

      if (uploadErr) {
        throw new Error(`storage upload: ${uploadErr.message}`)
      }

      // Generate a signed URL (24h) so the gallery can read it. RLS-safe
      // because the service role generated the URL.
      const { data: signed } = await supabase.storage
        .from(bucket)
        .createSignedUrl(storagePath, 60 * 60 * 24)

      console.log(`${tag} stored ${storagePath} on attempt ${attempt}`)
      return { path: storagePath, signedUrl: signed?.signedUrl ?? null }
    } catch (err) {
      lastErr = err
      const msg = err instanceof Error ? err.message : String(err)
      const isTransient =
        msg.includes("5") ||
        msg.includes("timeout") ||
        msg.includes("ECONN") ||
        msg.includes("network")

      console.warn(`${tag} attempt ${attempt} failed: ${msg}`)

      // Don't retry on terminal errors (4xx fetch, malformed URL, etc.)
      if (!isTransient || attempt === maxRetries) {
        break
      }

      // Exponential backoff: 1s, 2s, 4s
      const delayMs = 1000 * Math.pow(2, attempt - 1)
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }

  // Out of retries. Throw so the caller knows to mark the row as errored.
  throw new Error(
    `streamReplicateToStorage failed after ${maxRetries} attempts: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`
  )
}

/**
 * Marks a submission row as storage_error and records the message.
 * Idempotent — safe to call multiple times.
 */
export async function markStorageError(
  supabase: Supa,
  submissionId: string,
  errMessage: string
): Promise<void> {
  try {
    await supabase
      .from("submissions")
      .update({
        prompt_status: "storage_error",
        prompt_error: errMessage.slice(0, 500),
      })
      .eq("id", submissionId)
  } catch (e) {
    console.error("[stream-store] failed to mark submission as storage_error:", e)
  }
}
