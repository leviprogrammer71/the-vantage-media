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
  /** Optional MP3 / WAV URL to mix into the final video. Plays from t=0,
   *  loops if shorter than the reel, gets a 0.5s fade-out before the end.
   *  Routed via WebAudio → MediaStreamDestination → MediaRecorder so the
   *  audio is permanently baked into the output MP4 / WebM. */
  audioUrl?: string
  /** Audio mix gain (0..1). Default 0.85 — leaves a touch of headroom for
   *  any voiceover the user adds in their editor. */
  audioGain?: number
}

const W = 1080
const H = 1920
// ── FPS MATCHED TO SOURCE (May 12, 2026) ──
// Seedance 2.0 generates at 24fps (cinema standard) — we explicitly set
// fps:24 on every Seedance call. The stitch canvas must encode at the same
// rate, otherwise captureStream(30) samples a 24fps source at 30Hz, which
// produces duplicated frames in the output (every 5th frame is identical
// to the previous). The user sees this as "footage slowing down" in
// random segments. 24fps end-to-end eliminates the resample artifact.
const FPS = 24

/** Pick a MediaRecorder mimeType the current browser supports.
 *
 * CRITICAL: when `withAudio` is true the mimeType MUST declare BOTH a video
 * codec AND an audio codec — otherwise MediaRecorder throws:
 *   "An audio track cannot be recorded: video/webm;codecs=vp8 indicates an
 *    unsupported codec"
 * (We hit this in production May 12, 2026 when a user tried to stitch a
 * done-for-you reel with background music.)
 *
 * Strategy: probe a list of full audio+video codec strings first, fall back
 * to video-only strings, and finally let the browser pick.
 */
