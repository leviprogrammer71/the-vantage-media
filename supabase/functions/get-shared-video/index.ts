import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  try {
    const url = new URL(req.url)
    let submissionId = url.searchParams.get("id")
    
    // Also check body for POST requests
    if (!submissionId && req.method === "POST") {
      try {
        const body = await req.json()
        submissionId = body.id
      } catch {}
    }
    
    if (!submissionId) throw new Error("id required")

    // Fetch public submission
    const { data: sub, error } = await supabase
      .from("submissions")
      .select("*")
      .eq("id", submissionId)
      .eq("is_public", true)
      .eq("status", "delivered")
      .not("output_video_path", "is", null)
      .single()

    if (error || !sub) throw new Error("Not found or not public")

    // Increment view count
    await supabase
      .from("submissions")
      .update({ share_views: (sub.share_views || 0) + 1 })
      .eq("id", submissionId)

    // Sign all asset URLs (24h)
    async function sign(path: string | null) {
      if (!path) return null
      const { data } = await supabase.storage
        .from("project-submissions")
        .createSignedUrl(path, 86400)
      return data?.signedUrl ?? null
    }

    const [videoUrl, beforeUrl, afterUrl] = await Promise.all([
      sign(sub.output_video_path),
      sign(sub.generated_before_image_path ?? sub.before_photo_paths?.[0] ?? null),
      sign(sub.after_photo_paths?.[0] ?? null),
    ])

    return new Response(
      JSON.stringify({
        id: sub.id,
        transformation_type: sub.transformation_type,
        build_type: sub.build_type,
        created_at: sub.created_at,
        video_url: videoUrl,
        before_url: beforeUrl,
        after_url: afterUrl,
        share_views: (sub.share_views || 0) + 1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
