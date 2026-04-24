import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
}

const REPLICATE = "https://api.replicate.com/v1"
const OPENROUTER = "https://openrouter.ai/api/v1/chat/completions"

async function fetchImageAsBase64(url: string): Promise<string> {
  console.log(`[fetchImageAsBase64] fetching ${url.slice(0, 100)}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Failed to fetch image (${res.status}): ${url.slice(0, 120)}`)
  const buffer = await res.arrayBuffer()
  const b64 = base64Encode(new Uint8Array(buffer))
  const ct = res.headers.get("content-type") || "image/jpeg"
  const mime = ct.split(";")[0].trim()
  console.log(`[fetchImageAsBase64] ok, ${buffer.byteLength} bytes, mime=${mime}`)
  return `data:${mime};base64,${b64}`
}

async function callAI(
  systemPrompt: string,
  userText: string,
  imageUrls: string[] = []
): Promise<string> {
  const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY")
  if (!OPENROUTER_KEY) throw new Error("OPENROUTER_API_KEY not set")

  let userContent: any
  if (imageUrls.length > 0) {
    const parts: any[] = []
    for (const url of imageUrls) {
      // Convert to base64 data URL so OpenRouter/Azure can read the format
      const dataUrl = await fetchImageAsBase64(url)
      parts.push({ type: "image_url", image_url: { url: dataUrl } })
    }
    parts.push({ type: "text", text: userText })
    userContent = parts
  } else {
    userContent = userText
  }

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
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent }
      ],
      max_tokens: 600,
      temperature: 0.7
    })
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(`OpenRouter error ${res.status}: ${JSON.stringify(data)}`)
  }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) {
    throw new Error(`OpenRouter returned no content: ${JSON.stringify(data)}`)
  }
  return text
}

async function pollReplicate(
  predictionId: string,
  maxAttempts = 60
): Promise<string> {
  const TOKEN = Deno.env.get("REPLICATE_API_TOKEN")!
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 3000))
    const res = await fetch(
      `${REPLICATE}/predictions/${predictionId}`,
      { headers: { Authorization: `Token ${TOKEN}` } }
    )
    const data = await res.json()
    if (data.status === "succeeded") {
      if (typeof data.output === "string") return data.output
      if (Array.isArray(data.output)) return data.output[0]
      throw new Error("Unexpected Replicate output format")
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(data.error || "Replicate prediction failed")
    }
  }
  throw new Error("Replicate prediction timed out")
}

