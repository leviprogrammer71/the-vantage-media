/**
 * Normalize any uploaded image into a format OpenAI / OpenRouter / Replicate accept:
 * JPEG, PNG, WebP. HEIC/HEIF photos from iPhones get converted to JPEG client-side.
 *
 * Strategy:
 *  1. Already acceptable? return as-is.
 *  2. Browser can decode it? re-encode via <canvas> to JPEG — fast, no deps.
 *  3. Otherwise lazy-load heic2any for HEIC/HEIF (most common failure case).
 *  4. Still can't decode? throw a clear, user-facing error.
 */

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const HEIC_RX = /\.(heic|heif)$/i;
const HEIC_MIME_RX = /heic|heif/i;

const isHeic = (file: File) =>
  HEIC_MIME_RX.test(file.type) || HEIC_RX.test(file.name);

async function reencodeViaCanvas(file: File, quality = 0.92): Promise<File> {
  return await new Promise<File>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        if (!w || !h) {
          URL.revokeObjectURL(url);
          reject(new Error("Image has no dimensions"));
          return;
        }
        const canvas = document.createElement("canvas");
        // Cap at 4096 on the long edge — OpenRouter has size limits anyway.
        const MAX = 4096;
        const scale = Math.min(1, MAX / Math.max(w, h));
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("Canvas 2D context unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) {
              reject(new Error("Canvas toBlob returned null"));
              return;
            }
            const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
            resolve(new File([blob], newName, { type: "image/jpeg" }));
          },
          "image/jpeg",
          quality
        );
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Browser could not decode the image"));
    };
    img.src = url;
  });
}

async function heic2anyConvert(file: File): Promise<File> {
  // Lazy import so this ~400KB dependency only loads for iPhone HEIC users.
  const mod = (await import("heic2any")).default as (opts: {
    blob: Blob;
    toType?: string;
    quality?: number;
  }) => Promise<Blob | Blob[]>;

  const result = await mod({
    blob: file,
    toType: "image/jpeg",
    quality: 0.9,
  });

  const jpegBlob = Array.isArray(result) ? result[0] : result;
  const newName = file.name.replace(/\.(heic|heif)$/i, "") + ".jpg";
  return new File([jpegBlob], newName, { type: "image/jpeg" });
}

/**
 * Main entry point. Pass any File. Get back a File that's safe to upload.
 *
 * Throws with a clear human-readable message if conversion is impossible.
 */
export async function normalizeImageForUpload(file: File): Promise<File> {
  // Fast path: already OK
  if (ACCEPTED_IMAGE_TYPES.includes(file.type as any) && !isHeic(file)) {
    return file;
  }

  // HEIC/HEIF path — try heic2any first (the browser often can't decode HEIC outside Safari)
  if (isHeic(file)) {
    try {
      return await heic2anyConvert(file);
    } catch (heicErr) {
      // Some newer Chromes can decode HEIC via canvas — try as fallback
      try {
        return await reencodeViaCanvas(file);
      } catch {
        throw new Error(
          `We couldn't convert your HEIC photo. Please re-export it as JPEG from your phone's Photos app and upload again. (${(heicErr as Error).message || "unknown"})`
        );
      }
    }
  }

  // Unknown / unusual format — try canvas re-encoding
  try {
    return await reencodeViaCanvas(file);
  } catch (e) {
    throw new Error(
      `Unsupported image format: ${file.type || "unknown"}. Please use JPEG, PNG, or WebP.`
    );
  }
}

/**
 * Convenience helper for "before I save this file, make sure it's safe"
 * — returns both the normalized File and a boolean indicating whether a conversion happened.
 */
export async function normalizeWithReport(
  file: File
): Promise<{ file: File; converted: boolean; reason?: string }> {
  if (ACCEPTED_IMAGE_TYPES.includes(file.type as any) && !isHeic(file)) {
    return { file, converted: false };
  }
  const reason = isHeic(file)
    ? "Converted HEIC to JPEG for AI compatibility"
    : "Re-encoded to JPEG for AI compatibility";
  const converted = await normalizeImageForUpload(file);
  return { file: converted, converted: true, reason };
}
