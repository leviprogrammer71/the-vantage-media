import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ──────────────────────────────────────────────────
// UPGRADED PROMPTS — professional real estate photo editing
// Each prompt is engineered for Gemini image generation via OpenRouter
// ──────────────────────────────────────────────────

const presetPrompts: Record<string, string> = {
  // ─── EXTERIOR PRESETS ───

  "clarity-boost": `You are a professional real estate photo editor. Enhance this exterior property photo to MLS-ready quality.

TASKS:
1. Sharpen architectural details — roof edges, window frames, siding texture, brickwork grain — so every material is crisply defined
2. Correct white balance to neutral daylight (5500K–6500K) so whites are true white, not yellow or blue
3. Lift shadow areas under eaves, porches, and overhangs to reveal hidden detail without flattening depth
4. Recover any blown-out highlights on roof or siding surfaces
5. Increase micro-contrast on textures (wood grain, stone, stucco) for tactile realism
6. Gently saturate lawn and landscaping greens to look healthy without neon
7. Ensure the driveway and walkways are clean and well-exposed

OUTPUT: A single photorealistic image that looks like it was shot by a professional architectural photographer with a full-frame camera. Preserve the exact composition, perspective, and all structural elements.`,

  "sky-replacement": `You are a professional real estate photo editor. Replace the sky in this exterior property photo with a beautiful clear day.

TASKS:
1. Replace the existing sky with a vivid blue sky containing soft, natural white cumulus clouds — the kind you see on a perfect spring afternoon
2. Match the sun position and direction to the existing shadow angles in the photo — do NOT change shadow directions
3. Adjust the overall scene lighting to match bright daylight: warm highlights on sun-facing surfaces, cool fill in shadows
4. Add subtle sky reflections on windows and glossy surfaces (if present)
5. Ensure the horizon line and tree/roofline edges are perfectly masked with no fringing or halos
6. Boost lawn and foliage saturation slightly to match the brighter lighting conditions
7. Maintain natural color temperature throughout — no orange cast, no blue cast

OUTPUT: A photorealistic exterior photo that looks like it was taken on a perfect sunny day. The sky replacement must be undetectable. Preserve every architectural detail exactly.`,

  "day-to-dusk": `You are a professional real estate photo editor specializing in twilight conversions. Transform this daytime exterior into a stunning dusk/twilight scene.

TASKS:
1. Replace the sky with a rich twilight gradient — deep navy blue at the zenith transitioning to warm amber/coral at the horizon
2. Turn ON all interior lights visible through windows — warm golden glow (3000K) spilling outward
3. Turn ON all exterior lights — porch lights, landscape lighting, path lights, garage lights — with realistic warm halos
4. Add a subtle warm glow to the home's facade from the interior lights
5. Darken the landscape naturally while keeping key details visible
6. Add soft blue ambient fill to shadow areas (reflecting the twilight sky)
7. If there's a pool, add warm reflected light on the water surface
8. Ensure the overall exposure balances the bright windows against the darkened exterior

OUTPUT: A magazine-quality twilight photo that showcases the home at its most inviting. The warm interior glow contrasting against the cool dusk sky should create emotional appeal. Preserve all architectural details exactly.`,

  "lawn-enhancement": `You are a professional real estate photo editor specializing in curb appeal. Enhance the landscaping and exterior appearance of this property.

TASKS:
1. Transform any patchy, brown, or sparse lawn into lush, healthy, manicured green turf — consistent color without stripes or patches
2. Clean up garden beds — add fresh dark mulch where beds exist, make existing plants look healthy and well-maintained
3. Ensure hedges and shrubs appear neatly trimmed with defined edges
4. Clean the driveway and walkways — remove stains, cracks that look like debris, and discoloration
5. If the house paint appears faded, subtly refresh the color to look newly maintained (same color, just cleaner)
6. Ensure the overall scene looks like the property has been professionally landscaped and maintained
7. Keep all trees, major plantings, and structural elements in their exact positions

OUTPUT: A photorealistic exterior photo that looks like the property just received professional landscaping service. Every change must be believable and natural. Preserve the home's exact architecture and layout.`,

  "declutter": `You are a professional real estate photo editor. Remove all temporary and distracting objects from this exterior photo.

TASKS:
1. Remove all vehicles (cars, trucks, trailers) from the driveway, street, and visible areas
2. Remove trash bins, recycling containers, and waste bags
3. Remove garden hoses, tools, ladders, and construction equipment
4. Remove children's toys, sports equipment, and outdoor furniture that looks cluttered
5. Remove any visible signage (for-sale signs OK to keep if they're the subject)
6. Fill every removed area with a natural continuation of the background — match grass, driveway, landscaping, or street surface seamlessly
7. Ensure lighting and shadows are consistent across all filled areas
8. Clean up any remaining visual distractions (power lines crossing the frame, if possible)

OUTPUT: A clean, photorealistic exterior photo that shows the property at its best without distracting clutter. Every fill must be seamless. Preserve all permanent architectural features exactly.`,

  // ─── INTERIOR PRESETS ───

  "listing-ready": `You are a professional real estate photo editor. Enhance this interior photo to MLS-ready quality.

TASKS:
1. Balance exposure across the entire frame — lift dark corners and underexposed areas while recovering blown highlights near windows
2. Correct white balance to neutral (5000K–5500K) — walls should look their true color, not yellow or blue
3. Sharpen architectural details — crown molding, cabinet hardware, tile grout lines, countertop edges
4. Enhance natural light appearance — make the space feel bright and airy without looking overexposed
5. Correct any visible lens distortion — vertical lines should be vertical, horizontals level
6. Subtly boost the warmth of wood tones (flooring, cabinets) for richness
7. Ensure ceiling areas are clean and evenly lit
8. If visible, make windows show a pleasant exterior view rather than blown-out white

OUTPUT: A professional-quality interior photo that immediately communicates space, light, and livability. The room should look inviting and true-to-life. Preserve the exact layout, furniture, and decor.`,

  "interior-declutter": `You are a professional real estate photo editor. Remove personal clutter from this interior photo to create a clean, staged appearance.

TASKS:
1. Remove personal photographs, children's artwork, and personal memorabilia from walls and surfaces
2. Remove clutter from countertops — excess appliances, mail stacks, keys, bags, random items
3. Remove items from refrigerator doors — magnets, photos, drawings, notes
4. Remove toys, shoes, pet items, laundry, and personal care products visible in the scene
5. Clear excessive items from shelving and mantels — leave 2-3 tasteful decorative items per surface
6. Remove visible cords, cables, and charging stations
7. Fill all cleared surfaces naturally — match the countertop/shelf material, maintain realistic shadows
8. Ensure the room still looks lived-in and warm, not sterile or empty

OUTPUT: A photorealistic interior that looks professionally staged — clean, organized, and showing the space itself rather than the occupant's lifestyle. Every removal must be seamlessly filled. Preserve all architectural features and furniture.`,

  "virtual-staging": `You are a professional virtual staging expert. Furnish this empty or under-furnished room with modern, tasteful furniture and decor.

TASKS:
1. Identify the room type (bedroom, living room, dining room, etc.) and add appropriate furniture
2. Use a cohesive modern-contemporary style — clean lines, neutral palette with 1-2 accent colors
3. Scale all furniture correctly to the room dimensions — pieces should look proportional to the space
4. Place furniture following interior design principles — conversation groupings, traffic flow, focal points
5. Add appropriate soft furnishings — throw pillows, area rugs, curtains — that complement the color palette
6. Include 2-3 tasteful accessories — table lamp, plant, coffee table book, vase
7. Ensure all furniture casts correct shadows matching the room's light direction
8. Respect the room's architectural features — don't block windows, fireplaces, or built-ins
9. Match furniture style to the home's architecture (modern furniture for modern homes, transitional for traditional)

OUTPUT: A photorealistic staged interior that helps buyers envision living in the space. Every piece of furniture must look physically present in the room with correct perspective, scale, shadows, and lighting. Preserve all walls, flooring, windows, and architectural elements exactly.`,

  "color-update": `You are a professional real estate photo editor. Update the color palette of this interior to a modern neutral scheme.

TASKS:
1. Repaint walls to a sophisticated neutral — warm greige, soft white, or light warm gray (avoid stark cold white)
2. Ensure the new wall color looks natural under the room's existing lighting conditions
3. Maintain paint sheen — flat on ceilings, eggshell/satin on walls, semi-gloss on trim
4. Keep trim, baseboards, and crown molding in crisp bright white
5. Adjust shadow tones on walls to match the new color naturally
6. If cabinets appear dated, update to a modern white or soft gray (keeping hardware the same)
7. Maintain all furniture, decor, and flooring as-is — only change wall/cabinet colors

OUTPUT: A photorealistic interior with a fresh, modern color palette that appeals to the widest range of buyers. The new colors must interact naturally with the existing lighting. Preserve all furniture, decor, and architectural details exactly.`,

  "flooring-upgrade": `You are a professional real estate photo editor. Replace the existing flooring with premium light oak hardwood.

TASKS:
1. Replace all visible flooring with wide-plank light oak hardwood in a natural matte finish
2. Match the wood grain direction to the room's longest dimension (standard installation pattern)
3. Ensure plank perspective follows the room's vanishing points correctly
4. Add subtle natural variation in grain pattern — no two planks identical
5. Apply correct reflections/sheen — matte hardwood reflects ambient light softly, not like tile
6. Ensure transitions at doorways and between rooms look natural
7. Cast appropriate shadows from furniture onto the new floor surface
8. Match the floor color temperature to the room's lighting — warm light means slightly warmer wood appearance

OUTPUT: A photorealistic interior with beautiful new hardwood flooring that looks professionally installed. The flooring must follow correct perspective, have natural grain variation, and interact realistically with room lighting. Preserve all furniture, walls, and other elements exactly.`,

  "window-fix": `You are a professional real estate photo editor specializing in HDR window balancing. Fix the exposure difference between interior and window views.

TASKS:
1. Bring interior exposure up to bright, well-lit levels — every corner and surface clearly visible
2. Recover window views — the exterior should be clearly visible through every window, not blown-out white
3. Show realistic exterior content through windows — sky, trees, buildings, yard — whatever is actually there
4. Create a natural-looking transition between the bright interior and the window view
5. Ensure window frames and mullions are crisply defined against the view
6. If curtains or blinds are present, maintain their translucency/opacity realistically
7. Balance color temperature — interior lighting may be warm while exterior daylight is cooler; blend naturally
8. The final result should look like a single exposure from a professional camera, not an obvious HDR composite

OUTPUT: A single photorealistic interior photo with perfectly balanced exposure — bright inviting interior AND visible attractive window views. This should look like professional architectural photography. Preserve all furniture, decor, and layout exactly.`,

  "lighting-boost": `You are a professional real estate photo editor. Dramatically improve the interior lighting to make this space feel bright and inviting.

TASKS:
1. Simulate bright natural daylight flooding through all windows — lift the overall exposure significantly
2. Open up shadow areas under furniture, in corners, and behind objects without creating flat, shadowless look
3. Maintain a natural light falloff — areas near windows brighter than far walls, creating depth
4. If ceiling fixtures are visible, simulate them being ON with warm light halos
5. Enhance the sense of spaciousness through brightness — well-lit rooms feel larger
6. Preserve window detail and exterior views while boosting interior brightness
7. Ensure white walls look bright white, not gray or muddy
8. Keep color accuracy — boosting light should not shift colors toward yellow or blue

OUTPUT: A photorealistic interior that feels like it's bathed in natural light on a sunny day. The space should feel open, airy, and welcoming. Preserve all furniture, decor, and architectural details exactly.`,

  "warm-inviting": `You are a professional real estate photo editor. Transform this interior to feel warm, cozy, and inviting for an evening ambiance.

TASKS:
1. Shift the overall color temperature warmer (toward 3500K–4000K) — golden, honey tones throughout
2. Simulate warm lamp light and fixture light throughout the room — each light source casting a soft warm glow
3. If a fireplace is present, add a gentle warm fire with realistic light cast on nearby surfaces
4. Deepen shadows slightly for a cozy contrast between light pools and darker areas
5. Add subtle warm highlights on reflective surfaces — glass, polished wood, metal fixtures
6. Ensure fabric textures (pillows, throws, upholstery) look soft and inviting under warm light
7. If windows are visible, show a dark blue twilight or evening sky outside
8. The mood should evoke "coming home" — comfortable, secure, welcoming

OUTPUT: A photorealistic interior that makes buyers feel they've found their dream home. The warm lighting creates an emotional response of comfort and belonging. Preserve all furniture, decor, and architectural details exactly.`,

  // ─── LEGACY PRESETS (backward compatibility) ───

  "exterior-enhancement": `You are a professional real estate photo editor. Enhance this exterior property photo to MLS-ready quality. Sharpen architectural details, correct white balance to neutral daylight, lift shadows under eaves and porches, recover blown highlights, increase micro-contrast on textures, and gently saturate landscaping. The result should look like professional architectural photography. Preserve the exact composition, perspective, and all structural elements.`,

  "interior-enhancement": `You are a professional real estate photo editor. Enhance this interior photo to MLS-ready quality. Balance exposure across the frame, correct white balance, sharpen architectural details, enhance natural light, and ensure the space feels bright and inviting. Preserve the exact layout, furniture, and decor.`,

  "fireplace-fire": `You are a professional real estate photo editor. Add a realistic, warm fire to the fireplace in this photo.

TASKS:
1. Add natural-looking flames with varied heights — taller at center, shorter at edges
2. Include realistic glowing embers at the base of the fire
3. Cast warm orange-gold light from the fire onto the hearth, mantel, and nearby surfaces
4. Add subtle warm light bounce on the ceiling above the fireplace
5. The fire should look clean-burning with a natural flame color gradient (blue base, orange-gold upper)
6. Ensure the flame brightness is appropriate for the room's ambient lighting
7. No visible smoke inside the room

OUTPUT: A photorealistic interior with a cozy, inviting fireplace fire that enhances the room's appeal. Preserve everything else exactly.`,

  "tv-screen": `You are a professional real estate photo editor. Replace the TV screen content with an attractive, non-distracting image.

TASKS:
1. Replace the screen with a tasteful abstract art piece or calming nature scene (mountain landscape, ocean horizon, or minimalist art)
2. Match the screen content to the TV's exact perspective and viewing angle
3. Apply appropriate screen brightness relative to room lighting — not too bright, not too dim
4. Add subtle screen bezels/frame reflection if the TV has a glossy screen
5. The content should complement the room's decor style and color palette

OUTPUT: A photorealistic interior where the TV displays attractive content that enhances rather than distracts from the room. Preserve everything else exactly.`,
};

