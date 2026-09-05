import { fetchFile } from "@ffmpeg/util";
import { getFFmpeg, ffmpegWasmAvailable } from "@/lib/ffmpeg-stitch";
import type { BrandKit } from "@/hooks/useBrandKit";

/**
 * brand-engine — Stage 7 of the pipeline.
 *
 * Burns the agent's Brand Kit end card onto the finished reel, entirely in the
 * browser via ffmpeg.wasm (no server render needed):
 *   1. Draw the end card to a 1080×1920 canvas → PNG
 *   2. Encode that PNG into a short silent clip matching the reel's codec
 *   3. Concat reel + end card
 *
 * FAIL-SAFE: any problem (no SharedArrayBuffer, CDN blocked, odd codec)
 * returns null and the caller ships the unbranded reel. Never blocks delivery.
 */

const W = 1080;
const H = 1920;

/** Load an image (CORS-safe) for canvas drawing. */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundedClipCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
}

/** Render the end card to a PNG blob. */
export async function renderEndCard(kit: BrandKit, listingLine?: string): Promise<Blob | null> {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Background
    ctx.fillStyle = kit.color_secondary || "#1A1714";
    ctx.fillRect(0, 0, W, H);

    // Subtle top/bottom vignette for depth
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "rgba(255,255,255,0.05)");
    grad.addColorStop(0.5, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    let cursorY = H / 2 - 300;

    // Headshot (circular)
    if (kit.headshot_url) {
      const img = await loadImage(kit.headshot_url);
      if (img) {
        const r = 130;
        const cx = W / 2;
        const cy = cursorY + r;
        roundedClipCircle(ctx, cx, cy, r);
        const scale = Math.max((r * 2) / img.width, (r * 2) / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
        ctx.restore();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = kit.color_primary || "#8C3F2E";
        ctx.lineWidth = 6;
        ctx.stroke();
        cursorY = cy + r + 70;
      }
    }

    // Logo
    if (kit.logo_url) {
      const logo = await loadImage(kit.logo_url);
      if (logo) {
        const maxW = 420;
        const scale = Math.min(maxW / logo.width, 160 / logo.height);
        const lw = logo.width * scale;
        const lh = logo.height * scale;
        ctx.drawImage(logo, W / 2 - lw / 2, cursorY, lw, lh);
        cursorY += lh + 60;
      }
    }

    ctx.textAlign = "center";

    // Name
    ctx.fillStyle = "#F4EFE6";
    ctx.font = "600 92px Georgia, 'Times New Roman', serif";
    ctx.fillText(kit.full_name || "", W / 2, cursorY + 40);
    cursorY += 120;

    // Brokerage
    if (kit.brokerage) {
      ctx.fillStyle = kit.color_primary || "#8C3F2E";
      ctx.font = "600 40px Inter, Arial, sans-serif";
      ctx.fillText(kit.brokerage.toUpperCase(), W / 2, cursorY);
      cursorY += 70;
    }

    // Rule
    ctx.strokeStyle = "rgba(244,239,230,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 90, cursorY);
    ctx.lineTo(W / 2 + 90, cursorY);
    ctx.stroke();
    cursorY += 70;

    // Contact block
    ctx.fillStyle = "rgba(244,239,230,0.85)";
    ctx.font = "400 38px 'Courier New', monospace";
    for (const line of [kit.phone, kit.email, kit.website].filter(Boolean)) {
      ctx.fillText(String(line), W / 2, cursorY);
      cursorY += 58;
    }

    // Listing line (optional, small, at the very bottom)
    if (listingLine) {
      ctx.fillStyle = "rgba(244,239,230,0.5)";
      ctx.font = "400 30px Inter, Arial, sans-serif";
      ctx.fillText(listingLine, W / 2, H - 120);
    }

    return await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  } catch {
    return null;
  }
}

/**
 * Append the branded end card to a reel.
 * @returns a Blob of the branded MP4, or null to fall back to the original.
 */
export async function appendEndCard(opts: {
  videoUrl: string;
  kit: BrandKit;
  listingLine?: string;
  seconds?: number;
  onProgress?: (msg: string) => void;
}): Promise<Blob | null> {
  const { videoUrl, kit, listingLine, seconds = 2.5, onProgress } = opts;
  try {
    const avail = ffmpegWasmAvailable();
    if (!avail.ok) return null;

    const card = await renderEndCard(kit, listingLine);
    if (!card) return null;

    onProgress?.("Loading brand engine…");
    const ff = await getFFmpeg((m) => onProgress?.(m));

    onProgress?.("Compositing your brand…");
    await ff.writeFile("reel.mp4", await fetchFile(videoUrl));
    await ff.writeFile("card.png", new Uint8Array(await card.arrayBuffer()));

    // Encode the still into a clip that matches the reel's shape, then concat.
    // Re-encoding both to a common profile avoids concat-demuxer codec
    // mismatches (the classic cause of a black or truncated tail).
    await ff.exec([
      "-i", "reel.mp4",
      "-loop", "1", "-t", String(seconds), "-i", "card.png",
      "-f", "lavfi", "-t", String(seconds), "-i", "anullsrc=channel_layout=stereo:sample_rate=44100",
      "-filter_complex",
      "[0:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v0];" +
      "[1:v]scale=1080:1920,setsar=1,fps=30[v1];" +
      "[v0][0:a?][v1][2:a]concat=n=2:v=1:a=1[v][a]",
      "-map", "[v]", "-map", "[a]",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "23",
      "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      "-c:a", "aac", "-b:a", "128k",
      "out.mp4",
    ]);

    const data = (await ff.readFile("out.mp4")) as Uint8Array;
    if (!data || data.byteLength < 1000) return null;
    onProgress?.("Branded");
    return new Blob([data.slice().buffer as ArrayBuffer], { type: "video/mp4" });
  } catch (e) {
    console.warn("[brand-engine] falling back to unbranded reel:", e);
    return null;
  }
}
