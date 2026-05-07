/**
 * Client-side video stitcher.
 *
 * Why this exists: server-side stitching via Replicate's FFmpeg model has been
 * unreliable (model availability + 60s edge timeout + drawtext escaping). This
 * runs entirely in the browser using built-ins (Canvas + MediaRecorder), so
 * there's no external API to fail and no server timeout.
 *
 * How it works:
 *  1. Open each clip in a hidden <video> element, in sequence
 *  2. Draw each frame onto a 1080x1920 canvas
 *  3. Draw text overlays (price, location, realtor, brokerage, watermark) on
 *     top of each frame using the canvas API
 *  4. Capture the canvas's video stream via canvas.captureStream(30)
 *  5. Record it with MediaRecorder → Blob (mp4 on Safari, webm elsewhere)
 *
 * Tradeoff: stitching takes ~as long as the output (a 30s reel = 30s wait).
 * That's fine — it's a "done for you final cut" button, not a real-time op.
 */

export interface StitchListing {
  price?: number | null
  realtor_name?: string
  location?: string
  brokerage?: string
  show_price?: boolean
  caption?: string
}

export interface StitchOptions {
  clips: string[] // mp4 URLs in order
  listing: StitchListing
  watermark?: boolean // default true
  /** Style preset for the overlay treatment */
  style?: "editorial" | "snappy" | "cinema" | "minimal"
  /** Optional progress callback 0..1 */
  onProgress?: (frac: number) => void
}

const W = 1080
const H = 1920
const FPS = 30

/** Pick a MediaRecorder mimeType the current browser supports. */
function pickMimeType(): { mimeType: string; ext: string } {
  // Safari only supports mp4/h264 here
  const candidates = [
    { mimeType: "video/mp4;codecs=avc1.42E01E", ext: "mp4" },
    { mimeType: "video/mp4;codecs=h264", ext: "mp4" },
    { mimeType: "video/mp4", ext: "mp4" },
    { mimeType: "video/webm;codecs=h264", ext: "webm" },
    { mimeType: "video/webm;codecs=vp9", ext: "webm" },
    { mimeType: "video/webm;codecs=vp8", ext: "webm" },
    { mimeType: "video/webm", ext: "webm" },
  ]
  for (const c of candidates) {
    if ((window as any).MediaRecorder?.isTypeSupported?.(c.mimeType)) return c
  }
  // Fallback — let the browser pick
  return { mimeType: "", ext: "webm" }
}

/** Load a video element, await it being ready to play through. */
function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video")
    v.crossOrigin = "anonymous"
    v.muted = true
    v.playsInline = true
    v.preload = "auto"
    v.src = src
    const onReady = () => {
      v.removeEventListener("canplaythrough", onReady)
      v.removeEventListener("loadeddata", onReady)
      resolve(v)
    }
    v.addEventListener("canplaythrough", onReady)
    v.addEventListener("loadeddata", onReady)
    v.addEventListener("error", () => reject(new Error(`Failed to load video: ${src.slice(0, 80)}`)))
    // Some browsers require explicit load()
    v.load()
  })
}

/** Wait for current video to play to end. */
function playToEnd(v: HTMLVideoElement): Promise<void> {
  return new Promise((resolve) => {
    v.currentTime = 0
    const onEnd = () => {
      v.removeEventListener("ended", onEnd)
      resolve()
    }
    v.addEventListener("ended", onEnd)
    v.play().catch(() => {
      // If autoplay blocks, resolve anyway and the recorder will see a static frame
      resolve()
    })
  })
}

