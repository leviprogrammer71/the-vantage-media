# The Vantage — Real Estate Cinematography Prompt Library

Reference doc for prompt engineering on Seedance 2.0 / Kling 2.5. Built on prompt-guide research plus real-estate cinematography fundamentals. Use this when adding new shot types, tuning existing prompts, or designing new "Done-For-You" reel categories.

## Why prompts kept feeling off

The previous prompts said *"first five seconds: morph. last five seconds: camera pushes through."* The model interpreted that loosely and lingered in transformation through the whole clip — so the user saw a half-finished sketch reveal at second 9 and never got the magic moment.

**Fix: timeline prompting.** Seedance 2.0's official guide and the MindStudio / Higgsfield prompt guides all converge on the same answer — explicit `[0:00–0:0N]` beat markers force the model to commit to a structure. Open beat → action beat → settle beat. The transformation **completes by a specific timestamp**, the camera move owns the back half, and the clip ends on a clean held frame instead of mid-motion.

## The five-rule prompt grammar

1. **Subject + Action + Scene + Camera + Style + Constraints** — the model weights left-to-right.
2. **One camera move per clip.** Combining a dolly with a pan with a tilt produces jitter. Pick one.
3. **Standard cinematography vocab beats descriptive prose.** Say "dolly in", not "the camera moves closer". Say "crane up", not "rising vertical movement".
4. **Never use "fast" with another fast element.** Fast camera + fast cuts + busy scene = artifacts. Pick at most one element to be fast.
5. **End on a settle.** Reserve the last 1–2 seconds for the camera to hold the final composition. Otherwise clips end mid-motion and stitching reveals it.

## The Vantage timeline template

```
Cinematic 9:16 vertical real-estate listing reel. 1080p photorealistic, magazine-quality.
[0:00–0:01] Open on the establishing frame; architecture, materials, lighting locked exactly to the source photo.
[0:01–0:0N] {motionHint}. Smooth gimbal-stabilized motion, single deliberate move.
[0:0N–0:0M] Settle on the final composition and hold.
Subject and architecture stay identical to the source throughout — no morphing, no invented rooms, no added people, no weather change, no flickering.
{vibeLine}
```

`N` = `duration - 1` for slow pacing (luxury), `duration - 1` capped at 4 for medium pacing (snappy). `M` = `duration`.

This is what `buildClipPrompt()` in `generate-listing-video/index.ts` produces.

## Real-estate cinematography fundamentals

Distilled from luxury-listing video guides for prompt-writing.

### Camera moves (one per clip)

| Move | Use when | Vocabulary |
|---|---|---|
| Slow dolly push | Hero shot, establishing → reveal of focal point (kitchen island, fireplace, primary suite) | "Slow dolly push-in toward the subject from medium-wide to medium close" |
| Drone orbit | Exterior establishing, signature aerial. 60° arc is plenty — full 360° feels artificial | "Slow aerial arc — drone orbits 60 degrees around the subject at elevated altitude" |
| Parallax pan | Side-on listing shots, depth reveal. Gives a sense of space without zoom | "Lateral parallax tracking shot moving slowly left to right, foreground and background drift at different rates" |
| Crane up / reveal rise | Foyer, double-height entry, exteriors with landscaping foreground | "Crane up — camera rises vertically from low ground level to eye height, revealing the composition from the bottom up" |
| Architectural slider | Symmetric facades, kitchen counters, pool decks | "Clean architectural slider — perfectly horizontal lateral track, no rotation, emphasizing symmetry" |
| Pull-back establishing | Closing shot, bringing the whole house into frame | "Slow pull-back dolly out from tight composition to a wide establishing frame" |

### Pacing dial (luxury → social)

- **Slow / Editorial / Cinema** — 60–90 second total reel runtime, single move per clip, clip lengths 5–10s. Long settle. Golden-hour palette. Match cuts only, no whip pans. This is the language used in Luxury Presence and Adam Price luxury cinematic tours.
- **Medium / Snappy** — 30–45s reel, hard match cuts on the beat, occasional speed ramp into a whip pan. This is the Reels / TikTok / Speed Ramp Highlight Tour style.
- **Fast / Documentary** — not used at The Vantage. Reserved for investment-deck content where pacing is incidental.

### Per-room durations (when stitching multi-clip reels)

