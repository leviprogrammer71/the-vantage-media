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

  // Style: editorial — refined fashion-house aesthetic (default)
  if (style === "editorial") {
    // Top-left: location (small caps, parchment chip)
    if (listing.location) {
      const t = listing.location.toUpperCase()
      ctx.font = '600 28px Inter, system-ui, sans-serif'
      ctx.textBaseline = "top"
      const padX = 18, padY = 14
      const w = ctx.measureText(t).width + padX * 2
      ctx.fillStyle = "rgba(14,14,12,0.62)"
      ctx.fillRect(36, 36, w, 28 + padY * 2)
      ctx.fillStyle = "rgba(244,239,230,0.95)"
      ctx.fillText(t, 36 + padX, 36 + padY)
    }
    // Bottom-left: price (big serif)
    if (listing.show_price && listing.price) {
      const t = `$${listing.price.toLocaleString()}`
      ctx.font = '600 92px "Bauer Bodoni", Playfair Display, Georgia, serif'
      ctx.textBaseline = "bottom"
      ctx.shadowColor = "rgba(0,0,0,0.6)"
      ctx.shadowBlur = 16
      ctx.shadowOffsetY = 4
      ctx.fillStyle = "rgba(244,239,230,0.98)"
      ctx.fillText(t, 48, H - 140)
      ctx.shadowColor = "transparent"
    }
    // Bottom-right: realtor + brokerage
    if (listing.realtor_name) {
      ctx.font = '600 24px Inter, system-ui, sans-serif'
      ctx.textBaseline = "bottom"
      ctx.textAlign = "right"
      ctx.shadowColor = "rgba(0,0,0,0.6)"
      ctx.shadowBlur = 8
      ctx.fillStyle = "rgba(244,239,230,0.95)"
      ctx.fillText(listing.realtor_name.toUpperCase(), W - 36, H - (listing.brokerage ? 110 : 80))
      if (listing.brokerage) {
        ctx.font = '500 18px Inter, system-ui, sans-serif'
        ctx.fillStyle = "rgba(244,239,230,0.78)"
        ctx.fillText(listing.brokerage.toUpperCase(), W - 36, H - 78)
      }
      ctx.textAlign = "left"
      ctx.shadowColor = "transparent"
    }
  }

  // Style: snappy — high-contrast, big bold caps
  else if (style === "snappy") {
    if (listing.show_price && listing.price) {
      const t = `$${listing.price.toLocaleString()}`
      ctx.font = '900 120px Impact, "Bebas Neue", Arial Black, sans-serif'
      ctx.textBaseline = "top"
      ctx.fillStyle = "#FFD700"
      ctx.strokeStyle = "rgba(0,0,0,0.92)"
      ctx.lineWidth = 8
      ctx.lineJoin = "round"
      ctx.strokeText(t, 48, 80)
      ctx.fillText(t, 48, 80)
    }
    if (listing.location) {
      ctx.font = '700 32px Impact, Arial Black, sans-serif'
      ctx.textBaseline = "bottom"
      ctx.fillStyle = "#FFFFFF"
      ctx.strokeStyle = "rgba(0,0,0,0.85)"
      ctx.lineWidth = 4
      ctx.strokeText(listing.location.toUpperCase(), 48, H - 200)
      ctx.fillText(listing.location.toUpperCase(), 48, H - 200)
    }
    if (listing.realtor_name) {
      ctx.font = '700 26px Impact, Arial, sans-serif'
      ctx.fillStyle = "rgba(255,255,255,0.95)"
      ctx.textBaseline = "bottom"
      ctx.strokeStyle = "rgba(0,0,0,0.85)"
      ctx.lineWidth = 3
      ctx.strokeText(listing.realtor_name.toUpperCase(), 48, H - 140)
      ctx.fillText(listing.realtor_name.toUpperCase(), 48, H - 140)
    }
  }

  // Style: cinema — small precise type, big letterboxes
  else if (style === "cinema") {
    // Top + bottom letterbox bars
    ctx.fillStyle = "rgba(0,0,0,0.92)"
    ctx.fillRect(0, 0, W, 160)
    ctx.fillRect(0, H - 160, W, 160)

    if (listing.location) {
      ctx.font = '500 24px Inter, system-ui, sans-serif'
      ctx.textBaseline = "middle"
      ctx.fillStyle = "rgba(244,239,230,0.92)"
      ctx.letterSpacing = "0.18em" as any // not all browsers support
      ctx.fillText(listing.location.toUpperCase(), 48, 80)
    }
    if (listing.show_price && listing.price) {
      const t = `$${listing.price.toLocaleString()}`
      ctx.font = '500 56px "Bauer Bodoni", Playfair Display, Georgia, serif'
      ctx.textBaseline = "middle"
      ctx.fillStyle = "rgba(244,239,230,0.98)"
      ctx.textAlign = "right"
      ctx.fillText(t, W - 48, 80)
      ctx.textAlign = "left"
    }
    if (listing.realtor_name) {
      ctx.font = '500 22px Inter, system-ui, sans-serif'
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

  // Style: minimal — just a small price chip, nothing else
  else if (style === "minimal") {
    if (listing.show_price && listing.price) {
      const t = `$${listing.price.toLocaleString()}`
      ctx.font = '600 36px Inter, system-ui, sans-serif'
      ctx.textBaseline = "top"
      const padX = 24, padY = 16
      const w = ctx.measureText(t).width + padX * 2
      ctx.fillStyle = "rgba(255,255,255,0.96)"
      ctx.fillRect(W - w - 36, 36, w, 36 + padY * 2)
      ctx.fillStyle = "#0E0E0C"
      ctx.fillText(t, W - w - 36 + padX, 36 + padY)
    }
  }

  // Caption — simple line at top-center, fades in over the first half-second of every clip
  if (listing.caption) {
    const fade = Math.min(1, clipProgress * 4)
    ctx.font = '500 26px Inter, system-ui, sans-serif'
    ctx.textBaseline = "top"
    ctx.textAlign = "center"
    ctx.fillStyle = `rgba(244,239,230,${0.88 * fade})`
    ctx.shadowColor = `rgba(0,0,0,${0.55 * fade})`
    ctx.shadowBlur = 12
    // Wrap to ~60 chars
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
      ctx.fillText(l, W / 2, 220 + i * 36)
    })
    ctx.textAlign = "left"
    ctx.shadowColor = "transparent"
  }

  // Watermark
  if (watermark) {
    ctx.font = '500 16px Inter, system-ui, sans-serif'
    ctx.textBaseline = "bottom"
    ctx.textAlign = "right"
    ctx.fillStyle = "rgba(244,239,230,0.45)"
    ctx.fillText("AI · THE VANTAGE", W - 24, H - 24)
    ctx.textAlign = "left"
  }

  ctx.restore()
}