/** Style presets for the overlay treatment. Each draws differently. */
function drawOverlays(
  ctx: CanvasRenderingContext2D,
  listing: StitchListing,
  watermark: boolean,
  style: NonNullable<StitchOptions["style"]> = "editorial",
  // Progress 0..1 inside the current clip — used for fade-in animations
  clipProgress: number = 1
) {
  ctx.save()
  const fonts = FONT_STACKS[style]

  // Style: editorial — Cormorant Garamond luxury serif, fashion-house refined
  if (style === "editorial") {
    if (listing.location) {
      const t = listing.location.toUpperCase()
      ctx.font = `600 28px ${fonts.sub}`
      ctx.textBaseline = "top"
      const padX = 18, padY = 14
      const w = ctx.measureText(t).width + padX * 2
      ctx.fillStyle = "rgba(14,14,12,0.62)"
      ctx.fillRect(36, 36, w, 28 + padY * 2)
      ctx.fillStyle = "rgba(244,239,230,0.95)"
      ctx.fillText(t, 36 + padX, 36 + padY)
    }
    if (listing.show_price && listing.price) {
      const t = `$${listing.price.toLocaleString()}`
      ctx.font = `500 96px ${fonts.display}`
      ctx.textBaseline = "bottom"
      ctx.shadowColor = "rgba(0,0,0,0.6)"
      ctx.shadowBlur = 16
      ctx.shadowOffsetY = 4
      ctx.fillStyle = "rgba(244,239,230,0.98)"
      ctx.fillText(t, 48, H - 140)
      ctx.shadowColor = "transparent"
    }
    if (listing.realtor_name) {
      ctx.font = `600 24px ${fonts.sub}`
      ctx.textBaseline = "bottom"
      ctx.textAlign = "right"
      ctx.shadowColor = "rgba(0,0,0,0.6)"
      ctx.shadowBlur = 8
      ctx.fillStyle = "rgba(244,239,230,0.95)"
      ctx.fillText(listing.realtor_name.toUpperCase(), W - 36, H - (listing.brokerage ? 110 : 80))
      if (listing.brokerage) {
        ctx.font = `500 18px ${fonts.sub}`
        ctx.fillStyle = "rgba(244,239,230,0.78)"
        ctx.fillText(listing.brokerage.toUpperCase(), W - 36, H - 78)
      }
      ctx.textAlign = "left"
      ctx.shadowColor = "transparent"
    }
  }

  // Style: snappy — Anton bold caps, the dominant Reels/TikTok display font
  else if (style === "snappy") {
    if (listing.show_price && listing.price) {
      const t = `$${listing.price.toLocaleString()}`
      ctx.font = `900 132px ${fonts.display}`
      ctx.textBaseline = "top"
      ctx.fillStyle = "#FFD700"
      ctx.strokeStyle = "rgba(0,0,0,0.92)"
      ctx.lineWidth = 9
      ctx.lineJoin = "round"
      ctx.strokeText(t, 48, 80)
      ctx.fillText(t, 48, 80)
    }
    if (listing.location) {
      ctx.font = `400 38px ${fonts.display}`
      ctx.textBaseline = "bottom"
      ctx.fillStyle = "#FFFFFF"
      ctx.strokeStyle = "rgba(0,0,0,0.85)"
      ctx.lineWidth = 4
      ctx.strokeText(listing.location.toUpperCase(), 48, H - 200)
      ctx.fillText(listing.location.toUpperCase(), 48, H - 200)
    }
    if (listing.realtor_name) {
      ctx.font = `400 30px ${fonts.display}`
      ctx.fillStyle = "rgba(255,255,255,0.95)"
      ctx.textBaseline = "bottom"
      ctx.strokeStyle = "rgba(0,0,0,0.85)"
      ctx.lineWidth = 3
      ctx.strokeText(listing.realtor_name.toUpperCase(), 48, H - 140)
      ctx.fillText(listing.realtor_name.toUpperCase(), 48, H - 140)
    }
  }

  // Style: cinema — DM Serif Display anamorphic premium with letterbox bars
  else if (style === "cinema") {
    ctx.fillStyle = "rgba(0,0,0,0.92)"
    ctx.fillRect(0, 0, W, 160)
    ctx.fillRect(0, H - 160, W, 160)

    if (listing.location) {
      ctx.font = `500 24px ${fonts.sub}`
      ctx.textBaseline = "middle"
      ctx.fillStyle = "rgba(244,239,230,0.92)"
      ctx.fillText(listing.location.toUpperCase(), 48, 80)
    }
    if (listing.show_price && listing.price) {
      const t = `$${listing.price.toLocaleString()}`
      ctx.font = `400 60px ${fonts.display}`
      ctx.textBaseline = "middle"
      ctx.fillStyle = "rgba(244,239,230,0.98)"
      ctx.textAlign = "right"
      ctx.fillText(t, W - 48, 80)
      ctx.textAlign = "left"
    }
    if (listing.realtor_name) {
      ctx.font = `500 22px ${fonts.sub}`
      ctx.textBaseline = "middle"
      ctx.fillStyle = "rgba(244,239,230,0.85)"
      ctx.fillText(listing.realtor_name, 48, H - 80)
      if (listing.brokerage) {
        ctx.textAlign = "right"
        ctx.fillStyle = "rgba(244,239,230,0.62)"
        ctx.fillText(listing.brokerage, W - 48, H - 80)
        ctx.textAlign = "left"
      }
    }
  }

  // Style: minimal — Cormorant italic price chip, nothing else
  else if (style === "minimal") {
    if (listing.show_price && listing.price) {
      const t = `$${listing.price.toLocaleString()}`
      ctx.font = `400 44px ${fonts.display}`
      ctx.textBaseline = "top"
      const padX = 26, padY = 18
      const w = ctx.measureText(t).width + padX * 2
      ctx.fillStyle = "rgba(255,255,255,0.96)"
      ctx.fillRect(W - w - 36, 36, w, 44 + padY * 2)
      ctx.fillStyle = "#0E0E0C"
      ctx.fillText(t, W - w - 36 + padX, 36 + padY)
    }
  }

  // Caption — cinematic fade-in over the first half-second of every clip
  if (listing.caption) {
    const fade = Math.min(1, clipProgress * 4)
    ctx.font = style === "editorial" || style === "minimal"
      ? `italic 500 32px ${fonts.display}`
      : `500 26px ${fonts.sub}`
    ctx.textBaseline = "top"
    ctx.textAlign = "center"
    ctx.fillStyle = `rgba(244,239,230,${0.92 * fade})`
    ctx.shadowColor = `rgba(0,0,0,${0.55 * fade})`
    ctx.shadowBlur = 12
    const words = listing.caption.split(/\s+/)
    const lines: string[] = []
    let line = ""
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (ctx.measureText(test).width > W * 0.82 && line) {
        lines.push(line)
        line = w
      } else {
        line = test
      }
    }
    if (line) lines.push(line)
    lines.slice(0, 2).forEach((l, i) => {
      ctx.fillText(l, W / 2, 220 + i * 40)
    })
    ctx.textAlign = "left"
    ctx.shadowColor = "transparent"
  }

  // Watermark — brand mark, not "AI"-prefixed. We're a media studio.
  if (watermark) {
    ctx.font = `500 17px ${fonts.sub}`
    ctx.textBaseline = "bottom"
    ctx.textAlign = "right"
    ctx.fillStyle = "rgba(244,239,230,0.5)"
    ctx.fillText("THE VANTAGE MEDIA", W - 24, H - 24)
    ctx.textAlign = "left"
  }

  ctx.restore()
}

