/**
 * ffmpeg-stitch.ts — lossless MP4 concatenation via ffmpeg.wasm.
 *
 * Replaces the canvas + MediaRecorder stitcher with bit-perfect concat using
 * the MPEG-TS intermediate technique: each source MP4 is transmuxed to a TS
 * container with `-c copy -bsf:v h264_mp4toannexb -f mpegts`, then the TS
 * files are joined via the concat PROTOCOL (byte-append) and remuxed back
 * to MP4. Zero re-encode, zero quality loss.
 *
 * Why this and not `-f concat -c copy` (the simpler approach)?
 *   The concat DEMUXER + stream-copy worked on paper but produced BLACK
 *   FRAMES in production. Root cause: Replicate's Seedance/Kling outputs
 *   don't always share identical SPS/PPS extradata between clips. The
 *   concat demuxer writes packets directly using the FIRST file's
 *   parameter sets, so subsequent clips decode as garbage / black.
 *   The h264_mp4toannexb bitstream filter standardizes the parameter sets
 *   into the elementary stream itself, so each clip carries its own SPS/PPS
 *   in-band — concatenation becomes safe regardless of mismatch.
 *
 * Fallback: if the lossless path errors (very rare — would need a clip with
 * an unsupported codec profile), we re-encode via the concat FILTER with
 * libx264 -crf 18 (visually lossless). Slower but bulletproof.
 *
 * Browser requirements: SharedArrayBuffer (= COOP/COEP headers on the page).
 * Set in vercel.json on /video* and /gallery* only.
 */
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// ── Module-level singleton ──
let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

// Unpkg CDN base — pinned to the version in package.json.
const CORE_VERSION = "0.12.10";
const CORE_BASE_URL = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

/** Lazy-load ffmpeg.wasm. Idempotent across calls. */
export async function getFFmpeg(
  onProgress?: (msg: string) => void,
): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    onProgress?.("Loading ffmpeg core…");
    const ff = new FFmpeg();
    // Pipe high-signal log lines to console so we can debug black-output
    // regressions. Suppress everything else — ffmpeg is chatty.
    ff.on("log", ({ message }) => {
      if (/error|failed|invalid|cannot|unsupported|warning/i.test(message)) {
        console.warn("[ffmpeg.wasm]", message);
      }
    });
    await ff.load({
      coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    onProgress?.("ffmpeg core loaded");
    ffmpegInstance = ff;
    return ff;
  })();
  return loadPromise;
}

export interface FFmpegStitchOptions {
  /** Ordered MP4 URLs to concatenate. */
  clipUrls: string[];
  /** Optional progress callback (0–1). */
  onProgress?: (fraction: number) => void;
  /** Optional human-readable status callback for UI. */
  onStatus?: (message: string) => void;
}

export interface FFmpegStitchResult {
  blob: Blob;
  url: string;
  ext: "mp4";
  lossless: boolean;
  /** Which path actually produced the output — for monitoring. */
  method: "ts_concat" | "filter_reencode";
}

/**
 * Concatenate MP4 clips in order. Lossless if possible, re-encode if not.
 *
 * Path A (default): TS-intermediate concat — zero re-encode.
 * Path B (fallback): concat filter with libx264 -crf 18 — visually lossless
 *                    re-encode, ~2-3× slower but works on any input.
 */
