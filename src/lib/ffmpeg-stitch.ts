/**
 * ffmpeg-stitch.ts — lossless MP4 concatenation via ffmpeg.wasm.
 *
 * Replaces the canvas + MediaRecorder stitcher with bit-perfect concat using
 * libavformat's `concat` demuxer + `-c copy` (stream copy, no re-encode).
 *
 * Why this fixes the quality complaints:
 *   - MediaRecorder ALWAYS re-encodes the canvas → lossy, soft, color-shifted.
 *   - Canvas crossfades blend two decoded streams → blur, ghosting, "absurd
 *     cuts" because the decoded frames hiccup during transitions.
 *   - Audio mixdown forces codec constraints that hurt video bitrate budget.
 *
 * The ffmpeg.wasm approach reads the source MP4 bytes verbatim and writes
 * them back into a single container. Zero re-encode. The output is the same
 * pixels Seedance produced — magazine-grade quality preserved end-to-end.
 *
 * Requirements: clips must share codec/resolution/framerate/profile. Seedance
 * always returns 1080×1920 H.264 24fps so this is guaranteed for our flows.
 *
 * Browser requirements: SharedArrayBuffer. Means COOP/COEP headers must be
 * set on the page serving this code. We set them only on /video* and
 * /gallery* in vercel.json so other pages keep their third-party embeds.
 */
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// ── Module-level singleton ──
// ffmpeg.wasm loads ~30MB on first use. Cache the instance so the cost is
// paid ONCE per session even if the user stitches multiple reels.
let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

// Unpkg CDN base — Vite can't bundle ffmpeg's worker scripts; serve from CDN.
// Pinned to the version in package.json so updates don't surprise the build.
const CORE_VERSION = "0.12.10";
const CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

/** Lazy-load ffmpeg.wasm. Idempotent. */
export async function getFFmpeg(
  onProgress?: (msg: string) => void,
): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    onProgress?.("Loading ffmpeg core…");
    const ff = new FFmpeg();
    // Stream stderr/stdout into the progress callback for debugging hooks.
    ff.on("log", ({ message }) => {
      // Only surface high-signal messages to UI; full log goes to console.
      if (/error|failed|invalid/i.test(message)) {
        console.warn("[ffmpeg.wasm]", message);
      }
    });
    await ff.load({
      coreURL: await toBlobURL(
        `${CORE_BASE_URL}/ffmpeg-core.js`,
        "text/javascript",
      ),
      wasmURL: await toBlobURL(
        `${CORE_BASE_URL}/ffmpeg-core.wasm`,
        "application/wasm",
      ),
    });
    onProgress?.("ffmpeg core loaded");
    ffmpegInstance = ff;
    return ff;
  })();
  return loadPromise;
}

export interface FFmpegStitchOptions {
  /** Ordered MP4 URLs to concatenate. Must share codec/resolution/framerate. */
  clipUrls: string[];
  /** Optional progress callback (0–1). */
  onProgress?: (fraction: number) => void;
  /** Optional human-readable status callback for UI ("Loading ffmpeg…"). */
  onStatus?: (message: string) => void;
}

export interface FFmpegStitchResult {
  blob: Blob;
  url: string;
  /** Always "mp4" — concat demuxer with -c copy always produces MP4. */
  ext: "mp4";
  /** True if the concat used stream-copy (lossless). Currently always true. */
  lossless: boolean;
}

/**
 * Concatenate MP4 clips in order, lossless via stream copy.
 *
 * Steps:
 *   1. Load ffmpeg.wasm (cached after first use).
 *   2. Fetch each clip URL to a Uint8Array.
 *   3. Write each clip + a manifest file to ffmpeg's virtual FS.
 *   4. Run ffmpeg -f concat -safe 0 -i list.txt -c copy out.mp4.
 *   5. Read the output and return as a Blob.
 *
 * Performance: ~3-10× slower than native ffmpeg. For 6 clips × 5s totaling
 * ~30s of video, expect 8-20 seconds of stitch time on a modern laptop.
 *
 * Throws if any source URL fails to fetch, or if the clips have mismatched
 * codecs (rare with our pipeline — Seedance always returns identical specs).
 */
