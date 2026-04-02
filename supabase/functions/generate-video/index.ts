import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Video generation models - using Google Veo 3 for cinematic quality
const VIDEO_MODELS = {
  // Standard: WaveSpeed Wan 2.1 Image-to-Video 720p (fast, reliable)
  standard: "wavespeedai/wan-2.1-i2v-720p",
  // Premium: Google Veo 3 (cinematic quality - best for real estate)
  cinematic: "google/veo-3"
};

// Cinematic motion prompt templates for real estate video generation
const MOTION_PROMPTS = {
  // ─── EXTERIOR VIDEO PROMPTS ───
  drone_overview: "Cinematic drone shot rising slowly from street level to 80 feet, revealing the full property and surrounding landscape. Golden hour lighting with long warm shadows stretching across the lawn. The camera starts low and tight on the front facade, then smoothly ascends and pulls back to show the complete lot, roofline, and backyard. Gentle wind sound. Lens flare from the low sun. Photorealistic, no text, no people, no artifacts.",

  curbside_pan: "Smooth steadicam tracking shot moving laterally along the street at walking pace, showcasing the full front facade from left to right. Bright midday sunlight with crisp shadows under eaves. The camera maintains a consistent 30-foot distance from the home, keeping the entire facade in frame as parallax reveals depth between landscaping and the structure. Birds chirping, gentle ambient neighborhood sounds. No people, no text, no distortion.",

  twilight_orbit: "Slow 180-degree orbit around the home exterior during blue hour twilight. Deep indigo sky with warm amber glow at the horizon. Every window glows with warm 3000K interior light spilling onto the front walkway. Landscape lighting illuminates paths and garden beds. The camera moves at a constant arc distance, never jerking or changing speed. Reflections in windows shift naturally as the camera orbits. Ambient evening sounds — crickets, distant wind. No people, no text.",

  front_door_reveal: "Camera begins tight on the front door handle — polished brass catching afternoon sunlight. Then slowly pulls back and rises on a diagonal, revealing the door, then the porch, then the full facade, then the entire front yard and landscaping in one unbroken continuous motion. Clear blue sky fills the top of frame as the camera reaches its apex. The motion accelerates gently as it reveals more, creating anticipation. Wind rustling leaves, distant birdsong. No people, no text.",

  yard_360: "Locked-off 360-degree rotation from center of the front yard at eye level. The camera spins at a steady 72 degrees per second, completing a full revolution. Late afternoon golden light creates warm tones on the facade. As the camera rotates, it reveals: front landscaping, side yard, neighboring context, and returns to the front. Every surface catches different light angles during the rotation. Ambient wind and nature sounds only. No people, no narration, no text.",

  // ─── INTERIOR VIDEO PROMPTS ───
  kitchen_walkthrough: "Steady gimbal walkthrough entering the kitchen from the hallway. Morning sunlight floods through windows, casting geometric light patterns across countertops. The camera glides at counter height, moving past the island, revealing cabinet details, backsplash tile texture, and appliances in a smooth forward dolly. Natural light bounces off polished surfaces. The motion is deliberate and slow — 2 feet per second. Soft ambient sound only. No people, no text, no music.",

  living_room_pan: "Wide-angle steady pan across the living room at seated eye level. Midday sunlight streams through windows creating pools of light on the floor and furniture. The camera moves from left to right in a smooth horizontal sweep, revealing the full depth of the room — seating area, media wall, windows, and architectural details. Subtle depth of field makes near objects slightly soft while the room's far wall stays sharp. Natural room ambience. No people, no text.",

  cozy_evening: "Slow dolly-in through the living room at dusk. Table lamps and sconces are lit, casting overlapping pools of warm amber light. The camera enters from the room's widest point and pushes forward at 1 foot per second toward the main seating area. Shadows deepen in corners while light catches fabric textures on pillows and throws. If a fireplace is visible, warm flickering light dances on nearby surfaces. The atmosphere conveys comfort and homecoming. Gentle crackling fire sound, warm silence. No people, no text.",

  bedroom_showcase: "Smooth dolly shot entering the master bedroom from the doorway. Soft morning light pours through sheer curtains, creating a diffused luminous glow across the bed linens and carpet. The camera moves forward at waist height, revealing the bed, nightstands, and sitting area in sequence. Fabric textures catch the light — plush pillows, crisp sheets, soft carpet. The motion is dreamlike and unhurried, conveying serenity. Gentle ambient silence with distant birdsong. No people, no text.",

  open_concept_flow: "Continuous steadicam walkthrough moving from kitchen to dining area to living room in one unbroken shot. Bright afternoon light fills the space, highlighting the seamless transitions between zones. The camera moves at a natural walking pace, pausing fractionally at each transition point to let the viewer absorb the space. Countertop surfaces, dining table setting, and living room furniture pass by at natural parallax. The shot demonstrates flow and connectivity. Light instrumental ambient sound. No people, no narration, no text.",

  // ─── DEFAULT MOTION STYLES ───
  slow_push: "Slow, cinematic push-in toward the subject at 0.5 feet per second. The camera advances on a perfectly level dolly track, gradually revealing detail and depth. Professional architectural video feel — the kind of motion used in luxury property showcases. Shallow depth of field creates a premium look. Natural ambient sound only. No text, no narration, no people, no artifacts.",

  parallax: "Gentle lateral tracking shot moving left to right at 1 foot per second. Foreground elements (furniture, columns, landscaping) pass by faster than background elements, creating natural parallax depth. The camera maintains perfect level throughout the move. Professional real estate showcase quality. Clean, artifact-free motion. No text, no people.",

  zoom_out: "Elegant slow zoom-out starting tight on an architectural detail and gradually widening to reveal the full space. The zoom is optical-feeling, not a digital crop — the perspective shifts naturally as the field of view expands. Takes 5 seconds to complete the full reveal. The motion creates a satisfying sense of discovery. No text, no people, no distortion.",

  static_ambient: "Nearly static camera with extremely subtle micro-movement — a barely perceptible slow drift of 2-3 pixels that gives the image life without obvious motion. Soft ambient light shifts gently as if clouds are passing outside. The space feels alive and inhabited without any people present. Premium lifestyle atmosphere. No text, no narration, no artifacts."
};