/**
 * Stitch the clips into a single Blob. Returns the Blob plus a chosen file
 * extension (mp4 on Safari, webm elsewhere) and an object URL the caller can
 * download or play.
 */
export async function stitchClipsClientSide(
  opts: StitchOptions
): Promise<{ blob: Blob; ext: "mp4" | "webm"; url: string }> {
  const { clips, listing, watermark = true, style = "editorial", onProgress } = opts
  if (!clips?.length) throw new Error("No clips to stitch")

  // 1. Set up canvas at output resolution
  const canvas = document.createElement("canvas")
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext("2d", { alpha: false })
  if (!ctx) throw new Error("Canvas 2D context unavailable")

  // 2. Pre-load all videos so the recording is gapless
  const videos: HTMLVideoElement[] = []
  for (let i = 0; i < clips.length; i++) {
    onProgress?.((i / clips.length) * 0.2) // first 20% = loading
    videos.push(await loadVideo(clips[i]))
  }

  // 3. Set up MediaRecorder on the canvas's stream
  const stream = (canvas as any).captureStream(FPS) as MediaStream
  const { mimeType, ext } = pickMimeType()
  const recorderOpts: MediaRecorderOptions = mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : { videoBitsPerSecond: 6_000_000 }
  const recorder = new MediaRecorder(stream, recorderOpts)
  const chunks: Blob[] = []
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data)
  }
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve()
  })
  recorder.start(100) // emit chunks every 100ms

  // 4. Render loop — for each clip, draw frames into the canvas
  let frameHandle: number | null = null
  const startTime = performance.now()
  for (let i = 0; i < videos.length; i++) {
    const v = videos[i]
    const drawFrame = () => {
      // Cover-fit the video into the 9:16 canvas
      const vw = v.videoWidth
      const vh = v.videoHeight
      if (vw && vh) {
        const scale = Math.max(W / vw, H / vh)
        const dw = vw * scale
        const dh = vh * scale
        const dx = (W - dw) / 2
        const dy = (H - dh) / 2
        ctx.fillStyle = "#000"
        ctx.fillRect(0, 0, W, H)
        ctx.drawImage(v, dx, dy, dw, dh)
      } else {
        ctx.fillStyle = "#000"
        ctx.fillRect(0, 0, W, H)
      }
      const clipProgress = v.duration > 0 ? Math.min(1, v.currentTime / v.duration) : 1
      drawOverlays(ctx, listing, watermark, style, clipProgress)
      frameHandle = requestAnimationFrame(drawFrame)
    }
    frameHandle = requestAnimationFrame(drawFrame)
    await playToEnd(v)
    if (frameHandle) cancelAnimationFrame(frameHandle)
    frameHandle = null
    // 20% loading + 80% across all clips
    onProgress?.(0.2 + 0.8 * ((i + 1) / videos.length))
  }

  // 5. Stop recording, build the blob
  recorder.stop()
  await stopped
  const blob = new Blob(chunks, { type: mimeType || "video/webm" })
  const url = URL.createObjectURL(blob)
  // Cleanup videos
  videos.forEach((v) => {
    v.pause()
    v.src = ""
    v.load()
  })
  void startTime // unused — kept for future timing telemetry
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
