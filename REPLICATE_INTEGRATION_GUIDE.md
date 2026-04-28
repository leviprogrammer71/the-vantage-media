# Replicate Integration Guide — Without the Pain

A field guide for the next engineer integrating Replicate's image and video models into a Supabase edge function backend. Written after burning a full session debugging webp mime errors, 60-second edge timeouts, gpt-image-2 aspect ratio rejections, content moderation refusals, and prompt regressions. Read this before you write your first `fetch` to api.replicate.com.

---

## 1. Setup

### Environment

Three secrets need to live in your Supabase edge function environment:

```
REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Set them via the Supabase dashboard → Project Settings → Edge Functions → Secrets, or via `npx supabase secrets set REPLICATE_API_TOKEN=...`. Anon keys won't work for writes to the storage bucket from the function side.

### Base fetch pattern

Every Replicate call uses the same shape. Memorize it:

```ts
const REPLICATE = "https://api.replicate.com/v1"

const res = await fetch(
  `${REPLICATE}/models/${OWNER}/${MODEL_SLUG}/predictions`,
  {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait=60",  // crucial — see §3
    },
    body: JSON.stringify({ input: { /* model-specific */ } }),
  }
)
const prediction = await res.json()
```

The `Prefer: wait=60` header tells Replicate to hold the connection open for up to 60 seconds before returning. If the job finishes in that window, you get the output synchronously. If not, you get a `prediction.id` and you have to poll. This is the single most important detail in this whole document.

---

## 2. The Model Registry

These are the models we shipped to production. Slug, input shape, output shape, and the gotcha for each.

### `openai/gpt-image-2` — image edit / signage

**Use it for**: editing an existing image with a text prompt, especially when text needs to render on signs (real estate boards, store signs). It's the only model in this list that draws crisp text on physical surfaces.

**Input**:
```json
{
  "prompt": "A 'JUST LISTED' sign in the lawn, white panel, dark serif text",
  "input_images": ["https://signed-url.../photo.jpg"],
  "aspect_ratio": "2:3",
  "output_format": "jpg"
}
```

**Output**: a single image URL, sometimes an array.

**Gotchas — read all of these**:
1. **`aspect_ratio` only accepts `1:1`, `3:2`, `2:3`.** Pass `9:16` and it 422s. Map portrait inputs to `2:3`, landscape to `3:2`, square to `1:1`. Helper:
   ```ts
   function mapToGptImage2Ratio(req: string): "1:1" | "3:2" | "2:3" {
     if (["9:16","4:5","2:3","3:4"].includes(req)) return "2:3"
     if (["16:9","3:2","4:3","21:9"].includes(req)) return "3:2"
     if (req === "1:1") return "1:1"
     return "2:3" // default — most listing reels are vertical
   }
   ```
2. **Default output is webp.** Kling and Seedance both reject webp downstream. Always pass `output_format: "jpg"`. Always.
3. **Runs ~25-35s.** Use `Prefer: wait=60` and you'll usually get the output synchronously.

---

### `google/nano-banana` — fast reference-conditioned image generation

**Use it for**: generating a new image conditioned on a reference image. We use it for the "sketch on a desk" reveal — a property photo becomes a hand-drawn pencil sketch sitting on a wooden desk.

**Input**:
```json
{
  "prompt": "Generate a version of the reference image as a pencil architectural sketch on a wooden desk, with a person's right hand drawing it.",
  "image_input": ["https://signed-url.../photo.jpg"],
  "output_format": "jpg"
}
```

Note `image_input` (not `input_images`) — different field name from gpt-image-2.

**Output**: a single image URL.

**Gotchas**:
1. **Content moderation refuses real-estate signage with text on it.** If you ask nano-banana for a "FOR SALE" sign with readable text, it'll come back with "Failed to generate image." Use gpt-image-2 for any text-on-physical-object work; use nano-banana for stylistic transformations.
2. **Default output is also webp** — same fix, pass `output_format: "jpg"`.
3. **Fast** — usually ~8 seconds. Reliably finishes inside the wait=60 window.

---

### `black-forest-labs/flux-kontext-pro` — image-to-image style transformation

**Use it for**: transforming the *style* of an image while preserving the geometry. Sketch → photoreal interior. Floor plan → photoreal walkthrough. The "kontext" family is purpose-built for this.

**Input**:
```json
{
  "prompt": "Render this sketch as a photorealistic interior. Preserve the exact room geometry...",
  "input_image": "https://signed-url.../sketch.jpg",
  "aspect_ratio": "match_input_image",
  "output_format": "jpg",
  "safety_tolerance": 2,
  "prompt_upsampling": false
}
```

Note `input_image` (singular, no array). Don't conflate with gpt-image-2's `input_images` or nano-banana's `image_input`. Each model picks a different name.

**Output**: a single image URL.

**Gotchas**:
1. `aspect_ratio: "match_input_image"` is the safest default — preserves the source's dimensions. Avoid forcing a ratio the source doesn't already match unless you want letterboxing.
2. `safety_tolerance` — start at 2. If you get false-positive content blocks on architectural drawings, bump to 4-5. Going past 5 risks legitimately unsafe output.
3. `prompt_upsampling: false` — leave it off. The upsampler tends to add unwanted detail not present in the source image.
4. Runs ~30-45s. Worth waiting for.

---

### `kwaivgi/kling-v2.5-turbo-pro` — premium video generation with start + end frames

**Use it for**: cinematic video clips, especially transitions between two known frames (start_image → end_image). Best-in-class for smooth interpolation.

**Input — start frame only**:
```json
{
  "prompt": "Slow dolly camera push-in. Cinematic 9:16 vertical real-estate listing reel.",
  "start_image": "https://signed-url.../first.jpg",
  "duration": 5,
  "aspect_ratio": "9:16",
  "negative_prompt": "morphing geometry, flickering, motion blur, invented rooms"
}
```

**Input — start + end frame transition**:
```json
{
  "prompt": "Smooth cinematic transition from sketch to photoreal. No camera movement.",
  "start_image": "https://signed-url.../sketch.jpg",
  "end_image": "https://signed-url.../photo.jpg",
  "duration": 5,
  "aspect_ratio": "9:16",
  "negative_prompt": "..."
}
```

**Output**: a video URL (usually `https://replicate.delivery/.../tmp....mp4`).

