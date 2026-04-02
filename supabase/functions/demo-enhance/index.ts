import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Professional demo enhancement prompt — shows off the product's capability
const demoPrompt = `You are a professional real estate photo editor creating a demo enhancement for a potential customer. Make this photo look stunning.

ENHANCEMENT TASKS:
1. Dramatically improve overall brightness, exposure, and clarity — the difference should be immediately noticeable
2. Correct white balance to clean, neutral daylight tones
3. If this is an EXTERIOR photo:
   - Replace any dull, overcast, or gray sky with a vivid blue sky with soft white clouds
   - Make the lawn and landscaping look lush, green, and professionally maintained
   - Sharpen architectural details — roof edges, window frames, siding texture
   - Clean up the driveway and walkways
4. If this is an INTERIOR photo:
   - Balance window exposure so exterior views are visible (not blown out white)
   - Lift shadows in dark corners and under furniture
   - Make the space feel bright, airy, and spacious
   - Sharpen architectural details — countertop edges, cabinet hardware, molding
5. Increase micro-contrast on all material textures for tactile realism
6. Ensure colors are rich and accurate without oversaturation

CRITICAL CONSTRAINTS:
- Keep all architectural features exactly the same — no additions or removals
- Maintain realistic, natural appearance — must be believable as a real photograph
- No people, pets, or animals
- No watermarks, text, or graphics
- Must be MLS-compliant and represent the property accurately
- The result should make the viewer think "I need this for my listings"

Output a single, photorealistic, MLS-ready photograph that demonstrates the value of professional photo enhancement.`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Demo enhancement request received");

    // Call OpenRouter with Gemini for image enhancement
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://thevantage.co",
        "X-Title": "The Vantage",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-preview:thinking",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: demoPrompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenRouter API error:", errorText);
      return new Response(
        JSON.stringify({ error: "Enhancement failed", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    console.log("AI response received");

    // Extract enhanced image — handle multiple possible response formats
    const enhancedImageUrl =
      result.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      result.choices?.[0]?.message?.content?.[0]?.image_url?.url;

    if (!enhancedImageUrl) {
      console.error("No image in response:", JSON.stringify(result));
      return new Response(
        JSON.stringify({
          error: "No enhanced image generated",
          // Return original as fallback for demo
          enhancedImageUrl: imageUrl
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        enhancedImageUrl,
        message: "Demo enhancement complete"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Demo enhance error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