// Interior presets list for category detection
const interiorPresets = [
  "listing-ready", "enhance-interior", "lighting-boost", "warm-inviting",
  "bright-airy", "neutral-clean", "declutter", "window-fix", "stage-interior",
  "virtual-staging", "interior-enhancement", "fireplace-fire", "tv-screen",
  "interior-declutter", "color-update", "flooring-upgrade",
];

// Universal safety instructions appended to all prompts
const universalSafetyInstructions = `

CRITICAL REQUIREMENTS — MUST FOLLOW:
- Output a single photorealistic image — it must be indistinguishable from a real photograph
- Preserve the EXACT architectural structure: walls, windows, doors, rooflines, room layout — no additions, no removals
- Preserve the EXACT camera angle, lens perspective, and composition
- All lighting changes must be physically plausible — shadows match light sources, reflections match surfaces
- NO artistic filters, painterly effects, HDR halos, or surreal exaggeration
- NO watermarks, text, logos, or graphics of any kind
- NO people, pets, or animals in the final image
- NO hallucinated objects, rooms, or architectural features that don't exist in the original
- Color accuracy: materials should look like their real-world counterparts
- The final image must pass "The Buyer Test": what buyers see online must match what they see in person
- MLS compliant: the enhancement must represent the property accurately`;

function constructPrompt(preset: string): string {
  const basePrompt = presetPrompts[preset] || presetPrompts["sky-replacement"];
  return `${basePrompt}${universalSafetyInstructions}`;
}