/** Transition profile per style — modelled on FFmpeg's xfade filter
 *  (https://trac.ffmpeg.org/wiki/Xfade). Each style picks one transition
 *  type that matches its visual language. All transitions use a cubic-in-out
 *  easing curve so neither edge of the dissolve feels mechanical.
 *
 *  - editorial → 0.5s dissolve         (xfade=dissolve)         smooth alpha cross-fade
 *  - cinema    → 0.6s fade-through-black (xfade=fadeblack)      cinematic, magazine-grade
 *  - snappy    → 0.45s slide-left       (xfade=slideleft)       outgoing slides off left, incoming reveals from right
 *  - minimal   → 0.9s slow dissolve    (xfade=dissolve, slow)   nothing snaps, every cut stays smooth
 */
const TRANSITION_PROFILE: Record<
  NonNullable<StitchOptions["style"]>,
  { duration: number; type: "dissolve" | "fadeblack" | "slideleft" | "slow_dissolve" }
> = {
  editorial: { duration: 0.5,  type: "dissolve" },
  cinema:    { duration: 0.6,  type: "fadeblack" },
  snappy:    { duration: 0.45, type: "slideleft" },
  minimal:   { duration: 0.9,  type: "slow_dissolve" },
}

/** Per-style font stacks — researched from luxury real estate brand systems
 *  (Compass, Sotheby's, Douglas Elliman) and adapted to free Google Fonts.
 *
 *  - editorial → Cormorant Garamond  (high-contrast luxury serif, à la Aman/Compass marketing)
 *  - cinema    → DM Serif Display    (anamorphic premium serif, luxury auto-ad feel)
 *  - snappy    → Anton              (bold display caps, Bebas's bigger sister, dominant in Reels)
 *  - minimal   → Cormorant Garamond italic (whisper-quiet refined serif, just a price chip)
 *
 *  Inter is the universal sans for sub-text in every style.
 */
