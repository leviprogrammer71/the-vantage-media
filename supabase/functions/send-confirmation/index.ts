import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { to_email, first_name, business_name } = await req.json()

    const html = `
<div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 40px 24px; color: #1a1a1a;">
  <h1 style="font-size: 22px; font-weight: 600; margin-bottom: 16px;">Your project is in our hands.</h1>
  <p style="font-size: 16px; line-height: 1.6; margin-bottom: 12px;">
    Thanks ${first_name}, we've received your transformation project for ${business_name}.
  </p>
  <p style="font-size: 16px; line-height: 1.6; margin-bottom: 12px;">
    Our team will review your photos and have your video ready within 5 business days.
  </p>
  <p style="font-size: 16px; line-height: 1.6; margin-bottom: 12px;">
    We'll be in touch if we have any questions.
  </p>
  <p style="font-size: 14px; color: #888; margin-top: 32px;">— The Vantage Team</p>
  <p style="font-size: 12px; color: #aaa;">thevantage.co</p>
</div>`

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "The Vantage <noreply@thevantage.co>",
        to: [to_email],
        subject: "We've received your project — The Vantage",
        html,
      }),
    })

    const data = await res.json()

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