**Gotchas**:
1. **Rejects webp inputs with `mime type image/webp is not supported`.** Convert all images to jpg before they reach Kling. We learned this the hard way — see §4.
2. `duration` accepts 5 or 10 seconds. Anything else gets rejected.
3. `negative_prompt` matters a lot. Without it Kling will sometimes invent rooms or hallucinate furniture. Our standard:
   ```
   "Invented rooms, new objects, added people or animals, weather changes, morphing or warping geometry, flickering, motion blur, floating objects, lighting changes, added reflections, ghost trails, duplicated surfaces."
   ```
   But never use `"lighting changes"` in the negative prompt for time-of-day cycles — it'll suppress the very effect you want.
4. Total runtime is 60-180s. Always use the fire-and-poll pattern (§3) — never `await` to completion inside an edge function.

---

### `bytedance/seedance-1-pro` — premium long-form video (marketing name "Seedance 2.0")

**Use it for**: long clips (≥6s), drone-style and architectural moves, single-image animation. Cleaner physics than Kling for slow architectural pans. Note: ByteDance markets the current Replicate model as Seedance 2.0; the slug is still `seedance-1-pro`.

**Input**:
```json
{
  "prompt": "Slow aerial orbit 60° around the subject at elevated angle.",
  "image": "https://signed-url.../photo.jpg",
  "duration": 5,
  "aspect_ratio": "9:16",
  "resolution": "1080p"
}
```

Note `image` (singular) — different from Kling's `start_image`.

**Output**: a video URL.

**Gotchas**:
1. **Also rejects webp.** Same fix as Kling.
2. Doesn't accept a `start_image` + `end_image` pair. For two-frame transitions, use Kling instead.
3. `resolution: "1080p"` is the sweet spot. `720p` looks soft on Reels.
4. Auto-promote work to Seedance when `duration >= 6` even if your shot type maps to Kling — Seedance handles long-form motion more cleanly:
   ```ts
   const useSeedance = config.model === "seedance" || duration >= 6
   ```

---

### `lucataco/ffmpeg-api` — server-side video stitching with text overlay

**Use it for**: concatenating multiple clips into a single MP4 with text/price/branding overlays burned in. Lets you avoid building a separate Node FFmpeg service.

**Input**:
```json
{
  "media_files": ["https://...clip1.mp4", "https://...clip2.mp4"],
  "command": "-i clip0 -i clip1 -filter_complex \"[0:v][1:v]concat=n=2:v=1[outv];[outv]drawtext=text='1,250,000':fontcolor=white:...\" -map \"[outv]\" -c:v libx264 -pix_fmt yuv420p -s 1080x1920 output.mp4"
}
```