// Default video settings
const DEFAULT_SETTINGS = {
  duration: 5,
  fps: 24,
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_TOKEN");
    if (!REPLICATE_API_KEY) {
      console.error("REPLICATE_API_TOKEN is not configured");
      return new Response(
        JSON.stringify({ error: "Video service not configured. Please add REPLICATE_API_TOKEN." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const replicate = new Replicate({ auth: REPLICATE_API_KEY });

    const body = await req.json();
    const { 
      imageUrl, 
      quality = "standard", // "standard" or "cinematic"
      aspectRatio = "16:9", // "16:9" (MLS) or "9:16" (social)
      motion = "slow_push", // Motion style key
      duration = 5, // 5 or 10 seconds
      sceneType = "exterior", // "exterior" or "interior"
      predictionId // For status checks
    } = body;

    // Handle status check
    if (predictionId) {
      console.log("Checking status for prediction:", predictionId);
      const prediction = await replicate.predictions.get(predictionId);
      console.log("Status:", prediction.status);
      
      return new Response(
        JSON.stringify({
          status: prediction.status,
          output: prediction.output,
          error: prediction.error,
          progress: prediction.logs ? parseProgress(prediction.logs) : null
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate image URL
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting video generation: quality=${quality}, aspectRatio=${aspectRatio}, motion=${motion}, sceneType=${sceneType}`);

    // Get the appropriate motion prompt
    const motionPrompt = MOTION_PROMPTS[motion as keyof typeof MOTION_PROMPTS] || MOTION_PROMPTS.slow_push;
    console.log("Using prompt:", motionPrompt);

    // Prepare input based on model and quality
    let input: Record<string, unknown>;
    const model = quality === "cinematic" ? VIDEO_MODELS.cinematic : VIDEO_MODELS.standard;
    
    console.log("Using model:", model);

    if (quality === "cinematic") {
      // Google Veo 3 - uses different parameters
      input = {
        prompt: motionPrompt,
        image: imageUrl,
        aspect_ratio: aspectRatio,
        duration: duration <= 5 ? 5 : 8, // Veo 3 supports 5 or 8 seconds
      };
    } else {
      // WaveSpeed Wan 2.1 I2V 720p - faster, cheaper
      input = {
        image: imageUrl,
        prompt: motionPrompt,
        max_area: "720x1280",
        duration: duration,
        fast_mode: "Balanced", // Options: Fast, Balanced
        sample_steps: 30,
        sample_guide_scale: 5.0,
        sample_shift: 8.0,
      };
    }

    console.log("Creating prediction with input:", JSON.stringify(input));

    // Create prediction using replicate.run for simpler models or predictions.create for async
    const prediction = await replicate.predictions.create({
      model: model,
      input,
    });

    console.log("Prediction created:", prediction.id);

    return new Response(
      JSON.stringify({
        success: true,
        predictionId: prediction.id,
        status: prediction.status,
        estimatedTime: quality === "cinematic" ? "2-4 minutes" : "1-2 minutes",
        quality,
        aspectRatio,
        motion,
        duration
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Video generation error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Parse progress from logs
function parseProgress(logs: string): number | null {
  const match = logs.match(/(\d+)%/);
  return match ? parseInt(match[1]) : null;
}
