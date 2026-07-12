import { supabase } from "@/integrations/supabase/client";

export type QAVerdict = "pass" | "review" | "unavailable";

export interface QAResult {
  verdict: QAVerdict;
  score: number;
  issues: string[];
  summary: string;
  source: "claude" | "fallback";
}

/**
 * Grab a few frames from a video URL using a hidden <video> + canvas, returned
 * as downscaled JPEG data URIs.
 *
 * FAIL-SAFE: if the video is cross-origin without CORS (canvas taint), can't
 * load, or anything else goes wrong, resolves to [] rather than throwing — the
 * caller then treats QA as "unavailable", never a false failure.
 */
export function extractVideoFrames(
  videoUrl: string,
  atFractions: number[] = [0.15, 0.5, 0.85],
  maxWidth = 512,
): Promise<string[]> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (frames: string[]) => {
      if (settled) return;
      settled = true;
      try { video.src = ""; } catch { /* noop */ }
      resolve(frames);
    };

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    // Hard timeout so a stalled video never hangs the caller.
    const timeout = setTimeout(() => done([]), 12000);

    const frames: string[] = [];
    let targets: number[] = [];
    let idx = 0;

    const grab = () => {
      try {
        const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
        const w = Math.max(1, Math.round((video.videoWidth || maxWidth) * scale));
        const h = Math.max(1, Math.round((video.videoHeight || maxWidth) * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return done([]);
        ctx.drawImage(video, 0, 0, w, h);
        // toDataURL throws on a tainted canvas → caught below, resolves [].
        frames.push(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        clearTimeout(timeout);
        return done([]);
      }
      idx += 1;
      if (idx >= targets.length) {
        clearTimeout(timeout);
        return done(frames);
      }
      seek(targets[idx]);
    };

    const seek = (t: number) => {
      try { video.currentTime = t; } catch { clearTimeout(timeout); done([]); }
    };

    video.addEventListener("loadedmetadata", () => {
      const dur = isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      if (!dur) { clearTimeout(timeout); return done([]); }
      targets = atFractions.map((f) => Math.min(dur - 0.05, Math.max(0.05, f * dur)));
      seek(targets[0]);
    });
    video.addEventListener("seeked", grab);
    video.addEventListener("error", () => { clearTimeout(timeout); done([]); });

    video.src = videoUrl;
  });
}

/** Call the qa-review edge function on a set of frames. Fail-safe. */
export async function claudeQAFromFrames(
  frameUrls: string[],
  sourcePhotoUrls: string[] = [],
): Promise<QAResult> {
  try {
    if (!frameUrls.length) return { verdict: "unavailable", score: 0, issues: [], summary: "No frames.", source: "fallback" };
    const { data, error } = await supabase.functions.invoke("qa-review", {
      body: { frame_urls: frameUrls, source_photo_urls: sourcePhotoUrls.slice(0, 4) },
    });
    if (error || !data) return { verdict: "unavailable", score: 0, issues: [], summary: "QA unavailable.", source: "fallback" };
    return data as QAResult;
  } catch {
    return { verdict: "unavailable", score: 0, issues: [], summary: "QA unavailable.", source: "fallback" };
  }
}

/** Convenience: extract frames from a finished video and review them. */
export async function claudeReviewVideo(videoUrl: string, sourcePhotoUrls: string[] = []): Promise<QAResult> {
  const frames = await extractVideoFrames(videoUrl);
  return claudeQAFromFrames(frames, sourcePhotoUrls);
}