const FONT_STACKS: Record<
  NonNullable<StitchOptions["style"]>,
  { display: string; sub: string; italic: string }
> = {
  editorial: {
    display: '"Cormorant Garamond", "Playfair Display", "Bauer Bodoni", Georgia, serif',
    sub:     'Inter, system-ui, -apple-system, sans-serif',
    italic:  'italic 500 "Cormorant Garamond", Georgia, serif',
  },
  cinema: {
    display: '"DM Serif Display", "Cormorant Garamond", Georgia, serif',
    sub:     'Inter, system-ui, -apple-system, sans-serif',
    italic:  'italic 400 "DM Serif Display", Georgia, serif',
  },
  snappy: {
    display: 'Anton, Impact, "Bebas Neue", "Arial Black", sans-serif',
    sub:     '"Inter", system-ui, sans-serif',
    italic:  'italic 700 "Inter", system-ui, sans-serif',
  },
  minimal: {
    display: '"Cormorant Garamond", Georgia, serif',
    sub:     'Inter, system-ui, -apple-system, sans-serif',
    italic:  'italic 400 "Cormorant Garamond", Georgia, serif',
  },
}

/** Cubic ease-in-out — the standard cinematic easing curve. Mirrors FFmpeg
 *  xfade-easing's `cubic-in-out`. Keeps the transition slow at the edges and
 *  faster in the middle so neither clip feels abruptly handed off. */