function pickMimeType(withAudio = false): { mimeType: string; ext: string } {
  // Combined audio+video candidates — required when streaming audio tracks
  // into MediaRecorder. Safari uses mp4/h264+aac, Chrome/Firefox use
  // webm/(vp9|vp8|h264)+opus.
  const withAudioCandidates = [
    { mimeType: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", ext: "mp4" }, // h264 + AAC-LC
    { mimeType: "video/mp4;codecs=h264,aac", ext: "mp4" },
    { mimeType: "video/webm;codecs=h264,opus", ext: "webm" },
    { mimeType: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mimeType: "video/webm;codecs=vp8,opus", ext: "webm" },
    { mimeType: "video/webm;codecs=opus", ext: "webm" }, // browser picks video codec
  ]
  // Video-only candidates — used when the recording is silent.
  const videoOnlyCandidates = [
    { mimeType: "video/mp4;codecs=avc1.42E01E", ext: "mp4" },
    { mimeType: "video/mp4;codecs=h264", ext: "mp4" },
    { mimeType: "video/mp4", ext: "mp4" },
    { mimeType: "video/webm;codecs=h264", ext: "webm" },
    { mimeType: "video/webm;codecs=vp9", ext: "webm" },
    { mimeType: "video/webm;codecs=vp8", ext: "webm" },
    { mimeType: "video/webm", ext: "webm" },
  ]
  const candidates = withAudio ? withAudioCandidates : videoOnlyCandidates
  for (const c of candidates) {
    if ((window as any).MediaRecorder?.isTypeSupported?.(c.mimeType)) return c
  }
  // Fallback — let the browser pick. Safer than guessing.
  return { mimeType: "", ext: "webm" }
}

/** Load a video element AND wait until it has buffered enough to play
 *  through to the end without re-buffering. The previous version resolved
 *  on `loadeddata` (just the first frame) which caused mid-clip stalls
 *  during the stitch — the canvas would read empty frames when the network
 *  caught the buffer short. `canplaythrough` is the right event for a
 *  gapless render. Falls back to `loadeddata` after 8 seconds in case the
 *  browser's heuristics never declare canplaythrough (Safari sometimes
 *  doesn't on 5s clips).
 */
function loadVideo(src: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video")
    v.crossOrigin = "anonymous"
    v.muted = true
    v.playsInline = true
    v.preload = "auto"
    v.src = src
    let resolved = false
    const finish = () => {
      if (resolved) return
      resolved = true
      v.removeEventListener("canplaythrough", finish)
      v.removeEventListener("loadeddata", fallbackTimer.cancel)
      clearTimeout(fallbackTimer.id)
      resolve(v)
    }
    // Primary: wait for the browser to declare it can play through.
    v.addEventListener("canplaythrough", finish)
    // Fallback: if canplaythrough doesn't fire within 8s after loadeddata,
    // resolve anyway so we don't block forever on Safari edge cases.
    const fallbackTimer = (() => {
      let id: ReturnType<typeof setTimeout> = 0 as any
      const cancel = () => clearTimeout(id)
      v.addEventListener("loadeddata", () => {
        id = setTimeout(finish, 8000)
      })
      return { get id() { return id }, cancel }
    })()
    v.addEventListener("error", () => {
      if (!resolved) reject(new Error(`Failed to load video: ${src.slice(0, 80)}`))
    })
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

  // Style: snappy — Anton bold caps, the dominant Reels/TikTok display font.
  // Price is HEAVY (was 132 → 168) and gets a hard drop shadow under the
  // black stroke for clean read on busy backgrounds. This is the most
  // visually-distinct treatment in the stack.
  else if (style === "snappy") {
    if (listing.show_price && listing.price) {
      const t = `$${listing.price.toLocaleString()}`
      ctx.font = `900 168px ${fonts.display}`
      ctx.textBaseline = "top"
      // Drop shadow first
      ctx.fillStyle = "rgba(0,0,0,0.55)"
      ctx.fillText(t, 52, 92)
      // Black outline + yellow fill
      ctx.fillStyle = "#FFD700"
      ctx.strokeStyle = "rgba(0,0,0,0.95)"
      ctx.lineWidth = 11
      ctx.lineJoin = "round"
      ctx.strokeText(t, 48, 88)
      ctx.fillText(t, 48, 88)
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

  // Style: cinema — DM Serif Display anamorphic premium with HEAVY letterbox
  // bars (220px each, was 160) so the cinema grade actually reads as cinema
  // and not just "editorial with smaller type". Bars are pure black, fully
  // opaque, anchored to the frame edges.
  else if (style === "cinema") {
    ctx.fillStyle = "rgba(0,0,0,1)"
    ctx.fillRect(0, 0, W, 220)
    ctx.fillRect(0, H - 220, W, 220)

    if (listing.location) {
      ctx.font = `500 24px ${fonts.sub}`
      ctx.textBaseline = "middle"
      ctx.fillStyle = "rgba(244,239,230,0.92)"
      ctx.fillText(listing.location.toUpperCase(), 56, 110)
    }
    if (listing.show_price && listing.price) {
      const t = `$${listing.price.toLocaleString()}`
      ctx.font = `400 72px ${fonts.display}`
      ctx.textBaseline = "middle"
      ctx.fillStyle = "rgba(244,239,230,0.98)"
      ctx.textAlign = "right"
      ctx.fillText(t, W - 56, 110)
      ctx.textAlign = "left"
    }
    if (listing.realtor_name) {
      ctx.font = `500 24px ${fonts.sub}`
      ctx.textBaseline = "middle"
      ctx.fillStyle = "rgba(244,239,230,0.92)"
      ctx.fillText(listing.realtor_name, 56, H - 110)
      if (listing.brokerage) {
        ctx.textAlign = "right"
        ctx.fillStyle = "rgba(244,239,230,0.7)"
        ctx.fillText(listing.brokerage, W - 56, H - 110)
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
  // ── TRANSITION DURATIONS (May 12, 2026 — shortened) ──
  // Long crossfades blend two simultaneously-decoded streams. Any decoder
  // hiccup during the blend window shows up as a visible movement glitch
  // (the user reported "movement glitches" especially on the minimal style
  // which used a 0.9s slow_dissolve). Capping all transitions at ≤0.3s
  // keeps the blend window short enough that decoder stalls don't have
  // time to manifest, while still feeling cinematic. Slideleft on snappy
  // doesn't blend (it's a hard-edge translate), so its previous 0.45s
  // was already fine — kept short anyway for tempo.
  editorial: { duration: 0.3,  type: "dissolve" },
  cinema:    { duration: 0.3,  type: "fadeblack" },
  snappy:    { duration: 0.3,  type: "slideleft" },
  minimal:   { duration: 0.3,  type: "slow_dissolve" },
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

/** Sharpen pass applied to every style. Snappy was the only style without
 *  sharpening — but snappy is the most-watched on social feeds where the
 *  re-encode compresses heavily, so it benefits from MORE sharpening at the
 *  source, not less, to survive Reels/TikTok's recompression pipeline. */
const UNSHARP_BY_STYLE: Record<NonNullable<StitchOptions["style"]>, boolean> = {
  editorial: true,
  cinema:    true,
  minimal:   true,
  snappy:    true, // ← enabled May 12, 2026 — social re-encode benefits from extra sharpness at source
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
  // ── QUALITY: pixel-perfect draws skip the bicubic resample ──
  // When source video matches the canvas dimensions exactly (Seedance 9:16
  // 1080p → 1080×1920 canvas with scale=1.0), bicubic resampling adds a
  // visible softening pass even at imageSmoothingQuality="high". Disabling
  // smoothing for 1:1 maps preserves source sharpness. Sources at different
  // aspect ratios keep "high" smoothing because they actually need scaling.
  const needsScale = Math.abs(scale - 1.0) > 0.001
  ctx.imageSmoothingEnabled = needsScale
  if (needsScale) ctx.imageSmoothingQuality = "high"
  // Per-style colour grade — equivalent to FFmpeg `eq=saturation=…:contrast=…`
  // applied to the source clip before the overlay layer. Each preset is
  // visibly distinct so the user can tell editorial/cinema/snappy/minimal
  // apart at a glance:
  //
  //   editorial → warm magazine grade, saturated, slight brightness lift
  //   cinema    → desaturated cool-shadow grade, low brightness, high contrast
  //                (anamorphic ad feel — what luxury auto ads look like)
  //   snappy    → pumped saturation + bumped brightness + warm hue tilt
  //                (TikTok / Reels feed energy — vivid, punchy, alive)
  //   minimal   → almost monochrome — heavy desaturation, neutral contrast
  //                (whisper-quiet luxury — never shouts)
  const grade =
    style === "editorial"
      ? "saturate(1.12) contrast(1.05) brightness(1.03) sepia(0.04)"
      : style === "cinema"
      ? "saturate(0.85) contrast(1.18) brightness(0.94) hue-rotate(-3deg)"
      : style === "snappy"
      ? "saturate(1.28) contrast(1.10) brightness(1.06)"
      : "saturate(0.62) contrast(1.04) brightness(1.0)" // minimal — restrained
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

  // 1. Canvas at output resolution. ImageSmoothingQuality is bumped to
  //    "high" so any incidental upscale (e.g. a 720p Kling clip rendered
  //    onto a 1080×1920 canvas) uses bicubic-grade resampling instead of
  //    the default nearest-neighbor mush. This is the single biggest
  //    visible-quality win for the stitched output.
  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext("2d", { alpha: false })
  if (!ctx) throw new Error("Canvas 2D context unavailable")
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"
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

  // 4. MediaRecorder on the canvas stream — optionally with an audio
  //    track mixed in via WebAudio so the chosen song is permanently
  //    baked into the output MP4.
  //
  // ── DETERMINISTIC FRAME CAPTURE (May 12, 2026) ──
  // captureStream(N) is opportunistic — the stream sampler grabs whatever
  // is on the canvas at its N-Hz tick, regardless of whether the canvas was
  // redrawn since the last sample. During a rAF hiccup (GC pause, decoder
  // stall, paint backlog), the sampler grabs the SAME frame twice in a
  // row, producing a "movement glitch" the user sees as a momentary freeze
  // or rate stutter in the encoded output.
  //
  // captureStream(0) opts out of automatic sampling — the recorder ONLY
  // sees a new frame when we explicitly call track.requestFrame() after
  // each canvas draw. That gives us frame-perfect synchronization: every
  // encoded frame corresponds to exactly one rAF draw, no duplication, no
  // skipping.
  const videoStream = (canvas as any).captureStream(0) as MediaStream
  const videoTrack = videoStream.getVideoTracks()[0] as any // CanvasCaptureMediaStreamTrack

  // Audio mixdown (optional). When opts.audioUrl is set, we fetch the file,
  // decode it via WebAudio, route it through a MediaStreamDestination, and
  // merge that audio track with the canvas video track into a single
  // MediaStream that MediaRecorder consumes. Result: one MP4/WebM with
  // perfectly-synced video AND audio, no FFmpeg dependency, no server.
  let audioCtx: AudioContext | null = null
  let audioSource: AudioBufferSourceNode | null = null
  let audioGainNode: GainNode | null = null
  let hasAudio = false
  const stream = await (async (): Promise<MediaStream> => {
    if (!opts.audioUrl) return videoStream
    try {
      const res = await fetch(opts.audioUrl)
      if (!res.ok) throw new Error(`audio fetch ${res.status}`)
      const arrayBuf = await res.arrayBuffer()
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
      audioCtx = new Ctx()
      const decoded = await audioCtx.decodeAudioData(arrayBuf.slice(0))
      const dest = audioCtx.createMediaStreamDestination()
      audioGainNode = audioCtx.createGain()
      audioGainNode.gain.value = opts.audioGain ?? 0.85
      audioSource = audioCtx.createBufferSource()
      audioSource.buffer = decoded
      // Loop the song if it's shorter than the reel (Suno renders are 15s).
      audioSource.loop = decoded.duration < totalDuration
      audioSource.connect(audioGainNode).connect(dest)
      // Schedule a 0.5s linear fade-out so the song doesn't cut abruptly
      // when the video ends.
      const now = audioCtx.currentTime
      audioGainNode.gain.setValueAtTime(opts.audioGain ?? 0.85, now)
      audioGainNode.gain.linearRampToValueAtTime(0, now + totalDuration)
      const audioTrack = dest.stream.getAudioTracks()[0]
      const merged = new MediaStream([
        ...videoStream.getVideoTracks(),
        audioTrack,
      ])
      // Fire the audio source the same instant recording starts.
      audioSource.start(0)
      hasAudio = true
      return merged
    } catch (err) {
      console.warn("[stitch] audio mixdown failed, recording silent video:", err)
      return videoStream
    }
  })()

  // CRITICAL: pick the mimeType AFTER we know whether the stream has an audio
  // track. Picking a video-only mimeType (e.g. "video/webm;codecs=vp8") when
  // the stream carries audio causes MediaRecorder to throw at .start():
  //   "An audio track cannot be recorded: video/webm;codecs=vp8 indicates an
  //    unsupported codec"
  let { mimeType, ext } = pickMimeType(hasAudio)
  // Bitrate: 24 Mbps for 1080×1920 vertical @ 30 FPS. Earlier values:
  //   6 Mbps  → readable but visibly soft, especially in foliage / windows
  //   12 Mbps → still soft after Reels/TikTok re-encode (they re-encode at
  //             ~4-8 Mbps, so we have to ship something with enough quality
  //             headroom to survive the second encode pass)
  //   24 Mbps → magazine-grade output; survives Reels recompression at
  //             roughly the same perceived quality as the source.
  // 1080×1920 @ 30fps has 1.78× more pixels than 1080×1080 — bitrate has
  // to scale with pixel count, not fall back to landscape defaults.
  // For VP8 fallback (some Firefox builds), 24 Mbps is necessary just to
  // match VP9 at 14-16 Mbps.
  // Both videoBitsPerSecond AND bitsPerSecond are set — some browsers honor
  // only the combined `bitsPerSecond`, others only the per-track hints. With
  // both set we get max bitrate compliance everywhere. 24,256,000 = 24M video
  // + 256K audio sum.
  const recorderOpts: MediaRecorderOptions = mimeType
    ? {
        mimeType,
        videoBitsPerSecond: 24_000_000,
        audioBitsPerSecond: 256_000,
        bitsPerSecond: 24_256_000,
      }
    : {
        videoBitsPerSecond: 24_000_000,
        audioBitsPerSecond: 256_000,
        bitsPerSecond: 24_256_000,
      }

  // Defensive recorder construction. If MediaRecorder still rejects the
  // mimeType we picked (some browsers report isTypeSupported as true but
  // throw at construction time), fall back to a silent video-only recording
  // so the user at least gets the visual reel rather than nothing.
  let recorder: MediaRecorder
  try {
    recorder = new MediaRecorder(stream, recorderOpts)
  } catch (err) {
    console.warn("[stitch] MediaRecorder rejected combined audio+video, falling back to silent recording:", err)
    // Tear down audio so we don't leak the AudioContext
    try { audioSource?.stop() } catch { /* ignore */ }
    try { await audioCtx?.close() } catch { /* ignore */ }
    audioCtx = null
    audioSource = null
    audioGainNode = null
    hasAudio = false
    const fallback = pickMimeType(false)
    mimeType = fallback.mimeType
    ext = fallback.ext
    recorder = new MediaRecorder(
      videoStream,
      fallback.mimeType
        ? {
            mimeType: fallback.mimeType,
            videoBitsPerSecond: 24_000_000,
            bitsPerSecond: 24_000_000,
          }
        : {
            videoBitsPerSecond: 24_000_000,
            bitsPerSecond: 24_000_000,
          },
    )
  }
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data) }
  const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve() })
  recorder.start(100)

  // 5. Kick off clip 0 at t=0; wait for it to be ACTIVELY playing (not
  //    just for play() to resolve) before continuing — otherwise the
  //    first ~100ms of recording captures a black frame because the
  //    video element hasn't decoded its first frame yet. Subsequent
  //    clips are started inside the rAF loop the moment we cross into
  //    their start window.
  await new Promise<void>((res) => {
    const v0 = videos[0]
    const onPlaying = () => {
      v0.removeEventListener("playing", onPlaying)
      res()
    }
    v0.addEventListener("playing", onPlaying)
    v0.play().catch(() => res()) // if autoplay blocked, resolve anyway
    // Hard timeout in case `playing` never fires
    setTimeout(res, 1000)
  })
  const playState = videos.map((_, i) => i === 0)

  // 6. rAF loop driving the canvas. We gate the captureStream.requestFrame()
  //    call to a fixed FPS-locked cadence (24 fps) so MediaRecorder gets
  //    EXACTLY one frame per encoded slot. Without this throttle the rAF
  //    loop ran at the display refresh rate (60-120 Hz) and the recorder
  //    would either drop frames or duplicate them, producing the "footage
  //    slows down then jumps" glitch the user saw.
  const startMs = performance.now()
  const frameIntervalMs = 1000 / FPS
  let lastCaptureMs = startMs - frameIntervalMs // emit first frame immediately
  await new Promise<void>((resolve) => {
    const tick = () => {
      const nowMs = performance.now()
      const t = (nowMs - startMs) / 1000
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

      // Lazily start the next clip well BEFORE we need it on-screen so the
      // decoder has time to present the first frame. 0.05s was too tight —
      // on slower devices the canvas read a black frame during the first
      // ~50ms of the crossfade. 0.3s gives ~9 frames of warmup at 30 FPS.
      // We don't reset currentTime — the preloaded video is already at 0
      // and a setter call forces a seek that delays first-frame delivery.
      if (next >= 0 && !playState[next] && t >= starts[next] - 0.3) {
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

      // Emit a captured frame to MediaRecorder only when we've crossed
      // the next frame-interval boundary. This gates the encoder to exactly
      // FPS frames per second regardless of how often rAF fires.
      if (nowMs - lastCaptureMs >= frameIntervalMs) {
        if (typeof videoTrack?.requestFrame === "function") {
          videoTrack.requestFrame()
        }
        // Snap the next emit time to the grid so accumulated drift doesn't
        // shift the encoded timing.
        lastCaptureMs += frameIntervalMs
        // If we fell badly behind (tab backgrounded, GC pause), don't try
        // to catch up by spamming frames — just resume from now.
        if (nowMs - lastCaptureMs > frameIntervalMs * 4) lastCaptureMs = nowMs
      }

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

  // 8. Cleanup — videos and audio context
  videos.forEach((v) => {
    v.pause()
    v.src = ""
    v.load()
  })
  try {
    audioSource?.stop()
  } catch { /* already stopped */ }
  if (audioCtx && audioCtx.state !== "closed") {
    audioCtx.close().catch(() => {})
  }

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
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const isAndroid = /Android/i.test(navigator.userAgent)
  const isMobile = isiOS || isAndroid

  // ── FILENAME EXTENSION REFLECTS ACTUAL CONTENT ──
  // Chrome's MediaRecorder produces WebM regardless of what we ask for —
  // it can't mux MP4. Safari produces MP4. Previously we hard-coded .mp4
  // on every download, which gave Chrome users an .mp4 file containing
  // WebM bytes — iOS Safari refused to play it ("file corrupted").
  //
  // Now: detect the real container from blob.type and set the extension
  // accordingly. The user sees an honest filename and any player that
  // opens it sniffs the right codec.
  let finalFilename = filename
  if (typeof blobOrUrl !== "string" && blobOrUrl.type) {
    const t = blobOrUrl.type.toLowerCase()
    const realExt = t.includes("mp4") ? "mp4"
                  : t.includes("webm") ? "webm"
                  : t.includes("quicktime") ? "mov"
                  : null
    if (realExt) {
      // Replace any existing extension with the real one
      finalFilename = filename.replace(/\.(mp4|webm|mov|m4v)$/i, "") + `.${realExt}`
    }
  }

  // ── MOBILE WEBM HANDLING ──
  // iOS Safari can't decode WebM at all. On mobile, if the blob is WebM,
  // try the Web Share sheet first (lets the user pass it to another app
  // that can re-encode — e.g. Photos won't accept it but most editor
  // apps will). If share fails, the anchor-click fallback still saves
  // the bytes; user can transfer to a desktop to use them.
  if (isMobile && typeof blobOrUrl !== "string" && typeof (navigator as any).canShare === "function") {
    try {
      const file = new File([blobOrUrl], finalFilename, { type: blobOrUrl.type || "video/mp4" })
      const shareData: any = { files: [file], title: finalFilename }
      if ((navigator as any).canShare(shareData)) {
        await (navigator as any).share(shareData)
        return true
      }
    } catch { /* fall through to anchor click */ }
  }

  // Universal blob anchor click — desktop, Android, AND modern iOS.
  // target="_self" is critical for iOS so the click triggers a download
  // instead of a navigation. Do NOT also call window.open afterwards —
  // that's what made the previous version "open in another tab" instead
  // of saving.
  const url = typeof blobOrUrl === "string" ? blobOrUrl : URL.createObjectURL(blobOrUrl)
  const a = document.createElement("a")
  a.href = url
  a.download = finalFilename
  a.rel = "noopener"
  a.target = "_self"
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    try { document.body.removeChild(a) } catch { /* gone */ }
    if (typeof blobOrUrl !== "string") URL.revokeObjectURL(url)
  }, 1500)
  return true
}