**Gotchas**:
1. `drawtext` needs a fontfile path. The container ships DejaVu Sans by default. If you want a serif, embed a Google Fonts TTF URL via `fontfile=` (test first — some commands strip URLs).
2. Concat with mismatched codecs fails silently. If clips come from a mix of Kling and Seedance, force re-encoding via the concat *filter* instead of the concat *demuxer*.
3. Slow — 30-90s for a 30s output. Use fire-and-poll.

---

## 3. The Fire-and-Poll Pattern (read this twice)

Supabase edge functions die at the 60-second mark. Replicate video jobs routinely take 90-180s. So you cannot `await` Replicate inside the request handler — your function will return a 5xx before the video finishes.

The pattern that works:

### Server (edge function)

```ts
// MODE A — START THE JOB
if (req.method === "POST" && body.start) {
  const res = await fetch(REPLICATE + "/models/.../predictions", {
    method: "POST",
    headers: { Authorization: `Token ${token}`, "Content-Type": "application/json", Prefer: "wait=60" },
    body: JSON.stringify({ input: { ... } }),
  })
  const prediction = await res.json()

  // If Replicate finished inside the wait window, return synchronously
  if (prediction.status === "succeeded" && prediction.output) {
    return Response.json({ status: "complete", video_url: extractUrl(prediction.output) })
  }

  // Otherwise return the prediction_id for the client to poll
  return Response.json({ status: "processing", prediction_id: prediction.id })
}

// MODE B — POLL ONCE
if (req.method === "POST" && body.prediction_id) {
  const res = await fetch(REPLICATE + "/predictions/" + body.prediction_id, {
    headers: { Authorization: `Token ${token}` },
  })
  const data = await res.json()
  if (data.status === "succeeded") return Response.json({ status: "complete", video_url: extractUrl(data.output) })
  if (data.status === "failed")    return Response.json({ status: "failed", error: data.error }, { status: 500 })
  return Response.json({ status: "processing", prediction_id: body.prediction_id })
}
```

### Client (frontend)

```ts
const start = await supabase.functions.invoke("my-fn", { body: { start: true, ... } })

if (start.data?.status === "complete") {
  return start.data.video_url
}

if (start.data?.status === "processing") {
  for (let i = 0; i < 90; i++) {  // 90 × 4s = 6 min
    await new Promise(r => setTimeout(r, 4000))
    const poll = await supabase.functions.invoke("my-fn", { body: { prediction_id: start.data.prediction_id } })
    if (poll.data?.status === "complete") return poll.data.video_url
    if (poll.data?.status === "failed")   throw new Error(poll.data.error)
  }
  throw new Error("Generation took longer than 6 minutes")
}
```

### When you have multiple clips in one job (bundle, sun-cycle, sketch reveal)

Kick off all predictions in parallel, return an ARRAY of prediction_ids, and poll all of them on each tick. Final array shape:

```ts
{
  status: "processing",
  prediction_ids: [
    { index: 0, prediction_id: "abc123", video_url: null },
    { index: 1, prediction_id: "def456", video_url: null },
  ]
}
```

Each poll updates entries with their `video_url` once that one finishes. When every entry has either a `video_url` or an `error`, the bundle is "complete" and you persist all of them.

---

## 4. The WebP Trap (and how to never see it again)

**The error**: `mime type image/webp is not supported`

**Why it happens**: Kling and Seedance reject webp inputs. gpt-image-2 *defaults* to webp output. So you'll get this error any time:
- A user uploads a webp photo from a screenshot or a downloaded image
- gpt-image-2 generates a "before" frame and you pass it straight to Kling
- A signed URL from your storage bucket has `Content-Type: image/webp`

**The fix is in three layers**:

1. **Client-side**: convert webp → jpg before upload via `<canvas>`. Don't trust the browser file picker to filter it out.
   ```ts
   const isWebp = file.type === "image/webp" || /\.webp$/i.test(file.name)
   if (isWebp) file = await reencodeViaCanvas(file)
   ```

2. **Image generation models**: always pass `output_format: "jpg"`. Don't accept the default.
   ```ts
   { prompt, input_images: [...], output_format: "jpg" }  // gpt-image-2
   { prompt, image_input: [...], output_format: "jpg" }   // nano-banana
   { prompt, input_image: ..., output_format: "jpg" }     // flux-kontext
   ```