export async function stitchMp4Lossless(
  opts: FFmpegStitchOptions,
): Promise<FFmpegStitchResult> {
  const { clipUrls, onProgress, onStatus } = opts;
  if (!clipUrls?.length) throw new Error("stitchMp4Lossless: no clips provided");

  // Single clip — just fetch and return. No stitch needed.
  if (clipUrls.length === 1) {
    onStatus?.("Single clip — no stitch needed");
    const res = await fetch(clipUrls[0]);
    const buffer = await res.arrayBuffer();
    const blob = new Blob([buffer], { type: "video/mp4" });
    return {
      blob,
      url: URL.createObjectURL(blob),
      ext: "mp4",
      lossless: true,
      method: "ts_concat",
    };
  }

  const ff = await getFFmpeg(onStatus);

  // 1. Fetch all clips into the virtual FS.
  onStatus?.("Fetching clips…");
  const mp4Names: string[] = [];
  for (let i = 0; i < clipUrls.length; i++) {
    const name = `in-${i.toString().padStart(3, "0")}.mp4`;
    const data = await fetchFile(clipUrls[i]);
    await ff.writeFile(name, data);
    mp4Names.push(name);
    onProgress?.((i + 1) / clipUrls.length * 0.4); // 40% fetch
  }

  // ── PATH A: TS-intermediate concat (lossless, fast) ──
  try {
    onStatus?.("Transmuxing to MPEG-TS…");
    const tsNames: string[] = [];
    for (let i = 0; i < mp4Names.length; i++) {
      const tsName = `int-${i.toString().padStart(3, "0")}.ts`;
      // Per FFmpeg docs: `-bsf:v h264_mp4toannexb` converts mp4-format NALs
      // to annex-B format which is what mpegts container expects. This also
      // standardizes SPS/PPS into the bitstream itself — the key step that
      // fixes the "black frames after first clip" bug.
      await ff.exec([
        "-i", mp4Names[i],
        "-c", "copy",
        "-bsf:v", "h264_mp4toannexb",
        "-an", // strip any audio (we don't ship audio anyway)
        "-f", "mpegts",
        tsName,
      ]);
      tsNames.push(tsName);
      onProgress?.(0.4 + (i + 1) / mp4Names.length * 0.4); // 40-80%
    }

    // 2. Concat the TS files via the concat PROTOCOL (byte-append).
    // Notice: protocol uses pipe separators, not a manifest file.
    onStatus?.("Concatenating + remuxing to MP4…");
    const concatSpec = `concat:${tsNames.join("|")}`;
    await ff.exec([
      "-i", concatSpec,
      "-c", "copy",
      "-fflags", "+genpts",
      "-movflags", "+faststart",
      "out.mp4",
    ]);
    onProgress?.(0.95);

    // 3. Read output.
    onStatus?.("Reading output…");
    const outData = (await ff.readFile("out.mp4")) as Uint8Array;
    if (!outData || outData.byteLength === 0) {
      throw new Error("ts_concat produced empty output");
    }
    const blob = new Blob(
      [outData.buffer.slice(outData.byteOffset, outData.byteOffset + outData.byteLength)],
      { type: "video/mp4" },
    );
    const url = URL.createObjectURL(blob);
    onProgress?.(1);

    // 4. Cleanup.
    try {
      for (const n of mp4Names) await ff.deleteFile(n);
      for (const n of tsNames) await ff.deleteFile(n);
      await ff.deleteFile("out.mp4");
    } catch { /* best-effort */ }

    return { blob, url, ext: "mp4", lossless: true, method: "ts_concat" };
  } catch (tsErr) {
    console.warn("[ffmpeg-stitch] TS-intermediate concat failed, falling back to filter re-encode:", tsErr);
    // Cleanup any partial intermediates before fallback.
    try {
      for (let i = 0; i < clipUrls.length; i++) {
        await ff.deleteFile(`int-${i.toString().padStart(3, "0")}.ts`);
      }
      await ff.deleteFile("out.mp4");
    } catch { /* best-effort */ }
  }

  // ── PATH B: concat filter + libx264 re-encode (fallback) ──
  // Use the concat filter (filter_complex) which handles different SPS/PPS,
  // resolutions, framerates, anything. Re-encodes at CRF 18 which is
  // visually indistinguishable from the source. Slower but reliable.
  onStatus?.("Re-encoding with concat filter (slower, visually lossless)…");
  const filterInputs = mp4Names.flatMap((n) => ["-i", n]);
  const filterSpec = mp4Names
    .map((_, i) => `[${i}:v:0]`)
    .join("") + `concat=n=${mp4Names.length}:v=1:a=0[outv]`;
  await ff.exec([
    ...filterInputs,
    "-filter_complex", filterSpec,
    "-map", "[outv]",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "18",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "out.mp4",
  ]);
  onProgress?.(0.97);

  const outData = (await ff.readFile("out.mp4")) as Uint8Array;
  if (!outData || outData.byteLength === 0) {
    throw new Error("concat filter re-encode produced empty output");
  }
  const blob = new Blob(
    [outData.buffer.slice(outData.byteOffset, outData.byteOffset + outData.byteLength)],
    { type: "video/mp4" },
  );
  const url = URL.createObjectURL(blob);
  onProgress?.(1);

  try {
    for (const n of mp4Names) await ff.deleteFile(n);
    await ff.deleteFile("out.mp4");
  } catch { /* best-effort */ }

  return { blob, url, ext: "mp4", lossless: false, method: "filter_reencode" };
}

/**
 * Check whether the browser environment supports ffmpeg.wasm.
 */
export function ffmpegWasmAvailable(): { ok: boolean; reason?: string } {
  if (typeof SharedArrayBuffer === "undefined") {
    return {
      ok: false,
      reason: "Browser cross-origin isolation not enabled. Hard refresh the page (Cmd-Shift-R / Ctrl-Shift-R) — the COOP/COEP headers should apply on a fresh load.",
    };
  }
  if (typeof WebAssembly === "undefined") {
    return { ok: false, reason: "WebAssembly not supported in this browser." };
  }
  return { ok: true };
}
