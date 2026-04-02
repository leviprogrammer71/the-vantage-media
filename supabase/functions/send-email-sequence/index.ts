import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { type, user_id, email, name, submission_id } = await req.json();

    const fromEmail = "The Vantage <hello@thevantage.co>";

    if (type === "welcome") {
      await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: "Welcome to The Vantage 🎬",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 24px;">
            <h1 style="color: #0A0A0A; font-size: 28px; margin-bottom: 16px;">Welcome aboard${name ? `, ${name}` : ""}!</h1>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              You're all set to turn your transformation projects into viral short-form videos.
            </p>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Here's how it works:
            </p>
            <ol style="color: #555; font-size: 16px; line-height: 1.8;">
              <li>Upload your finished "after" photo</li>
              <li>Our AI reconstructs the before state</li>
              <li>Get a cinematic transformation video in minutes</li>
            </ol>
            <a href="https://thevantage.co/video?mode=transform" style="display: inline-block; background: #F59E0B; color: #000; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; margin-top: 16px;">
              Create Your First Video →
            </a>
            <p style="color: #888; font-size: 12px; margin-top: 32px;">
              The Vantage — thevantage.co
            </p>
          </div>
        `,
      });
    } else if (type === "tips") {
      await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: "3 tips for better transformation videos 📸",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 24px;">
            <h1 style="color: #0A0A0A; font-size: 24px; margin-bottom: 16px;">Get better results 🎯</h1>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">Here are 3 quick tips for amazing transformation videos:</p>
            <div style="margin: 24px 0;">
              <p style="color: #0A0A0A; font-size: 16px; font-weight: bold;">1. Use a well-lit after photo</p>
              <p style="color: #555; font-size: 14px;">Natural daylight gives the best results. Avoid shadows and dark corners.</p>
              <p style="color: #0A0A0A; font-size: 16px; font-weight: bold; margin-top: 16px;">2. Choose the right transformation type</p>
              <p style="color: #555; font-size: 14px;">Matching your project type helps the AI generate a more realistic before state.</p>
              <p style="color: #0A0A0A; font-size: 16px; font-weight: bold; margin-top: 16px;">3. Add a description</p>
              <p style="color: #555; font-size: 14px;">Even a one-liner about what was built helps the AI write a better video prompt.</p>
            </div>
            <a href="https://thevantage.co/video?mode=transform" style="display: inline-block; background: #F59E0B; color: #000; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 8px;">
              Try It Now →
            </a>
            <p style="color: #888; font-size: 12px; margin-top: 32px;">The Vantage — thevantage.co</p>
          </div>
        `,
      });
    } else if (type === "re_engagement") {
      await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: "You haven't created a video yet 👀",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 24px;">
            <h1 style="color: #0A0A0A; font-size: 24px; margin-bottom: 16px;">Your first video is waiting</h1>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              You signed up for The Vantage but haven't created your first transformation video yet.
            </p>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              It takes less than 5 minutes. Just upload an after photo of any project — backyard, kitchen, pool, anything.
            </p>
            <a href="https://thevantage.co/video?mode=transform" style="display: inline-block; background: #F59E0B; color: #000; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 8px; margin-top: 16px;">
              Create Your First Video →
            </a>
            <p style="color: #888; font-size: 12px; margin-top: 32px;">The Vantage — thevantage.co</p>
          </div>
        `,
      });
    } else if (type === "share_milestone") {
      // Fetch submission info
      const { data: sub } = await supabase
        .from("submissions")
        .select("transformation_type, share_views")
        .eq("id", submission_id)
        .single();

      const typeLabel = sub?.transformation_type?.replace(/_/g, " ") || "transformation";
      const views = sub?.share_views || 100;

      await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: `Your ${typeLabel} video hit ${views} views! 🎉`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 24px;">
            <h1 style="color: #0A0A0A; font-size: 24px; margin-bottom: 16px;">🎉 ${views} views!</h1>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              Your <strong>${typeLabel}</strong> transformation video just hit ${views} views on its share page.
            </p>
            <p style="color: #555; font-size: 16px; line-height: 1.6;">
              People are watching your work. Keep the momentum going — create another video to showcase your next project.
            </p>
            <div style="margin: 24px 0;">
              <a href="https://thevantage.co/share/${submission_id}" style="display: inline-block; background: #222; color: #fff; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px; margin-right: 12px;">
                View Share Page
              </a>
              <a href="https://thevantage.co/video?mode=transform" style="display: inline-block; background: #F59E0B; color: #000; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 8px;">
                Create Another Video →
              </a>
            </div>
            <p style="color: #888; font-size: 12px; margin-top: 32px;">The Vantage — thevantage.co</p>
          </div>
        `,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Email send error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