function easeInOutCubic(x: number): number {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

/** SVG filter id for the FFmpeg-equivalent unsharp mask. The filter element
 *  is mounted to the DOM once at stitch-start so canvas `ctx.filter` can
 *  reference it via `url(#vantage-unsharp)`.
 *
 *  The convolution kernel is the standard 3×3 sharpen kernel:
 *      0  -1   0
 *     -1   5  -1
 *      0  -1   0
 *  Equivalent to FFmpeg `unsharp=3:3:0.6` — subtle edge enhancement, not
 *  the over-sharpened "HDR phone" look. Pairs with the per-style eq grade
 *  to give the output a finishing pass that matches what a colourist would
 *  apply in DaVinci Resolve.
 */
const UNSHARP_FILTER_ID = "vantage-unsharp"
const UNSHARP_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute">
    <filter id="${UNSHARP_FILTER_ID}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feConvolveMatrix order="3" preserveAlpha="true"
        kernelMatrix="0 -0.6 0  -0.6 3.4 -0.6  0 -0.6 0" />
    </filter>
  </svg>
`

/** Mount the unsharp SVG filter into the document once. Idempotent — second
 *  mount is a no-op. */
function ensureUnsharpFilter() {
  if (typeof document === "undefined") return
  if (document.getElementById(UNSHARP_FILTER_ID)) return
  const wrap = document.createElement("div")
  wrap.style.position = "absolute"
  wrap.style.width = "0"
  wrap.style.height = "0"
  wrap.style.overflow = "hidden"
  wrap.innerHTML = UNSHARP_SVG
  document.body.appendChild(wrap)
}

/** Whether to apply the unsharp pass. Off for snappy (already punchy) so
 *  the output doesn't look brittle on social feeds. */
const UNSHARP_BY_STYLE: Record<NonNullable<StitchOptions["style"]>, boolean> = {
  editorial: true,
  cinema:    true,
  minimal:   true,
  snappy:    false,
}

/** Cover-fit a video frame into the 1080×1920 canvas at a given alpha.
 *  Applies an FFmpeg-`eq`-style colour grade plus optional unsharp mask
 *  per reel style. Implemented via the Canvas 2D `filter` property which
 *  the browser pipelines on the GPU. */
function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  v: HTMLVideoElement,
  alpha: number,
  style: NonNullable<StitchOptions["style"]> = "editorial",
) {
  const vw = v.videoWidth
  const vh = v.videoHeight
  if (!vw || !vh) return
  const scale = Math.max(W / vw, H / vh)
  const dw = vw * scale
  const dh = vh * scale
  const dx = (W - dw) / 2
  const dy = (H - dh) / 2
  ctx.save()
  ctx.globalAlpha = alpha
  // Per-style colour grade — equivalent to FFmpeg `eq=saturation=…:contrast=…`
  // applied to the source clip before the overlay layer. Optional unsharp
  // mask via SVG `feConvolveMatrix` chains in afterwards for the finishing
  // pass — equivalent to FFmpeg `unsharp=3:3:0.6`.
  const grade =
    style === "editorial"
      ? "saturate(1.08) contrast(1.04) brightness(1.02)"
      : style === "cinema"
      ? "saturate(1.05) contrast(1.10) brightness(0.98)"
      : style === "minimal"
      ? "saturate(0.92) contrast(1.02) brightness(1.0)"
      : "saturate(1.10) contrast(1.06) brightness(1.02)" // snappy — punchy
  const sharpen = UNSHARP_BY_STYLE[style] ? ` url(#${UNSHARP_FILTER_ID})` : ""
  ctx.filter = grade + sharpen
  ctx.drawImage(v, dx, dy, dw, dh)
  ctx.filter = "none"
  ctx.restore()
}

/** FFmpeg `vignette` filter equivalent — radial darkening at the edges.
 *  Drawn once per frame after the video and before the text overlays so
 *  it pulls attention into the centre of the composition. */
function drawVignette(
  ctx: CanvasRenderingContext2D,
  style: NonNullable<StitchOptions["style"]>,
) {
  // Snappy keeps it punchy edge-to-edge; the others get a soft vignette.
  if (style === "snappy") return
  const intensity =
    style === "cinema" ? 0.55 : style === "editorial" ? 0.4 : 0.45 // minimal
  const cx = W / 2
  const cy = H / 2
  const inner = Math.max(W, H) * 0.42
  const outer = Math.hypot(W, H) / 2
  const grad = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer)
  grad.addColorStop(0, "rgba(0,0,0,0)")
  grad.addColorStop(1, `rgba(0,0,0,${intensity})`)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)
}

/**
 * Stitch the clips into a single Blob with smooth crossfade transitions.
 *
 * Architecture (gapless + crossfaded):
 *  - Single continuous requestAnimationFrame loop over the entire output
 *    duration. The canvas is never blanked except as a black bg fill on the
 *    first frame.
 *  - Each clip starts playing 0.5s before the previous clip ends (overlap).
 *  - During the overlap window, the outgoing clip is drawn at decreasing
 *    alpha and the incoming clip at increasing alpha — a true crossfade.
 *  - Between overlaps, only one clip is drawn (full alpha).
 *
 * This eliminates the 1-frame black flash that the old per-clip rAF loops
 * produced when iterating from clip[i] to clip[i+1], and replaces every hard
 * cut with a smooth dissolve.
 */