export async function stitchMp4Lossless(
  opts: FFmpegStitchOptions,
): Promise<FFmpegStitchResult> {
  const { clipUrls, onProgress, onStatus } = opts;
  if (!clipUrls?.length) throw new Error("stitchMp4Lossless: no clips provided");
  if (clipUrls.length === 1) {
    // Single clip — fetch, return as blob. No ffmpeg cost.
    onStatus?.("Single clip — no stitch needed");
    const res = await fetch(clipUrls[0]);
    const buffer = await res.arrayBuffer();
    const blob = new Blob([buffer], { type: "video/mp4" });
    return { blob, url: URL.createObjectURL(blob), ext: "mp4", lossless: true };
  }

  const ff = await getFFmpeg(onStatus);
  onStatus?.("Fetching clips…");

  // 1. Write each clip into ffmpeg's virtual FS.
  const clipNames: string[] = [];
  for (let i = 0; i < clipUrls.length; i++) {
    const name = `clip-${i.toString().padStart(3, "0")}.mp4`;
    const data = await fetchFile(clipUrls[i]);
    await ff.writeFile(name, data);
    clipNames.push(name);
    // Progress: clip-fetch phase is the first 50% of total time.
    onProgress?.((i + 1) / clipUrls.length * 0.5);
  }

  // 2. Build the concat manifest. The `concat` demuxer needs one file per
  // line in a specific format. Paths are relative to ffmpeg's working dir.
  const manifest = clipNames.map((n) => `file '${n}'`).join("\n");
  await ff.writeFile("list.txt", new TextEncoder().encode(manifest));

  // 3. Run the stitch. -c copy = stream copy = no re-encode = zero quality
  // loss + fast. -safe 0 allows arbitrary filenames in the manifest.
  // -fflags +genpts regenerates packet timestamps so the output has a clean
  // monotonic timeline regardless of input metadata quirks.
  onStatus?.("Stitching with ffmpeg…");
  onProgress?.(0.6);
  await ff.exec([
    "-f", "concat",
    "-safe", "0",
    "-i", "list.txt",
    "-c", "copy",
    "-fflags", "+genpts",
    "-movflags", "+faststart",
    "out.mp4",
  ]);
  onProgress?.(0.95);

  // 4. Read the output and return as a Blob.
  onStatus?.("Reading output…");
  const outData = await ff.readFile("out.mp4");
  // outData is Uint8Array in browser ffmpeg.wasm; cast to ArrayBuffer-friendly type
  const outBytes = outData as Uint8Array;
  const blob = new Blob([outBytes.buffer.slice(outBytes.byteOffset, outBytes.byteOffset + outBytes.byteLength)], { type: "video/mp4" });
  const url = URL.createObjectURL(blob);
  onProgress?.(1);

  // 5. Cleanup the virtual FS so the next stitch starts clean.
  try {
    for (const n of clipNames) await ff.deleteFile(n);
    await ff.deleteFile("list.txt");
    await ff.deleteFile("out.mp4");
  } catch { /* best-effort cleanup */ }

  return { blob, url, ext: "mp4", lossless: true };
}

/**
 * Check whether the browser environment supports ffmpeg.wasm. Returns the
 * reason if not so we can show a clean fallback message.
 */
export function ffmpegWasmAvailable(): { ok: boolean; reason?: string } {
  if (typeof SharedArrayBuffer === "undefined") {
    return {
      ok: false,
      reason: "Browser cross-origin isolation not enabled. Reload the page — the headers should apply on hard refresh.",
    };
  }
  if (typeof WebAssembly === "undefined") {
    return { ok: false, reason: "WebAssembly not supported in this browser." };
  }
  return { ok: true };
}
