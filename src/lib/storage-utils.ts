import { supabase } from "@/integrations/supabase/client";

/**
 * Converts a signed storage URL to a public URL.
 * This is needed because the database stores signed URLs that expire,
 * but the bucket is now public, so we can use the public URL directly.
 */
export function getPublicStorageUrl(signedUrl: string | null): string | null {
  if (!signedUrl) return null;

  try {
    const url = new URL(signedUrl);
    
    // Check if this is a Supabase storage URL
    if (!url.pathname.includes('/storage/v1/object/')) {
      return signedUrl; // Not a Supabase storage URL, return as-is
    }

    // Extract the bucket name and file path from either signed or public URLs
    // Signed URL format: /storage/v1/object/sign/bucket-name/path/to/file?token=...
    // Public URL format: /storage/v1/object/public/bucket-name/path/to/file
    
    let bucketAndPath: string;
    
    if (url.pathname.includes('/storage/v1/object/sign/')) {
      // Extract from signed URL
      bucketAndPath = url.pathname.replace('/storage/v1/object/sign/', '');
    } else if (url.pathname.includes('/storage/v1/object/public/')) {
      // Already a public URL
      return signedUrl;
    } else {
      return signedUrl;
    }

    // Construct the public URL
    const publicUrl = `${url.origin}/storage/v1/object/public/${bucketAndPath}`;
    return publicUrl;
  } catch (error) {
    console.error('Error parsing storage URL:', error);
    return signedUrl; // Return original on error
  }
}

/**
 * Gets a public URL for a file in a storage bucket.
 */
export function getStoragePublicUrl(bucket: string, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