export async function stitchClipsClientSide(
  opts: StitchOptions
): Promise<{ blob: Blob; ext: "mp4" | "webm"; url: string }> {
  const { clips: rawClips, listing, watermark = true, style = "editorial", onProgress } = opts
  // Only stitch actual video files. If a photo URL leaks into the array
  // (shouldn't happen but defensive), skip it — stitching a still over a
  // crossfade looks broken and stretches the runtime. Accepts mp4, webm,
  // mov, m4v + signed-URL queries on those extensions.
  const VIDEO_EXTS = /\.(mp4|webm|mov|m4v)(?:\?|$)/i
  const clips = (rawClips || []).filter((u) => typeof u === "string" && VIDEO_EXTS.test(u.toLowerCase()))
  if (!clips.length) {
    const filtered = (rawClips || []).length - clips.length
    throw new Error(
      filtered > 0
        ? `No video clips to stitch — ${filtered} non-video URL(s) were filtered out. Make sure every clip is .mp4/.webm/.mov.`
        : "No clips to stitch"
    )
  }

  const profile = TRANSITION_PROFILE[style]
  const transitionSec = profile.duration

  // 0. Mount the unsharp SVG filter once — `ctx.filter` will reference it.
  ensureUnsharpFilter()

  // 1. Canvas at output resolution
  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext("2d", { alpha: false })
  if (!ctx) throw new Error("Canvas 2D context unavailable")
  // Black background — drawn once at start so the first crossfade has
  // something to dissolve over.
  ctx.fillStyle = "#000"
  ctx.fillRect(0, 0, W, H)

  // 2. Preload every clip so playback is gapless
  const videos: HTMLVideoElement[] = []
  for (let i = 0; i < clips.length; i++) {
    onProgress?.((i / clips.length) * 0.2)
    videos.push(await loadVideo(clips[i]))
  }

  // 3. Compute the global timeline. Each clip starts `transitionSec` before
  //    the previous one ends, producing the overlap windows used for the
  //    crossfade.
  const durations = videos.map((v) => Math.max(0.1, v.duration || 5))
  const starts: number[] = [0]
  for (let i = 1; i < videos.length; i++) {
    starts[i] = starts[i - 1] + durations[i - 1] - transitionSec
  }
  const totalDuration = starts[videos.length - 1] + durations[videos.length - 1]

  // 4. MediaRecorder on the canvas stream
  const stream = (canvas as any).captureStream(FPS) as MediaStream
  const { mimeType, ext } = pickMimeType()
  const recorderOpts: MediaRecorderOptions = mimeType
    ? { mimeType, videoBitsPerSecond: 6_000_000 }
    : { videoBitsPerSecond: 6_000_000 }
  const recorder = new MediaRecorder(stream, recorderOpts)
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data) }
  const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve() })
  recorder.start(100)

  // 5. Kick off clip 0 at t=0; subsequent clips are started inside the rAF
  //    loop the moment we cross into their start window.
  await videos[0].play().catch(() => {})
  const playState = videos.map((_, i) => i === 0)

  // 6. Continuous rAF loop driving the canvas for the full output duration.
  const startMs = performance.now()
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = (performance.now() - startMs) / 1000
      if (t >= totalDuration) {
        resolve()
        return
      }

      // Determine which clip(s) are active at time t.
      // Find the latest index whose start <= t and which has time remaining.
      let primary = 0
      for (let i = 0; i < videos.length; i++) {
        if (starts[i] <= t && t < starts[i] + durations[i]) primary = i
      }
      const next = primary + 1 < videos.length ? primary + 1 : -1

      // Are we in the overlap window between primary and next?
      let blend = 0
      if (next >= 0 && t >= starts[next]) {
        // Fade strength 0 → 1 across the transition window
        blend = Math.min(1, (t - starts[next]) / transitionSec)
      }

      // Lazily start the next clip the first frame we cross into its start.
      if (next >= 0 && !playState[next] && t >= starts[next] - 0.05) {
        videos[next].currentTime = 0
        videos[next].play().catch(() => {})
        playState[next] = true
      }

      // Black bg under everything for safety (never visible unless both videos
      // freeze — should not normally happen)
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, W, H)

      // Apply the cinematic ease-in-out curve so the transition is slow at the
      // edges and faster in the middle — eliminates the jarring linear handoff.
      const eased = blend > 0 ? easeInOutCubic(blend) : 0

      // Render the transition. Each branch maps to an xfade-equivalent.
      if (next < 0 || eased === 0) {
        // No transition window — single clip at full alpha.
        drawVideoCover(ctx, videos[primary], 1, style)
      } else if (profile.type === "dissolve" || profile.type === "slow_dissolve") {
        // FFmpeg xfade=dissolve — straight cross-fade alpha blend.
        drawVideoCover(ctx, videos[primary], 1 - eased, style)
        drawVideoCover(ctx, videos[next], eased, style)
      } else if (profile.type === "fadeblack") {
        // FFmpeg xfade=fadeblack — outgoing fades to black in first half,
        // incoming fades up from black in second half. Cinematic, magazine-grade.
        if (eased < 0.5) {
          drawVideoCover(ctx, videos[primary], 1 - eased * 2, style)
        } else {
          drawVideoCover(ctx, videos[next], (eased - 0.5) * 2, style)
        }
      } else if (profile.type === "slideleft") {
        // FFmpeg xfade=slideleft — outgoing slides off to the LEFT, incoming
        // slides in from the RIGHT. Sharp directional reveal for snappy.
        const offset = W * eased
        ctx.save()
        ctx.translate(-offset, 0)
        drawVideoCover(ctx, videos[primary], 1, style)
        ctx.restore()
        ctx.save()
        ctx.translate(W - offset, 0)
        drawVideoCover(ctx, videos[next], 1, style)
        ctx.restore()
      } else {
        drawVideoCover(ctx, videos[primary], 1 - eased, style)
        drawVideoCover(ctx, videos[next], eased, style)
      }

      // FFmpeg `vignette` filter equivalent — radial darkening that pulls
      // attention into the centre. Skipped for snappy.
      drawVignette(ctx, style)

      // Overlay text — use the active clip's progress for caption fade
      const activeForCaption = blend > 0.5 && next >= 0 ? videos[next] : videos[primary]
      const clipProgress = activeForCaption.duration > 0
        ? Math.min(1, activeForCaption.currentTime / activeForCaption.duration)
        : 1
      drawOverlays(ctx, listing, watermark, style, clipProgress)

      // Progress reporting (20% load + 80% render)
      onProgress?.(0.2 + 0.8 * Math.min(1, t / totalDuration))

      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })

  // 7. Stop recording, finalize blob
  recorder.stop()
  await stopped
  const blob = new Blob(chunks, { type: mimeType || "video/webm" })
  const url = URL.createObjectURL(blob)

  // 8. Cleanup
  videos.forEach((v) => {
    v.pause()
    v.src = ""
    v.load()
  })

  return { blob, ext: ext as "mp4" | "webm", url }
}