3. **Server-side defensive guard**: HEAD-check every URL before passing it to Kling/Seedance. If the content-type is webp, throw a clean error rather than letting Replicate cough back the cryptic mime message.
   ```ts
   const head = await fetch(url, { method: "HEAD" })
   if ((head.headers.get("content-type") || "").includes("webp")) {
     throw new Error(`Photo is webp — re-upload as JPEG. (We auto-convert webp on new uploads, this looks like an old file.)`)
   }
   ```

Don't store webp in your bucket. Always upload as `image/jpeg` with `.jpg` extension.

---

## 5. Storage + Signed URL Pattern

Replicate models need *publicly fetchable* URLs as inputs. They cannot read from your authenticated Supabase storage. So:

1. Upload the file to a private bucket
2. Generate a signed URL with `createSignedUrl(path, 86400)` (24h expiry — Replicate finishes in minutes, but the URL might still be passed around)
3. Pass that signed URL as the input to Replicate

```ts
const { data, error } = await supabase.storage
  .from("project-submissions")
  .upload(`${userId}/${Date.now()}/photo.jpg`, file)

const { data: signed } = await supabase.storage
  .from("project-submissions")
  .createSignedUrl(data.path, 86400)

await fetch(REPLICATE + "/models/.../predictions", {
  body: JSON.stringify({ input: { input_images: [signed.signedUrl] } })
})
```

When you get the output back from Replicate, **download it and re-upload to your own storage immediately**. Replicate URLs expire in ~24h; users will come back the next day to a broken video link if you store the Replicate URL directly.

```ts
const videoFetch = await fetch(prediction.output)
const buf = await videoFetch.arrayBuffer()
const path = `videos/${Date.now()}/output.mp4`
await supabase.storage.from("project-submissions").upload(path, buf, {
  contentType: "video/mp4",
  upsert: true,
})
// Persist `path` to your DB. Sign on demand later.
```

---

## 6. Common Errors → Causes → Fixes

| Error | Cause | Fix |
|---|---|---|
| `mime type image/webp is not supported` | Kling/Seedance got a webp input | §4 — three layers of webp protection |
| `aspect_ratio must be one of [1:1, 3:2, 2:3]` | gpt-image-2 got `9:16` or `16:9` | Map ratios via `mapToGptImage2Ratio()` |
| `Edge Function returned a non-2xx status code` | Function timed out or threw | Switch to fire-and-poll. Never `await` long Replicate calls inside the handler. |
| `Failed to generate image` (nano-banana) | Content moderation refused | Real-estate signage with text triggers it. Use gpt-image-2 instead. |
| Empty page / no render after CTA navigation | Frontend route param sets one piece of state but not another that the conditional render requires | Initialise *all* required state from the URL on page load, not just the primary one |
| `No before image` in gallery for AI-mode submissions | Edge function returned a URL but didn't persist to the submission row | After generating, always upload the asset to your own storage AND update the submission row with the path |
| Function works locally, fails in production | Different env vars, or the function isn't deployed | Verify deploy with `npx supabase functions deploy <name> --project-ref <id>`. The web dashboard "Edit function" + "Deploy" doesn't always pick up local file changes. |

---

## 7. How to Prompt These Models

After ~50 generations across all six models, here's what consistently produces good output.

### Universal principles

1. **Tight beats verbose.** A 100-word prompt outperforms a 250-word prompt. Stacked adjectives confuse video models — they'll try to honor every one and end up averaging into mush.

2. **Three beats per video prompt**: (a) what physically happens, (b) how the camera moves, (c) what the final composition looks like. Anything else is noise.

3. **End with the most important constraint.** Models weight the end of the prompt more. If "subject stays locked" matters most, put it last.

4. **Specify what to *preserve*, not just what to change.** "Keep all walls, windows, doors, and the camera angle identical to the source" is more reliable than "transform the room."

5. **Use the negative prompt aggressively for video.** Kling especially benefits from explicit blocks on the failure modes you've seen.

### gpt-image-2 prompts

Designed for: edits to existing images, especially text rendering on physical objects.

Good:
> "Add a clean, professional 'JUST LISTED' real estate yard sign on a metal post, planted upright in the lawn in front of the property. White panel, dark serif text, in scale with the building. Photorealistic, evenly lit, sharp lettering."

Why it works: specifies object, position, materials, scale, and rendering style. Dark serif text on white panel renders cleanly because gpt-image-2 has strong typography priors.

