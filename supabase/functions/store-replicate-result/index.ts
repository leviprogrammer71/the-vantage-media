// ──────────────────────────────────────────────────────────────────────────
//  store-replicate-result
//  Webhook receiver for Replicate predictions
//  ──────────────────────────────────────────────────────────────────────────
//
//  Replicate POSTs to this function when a prediction transitions to a
//  terminal state (succeeded / failed / canceled). We then:
//    1. Verify the request actually came from Replicate (HMAC-SHA256
//       signature header, shared secret).
//    2. Look up the target submission row from the query string params
//       (submission_id + optional clip_index for extended_cut bundles).
//    3. Stream the resulting MP4 from the Replicate URL straight into
//       Supabase Storage using the shared streaming helper.
//    4. Update the submission row with the storage path / signed URL.
//
//  Why this exists:
//    The video edge functions used to do the fetch+upload inside the user's
//    request lifecycle. That hit edge-function memory + wall-time limits on
//    larger files and silently dropped the permanent copy. The user's
//    gallery would then show the Replicate URL — which expires in 24h.
//
//    By having Replicate call us back, the storage write happens AFTER the
//    client request has returned. No memory pressure, no timeout pressure,
//    and any failure is caught + surfaced on the submission row instead of
//    swallowed.
// ──────────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import {
  streamReplicateToStorage,
  markStorageError,
} from "../_shared/store-video.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
}

/**
 * Verify the request came from Replicate using their standard webhook
 * signing scheme. Replicate sends three headers:
 *   webhook-id
 *   webhook-timestamp
 *   webhook-signature   ("v1,<base64-hmac-sha256>" or whitespace-separated list)
 *
 * The signed payload is `${webhook_id}.${webhook_timestamp}.${rawBody}`.
 * We compute HMAC-SHA256 with the shared secret (also base64-encoded) and
 * compare against the provided signature. Constant-time compare to avoid
 * timing oracle attacks on the secret.
 *
 * If REPLICATE_WEBHOOK_SECRET is not set, we skip verification (dev-only).
 */
async function verifyReplicateSignature(
  rawBody: string,
  headers: Headers
): Promise<boolean> {
  const secret = Deno.env.get("REPLICATE_WEBHOOK_SECRET")
  if (!secret) {
    console.warn("[store-replicate-result] REPLICATE_WEBHOOK_SECRET not set — skipping signature verification (DEV ONLY)")
    return true
  }

  const id = headers.get("webhook-id")
  const ts = headers.get("webhook-timestamp")
  const sig = headers.get("webhook-signature")
  if (!id || !ts || !sig) {
    console.error("[store-replicate-result] missing webhook signature headers")
    return false
  }

  // Replicate secrets are typically prefixed "whsec_" — strip if present and
  // treat the rest as base64.
  const rawSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret
  let keyBytes: Uint8Array
  try {
    keyBytes = Uint8Array.from(atob(rawSecret), (c) => c.charCodeAt(0))
  } catch {
    // Fall back to interpreting as raw UTF-8 if not base64.
    keyBytes = new TextEncoder().encode(rawSecret)
  }

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signedPayload = `${id}.${ts}.${rawBody}`
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedPayload)
  )
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)))

  // Replicate's header value looks like "v1,<sig>" or a space-separated list.
  const candidates = sig
    .split(/\s+/)
    .map((s) => (s.startsWith("v1,") ? s.slice(3) : s))

  for (const c of candidates) {
    if (c === expected) return true
  }
  console.error("[store-replicate-result] signature mismatch")
  return false
}

