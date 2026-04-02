import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { websiteUrl } = await req.json();
    if (!websiteUrl) {
      return new Response(JSON.stringify({ error: "Website URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Analyzing website: ${websiteUrl} for user: ${user.id}`);

    // Create consultation record
    const { data: consultation, error: insertError } = await supabaseClient
      .from("website_consultations")
      .insert({
        user_id: user.id,
        website_url: websiteUrl,
        status: "processing"
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("Failed to create consultation record");
    }

    // Use OpenRouter AI for analysis
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    const prompt = `You are an expert real estate website consultant. Analyze the following website URL and provide a comprehensive consultation report.

Website URL: ${websiteUrl}

Please provide a detailed analysis in the following JSON format:
{
  "overallScore": <number 0-100>,
  "summary": "<brief 2-3 sentence summary of the website's strengths and weaknesses>",
  "categories": [
    {
      "name": "SEO & Discoverability",
      "score": <number 0-100>,
      "findings": ["<finding 1>", "<finding 2>"],
      "recommendations": ["<recommendation 1>", "<recommendation 2>"]
    },
    {
      "name": "Lead Generation",
      "score": <number 0-100>,
      "findings": ["<finding 1>", "<finding 2>"],
      "recommendations": ["<recommendation 1>", "<recommendation 2>"]
    },
    {
      "name": "User Experience",
      "score": <number 0-100>,
      "findings": ["<finding 1>", "<finding 2>"],
      "recommendations": ["<recommendation 1>", "<recommendation 2>"]
    },
    {
      "name": "Visual Appeal & Photography",
      "score": <number 0-100>,
      "findings": ["<finding 1>", "<finding 2>"],
      "recommendations": ["<recommendation 1>", "<recommendation 2>"]
    }
  ],
  "quickWins": [
    "<easy to implement improvement 1>",
    "<easy to implement improvement 2>",
    "<easy to implement improvement 3>"
  ],
  "longTermStrategies": [
    "<strategic improvement 1>",
    "<strategic improvement 2>",
    "<strategic improvement 3>"
  ]
}

Focus on:
1. SEO best practices for real estate websites
2. Lead capture and conversion optimization
3. Property listing presentation
4. Mobile responsiveness
5. Trust signals and credibility
6. Photography and visual quality recommendations

Be specific and actionable in your recommendations. Provide real, practical advice that a real estate professional can implement.

IMPORTANT: Return ONLY the JSON object, no additional text or markdown.`;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://thevantage.co",
        "X-Title": "The Vantage",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-preview:thinking",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter AI error:", errorText);
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("AI credits exhausted. Please add credits to continue.");
      }
      throw new Error("Failed to analyze website");
    }

    const aiResponse = await response.json();
    console.log("AI Response:", JSON.stringify(aiResponse, null, 2));

    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let report;
    try {
      // Remove any markdown code blocks if present
      let cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
      
      // Fix common JSON issues: trailing commas before ] or }
      cleanContent = cleanContent.replace(/,\s*]/g, "]").replace(/,\s*}/g, "}");
      
      // Try to extract JSON object if there's extra text
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }
      
      report = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Parse error:", parseError, "Content:", content);
      // Return a fallback report structure
      report = {
        overallScore: 50,
        summary: "We were unable to fully analyze this website. Please try again or contact support.",
        categories: [],
        quickWins: ["Try running the analysis again"],
        longTermStrategies: ["Contact support if the issue persists"]
      };
    }

    // Update consultation record with report
    const { error: updateError } = await supabaseClient
      .from("website_consultations")
      .update({
        consultation_report: report,
        status: "completed"
      })
      .eq("id", consultation.id);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    return new Response(
      JSON.stringify({ report }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