| Space | Recommended duration |
|---|---|
| Kitchen, primary bedroom, primary bath | 6–10s — the buyer wants to dwell |
| Living, family, great room | 6–8s |
| Hallway, staircase | 3–5s — keep the reel moving |
| Closet, laundry, secondary bath | 3–4s |
| Exterior establishing | 5–8s |
| Aerial / drone | 5–7s |

### Transition vocabulary

- **Match cut** — same composition or motion lines across two shots. Default for luxury. Produces an invisible cut.
- **Whip pan** — fast horizontal camera motion creating a directional blur. Pair with a sound whoosh in post for Reels energy. Don't combine with a busy interior scene.
- **Speed ramp** — gradual time-stretch in or out of a clip. Pairs naturally with a whip pan. Adds energy at the cost of premium feel.
- **Crossfade** — soft dissolve, used for slow-pacing transitions between rooms when there's no obvious match. Subtle, calming.
- **Hard cut on the beat** — for music-driven reels. Each cut lands on a downbeat.

The Vantage default: **match cuts** for Editorial / Cinema / Minimal styles, **whip pan + speed ramp** for Snappy.

## Per-category prompt patterns (current source of truth)

These match what's in `generate-listing-video/index.ts`. Edit them there; this doc reflects the intent.

### Animate Single — single shot, locked subject

The base case. Generated by `buildClipPrompt()`:

```
Cinematic 9:16 vertical real-estate listing reel. 1080p photorealistic, magazine-quality.
[0:00–0:01] Open on the establishing frame; architecture, materials, lighting, and framing locked exactly to the source photo.
[0:01–0:04] {SHOT_CONFIG.motionHint} Smooth gimbal-stabilized motion, single deliberate move.
[0:04–0:05] Settle on the final composition and hold.
Subject and architecture stay identical to the source throughout — no morphing, no invented rooms, no added people or animals, no weather change, no flickering.
{vibeSuffix}
```

### Sun-Up to Sundown — static day cycle

Static lock-off camera. Each phase gets its own beat so the model commits to the full sunrise → golden → dusk arc.

```
[0:00–0:02] SUNRISE: pink-and-amber sky, sun above the eastern horizon, long cool shadows pointing west.
[0:02–0:05] Sun arcs across the sky toward the south. Light warms into GOLDEN HOUR — orange tones rake across the building.
[0:05–0:08] Late golden hour transitions into BLUE HOUR / DUSK — sky deepens to cobalt with a warm horizon glow.
[0:08–0:10] Full dusk — interior windows glow warm yellow from inside.
```

### Sketch to Reality — morph + reveal

Hard completion beat at 0:04–0:05. Past this, no pencil shading, no desk, no hand. The reveal phase needs to feel like a clean photoreal interior.

```
[0:00–0:01] Hold on the pencil sketch on a wooden desk, person's hand drawing.
[0:01–0:04] Sketch fills with colour, light, texture as it morphs into the photoreal interior. Pencil shading dissolves. Desk and hand fade out completely.
[0:04–0:05] Transition completes — fully photoreal interior. No trace of pencil, paper, desk, or hand remains.
[0:05–0:10] Slow dolly camera push-in through the now-photoreal interior.
```

### Floor Plan to Walkthrough — drawing → photoreal

Same shape as Sketch to Reality, but the source frame is a 2D plan / axonometric. The "photoreal by 0:04" rule is the same.

### Virtual Staging — empty room dressing

Empty room dresses itself in furniture by 0:04, then camera glides through.

```
[0:00–0:01] Hold on the empty undressed room.
[0:01–0:04] Furniture, rug, lamps, art, decor lift smoothly into final positions.
[0:04–0:05] Dressing completes — every object settles, room is fully resolved.
[0:05–0:10] Slow dolly push-in through the now-styled interior.
```

### Listing Bundle / Done-For-You Reel — multi-clip stitched

Each clip generated independently via `buildClipPrompt()` with rotating shot types. Stitch handled client-side by `client-stitch.ts`. The four DFY style presets (Editorial / Snappy / Cinema / Minimal) differ in stitching typography, not in cinematography. The cinematography is consistent and luxury-paced; the post-overlay style determines the brand voice.

## Negative prompts — what to forbid

A single source of truth for negatives across the codebase:

```
Invented rooms, new objects, added people or animals, weather changes, morphing or warping geometry,
flickering, motion blur, floating objects, lighting changes, added reflections, ghost trails,
duplicated surfaces, fast motion, jitter, camera shake.
```