Bad:
> "Make a beautiful for sale sign that really pops and grabs attention with elegant text in a fancy font."

Why it fails: subjective adjectives ("beautiful", "elegant", "really pops"), no position, no scale, no constraint on text style.

### flux-kontext-pro prompts

Designed for: image-to-image style transformation while preserving geometry.

Good:
> "Render this sketch as a photorealistic interior. Preserve the exact room geometry, walls, windows, doors, ceiling lines, and key architectural features from the drawing. Add realistic furniture, finishes, materials, soft natural light, and lived-in props in a luxury aesthetic. Magazine-quality interior photography."

Why it works: clear input type, clear output goal, explicit preservation list, single aesthetic descriptor.

### nano-banana prompts

Designed for: stylistic generation conditioned on a reference image.

Good:
> "Generate a version of the reference image as a pencil architectural sketch on a piece of paper sitting on a wooden desk, with a person's right hand holding a pencil drawing it. The sketch shows the same interior room from the reference image, in clean architectural pencil-sketch style with shading and perspective. Warm desk lighting, shallow depth of field, photorealistic — but the drawing on the paper is a hand-drawn pencil sketch."

Why it works: separates the *meta-scene* (sketch on a desk, hand drawing) from the *contents* (the reference room). The model handles both context layers cleanly.

### Kling prompts (start frame only)

Three sentences max. Camera move + scene + lock.

Good:
> "Slow dolly camera push-in on the subject, steady and cinematic. Cinematic 9:16 vertical real-estate listing reel. Photorealistic, magazine-quality. Subject, architecture, and lighting stay locked exactly as in the source frame."

### Kling prompts (start + end transition)

Describe the *change*, the *manner*, and the *constraint*. Keep camera movement out unless you actually want it.

Good:
> "The pencil architectural sketch on the desk gradually fills with realistic colour, light, materials, and furniture, then opens up to fill the full frame as the actual photorealistic interior shown in the end image. Hand and desk fade gently to the edges. Smooth dreamlike crossfade — the drawing comes alive. No camera movement."

Why it works: explicit start state, explicit transformation, explicit end state, explicit camera behavior.

### Seedance prompts

Slightly more architectural — Seedance handles long pans well. Be specific about the move.

Good:
> "Slow aerial orbit 60° around the subject at elevated angle, smooth drone motion. Cinematic 9:16 vertical real-estate listing reel. Photorealistic. Smooth physically-plausible motion. Subject and architecture stay locked exactly as in the source frame."

---

## 8. Negative Prompt Patterns

Used for Kling and Seedance.

### Default (single-image animation)

```
"Invented rooms, new objects, added people or animals, weather changes,
morphing or warping geometry, flickering, motion blur, floating objects,
lighting changes, added reflections, ghost trails, duplicated surfaces."
```

### Time-of-day transitions (sun-up to sundown)

REMOVE `"lighting changes"` from the negative — that's the entire point of the clip. Keep everything else.

```
"Invented objects, added people or animals, geometry warping,
jittery interpolation, flickering, motion artifacts, frame drops."
```

### Sketch / floor-plan transformations

Keep it minimal. The transformation IS the change, you don't want to fight it.

```
"Invented objects, added people or animals, geometry warping,
jittery interpolation, flickering, motion artifacts, frame drops."
```

---

## 9. Per-Category Recipes (real production patterns)

These are the actual flows we shipped. Copy any of them directly.

### Single-photo cinematic clip

Inputs: 1 photo, shot type, optional listing badge.

1. Optionally apply listing badge via gpt-image-2 (prompt = `EFFECT_PROMPTS[badge_id]`)
2. Pass result image to Kling or Seedance with chosen `motionHint` and `duration: 5-8`
3. Return prediction_id, client polls

### Multi-clip listing reel (3-6 photos)

Inputs: 3-6 photos.

1. Fire N parallel `startVideoGeneration` calls (one per photo, rotating shot types)
2. Return `prediction_ids` array
3. Client polls — each poll updates per-clip status
4. When all done, optionally call `stitch-listing-reel` to concat with FFmpeg + drawtext overlays

### Day-cycle (sunrise → golden hour → dusk)

Inputs: 1 daytime exterior photo.

1. Call gpt-image-2 three times in parallel with three time-of-day prompts (one each for sunrise, golden, dusk)
2. Fire two parallel Kling start→end transitions (sunrise→golden, golden→dusk), 6s each
3. Return `prediction_ids` array
4. Client polls