async function runFlux(
  token: string,
  prompt: string,
  aspectRatio = "9:16",
  inputImageUrl?: string
): Promise<string> {
  const input: Record<string, any> = {
    prompt,
    aspect_ratio: aspectRatio,
    output_format: "jpg",
    output_quality: 95,
    safety_tolerance: 2,
  }

  // Pass after photo as reference so FLUX sees the actual space and perspective
  if (inputImageUrl) {
    input.input_image = inputImageUrl
  }

  const res = await fetch(
    `${REPLICATE}/models/black-forest-labs/flux-kontext-pro/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({ input }),
    }
  )

  const prediction = await res.json()
  if (!res.ok || !prediction.id) {
    throw new Error(`FLUX failed: ${JSON.stringify(prediction)}`)
  }

  if (prediction.status === "succeeded") {
    return Array.isArray(prediction.output)
      ? prediction.output[0]
      : prediction.output
  }

  return await pollReplicate(prediction.id)
}

// ── Prompt templates ──

// ── CONSTRUCTION PROMPTS (existing) ──

const FLUX_SYSTEM_PROMPT = `You write image editing instructions for FLUX Kontext Pro in image-to-image mode. You receive a finished transformation photo and write an instruction to strip it back to the most extreme raw empty state possible before any work ever began.

THE GOLDEN RULE OF BEFORE IMAGES
The before image must be SO DIFFERENT from the after photo that a viewer looking at both side by side immediately understands the full magnitude of the transformation.
If the after shows a beautiful pool and deck: Before shows bare cracked clay earth with tufts of dead grass and builder rubble. No pool. No deck. No paving. Nothing.
If the after shows a finished kitchen: Before shows raw stud walls, exposed wiring, concrete subfloor, dust sheets, no cabinetry, bare bulb hanging from ceiling.
If the after shows a landscaped garden: Before shows compacted bare dirt, a rusted corrugated fence, weeds along the edges, a pile of broken terracotta from demolition.
If the after shows a finished building: Before shows an empty block of land with survey pegs, a portaloo in the corner, churned mud from machinery, no structure.
The viewer must feel the before is hopeless and the after is miraculous. That contrast is the entire emotional engine of the video.

DISTANCE AND PERSPECTIVE RULE
The before image must pull the perspective back by 10-15% compared to the after photo. More sky. More surrounding context. More empty ground around the edges. The space should feel bigger and emptier.

WHAT TO REMOVE — BE EXHAUSTIVE
Remove every single finished element: All structures, water features, landscaping, hard surfaces, lighting, furniture, finishes.

WHAT TO ADD — SIGNS OF A BLANK SLATE
Replace everything removed with authentic pre-construction evidence: cracked dry clay earth, compacted builder's rubble, churned muddy soil, patchy dead grass, bare clay subsoil, scattered demolition debris. Add sparingly: survey pegs, skip bin, portaloo, temporary fencing. Harsh flat midday light, overcast sky.

WHAT TO KEEP — CONTINUITY ANCHORS
Same camera angle and elevation. Same compass direction. Same background structures that predate construction. Same sky colour temperature. Same basic spatial proportions.

INSTRUCTION FORMAT
Start with exactly: "Transform this finished photo to show the same location BEFORE any construction began."
Then list removals, replacement ground state, distance pull, atmosphere, continuity.
Length: 80-100 words maximum. Output ONLY the instruction.`

function getFluxUserPrompt(transformation_type: string, _build_type: string, _project_description: string) {
  return `Analyze this finished after photo carefully. Identify every finished element present: structures, surfaces, water features, landscaping, lighting, furniture, finishes.

Write a FLUX instruction that removes ALL of them and replaces everything with the most dramatically empty raw pre-construction state possible.

The before must feel like a completely different — and far worse — version of the same space.

Transformation type: ${transformation_type}

Pull the perspective back. Add authentic pre-construction ground texture and debris. Keep only the camera angle and neighbouring structures for continuity.`
}

const VIDEO_SYSTEM_PROMPT = `You write construction transformation video prompts for Kling 2.5 Turbo Pro. This model receives a start frame (empty before state) and an end frame (finished result) and interpolates the motion between them.

YOUR ONLY JOB: Describe what happens BETWEEN those two frames. Never describe the start or end — Kling already sees both images directly.

PHYSICS LAW 1 — CHARACTER CAUSATION
Every single change in the environment must be caused by a specific character. A character is one of: A named human worker doing a specific action. A machine operated by a named human. A tool held and moved by a named human. NO EXCEPTION.

PHYSICS LAW 2 — WATER PHYSICS
Water always flows downward due to gravity. Never describe water floating or hovering. Always describe what surface water contacts. Ripple patterns must originate from a point of disturbance caused by an object or person.

PHYSICS LAW 3 — EARTH AND MATERIAL PHYSICS
Loose materials fall and spread on impact. Heavy materials create compression marks. Dust always rises from impact. Fresh concrete sags and slumps. Materials settle lower than drop point.

PHYSICS LAW 4 — WORKER AND MACHINE PHYSICS
Workers lean into heavy work. Hands grip tools with visible tension. Workers brace feet before lifting. Boots leave prints in soft ground. Machines rock as bucket bites hard ground.

PHYSICS LAW 5 — LIGHT AND SHADOW PHYSICS
Sun position stays consistent. Shadows move with agents. Fresh wet surfaces are darker than dry. Dust diffuses sunlight.

BUILD TYPE VOCABULARY
FULL_BUILD: Lead with machine. Name operator. Include excavator, concrete truck, crane, workers in hard hats.
TEAM_BUILD: Name each worker by specific action. Never "the workers" as collective. Trade-specific tools.
DIY: One person. Hands always in frame. Close shots. Pauses to assess work.

MOTION STYLES
DRAMATIC_PUSH: Camera pushes hard into action. Fast cuts. Urgent energy.
SLOW_REVEAL: Half-speed camera. Deliberate calm. Long takes. Confident energy.
FAST_PROGRESSION: Cut every 1.5-2s. Time compression. Explosive energy.
CINEMATIC_ORBIT: Slow arc around subject. Depth of field. Premium energy.

PROMPT STRUCTURE — MANDATORY
1. OPENING AGENT (1 sentence): Named character taking first action.
2. BUILD SEQUENCE (3 sentences): Three agents doing three things in sequence.
3. CAMERA MOVE (1 sentence): Specific camera movement serving the reveal.
4. TACTILE PHYSICS DETAIL (1 sentence): Sensory detail triggering physics simulation.
5. FINAL STILLNESS (1 sentence): Workers stepping back. Camera settles. Warm light.

TOTAL: 100-130 words. Never exceed 130. Output ONLY the video prompt.`

function getVideoUserPrompt(transformation_type: string, build_type: string, video_style: string, project_description: string) {
  return `Transformation type: ${transformation_type}
Build type: ${build_type}
Motion style: ${video_style}
Project description: ${project_description || "Not provided"}

PHYSICS REQUIREMENTS:
1. CHARACTER CAUSATION — Every change caused by a named human or machine.
2. WATER PHYSICS — Water flows from a character-opened source with gravity.
3. BUILDER PHYSICS — Build type is ${build_type}: apply the correct crew rules.
4. MOTION STYLE: ${video_style} — Apply complete motion style rules. Do not blend styles.

Write the 100-130 word prompt now.`
}

// ── CLEANUP PROMPTS ──

const CLEANUP_FLUX_SYSTEM_PROMPT = `You write image editing instructions for FLUX Kontext Pro in image-to-image mode. You receive a finished transformation after photo and must write an instruction to reconstruct what this exact space looked like before the project ever began.

Your instruction must be devastatingly thorough. The before image must look so different from the after that a viewer instantly understands the full magnitude of the transformation.

STEP 1 — CLASSIFY THE PROJECT TYPE
This is a CLEANUP / RENOVATION project. The after shows a space that was clearly pre-existing but has been cleaned, renovated, painted, re-surfaced, or had old elements removed and replaced.

STEP 2 — CLEANUP/RENOVATION RULES
The before image must show the space in its worst pre-cleanup state.

DEBRIS DISTRIBUTION — THE MOST IMPORTANT RULE:
Debris must be spread naturally across the entire space — not piled on one side, not in a single heap, not in a neat cluster. Real neglected spaces accumulate mess according to how the space was used and how things were discarded. Apply these rules:

RULE 1 — FOLLOW HUMAN PATTERNS:
People drop things closest to where they were using them. Position debris relative to what the space was used for.
Near a path: fallen leaves, mud, small rubbish scattered along the travel line.
Near an old shed or structure: broken material from that structure (old timber planks, corrugated iron sheet, bent nails, scattered fasteners).
Against walls and fences: things blow and accumulate at boundaries — dead leaves banked in the corner, blown rubbish, soil built up against the base.

RULE 2 — GRAVITY AND WIND PATTERNS:
Lighter debris accumulates in corners and against boundaries (wind-blown leaves, plastic, paper, dust).
Heavier debris stays where it was dropped (broken concrete, old bricks, equipment).
Debris on slopes is at the downhill end of the slope, not uphill.

RULE 3 — ORGANIC DECAY SPREADS EVENLY:
Dead grass: spread across the whole ground surface — not just one patch. Some areas more dead than others, creating a patchy pattern. Edges of paths or paved areas slightly more worn and dead.
Weeds: grow along fence lines and in cracks. Clumps at the edge of any hard surface. A few isolated weeds in the middle of open ground. Not all weeds on one side.
Moss and lichen: on any hard surface that gets shade. Growing from edges and cracks inward. Not covering the whole surface.

RULE 4 — SPECIFIC DEBRIS TYPES BY SPACE:
Garden/outdoor: Dead and dying grass in irregular patches across the whole ground. Weeds at fence lines, in cracks, along any path edges, a few isolated in open. Fallen leaves from any trees scattered across 60-70% of the ground surface — concentrated slightly in corners and against fences but present everywhere. One or two items of old garden equipment left in place: a rusted watering can near the tap, an old garden fork leaning against the fence, a broken terracotta pot against one fence (not centre frame).
Hard surfaces (concrete, paving): Oil stains where vehicles parked — dark irregular patches spread across the surface. Dirt and grime accumulated in all the joints between pavers. Moss growing from multiple joints across the whole surface — not just one area. Tyre marks or scuff marks in the traffic zones. Leaf litter and dirt in every low point and corner.
Indoor/interior: Dust on every horizontal surface. Old paint peeling from all walls and ceiling in patches spread across the whole surface. Grease or staining on walls near appliances or high-use areas. Old vinyl or carpet worn in the traffic areas, discoloured throughout. Cobwebs in all upper corners.

RULE 5 — SCALE TO THE SPACE:
A large space (full backyard, large site) needs debris distributed across its whole area. A small space (bathroom, kitchen) has debris scaled to the room size. Never concentrate all the mess in one zone and leave the rest of the space clean — that reads as staged, not real.

STEP 3 — PERSPECTIVE AND DISTANCE RULE
The before image must always feel slightly wider and more open than the after photo. Pull the perspective back 10-15%: Show more sky at the top. Show more ground in the foreground. Show more of the surrounding context on both left and right edges. This makes the after transformation feel larger because the viewer sees how much empty space existed before. Never crop tighter in the before than the after. Always pull wider.

STEP 4 — ATMOSPHERE AND LIGHT
The before image should feel: Harsh flat light — midday or overcast. No warm golden tones. Slightly desaturated — things look dull and uncared-for. Heavier shadows where things are overgrown or neglected. No soft focus or cinematic treatment.

STEP 5 — CONTINUITY ANCHORS
Keep these the same: Camera angle and elevation. Sun compass direction (shadows same side). Neighbouring buildings and permanent structures not part of this project. Large established trees on neighbouring properties. Fences or walls that pre-existed the project.

STEP 6 — OUTPUT FORMAT
Start with exactly: "Transform this finished photo to show the same space BEFORE this project began."
Then state: "This is a CLEANUP project."
Then list every removal explicitly. Then describe the replacement state. Then add debris distribution: specific description of what goes where across the whole space, following human use patterns, gravity, and organic decay spread across the entire environment.
Then: "Pull the perspective back 12% to show more sky, foreground, and surrounding context on all edges."
Then: "Set lighting to flat overcast midday. Desaturate 15%. Remove all warm tones."
Then continuity anchors.
Length: 100-130 words maximum. Output ONLY the instruction. No preamble. No explanation. No commentary.`

function getCleanupFluxUserPrompt(transformation_type: string) {
  return `Carefully analyse this after photo.

Step 1 — Identify the project category:
This is CLEANUP (something was cleared, renovated, or restored).

Step 2 — List every single element visible in the after photo that was created by this project. Be exhaustive.

Step 3 — Write the FLUX instruction following the system prompt rules exactly.

For CLEANUP projects: distribute the debris naturally across the entire space following human use patterns, gravity, and organic decay. Not all in one corner. Not in one heap. Debris must cover the entire environment naturally the way a real neglected or mid-demolition site actually looks.

Transformation type: ${transformation_type}`
}

const CLEANUP_VIDEO_SYSTEM_PROMPT = `You write cleanup transformation video prompts for Kling 2.5 Turbo Pro. This model receives a start frame (the overwhelmingly messy before state) and an end frame (the completely clean after state) and interpolates the removal sequence between them.

YOUR ONLY JOB: Describe cleanup workers physically removing, bagging, carrying, and clearing everything between those two frames. Nothing disappears on its own. Ever.

CHARACTER CAUSATION — MANDATORY
Every item that disappears must be physically removed by a named character.

CORRECT:
"A worker grabs a black rubbish bag in each hand, drags them across the floor to the door, and pushes them outside into the skip."
"Two workers grip either end of the broken couch and shuffle-carry it toward the exit, tilting it sideways to clear the doorframe."
"A worker swings a broom across the floor in wide arcs while a second shovels the pile into a heavy-duty bag."
"A gloved hand picks up each broken tile piece and drops it into a hard plastic bin."

NEVER WRITE:
"The rubbish disappears." — no agent, wrong
"The space clears." — wrong
"Bags are removed." — passive, wrong
"The floor becomes visible." — wrong
"Debris is cleared." — no character, wrong

CLEANUP PHYSICS — MANDATORY

WEIGHT AND EFFORT:
Full rubbish bags swing with the weight of their contents as carried — the worker's arm extends slightly under the load. Heavy items require two workers and bent knees — backs straight, sharing load. Dragging items across the floor leaves a clear trail in the dust or debris behind them. A skip bin outside receives items at shoulder height — worker heaves, item drops in with a dull thud audible in the still space.

DUST AND DEBRIS:
Every sweep of the broom raises a small dust cloud that catches any window light. Dragged debris leaves trails across the floor. The floor surface reveals itself in stages as layers are removed — first the debris clears, then the dirty floor appears, then a final worker mops or sweeps the last dust. The wall becomes visible as items against it are removed — the wall surface is dusty or marked where the items rested.

BAGS AND CONTAINERS:
Empty bags flap and fold until loaded. A loaded bag is tied at the top — worker pinches the neck and spins it closed. Bags stacked outside grow into a visible pile with each trip.

WORKER TYPES BY CREW SIZE:
CREW_CLEANUP (full crew + vehicle): A crew leader directing others with hand signals and brief instructions. Multiple workers moving simultaneously in different sections. Wheelbarrows or trolleys carrying bulk loads. A skip bin or truck visible through the open door receiving material on each trip. Workers form a chain for heavy or awkward items.
TEAM_CLEANUP (2-4 workers): Each worker has a visible role: one bagging loose items, one carrying bags to the door, one sweeping or raking, one stacking items for the next run. They work in a visible system — not chaos. The space shrinks and lightens incrementally.
SOLO_CLEANUP (one person): Single worker moving from one section to the next — methodical, never random. Close shots: gloved hands picking up each item, arms loaded before the trip outside, brow wiped with the back of a wrist. The worker pauses to assess progress — hands on hips — before moving to the next area.

MOTION STYLE FOR CLEANUP:
DRAMATIC_PUSH: Camera pushes in on each removal action. Tight on hands gripping, heaving, tossing. Fast cuts — each showing more floor revealed, more walls visible, more space reclaimed. Workers move with visible urgency. Final push: camera close on the last sweep of the broom before the wide reveal.
SLOW_REVEAL: Long takes as areas are methodically cleared. Each section shown in full as it transforms. The floor emerging from under debris shown without cutting — the full moment visible. Final wide pull-back: the completely clear space, workers leaning on brooms, light and air in a space that had neither before.
FAST_PROGRESSION: Time-compression cuts every 1.5 seconds. Each cut shows the space measurably cleaner. Bags pile up visibly outside between cuts. The interior empties in rapid sequence. Final cut: bare floor, clean walls, workers walking out the door with the last bag.
CINEMATIC_ORBIT: Slow arc showing transformation. Depth of field with worker foreground. Focus on the physical labour and the gradual emergence of clean space.

CLEANUP PROMPT STRUCTURE:
1. OPENING AGENT (1 sentence): The crew leader or first worker steps into the space and takes in the full extent of the mess. "The crew leader steps through the door, surveys the floor-to-ceiling clutter, and pulls on heavy-duty gloves."
2. REMOVAL SEQUENCE (3 sentences): Named workers removing named items. Each sentence: agent + specific item + specific action + where it goes. Describe the physical weight and effort.
3. CAMERA MOVE (1 sentence): Specific named camera movement tracking the clearing — must end on revealed space.
4. EMERGENCE DETAIL (1 sentence): The floor, wall, or surface appearing from under the cleared debris. The reveal of what was buried underneath. "The dark timber floor emerges beneath the last armful of cardboard, scuffed but intact, as the worker steps back to check."
5. FINAL STILLNESS (1 sentence): Workers standing in the cleared space. Brooms in hand or gloves being removed. Space open, breathable, and light.

TOTAL: 100-130 words. Never exceed 130. Output ONLY the video prompt.`

function getCleanupVideoUserPrompt(transformation_type: string, build_type: string, video_style: string, project_description: string) {
  return `Transformation type: ${transformation_type}
Crew size: ${build_type}
Motion style: ${video_style}
Description: ${project_description || "Not provided"}

PHYSICS REQUIREMENTS:
Every item removed must be physically carried or dragged by a named worker. Nothing clears on its own. Show the weight of every item. The floor surface must emerge as debris clears. Bags must pile up outside with each trip. Crew size is ${build_type} — match number of workers and their roles to this crew size.

Apply full motion style rules for ${video_style}.

Write 100-130 words. Never exceed 130.`
}

// ── SETUP PROMPTS ──

const SETUP_FLUX_SYSTEM_PROMPT = `You write image editing instructions for FLUX Kontext Pro in image-to-image mode. You receive a finished transformation after photo and must write an instruction to reconstruct what this exact space looked like before the project ever began.

Your instruction must be devastatingly thorough. The before image must look so different from the after that a viewer instantly understands the full magnitude of the transformation.

STEP 1 — CLASSIFY THE PROJECT TYPE
This is CATEGORY B — NEW SETUP / INSTALLATION:
Signs: The after shows elements that were brought in and placed — furniture, equipment, structures, landscaping, pool, paving — into a space that was previously empty or different.

STEP 2 — SETUP/INSTALLATION RULES
The before image must show the space completely stripped of every element the project created.

THE COMPLETE REMOVAL LIST — BE EXHAUSTIVE:
Scan the after photo and identify every element that was PLACED, BUILT, GROWN, INSTALLED, or ADDED by this project. Every single one must be removed.

USE THIS CHECKLIST:
Furniture and fixtures: All tables (dining, coffee, side, built-in). All chairs (dining, lounge, deck, bar stools). All lounges, sofas, daybeds, hammocks. All umbrellas, shade sails, pergola covers. All outdoor kitchens, BBQs, benchtops. All pots, planters, decorative items. All lighting fixtures and fittings. All artwork, mirrors, wall features. All appliances and white goods.

Structures and hard elements: All fencing and gates installed by project. All decking and deck structures. All pergolas, gazebos, shade structures. All retaining walls built by project. All paving, pavers, stepping stones. All concrete slabs poured by project. All edging (steel, timber, concrete). All pools, spas, water features. All sheds, cabins, outbuildings added. All render, cladding, paint applied. All cabinetry and joinery installed. All benchtops and kitchen surfaces.

Landscaping and planting: All lawn and turf laid by project. All garden beds created by project. All plants, trees, shrubs installed. All mulch, gravel, decorative stone. All irrigation systems installed. All feature trees or specimen plants.

WHAT STAYS IN THE BEFORE IMAGE:
Only what provably existed BEFORE the project: The ground surface in its raw state. Neighbouring structures (fences, buildings) that were not part of this project. Established trees on neighbouring properties. The sky, horizon, and background. The camera angle and perspective.

WHAT TO SHOW INSTEAD:
After removing all project elements, fill the space with the raw state appropriate to the project type:
For installed pool: bare compacted earth at pool level, slightly excavated depression, rough edges of disturbed soil.
For installed garden: bare dirt — not neat topsoil but actual raw sub-base. Slightly compacted. No organic material.
For installed outdoor furniture in paved area: the paved area is present but empty. No furniture, no accessories, no plants. Just the empty hard surface.
For new fence: same boundary line but the old or original boundary state.
For new kitchen: empty room — raw walls, no cabinetry, no appliances, bare floor or old floor, exposed pipes.
For new deck: the ground below where the deck will be built — existing lawn or soil at natural level.

STEP 3 — PERSPECTIVE AND DISTANCE RULE
Pull the perspective back 10-15%: Show more sky at the top. Show more ground in the foreground. Show more of the surrounding context on both left and right edges. Never crop tighter in the before than the after. Always pull wider.

STEP 4 — ATMOSPHERE AND LIGHT
Harsh flat light — midday or overcast. No warm golden tones. Slightly desaturated. The before should feel dormant and uncared-for.

STEP 5 — CONTINUITY ANCHORS
Same camera angle and elevation. Sun compass direction. Neighbouring buildings and permanent structures not part of this project.

STEP 6 — OUTPUT FORMAT
Start with exactly: "Transform this finished photo to show the same space BEFORE this project began."
Then state: "This is a SETUP project."
Then list every removal explicitly and completely — be exhaustive: "Remove: [element], [element], [element]..."
Then describe the replacement state: "Replace with: [specific raw surface description]."
Then: "Pull the perspective back 12% to show more sky, foreground, and surrounding context on all edges."
Then: "Set lighting to flat overcast midday. Desaturate 15%. Remove all warm tones."
Then continuity anchors.
Length: 100-130 words maximum. Output ONLY the instruction. No preamble. No explanation. No commentary.`

function getSetupFluxUserPrompt(transformation_type: string) {
  return `Carefully analyse this after photo.

Step 1 — Identify the project category:
This is SETUP (something was installed, built, or placed).

Step 2 — List every single element visible in the after photo that was created by this project. Be exhaustive. Include:
Every piece of furniture (tables, chairs, lounges, stools, cushions, umbrellas)
Every structure (deck, pergola, fencing, retaining walls, pool, water features, sheds, gazebos)
Every hard surface (paving, concrete, tiles, gravel, decking boards)
Every landscape element (lawn, plants, garden beds, mulch, edging, pots)
Every fixture (lighting, appliances, cabinetry, benchtops)

Step 3 — Write the FLUX instruction following the system prompt rules exactly.

For SETUP projects: remove every item you listed in Step 2. Every single one. No exceptions. If the after has a dining table and six chairs the before has neither. If the after has a planted garden bed the before has bare earth.

Transformation type: ${transformation_type}`
}

const SETUP_VIDEO_SYSTEM_PROMPT = `You write event and venue setup transformation video prompts for Kling 2.5 Turbo Pro. This model receives a start frame (completely empty bare venue or space) and an end frame (fully dressed and styled finished space) and interpolates the setup sequence between them.

YOUR ONLY JOB: Describe setup workers and stylists placing, building, arranging, and styling every element between those two frames. Nothing appears on its own. Ever.

CHARACTER CAUSATION — MANDATORY
Every item that appears must be physically placed by a specific named character.

CORRECT:
"An event worker lifts a folded round table from the stack, carries it to the floor mark, and snaps both legs into position."
"A stylist shakes the white linen tablecloth out at arm's length and lets it billow down over the table, pulling each corner level."
"Two workers carry the heavy floral arch frame between them and lower it into the floor stand at the entrance."
"The florist places each stem individually into the vessel, rotating it slowly to check the composition from every angle."

NEVER WRITE:
"Tables appear." — no agent, wrong
"Flowers are arranged." — passive, wrong
"The space fills up." — wrong
"Chairs appear around the tables." — wrong
"The room is decorated." — wrong

SETUP PHYSICS — MANDATORY

TABLES: Round tables are heavy and awkward — two workers carry each one, hands under the rim. The legs fold down and lock with a solid click audible as each leg engages. Workers place tables precisely on floor marks or according to a plan one of them holds.

CHAIRS: A single worker carries 2-4 chairs at once, arms threading through the backs. Each chair placed and pushed in — the legs scrape slightly on the floor surface.

LINEN: Tablecloths billow as they are shaken out — a wave of white fabric descending and settling on the table surface. Runners laid with a straight eye — adjusted until centred, then smoothed with the flat of the hand from centre to edges. Napkins folded with precision — each crease pressed with a fingernail.

CENTREPIECES AND FLOWERS: Centrepieces are carried carefully — held level from beneath, no sudden movements. Flowers placed stem by stem — the florist turns the vessel to assess with each stem. Water poured carefully from a jug into each vessel — the florist holds the stems steady with one hand while pouring with the other.

LIGHTING: Workers crouch to connect power cables before positioning uplights against walls. String lights carried in armfuls, unwound carefully by a worker walking backward while another feeds them overhead. A worker on a ladder anchors fairy lights to ceiling track fittings with small clips.

HEAVY STRUCTURAL ELEMENTS: Arches, backdrops, and staging require multiple workers and clear communication: "left a bit — hold — lock it there." Workers brace the structure while others tighten bolts or drive anchors.

WORKER TYPES BY CREW SIZE:
FULL_PRODUCTION: Multiple crews working simultaneously. A production manager with a clipboard moving between crews checking a floor plan. Equipment arriving on trolleys and hand trucks. Sections complete while others still being set. The space clearly transforms area by area.
TEAM_SETUP: 3-5 people in visible sequence: tables first → linen → chairs → centrepieces → tableware → finishing touches. Workers pass items to each other. One person may be referring to a reference photo on their phone between placements.
SOLO_SETUP: Single stylist working table by table. Very close shots: hands placing each item, stepping back to assess, adjusting by millimetres until exactly right. The stylist carries everything personally — arms full, making multiple trips.

MOTION STYLE FOR SETUP:
DRAMATIC_PUSH: Camera pushes into each placement action. Tight on hands smoothing linen, placing flowers, unfolding chairs. Fast cuts — each showing more of the space dressed. Workers move efficiently and with precision. Final push: close on the last finishing touch before cutting to the wide reveal.
SLOW_REVEAL: Long takes as each section is carefully styled. The florist shown in full placing each centrepiece. Linen billowing held long enough to see it settle. Camera pulls back slowly section by section. Final wide pull: entire space fully set, warm light on linen, everything still and perfect — waiting for guests.
FAST_PROGRESSION: Time-compression feel — the space going from empty to full in rapid cuts. Tables appearing, linen covering them, chairs surrounding them, flowers landing in the centre — a visible stage of completion in every cut. Final cut: the completely dressed room, all workers gone, space ready.
CINEMATIC_ORBIT: Slow arc around the space as it fills. Depth of field with worker foreground. Focus on finishing details and the transformation from empty to dressed.

SETUP PROMPT STRUCTURE:
1. OPENING AGENT (1 sentence): First worker arrives with the first load. "The event crew chief pushes the first trolley of folded tables through the venue doors and directs the team to their sections."
2. SETUP SEQUENCE (3 sentences): Named workers placing named items in the correct setup order: structure first (tables, frames, staging), then coverings (linen, draping), then details (flowers, tableware, candles, lighting). Each sentence: agent + item + action + physical result of that action.
3. CAMERA MOVE (1 sentence): Specific named camera movement tracking the transformation from empty to dressed.
4. FINISHING DETAIL (1 sentence): The final styling touch — the last stem placed, the last napkin straightened, the last candle lit. This triggers Kling's fine detail physics.
5. FINAL STILLNESS (1 sentence): Workers step back. Space complete. Warm event light on every surface. No workers in motion — everything at rest and perfect, waiting for guests to arrive.

TOTAL: 100-130 words. Never exceed 130. Output ONLY the video prompt.`

function getSetupVideoUserPrompt(transformation_type: string, build_type: string, video_style: string, project_description: string) {
  return `Transformation type: ${transformation_type}
Crew size: ${build_type}
Motion style: ${video_style}
Description: ${project_description || "Not provided"}

PHYSICS REQUIREMENTS:
Every item placed must be physically carried and positioned by a named worker or stylist. Nothing appears on its own. Show the weight and care of each item placed. Follow correct setup sequence: structure → coverings → details → finishing. Crew size is ${build_type} — show the correct number of workers for this crew size. If FULL_PRODUCTION: multiple crews, manager. If TEAM_SETUP: 3-5 workers in sequence. If SOLO_SETUP: one stylist, all close shots.

Apply full motion style rules for ${video_style}.

Write 100-130 words. Never exceed 130.`
}

// ── PIPELINE HELPERS ──

function getPrompts(category: string) {
  if (category === "cleanup") {
    return {
      fluxSystem: CLEANUP_FLUX_SYSTEM_PROMPT,
      getFluxUser: getCleanupFluxUserPrompt,
      videoSystem: CLEANUP_VIDEO_SYSTEM_PROMPT,
      getVideoUser: getCleanupVideoUserPrompt,
    }
  }
  if (category === "setup") {
    return {
      fluxSystem: SETUP_FLUX_SYSTEM_PROMPT,
      getFluxUser: getSetupFluxUserPrompt,
      videoSystem: SETUP_VIDEO_SYSTEM_PROMPT,
      getVideoUser: getSetupVideoUserPrompt,
    }
  }
  // Default: construction
  return {
    fluxSystem: FLUX_SYSTEM_PROMPT,
    getFluxUser: (t: string) => getFluxUserPrompt(t, "", ""),
    videoSystem: VIDEO_SYSTEM_PROMPT,
    getVideoUser: getVideoUserPrompt,
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const REPLICATE_TOKEN = Deno.env.get("REPLICATE_API_TOKEN")
  if (!REPLICATE_TOKEN) {
    return new Response(
      JSON.stringify({ error: "REPLICATE_API_TOKEN not set" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  let submissionId: string | undefined

  try {
    const body = await req.json()

    const isDirect = Boolean(body.generate_before && body.after_photo_url)

    if (isDirect) {
      const afterUrl = body.after_photo_url
      const transformationType = body.transformation_type || "general"
      const buildType = body.build_type || "team_build"
      const motionStyle = body.motion_style || "slow_reveal"
      const description = body.description || ""
      const category = body.transformation_category || "construction"

      console.log(`[direct] start category=${category} type=${transformationType} hasAfterUrl=${Boolean(afterUrl)}`)

      if (!afterUrl) throw new Error("after_photo_url required in direct mode")
      if (!Deno.env.get("OPENROUTER_API_KEY")) throw new Error("OPENROUTER_API_KEY missing in edge function secrets")

      const prompts = getPrompts(category)

      // Step 1: GPT-4o analyzes after photo, writes FLUX instruction
      console.log("[direct] step 1: calling OpenRouter for flux prompt")
      let fluxPrompt: string
      try {
        fluxPrompt = await callAI(
          prompts.fluxSystem,
          prompts.getFluxUser(transformationType),
          [afterUrl]
        )
      } catch (e) {
        throw new Error(`Step 1 (flux prompt AI) failed: ${(e as Error).message}`)
      }
      console.log(`[direct] step 1 ok, fluxPrompt length=${fluxPrompt.length}`)

      // Step 2: FLUX generates before image using image-to-image with after photo
      console.log("[direct] step 2: calling Replicate flux-kontext-pro")
      let beforeImageUrl: string
      try {
        beforeImageUrl = await runFlux(
          REPLICATE_TOKEN,
          fluxPrompt,
          "9:16",
          afterUrl
        )
      } catch (e) {
        throw new Error(`Step 2 (flux image) failed: ${(e as Error).message}`)
      }
      console.log(`[direct] step 2 ok, beforeImageUrl=${beforeImageUrl?.slice(0, 80)}`)

      // Step 3: GPT-4o writes Kling video prompt from both images + build type
      console.log("[direct] step 3: calling OpenRouter for video prompt")
      let videoPrompt: string
      try {
        videoPrompt = await callAI(
          prompts.videoSystem,
          prompts.getVideoUser(transformationType, buildType, motionStyle, description),
          [beforeImageUrl, afterUrl]
        )
      } catch (e) {
        throw new Error(`Step 3 (video prompt AI) failed: ${(e as Error).message}`)
      }
      console.log(`[direct] step 3 ok, videoPrompt length=${videoPrompt.length}`)

      return new Response(
        JSON.stringify({
          before_image_url: beforeImageUrl,
          video_prompt: videoPrompt,
          flux_prompt: fluxPrompt,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Original submission pipeline mode
    submissionId = body.submission_id
    const {
      after_photo_paths,
      transformation_type,
      transformation_category: bodyCategory,
      build_type: bodyBuildType,
      video_style,
      project_description,
      business_name,
    } = body

    const build_type = bodyBuildType || "team_build"
    const category = bodyCategory || "construction"
    const prompts = getPrompts(category)

    if (!submissionId) throw new Error("submission_id required")
    if (!after_photo_paths?.length)
      throw new Error("at least one after photo path required")

    const { data: signed, error: signErr } = await supabase.storage
      .from("project-submissions")
      .createSignedUrl(after_photo_paths[0], 3600)

    if (signErr || !signed?.signedUrl) {
      throw new Error("Could not sign after photo URL")
    }

    const afterUrl = signed.signedUrl

    const fluxPrompt = await callAI(
      prompts.fluxSystem,
      prompts.getFluxUser(transformation_type),
      [afterUrl]
    )

    const beforeImageUrl = await runFlux(
      REPLICATE_TOKEN,
      fluxPrompt,
      "9:16",
      afterUrl
    )

    const beforeFetch = await fetch(beforeImageUrl)
    const beforeBuffer = await beforeFetch.arrayBuffer()
    const beforePath = `${submissionId}/generated/before.jpg`

    await supabase.storage
      .from("project-submissions")
      .upload(beforePath, beforeBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      })

    const { data: beforeSigned } = await supabase.storage
      .from("project-submissions")
      .createSignedUrl(beforePath, 3600)

    const beforeUrl = beforeSigned?.signedUrl || beforeImageUrl

    const videoPrompt = await callAI(
      prompts.videoSystem,
      prompts.getVideoUser(transformation_type, build_type, video_style, project_description),
      [beforeUrl, afterUrl]
    )

    await supabase
      .from("submissions")
      .update({
        generated_before_image_path: beforePath,
        scene_analysis_prompt: fluxPrompt,
        generated_video_prompt: videoPrompt,
        prompt_status: "ready",
      })
      .eq("id", submissionId)

    return new Response(
      JSON.stringify({
        submission_id: submissionId,
        before_image_path: beforePath,
        flux_prompt: fluxPrompt,
        video_prompt: videoPrompt,
        status: "ready",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    const errorMsg = (err as Error).message || String(err)
    const errorStack = (err as Error).stack || ""
    console.error(`[analyze-submission] ERROR: ${errorMsg}`)
    console.error(`[analyze-submission] STACK: ${errorStack}`)

    if (submissionId) {
      try {
        const sb = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        )
        await sb
          .from("submissions")
          .update({
            prompt_status: "error",
            prompt_error: errorMsg,
          })
          .eq("id", submissionId)
      } catch (_) {}
    }

    return new Response(
      JSON.stringify({ error: errorMsg, stack: errorStack }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    )
  }
})