async function uploadBase64ToStorage(
  supabase: any,
  base64Data: string,
  userId: string,
  enhancementId: string
): Promise<string> {
  // Remove the data:image/png;base64, prefix if present
  const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');

  // Convert base64 to Uint8Array
  const binaryString = atob(base64Clean);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const fileName = `enhanced/${userId}/${enhancementId}-${Date.now()}.png`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('property-photos')
    .upload(fileName, bytes, {
      contentType: 'image/png',
      upsert: true
    });

  if (uploadError) {
    console.error("Error uploading enhanced image:", uploadError);
    throw new Error("Failed to upload enhanced image");
  }

  // Get public URL for the uploaded image (permanent, never expires)
  const { data: publicUrlData } = supabase.storage
    .from('property-photos')
    .getPublicUrl(fileName);

  return publicUrlData?.publicUrl || '';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    if (!OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY is not configured");
      throw new Error("OPENROUTER_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the user's JWT token
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { imageUrl, preset } = body;

    // Handle new enhancement request
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required field: imageUrl" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check user credits
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("credits_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile error:", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!profile || profile.credits_balance < 1) {
      return new Response(
        JSON.stringify({
          error: "Insufficient credits",
          creditsNeeded: 1,
          creditsAvailable: profile?.credits_balance || 0,
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get preset settings
    const selectedPreset = preset || "sky-replacement";
    const fullPrompt = constructPrompt(selectedPreset);

    console.log("Using preset:", selectedPreset);
    console.log("Prompt length:", fullPrompt.length);
    console.log("Image URL:", imageUrl);

    // Create enhancement record first to get ID
    const { data: enhancement, error: insertError } = await supabase
      .from("enhancements")
      .insert({
        user_id: user.id,
        original_image_url: imageUrl,
        preset_used: selectedPreset,
        toggles_used: {},
        credits_used: 1,
        status: "processing",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating enhancement record:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create enhancement record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Deduct credit
    const { error: creditError } = await supabase
      .from("profiles")
      .update({ credits_balance: profile.credits_balance - 1 })
      .eq("user_id", user.id);

    if (creditError) {
      console.error("Error deducting credit:", creditError);
    }

    // Call OpenRouter with Gemini for image editing
    console.log("Calling OpenRouter with Gemini model...");

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
              {
                type: "text",
                text: fullPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("OpenRouter API error:", aiResponse.status, errorText);

      // Refund credit on failure
      await supabase.rpc("increment_credits", {
        p_user_id: user.id,
        p_amount: 1,
      });

      // Update enhancement record
      await supabase
        .from("enhancements")
        .update({
          status: "failed",
          error_message: `AI API error: ${aiResponse.status}`,
        })
        .eq("id", enhancement.id);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service payment required." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to enhance image", details: errorText }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiResult = await aiResponse.json();
    console.log("AI Response received");

    // Extract the generated image from the response
    // OpenRouter Gemini image response format
    const generatedImageBase64 =
      aiResult.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      aiResult.choices?.[0]?.message?.content?.[0]?.image_url?.url;

    if (!generatedImageBase64) {
      console.error("No image in AI response:", JSON.stringify(aiResult));

      // Refund credit
      await supabase.rpc("increment_credits", {
        p_user_id: user.id,
        p_amount: 1,
      });

      // Update enhancement record
      await supabase
        .from("enhancements")
        .update({
          status: "failed",
          error_message: "No image generated by AI",
        })
        .eq("id", enhancement.id);

      return new Response(
        JSON.stringify({ error: "No image generated" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Upload the base64 image to storage
    let enhancedImageUrl: string;
    try {
      enhancedImageUrl = await uploadBase64ToStorage(
        supabase,
        generatedImageBase64,
        user.id,
        enhancement.id
      );
      console.log("Enhanced image uploaded:", enhancedImageUrl);
    } catch (uploadError) {
      console.error("Failed to upload enhanced image:", uploadError);

      // Refund credit
      await supabase.rpc("increment_credits", {
        p_user_id: user.id,
        p_amount: 1,
      });

      // Update enhancement record
      await supabase
        .from("enhancements")
        .update({
          status: "failed",
          error_message: "Failed to save enhanced image",
        })
        .eq("id", enhancement.id);

      return new Response(
        JSON.stringify({ error: "Failed to save enhanced image" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update enhancement record with result
    const { error: updateError } = await supabase
      .from("enhancements")
      .update({
        enhanced_image_url: enhancedImageUrl,
        status: "completed",
      })
      .eq("id", enhancement.id);

    if (updateError) {
      console.error("Error updating enhancement:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "completed",
        enhancementId: enhancement.id,
        imageUrl: enhancedImageUrl,
        newCreditsBalance: profile.credits_balance - 1,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in enhance-photo function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