`fast motion`, `jitter`, and `camera shake` are the additions from this round — they were cleaning up the previous output's rough edges.

## When you add a new shot type or category

1. Pick **one** camera move from the table above. Don't combine.
2. Write the `motionHint` in standard cinematography vocab.
3. Tag pacing — `slow` (luxury) or `medium` (snappy).
4. The timeline gets built automatically by `buildClipPrompt()`.
5. For transformation flows (sketch / floor plan / staging), write your own timeline with a hard completion beat. Always reserve at least 5 seconds for the camera reveal of the resolved scene — that's where the magic lands.

## Attention to detail — what separates pro output from AI slop

Research from the Higgsfield prompt guide, the nano-banana cookbook, the Veo 3.1 ultimate prompting guide, and luxury staging-AI guides converges on three rules:

**1. Name the finish, not just the material.** "Brass" is vague. "Unlacquered satin-brushed brass with patina starting on the edges" is a render brief. Diffusion models render finishes differently — polished vs. honed, lacquered vs. raw, fresh vs. aged. Always commit.

**2. Light has a temperature, a direction, and a purpose.** Avoid "warm light". Use "warm 3200K key light from camera-left, raking across the timber floor and catching the brass fittings." The model needs to know *which* surface to highlight, *which* shadow to deepen.

**3. Tell the model what to keep, not just what to change.** Flux Kontext and nano-banana both reward this — "do not alter the building, landscaping, sky, or any other element of the image" produces cleaner edits than "add a sign". Same rule for Seedance morphs: "architectural geometry from the drawing stays anchored throughout".

## Lens + camera body language (vibeSuffix grammar)

Every vibe in `generate-listing-video/index.ts` now sets a virtual camera body:

| Vibe | Lens | Aperture | Colour temp | Motion |
|---|---|---|---|---|
| luxury | 35mm prime | f/2 | 3200K golden | slow dolly |
| cozy | 50mm prime | f/2.8 | 2700K tungsten | gentle handheld |
| modern | 24mm wide | f/4 | 5600K diffuse | smooth gimbal |
| family | 35mm | f/2.8 | 5000K midday | steady eye-level |
| investment | 28mm | f/5.6 | 5200K neutral | steady documentary |
| vacation | 35mm | f/2 | 3000K sunset | smooth gimbal |

Naming the lens body forces a specific depth-of-field rendering. f/2 produces creamy bokeh; f/5.6 keeps everything in focus. Vague mood descriptors don't drive the math — apertures do.

## Virtual staging — placement specificity

Generic furniture description ("modern sofa, coffee table, art on wall") produces generic AI staging. Each STAGING_STYLES preset now follows a four-part placement brief:

1. **Palette** — wall colour, floor finish, accent metals (named).
2. **Furniture with placement zone** — "low-profile linen sofa **centered against the longest wall**", "boucle armchair **angled into the room**".
3. **Accents** — three to five specific objects, each with a placement.
4. **Lighting** — direction, temperature, what surfaces it interacts with.

The staging-AI best-practice "always start with `virtually stage`, specify exact style, give precise placement, and clearly mention anything you do not want changed" is encoded structurally — the existing virtual_staging timeline already includes "Walls, windows, doors, floors, ceiling, and architectural features stay locked exactly as in the source throughout."

## Sign overlay (gpt-image-2 / nano-banana) — typography brief

Sign prompts now follow this anatomy:
1. **Placement** — "in the lawn directly in front of the property, post planted upright at ground level, panel facing the camera"
2. **Sign anatomy** — exact dimensions, post material, panel material, finial detail
3. **Typography** — exact wording, weight, family, line breaks, kerning constraint (no doubled glyphs)
4. **Scale anchor** — "post height roughly equal to a fire hydrant" gives the model a real-world reference
5. **Lighting match** — cast shadows that match the existing sun direction
6. **Lock-down** — "do not alter the building, landscaping, sky, or any other element of the image"

This is straight out of the nano-banana typography research — the model treats text as symbolic characters when given a typography brief, but treats it as an opaque texture when given vague "add a sign" instructions.

## Sketch-on-desk (nano-banana) — physical scene brief

The previous sketch prompt said "pencil architectural sketch on a piece of paper sitting on a wooden desk". Generic. The current version names every prop:

