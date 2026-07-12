// curate-listing — the in-app "creative director".
//
// Given a set of listing photos (and optional listing context), a vision model
// (Claude via OpenRouter) picks and ORDERS the best shots for a reel narrative,
// recommends a style / vibe / music mood, and flags rooms that would benefit
// from virtual staging. This is the intelligence layer that raises output
// quality: instead of the user guessing, Claude curates.
//
// FAIL-SAFE BY DESIGN: if the key is missing, the model errors, or the response
// can't be parsed, the function returns the photos unchanged with sane defaults
// and source:"fallback". It must NEVER block or break the generation flow.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions"
// Vision-capable, on-brand default. Override with CURATION_MODEL if desired.
const MODEL = Deno.env.get("CURATION_MODEL") || "anthropic/claude-3.5-sonnet"

const STYLES = ["luxury", "family", "airbnb", "snappy", "creative"] as const
type Style = (typeof STYLES)[number]

interface Listing {
  price?: string
  address?: string
  description?: string
  platform?: string
}

interface CurateResult {
  ordered_photo_urls: string[]
  order: number[]
  style: Style
  vibe: string
  music: string
  staging: { index: number; room: string; why: string }[]
  reasoning: string
  source: "claude" | "fallback"
}

function fallback(photoUrls: string[], max: number, note: string): CurateResult {
  const order = photoUrls.slice(0, max).map((_, i) => i)
  return {
    ordered_photo_urls: photoUrls.slice(0, max),
    order,
    style: "snappy",
    vibe: "bright, upbeat, modern",
    music: "light upbeat instrumental",
    staging: [],
    reasoning: note,
    source: "fallback",
  }
}

/** Pull the first {...} JSON object out of a model reply, tolerant of prose/fences. */
function extractJson(text: string): unknown | null {
  if (!text) return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch {
    return null
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  let photoUrls: string[] = []
  let max = 9
  try {
    const body = await req.json().catch(() => ({}))
    photoUrls = Array.isArray(body?.photo_urls)
      ? body.photo_urls.filter((u: unknown) => typeof u === "string" && u.trim().length > 0)
      : []
    if (typeof body?.max === "number" && body.max >= 2 && body.max <= 12) max = Math.floor(body.max)
    const listing: Listing = body?.listing && typeof body.listing === "object" ? body.listing : {}

    if (photoUrls.length === 0) {
      return new Response(JSON.stringify(fallback([], max, "No photos provided.")), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const KEY = Deno.env.get("OPENROUTER_API_KEY")
    if (!KEY) {
      return new Response(JSON.stringify(fallback(photoUrls, max, "Curation model not configured; using even order.")), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Cap images sent to the model to keep latency + cost bounded. We still
    // return orders/indices against the FULL input array.
    const sample = photoUrls.slice(0, 16)

    const ctx: string[] = []
    if (listing.price) ctx.push(`Price: ${listing.price}`)
    if (listing.address) ctx.push(`Address: ${listing.address}`)
    if (listing.platform) ctx.push(`Source: ${listing.platform}`)
    if (listing.description) ctx.push(`Description: ${String(listing.description).slice(0, 600)}`)

    const system =
      "You are the creative director for The Vantage, a cinematic real-estate reel studio. " +
      "You are shown a numbered set of listing photos (index starts at 0). Choose the strongest " +
      `up to ${max} photos and ORDER them into a compelling short-reel narrative: open on the best ` +
      "hero/exterior, then a natural walkthrough (living, kitchen, primary bedroom, bath, a standout " +
      "feature), and close on the yard or a view. Skip near-duplicates and weak/blurry/dark shots. " +
      "Also pick an overall style, a vibe, and a music mood that fit the property's price and character, " +
      "and flag any rooms that look empty or dated and would benefit from virtual staging. " +
      `Style MUST be one of: ${STYLES.join(", ")}. ` +
      'Respond with ONLY strict minified JSON, no prose, in exactly this shape: ' +
      '{"order":[int,...],"style":"...","vibe":"...","music":"...","staging":[{"index":int,"room":"...","why":"..."}],"reasoning":"..."}'

    const userContent: unknown[] = [
      {
        type: "text",
        text:
          (ctx.length ? ctx.join("\n") + "\n\n" : "") +
          `There are ${sample.length} photos, indexed 0..${sample.length - 1}, in order below.`,
      },
      ...sample.map((url) => ({ type: "image_url", image_url: { url } })),
    ]

    let data: any
    try {
      const res = await fetch(OPENROUTER, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://thevantage.media",
          "X-Title": "The Vantage",
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: userContent },
          ],
          max_tokens: 700,
          temperature: 0.3,
        }),
      })
      if (!res.ok) {
        return new Response(JSON.stringify(fallback(photoUrls, max, `Curation model HTTP ${res.status}; using even order.`)), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
      data = await res.json()
    } catch (e) {
      return new Response(JSON.stringify(fallback(photoUrls, max, `Curation call failed: ${(e as Error).message}`)), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const text = data?.choices?.[0]?.message?.content?.trim?.() ?? ""
    const parsed = extractJson(text) as any
    if (!parsed || !Array.isArray(parsed.order)) {
      return new Response(JSON.stringify(fallback(photoUrls, max, "Model reply unparseable; using even order.")), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Sanitize indices against the SAMPLE we actually showed the model.
    const seen = new Set<number>()
    const order: number[] = []
    for (const raw of parsed.order) {
      const i = Number(raw)
      if (Number.isInteger(i) && i >= 0 && i < sample.length && !seen.has(i)) {
        seen.add(i)
        order.push(i)
        if (order.length >= max) break
      }
    }
    if (order.length < 2) {
      return new Response(JSON.stringify(fallback(photoUrls, max, "Model returned too few valid indices; using even order.")), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const style: Style = STYLES.includes(parsed.style) ? parsed.style : "snappy"
    const staging = Array.isArray(parsed.staging)
      ? parsed.staging
          .filter((s: any) => Number.isInteger(Number(s?.index)))
          .map((s: any) => ({ index: Number(s.index), room: String(s.room ?? ""), why: String(s.why ?? "") }))
          .slice(0, 8)
      : []

    const result: CurateResult = {
      ordered_photo_urls: order.map((i) => sample[i]),
      order,
      style,
      vibe: typeof parsed.vibe === "string" ? parsed.vibe.slice(0, 120) : "bright, modern",
      music: typeof parsed.music === "string" ? parsed.music.slice(0, 120) : "light upbeat instrumental",
      staging,
      reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning.slice(0, 600) : "",
      source: "claude",
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    // Last-resort fail-safe — still return a usable order.
    return new Response(JSON.stringify(fallback(photoUrls, max, `Unexpected error: ${(err as Error).message}`)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
