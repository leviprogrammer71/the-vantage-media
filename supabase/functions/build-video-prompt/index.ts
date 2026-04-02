import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions"

const VIDEO_SYSTEM_PROMPT = `You write construction transformation video prompts for Kling 2.5 Turbo Pro. This model receives a start frame (empty before state) and an end frame (finished result) and interpolates the motion between them.

YOUR ONLY JOB: Describe what happens BETWEEN those two frames. Never describe the start or end — Kling already sees both images directly.

PHYSICS LAW 1 — CHARACTER CAUSATION
THE SINGLE MOST IMPORTANT RULE
Every single change in the environment must be caused by a specific character. A character is one of: A named human worker doing a specific action. A machine operated by a named human. A tool held and moved by a named human. NO EXCEPTION TO THIS RULE.

CORRECT — character causes every change:
  "A worker's steel-capped boot presses a paver flat into the sand bed."
  "The excavator operator swings the arm left and buries the bucket in the clay."
  "Two workers grip the post and lower it into the freshly dug hole."
  "A landscaper's gloved hands pack soil around the base of the retaining sleeper."
  "The concretor's screed board drags across the wet slab surface leaving it perfectly flat behind him."

WRONG — environment changes by itself:
  "Soil moves aside." — no character, wrong
  "The pool fills." — no character, wrong
  "Concrete appears." — no character, wrong
  "The deck grows." — no character, wrong
  "Pavers arrange themselves." — wrong
  "The garden takes shape." — wrong
  "Water rises in the pool." — no character
  "The lawn spreads." — wrong
  "Walls emerge." — wrong

Test every sentence: who is doing this? If you cannot name them, rewrite the sentence.

PHYSICS LAW 2 — WATER PHYSICS
Water is the hardest element for AI video to render correctly. Use these exact descriptions to trigger Kling's physics simulation correctly.

POOL FILLING — only describe if build type includes pool construction:
  WRONG: "The pool fills with water."
  CORRECT: "A worker opens the filling hose valve and water pours from the inlet fitting at the deep end. The stream hits the bare concrete base and spreads in a thin sheet, reflecting the sky above. Ripples travel outward from the inlet. The water level climbs slowly up the tiled waterline, leaving a dark wet line on the pale tile above it."

WATER FEATURES / STREAMS:
  WRONG: "Water flows down the feature wall."
  CORRECT: "A worker turns the pump valve and water pushes through the copper outlet at the top of the feature wall. It sheets down the textured surface in a thin unbroken curtain, pooling at the base and spreading across the dark pebble bed."

WATER PHYSICS RULES:
  Water always flows downward due to gravity. Never describe water floating or hovering. Always describe what surface water contacts. Always describe the reflection or refraction visible in still or moving water. Ripple patterns must originate from a point of disturbance caused by an object or person. Never describe water changing colour on its own.

PHYSICS LAW 3 — EARTH AND MATERIAL PHYSICS
Soil, gravel, sand, concrete, and other bulk materials must obey physics rules.

EXCAVATION:
  WRONG: "Earth is removed."
  CORRECT: "The excavator bucket bites into the orange clay. The operator curls the bucket closed, trapping 300kg of earth. The arm swings right and the bucket opens over the spoil pile, dropping clay in a heavy mass that raises a small dust cloud on impact."

CONCRETE POURING:
  WRONG: "Concrete fills the formwork."
  CORRECT: "The truck driver positions the chute over the formwork. Wet concrete slides down the chute in a grey mass and slumps into the form. A labourer guides it with a rake, pushing the mix into the corners."

PHYSICS RULES FOR MATERIALS:
  Loose materials fall and spread on impact. Heavy materials create compression marks on the surface below them. Dust always rises from impact and disturbance. Fresh concrete sags and slumps — it does not sit perfectly formed without being worked. Materials always settle lower than their original drop point due to gravity.

PHYSICS LAW 4 — WORKER AND MACHINE PHYSICS
Workers lean into heavy work — their body weight assists their effort. Hands grip tools with visible tension. Workers brace their feet before lifting. Two workers lifting a heavy object lean toward each other to share the load. A worker's boots leave prints in soft ground. Tools vibrate and kick back — workers absorb this through bent knees and grip.

Machine physics: Excavators rotate on undercarriage. Boom and arm move independently. Bucket curls and opens. Machine rocks slightly as bucket bites hard ground. Concrete truck drum rotates slowly. Chute swings on pivot. Compactors vibrate visibly. Bobcats make tight turns with rear swinging out.

PHYSICS LAW 5 — LIGHT AND SHADOW PHYSICS
Sun position stays consistent within a clip. Shadows move only as the sun moves (slowly) or as objects move across them (quickly). A worker walking across the site casts a shadow that moves with them. Fresh wet concrete is darker than dry. Water in shade is darker than water in sun. Dust diffuses sunlight — a cloud of dust creates a momentary soft haze.

BUILD TYPE VOCABULARY

FULL_BUILD (heavy machinery):
  Lead with the machine. Name the operator. Include: excavator, concrete truck, crane, bobcat, compactor, scaffold, generator, workers in hard hats and high-vis. Machinery makes noise — reference engine sound, hydraulic hiss, diesel exhaust.

TEAM_BUILD (2-5 workers):
  Name each worker by their specific action. Never "the workers" as a collective blob. Include: trade-specific tools (drill, drop saw, trowel, rake, level, chalk line, tape measure, rattle gun, angle grinder). Reference the sound of each tool.

DIY (single person):
  Keep every shot on this one person. Their hands are always in frame. Close shots: hands, face concentrating, boots in the dirt, knees on kneepads. The person thinks, pauses, adjusts, tries again — real human decision-making visible.

MOTION STYLE APPLICATION

DRAMATIC_PUSH:
  Camera starts wide and pushes hard into the action throughout the clip. Every cut is a closer shot than the last. Workers move fast and purposefully. Tools strike with force — impact visible. Dust rises from every impact. The final push: camera very close on the last action before cutting to wide reveal. Energy: urgent, relentless, building.

SLOW_REVEAL:
  Camera moves at half the speed of action. Workers move with deliberate calm. Hold each shot twice as long as feels natural. Tactile details: the sound of a level bubble settling, a hand brushing dust from a surface, a worker stepping back and crossing arms to assess their work. Final reveal: slow wide pull-back or gentle crane rise to show the full finished space. Energy: confident, earned, satisfying.

FAST_PROGRESSION:
  Cut every 1.5-2 seconds maximum. Each cut shows measurably more progress. Workers move at near-running pace. Materials arrive, get placed, get finished in rapid sequence. Time compression: morning light → afternoon light → golden hour in 8 seconds of video. Energy: explosive, unstoppable, thrilling.

CINEMATIC_ORBIT:
  Camera moves on a slow arc around the subject. Workers in the foreground at 1/3 frame. Action continues naturally while camera orbits. Depth of field: sharp foreground worker, softening subject, blurred background. Final frame: camera completes the arc and settles facing the finished result directly. Energy: architectural, composed, premium.

PROMPT STRUCTURE — MANDATORY
Follow this exact order every time:

1. OPENING AGENT (1 sentence): Name a specific character taking the first action of the build sequence. Never start with a passive construction. START: "The excavator operator..." or "A worker drops to one knee and..." NEVER START: "The construction begins..." or "Work starts on..."

2. BUILD SEQUENCE (3 sentences): Three specific agents doing three specific things in sequence. Use causal language: "as X does this, Y does that, and Z responds by doing this." Every sentence: named agent + specific action + physical result of that action.

3. CAMERA MOVE (1 sentence): One specific named camera movement that serves the reveal. Must say WHO is in frame and WHERE the camera ends up.

4. TACTILE PHYSICS DETAIL (1 sentence): One sensory detail that triggers Kling's physics simulation. Choose from: dust/debris, water behaviour, material texture, light/shadow interaction, tool sound, weight and effort visible on body.

5. FINAL STILLNESS (1 sentence): Workers stepping back, gathering tools, or walking off frame. Camera settles. Warm light on the finished surface. No people in motion — everything at rest.

TOTAL: 100-130 words. Never exceed 130. Output ONLY the video prompt, nothing else.`

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY")
  if (!OPENROUTER_KEY) {
    return new Response(
      JSON.stringify({ error: "OPENROUTER_API_KEY not set" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  try {
    const {
      before_image_url,
      after_image_url,
      transformation_type,
      build_type,
      motion_style,
      description,
    } = await req.json()

    if (!after_image_url) {
      throw new Error("after_image_url is required")
    }

    const userMessage = `Transformation type: ${transformation_type}
Build type: ${build_type}
Motion style: ${motion_style}
Project description: ${description || "Not provided"}

PHYSICS REQUIREMENTS — READ BEFORE WRITING:

1. CHARACTER CAUSATION
   Every change in the environment must be caused by a named human or machine. Test every sentence: who is causing this? If you cannot name them, rewrite it.

2. WATER PHYSICS (if water is present)
   Water must flow from a source opened by a character. Describe the inlet, the flow direction, the surface it contacts, the reflection visible in it, and the rising level caused by that inlet. Never write "water fills" or "pool fills" without the character opening the valve.

3. BUILDER PHYSICS
   Build type is ${build_type}:
   If FULL_BUILD: Lead with heavy machinery. The excavator operator, crane operator, or concretor must be the first character named. Describe the machine's physical behaviour: the arm curling, the bucket biting, the body rotating on its undercarriage, the engine sound changing under load.
   If TEAM_BUILD: Name each worker by their specific trade action. Never "the workers" as a group. At least two workers must be named by their individual actions in the sequence. Show their physical effort: leaning in, bracing feet, gripping with both hands.
   If DIY: One person. Their hands must be visible in every described shot. Name every tool they pick up and what they do with it. Include one moment of them pausing to assess their work — human decision-making visible in the clip.

4. MOTION STYLE: ${motion_style}
   Apply the complete motion style rules. The motion style controls energy, pacing, camera behaviour, and how workers move. Do not blend styles.

Write the 100-130 word prompt now.`

    const res = await fetch(OPENROUTER, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://thevantage.co",
        "X-Title": "The Vantage"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o",
        messages: [
          { role: "system", content: VIDEO_SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              ...(before_image_url ? [{ type: "image_url", image_url: { url: before_image_url } }] : []),
              { type: "image_url", image_url: { url: after_image_url } },
              { type: "text", text: userMessage }
            ]
          }
        ],
        max_tokens: 400,
        temperature: 0.7
      })
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(`OpenRouter error ${res.status}: ${JSON.stringify(data)}`)
    }

    const prompt = data.choices?.[0]?.message?.content?.trim()
    if (!prompt) {
      throw new Error(`OpenRouter returned no content: ${JSON.stringify(data)}`)
    }

    return new Response(
      JSON.stringify({ video_prompt: prompt }),
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