- **Paper**: warm-cream A3 architectural drafting paper
- **Pencil grade**: 2H pencil (architect's choice)
- **Sketch style**: confident architect's hand, single weight pencil lines, light cross-hatching
- **Hand**: bare, relaxed, entering bottom-right with pencil tip mid-stroke
- **Desk surroundings**: coffee mug upper-left, scale ruler at top edge, brass desk lamp upper-left
- **Lighting**: warm 2900K directional from upper-left
- **Camera**: top-down 3/4 angle, 50mm equivalent, shallow DoF on the pencil tip

The model renders sketch + photoreal hybrids best when given an explicit physical scene brief, not abstract direction.

## Construction / Cleanup / Setup video prompts (build-video-prompt)

The system prompts in `build-video-prompt/index.ts` now include a CINEMATOGRAPHY GRAMMAR header at the top of each preset:

- **Named camera moves only** — dolly in, dolly out, pan, tilt, tracking shot, crane, arc, rack focus, push-in, pull-back. Never invent moves.
- **One camera move per beat.** Stacking moves produces jitter.
- **Lighting specificity required** — colour temperature (e.g. 3200K), direction (camera-left), what the light catches.
- **Material finish callouts required** — "polished concrete with matte sealer", "rough-sawn white oak", "satin-brushed brass". Realism comes from finish callouts.

These cinematography rules sit alongside the existing physics laws (character causation, water physics, earth physics, body physics, light/shadow physics) — the physics laws keep the motion believable, the cinematography grammar keeps the framing watchable.

## Jitter prevention — research-backed recipe

The Seedance / Kling official prompt guides converge on the same anti-jitter checklist. Every clip prompt now ends with this stack:

1. **One primary camera move per clip.** Multiple conflicting move instructions (e.g. dolly + pan + tilt at once) confuse the model and produce jittery, incoherent footage. Pick one and commit.
2. **Pacing words at the end.** "Slow", "smooth", "stable", "gradual", "gentle" — Seedance was trained on rhythmic descriptions, not photography jargon. Weight them at the tail of the prompt where the model leans heaviest.
3. **Gimbal terminology.** "Gimbal-stabilized" produces smooth motion. "Handheld" produces deliberate micro-wobble. Always pick the one matching the brand.
4. **Stability constraint stack.** Append: "avoid jitter, avoid camera shake, avoid handheld micro-wobble, avoid sudden direction changes, avoid frame drops, avoid flickering, avoid motion blur." This now lives inside `buildClipPrompt()` so every Seedance call gets it.
5. **No fast-element stacking.** Fast camera + fast cuts + busy interior = artifacts. Pick at most one to be fast — usually the cuts (Snappy style), never the camera.
6. **Slow motion renders better than fast motion.** AI video generates slow movement at higher fidelity. "Slowly turning" beats "running fast" every time.

## Stitching — FFmpeg xfade-style transitions per reel style

The client-side stitcher (`src/lib/client-stitch.ts`) now models its transitions on FFmpeg's `xfade` filter. Every transition uses a **cubic-in-out easing curve** so the dissolve is slow at the edges and faster in the middle — eliminates the linear-ramp handoff that made the old stitches feel mechanical.

| Reel style | Transition | Duration | xfade equivalent | Use case |
|---|---|---|---|---|
| **editorial** | Cross-dissolve | 0.5s | `xfade=dissolve` | Slow magazine pacing — alpha blends one clip into the next |
| **cinema** | Fade through black | 0.6s | `xfade=fadeblack` | Outgoing fades to black, incoming fades up — cinematic |
| **snappy** | Wipe left | 0.3s | `xfade=wipeleft` | Sharp directional reveal — incoming wipes in from the right edge for feed energy |
| **minimal** | Slow dissolve | 0.9s | `xfade=dissolve` (longer) | Extra-long cubic-eased dissolve — nothing snaps, everything is luxurious |

The minimal style additionally restricts shot rotation to slow-only camera moves: `slow_push`, `architectural`, `establishing`. No drone orbit, no fast parallax pan, no crane rise. Every cut stays smooth. Every camera move stays slow. The minimal preset is the "expensive house" aesthetic — quiet enough that you hear the music breathe.

## Stitcher implementation notes

- **Single continuous rAF loop** spans the entire output duration. The canvas is never blanked between clips; the previous render persists into the next frame, so there's no 1-frame black flash at clip boundaries.
- **Parallel video playback** during the overlap window — the next clip starts playing 0.5–0.9s before the previous ends, so both clips are advancing in real time during the crossfade.
- **Cubic-in-out easing** smooths the alpha curve. Linear blends look mechanical; cubic feels cinematic.
- Black background fill happens once at the start of the recording, then never again — only video frames are drawn over it.

If we ever need fluid motion interpolation between low-fps source clips, FFmpeg's `minterpolate` filter (motion-compensated frame interpolation) is the server-side option — not currently implemented, since Seedance 2.0 outputs at native 30fps.

## Sources

This library was built from these sources:

- [Seedance 2.0 Prompt Guide — Imagine.art](https://www.imagine.art/blogs/seedance-2-0-prompt-guide)
- [Timeline Prompting with Seedance 2.0 — MindStudio](https://www.mindstudio.ai/blog/timeline-prompting-seedance-2-cinematic-ai-video)
- [Seedance 2.0 Complete Prompting Guide — Higgsfield](https://higgsfield.ai/blog/seedance-prompting-guide)
- [5 Cinematic Techniques to Make Any Property Look Luxurious — Lumatrix Media](https://lumatrixmedia.com/2025/12/11/5-cinematic-techniques-to-make-any-property-look-luxurious/)
- [Cinematic 4K Real Estate Videography — Finchley](https://www.finchley.co.uk/finchley-learning/cinematic-4k-real-estate-videography-elevating-your-listings-to-luxury-level)
- [Real Estate Cinematic Video Editing Tips — Fotober](https://fotober.com/real-estate-cinematic-video-editing)
- [Everything You Should Know About Real Estate Videography — Luxury Presence](https://www.luxurypresence.com/blogs/everything-you-should-know-about-real-estate-videography/)
- [Exploring the Many Styles of Real Estate Video — Adam Price Photography](https://www.adampricephotography.com/blog/2026/3/16/exploring-the-many-styles-of-real-estate-video-finding-the-right-approach-for-every-listing)
- [The Whip Pan Shot Ultimate Guide — StudioBinder](https://www.studiobinder.com/camera-shots/camera-movements/whip-pan-shot/)
- [Kling 2.5 Video Prompt Guide — Akool](https://akool.com/blog-posts/kling-2-5-video-prompt-guide)
- [Kling AI Prompt Guide — Leonardo.Ai](https://leonardo.ai/news/kling-ai-prompts/)
- [Flux Kontext Prompt Guide — Flux AI Pro](https://fluxai.pro/blog/flux-kontext-prompt-guide)
- [FLUX.1 Kontext — Black Forest Labs](https://bfl.ai/models/flux-kontext)
- [Ultimate Prompting Guide for Veo 3.1 — Google Cloud](https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-veo-3-1)
- [Ultimate Prompting Guide for Nano Banana — Google Cloud](https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-nano-banana)
- [Nano Banana Pro Prompt Engineering — minimaxir](https://minimaxir.com/2025/11/nano-banana-prompts/)
- [Higgsfield Cinematic Video Prompt Guide](https://higgsfield.ai/blog/Prompt-Guide-to-Cinematic-AI-Videos)
- [How to Make Realistic AI Videos — Leonardo.Ai](https://leonardo.ai/news/how-to-make-realistic-ai-videos/)
- [Mediterranean Luxury Virtual Staging — Ideal House](https://ideal.house/create/virtual-staging/Interior%20Design_Interior%20Style_Mediterranean_Mediterranean%20Luxury)
- [Seedance 2.0 Official Prompt Guide — Apiyi](https://help.apiyi.com/en/seedance-2-0-prompt-guide-video-generation-camera-style-tips-en.html)
- [Seedance 2.0 Best Settings + Quality Tradeoffs — WaveSpeed](https://wavespeed.ai/blog/posts/blog-seedance-2-0-best-settings/)
- [FFmpeg xfade Filter — OTTVerse](https://ottverse.com/crossfade-between-videos-ffmpeg-xfade-filter/)
- [FFmpeg xfade-easing — scriptituk/xfade-easing](https://github.com/scriptituk/xfade-easing)
- [FFmpeg Filters Documentation](https://ffmpeg.org/ffmpeg-filters.html)
- [Suno Instrumental Prompts Guide — Hookgenius](https://hookgenius.app/learn/suno-instrumental-prompts/)
- [Suno AI Prompt Structure — Soundverse](https://www.soundverse.ai/blog/article/how-to-structure-prompts-for-suno-ai-music-generation-0402)