### Sketch / floor-plan reveal (the magic moment)

Inputs: 1 image (property photo for sketch reveal, OR floor plan for plan reveal).

1. **For sketch reveal**: pass the property photo to nano-banana with the "drawing on a desk" prompt → returns the sketch-on-desk image
2. **For floor-plan reveal**: pass the floor plan to flux-kontext-pro with the photoreal interior render prompt → returns the photoreal interior
3. Fire two parallel predictions:
   - Kling start→end transition (sketch → photo) — the morph
   - startVideoGeneration on the final photo with `slow_push` — the reveal walk
4. Return `prediction_ids` array

### Virtual staging

Inputs: 1 empty room photo, staging style.

1. Call gpt-image-2 with furnishing prompt + style descriptor → returns furnished image
2. Fire two parallel:
   - Kling transition (empty → furnished) — the dressing morph
   - startVideoGeneration on furnished image with `slow_push` — the walkthrough
3. Return `prediction_ids` array

---

## 10. Frontend: Surfacing Errors Properly

Supabase's `functions.invoke` swallows the response body when the function returns a non-2xx. You need to dig it out manually:

```ts
const response = await supabase.functions.invoke("my-fn", { body: {...} })

if (response.error) {
  let detailedMsg = response.error.message
  try {
    const errCtx: any = (response.error as any).context
    if (errCtx?.body) {
      const parsed = typeof errCtx.body === "string" ? JSON.parse(errCtx.body) : errCtx.body
      if (parsed?.error) detailedMsg = parsed.error
    }
  } catch {}
  throw new Error(detailedMsg)
}
```

Without this you'll see "Edge Function returned a non-2xx status code" forever and never know what actually broke. Always do the unwrap.

On the server side, return error bodies with enough context to debug from the toast alone:

```ts
return new Response(
  JSON.stringify({
    error: errorMsg,
    debug: {
      stack: errorStack.slice(0, 500),
      received: { category, photo_count, shot_type },
    },
  }),
  { status: 500, headers: corsHeaders }
)
```

---

## 11. Cost Awareness

Approximate Replicate costs per call (as of mid-2026):

| Model | Per-call cost |
|---|---|
| `openai/gpt-image-2` | ~$0.04 per image |
| `google/nano-banana` | ~$0.01 per image |
| `black-forest-labs/flux-kontext-pro` | ~$0.04 per image |
| `kwaivgi/kling-v2.5-turbo-pro` (5s) | ~$0.35 |
| `bytedance/seedance-1-pro` (5s, 1080p) | ~$0.45 |
| `lucataco/ffmpeg-api` | ~$0.01 per stitch |

A 6-clip listing bundle = 6 × Seedance + 1 × stitch ≈ $2.70. Price your credits accordingly. Verify current pricing on the model pages before shipping.

---

## 12. Pre-flight Checklist

Before you ship a new edge function, verify:

- [ ] Replicate API token is set in Supabase secrets
- [ ] All image generation calls pass `output_format: "jpg"`
- [ ] All gpt-image-2 calls map aspect ratios via `mapToGptImage2Ratio()`
- [ ] Long-running calls use fire-and-poll, not synchronous `await`
- [ ] Server-side webp HEAD check on every URL passed to Kling/Seedance
- [ ] Output files are downloaded and re-uploaded to your own storage (Replicate URLs expire ~24h)
- [ ] Submission row is updated with the persisted storage path, not the Replicate URL
- [ ] Frontend unwraps error bodies, doesn't show "non-2xx" generic
- [ ] `npx tsc --noEmit` passes
- [ ] Deployed via `npx supabase functions deploy <name> --project-ref <id>`, not just edited in the dashboard

---

## 13. When Something Goes Wrong

1. Check `npx supabase functions logs <function-name> --project-ref <id> --tail` — the actual error message will be there.
2. If the function logs show a Replicate error, click through to the prediction on https://replicate.com/predictions/<id> — Replicate keeps logs of every call and shows the exact input/output.
3. If the prediction never appears, you're failing before the Replicate call. Look for env var, JSON serialization, or auth header issues.
4. If the prediction succeeded but your function returns an error, the issue is in your output handling — `extractFirstUrl()` is the usual culprit, models return different output shapes (string, array, object with `.url`).

---

This document is the condensed lessons of one full session of debugging. Update it when you discover new failure modes — the next engineer will thank you.