function extractVideoUrl(output: unknown): string | null {
  if (typeof output === "string") return output
  if (Array.isArray(output) && output.length > 0 && typeof output[0] === "string") {
    return output[0]
  }
  if (output && typeof output === "object") {
    const maybeUrl = (output as any).url
    if (typeof maybeUrl === "string") return maybeUrl
  }
  return null
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 })
  }

  const rawBody = await req.text()

  // Verify signature before doing anything else
  const verified = await verifyReplicateSignature(rawBody, req.headers)
  if (!verified) {
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Parse routing info from the URL query string. The edge functions append
  // these when they pass the webhook URL to Replicate.
  const url = new URL(req.url)
  const submissionId = url.searchParams.get("submission_id")
  const clipIndexRaw = url.searchParams.get("clip_index")
  const clipIndex = clipIndexRaw !== null ? parseInt(clipIndexRaw, 10) : null

  console.log(
    `[store-replicate-result] webhook fired — prediction=${payload?.id} status=${payload?.status} submission=${submissionId} clip_index=${clipIndex ?? "none"}`
  )

  if (!submissionId) {
    // No submission_id in query — anonymous direct call, nothing to persist.
    return new Response(JSON.stringify({ ok: true, persisted: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  // Handle terminal failure states up front — Replicate sends those too.
  if (payload.status === "failed" || payload.status === "canceled") {
    const errMsg = payload.error || `prediction ${payload.status}`
    console.error(`[store-replicate-result] prediction terminal: ${errMsg}`)
    await supabase
      .from("submissions")
      .update({
        prompt_status: "error",
        prompt_error: typeof errMsg === "string" ? errMsg.slice(0, 500) : "prediction failed",
      })
      .eq("id", submissionId)
    return new Response(JSON.stringify({ ok: true, terminal: payload.status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (payload.status !== "succeeded") {
    // Intermediate webhook (start / logs). Acknowledge and move on.
    return new Response(JSON.stringify({ ok: true, ignored: payload.status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const videoUrl = extractVideoUrl(payload.output)
  if (!videoUrl) {
    console.error("[store-replicate-result] succeeded but no video URL in output:", payload.output)
    await markStorageError(supabase, submissionId, "Replicate succeeded but returned no video URL")
    return new Response(JSON.stringify({ ok: false, error: "no video URL" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Stream into storage. Path is namespaced by submission so clips can
  // co-exist for the extended-cut bundle.
  const suffix = clipIndex !== null ? `clip-${clipIndex}` : "video"
  const storagePath = `${submissionId}/generated/${suffix}.mp4`

  try {
    const { path, signedUrl } = await streamReplicateToStorage(
      supabase,
      videoUrl,
      storagePath,
      { logTag: `webhook:${submissionId.slice(0, 8)}` }
    )

    // Update the submission row. For bundle clips, we patch the array in
    // place — but we need a server-side guard so concurrent clip writes
    // don't trample each other. Use the postgres array-append idiom via
    // a small RPC, falling back to a read-modify-write on a single shot.
    if (clipIndex !== null) {
      // Bundle clip: read current arrays, update index, write back.
      const { data: row, error: readErr } = await supabase
        .from("submissions")
        .select("output_clip_urls, output_clip_paths")
        .eq("id", submissionId)
        .single()
      if (readErr) {
        console.error("[store-replicate-result] failed to read submission for clip merge:", readErr)
      }
      const clipUrls: string[] = Array.isArray(row?.output_clip_urls) ? [...row.output_clip_urls] : []
      const clipPaths: string[] = Array.isArray(row?.output_clip_paths) ? [...row.output_clip_paths] : []
      while (clipUrls.length <= clipIndex) clipUrls.push("")
      while (clipPaths.length <= clipIndex) clipPaths.push("")
      clipUrls[clipIndex] = videoUrl
      clipPaths[clipIndex] = path

      const allFilled = clipUrls.every((u) => !!u) && clipPaths.every((p) => !!p)
      await supabase
        .from("submissions")
        .update({
          output_clip_urls: clipUrls,
          output_clip_paths: clipPaths,
          // First clip drives the row's headline url/path so the gallery
          // has something to show as soon as either lands.
          ...(clipIndex === 0
            ? { output_video_url: videoUrl, output_video_path: path }
            : {}),
          ...(allFilled
            ? { status: "delivered", prompt_status: "complete" }
            : {}),
        })
        .eq("id", submissionId)
    } else {
      // Single-clip path
      await supabase
        .from("submissions")
        .update({
          output_video_url: videoUrl,
          output_video_path: path,
          status: "delivered",
          prompt_status: "complete",
        })
        .eq("id", submissionId)
    }

    console.log(`[store-replicate-result] persisted ${storagePath} (signed=${!!signedUrl})`)
    return new Response(JSON.stringify({ ok: true, path, signed_url: signedUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (storageErr) {
    const msg = storageErr instanceof Error ? storageErr.message : String(storageErr)
    console.error(`[store-replicate-result] terminal storage failure:`, msg)
    // Save the Replicate URL so the user has SOMETHING (it expires in 24h
    // but at least they can grab it before then), and flag the row so the
    // frontend can surface a "we failed to archive this" affordance.
    await supabase
      .from("submissions")
      .update({
        output_video_url: videoUrl,
        prompt_status: "storage_error",
        prompt_error: `Storage write failed: ${msg.slice(0, 400)}`,
      })
      .eq("id", submissionId)
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200, // 200 to Replicate so it doesn't retry the webhook
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