/**
 * Cross-device download. Handles desktop (anchor click), mobile Safari
 * (Web Share API or new tab fallback), and mobile Chrome (anchor click).
 * Returns true if the download was initiated, false if the user needs to
 * tap-and-hold an opened tab to save.
 */
export async function downloadBlobOrUrl(
  blobOrUrl: Blob | string,
  filename: string
): Promise<boolean> {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

  const url = typeof blobOrUrl === "string" ? blobOrUrl : URL.createObjectURL(blobOrUrl)

  // iOS Safari: anchor download mostly fails. Best UX is the Share Sheet.
  if (isiOS && typeof blobOrUrl !== "string" && (navigator as any).canShare) {
    try {
      const file = new File([blobOrUrl], filename, { type: blobOrUrl.type || "video/mp4" })
      const shareData = { files: [file], title: filename } as any
      if ((navigator as any).canShare(shareData)) {
        await (navigator as any).share(shareData)
        return true
      }
    } catch {
      // fall through to anchor click
    }
  }

  // Desktop + Android Chrome — anchor with download attribute
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    if (typeof blobOrUrl !== "string") URL.revokeObjectURL(url)
  }, 1000)

  // iOS without Web Share — open in new tab so the user can long-press to save
  if (isiOS && typeof blobOrUrl === "string") {
    window.open(url, "_blank")
    return false
  }

  return true
}
