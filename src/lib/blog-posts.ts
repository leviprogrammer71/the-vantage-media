/**
 * Blog post registry — long-form SEO content targeting high-intent
 * real-estate-video keywords. Each post is a self-contained markdown-flavored
 * record. The Blog page renders these directly; no CMS, no extra build step.
 *
 * Add new posts by appending to this array. Sitemap.xml is updated manually.
 */

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  /** Display date — used in JSON-LD too */
  publishedAt: string;
  /** Estimated read time in minutes */
  readTime: number;
  /** Hero image for the post + share card */
  cover: string;
  /** Optional looping video for the hero */
  coverVideo?: string;
  /** Eyebrow tag — short categorical label */
  category: string;
  /** Body — array of section blocks. Plain prose, not HTML. */
  sections: Array<
    | { type: "lede"; text: string }
    | { type: "h2"; text: string }
    | { type: "p"; text: string }
    | { type: "ul"; items: string[] }
    | { type: "ol"; items: string[] }
    | { type: "quote"; text: string; attribution?: string }
    | { type: "cta"; label: string; href: string; subhead?: string }
  >;
  /** SEO keywords this post targets (used in meta tag) */
  keywords: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "ai-listing-video-from-one-photo",
    title: "AI Listing Video from One Photo: How to Turn a Static Frame into a Cinematic Reel in 3 Minutes",
    description: "The complete 2026 guide to making cinematic real estate listing videos from a single photo. Workflow, prompts, camera moves, and the AI tools photographers actually ship with.",
    publishedAt: "2026-05-06",
    readTime: 9,
    cover: "/trenton/outside.webp",
    coverVideo: "/trenton/321-e-drumont-final-cut.mp4",
    category: "AI VIDEO · WORKFLOW",
    keywords: [
      "ai listing video",
      "photo to video real estate",
      "ai real estate video",
      "cinematic listing video",
      "seedance real estate",
      "ai video from one photo",
      "real estate reel maker",
    ],
    sections: [
      {
        type: "lede",
        text:
          "The fastest way to a scroll-stopping listing reel in 2026 doesn't start with a videographer. It starts with one photo, an image-to-video model trained on cinematic camera moves, and a prompt that knows what 'magazine quality' actually means in code. Here's the working playbook.",
      },
      { type: "h2", text: "Why one-photo listing videos beat traditional video tours" },
      {
        type: "p",
        text:
          "A traditional cinematic listing tour costs $1,200-$2,800 per property, requires a second crew on shoot day, and turns around in 5-7 days of post. The 2026 reality: an AI image-to-video pipeline running on Seedance 2.0 produces a 1080p vertical reel from a single photograph in about three minutes, at credit costs that round to a few dollars per finished clip. The math is simple — same delivery, same vertical format the algorithm wants, two zeroes off the bill.",
      },
      {
        type: "p",
        text:
          "What's harder is producing one that actually looks luxurious. The default output of any AI video model is generic. The difference between a scroll-stopper and a scroll-past is the prompt structure, the camera move chosen for the photo, and the post-processing chain.",
      },
      { type: "h2", text: "The 5-step workflow we ship with" },
      {
        type: "ol",
        items: [
          "Pick the right photo. Shoot landscape, 4:3 or 16:9 sensor crop, 12MP+, sharp edge-to-edge, golden-hour exterior or even-lit interior. Vertical phone snaps get re-cropped to 9:16 by the model and lose framing.",
          "Pick the camera move that matches the subject. Slow dolly push for hero shots. Drone orbit for exteriors only. Parallax pan for hallways and rooms with depth. Crane up for foyers and double-height entries. Architectural slider for symmetric facades and kitchen counters. Pull-back establishing for closing shots.",
          "Use timeline-prompted instructions. The model performs dramatically better with explicit beat markers like [0:00–0:01] open on establishing frame, [0:01–0:04] dolly push, [0:04–0:05] settle and hold. Without timestamps the model improvises pacing and lingers in transformation through the whole clip.",
          "Stack a no-humans negative prompt. AI image-to-video models will hallucinate occupants if you don't explicitly forbid them. Listing reels with invented people are unusable for legal-disclosure reasons.",
          "Apply a finishing pass: subtle saturation bump (1.05-1.08x), modest contrast (1.04-1.10x), unsharp mask (FFmpeg unsharp=3:3:0.6 or equivalent). This is what turns Seedance's flat output into magazine quality.",
        ],
      },
      { type: "h2", text: "The camera-move table" },
      {
        type: "p",
        text:
          "After 248+ films delivered through the Vantage pipeline, here's the table we reach for. Mismatched moves are the #1 cause of artifacts.",
      },
      {
        type: "ul",
        items: [
          "Slow dolly push — hero shots of a single focal point (kitchen island, fireplace, primary suite). Most forgiving move on the list.",
          "Drone orbit — exterior establishing shots taken from elevation. Never use on interiors; the model invents geometry.",
          "Parallax pan — side-on listing shots with depth (long hallway, room with foreground+background). Don't use on flat-on facades.",
          "Crane up — foyer, double-height entry, exterior with landscaping foreground.",
          "Architectural slider — symmetric facades, kitchen counters, pool decks. Don't use on rooms with busy decor.",
          "Pull-back establishing — closing shot, brings the whole property into frame.",
        ],
      },
      { type: "h2", text: "Stitch six clips into one Done-For-You reel" },
      {
        type: "p",
        text:
          "A single AI clip is enough for an Animate Single post. For a full listing, stitch 3-6 clips together. Use cross-dissolve transitions (0.5s editorial, 0.6s fade-through-black for cinema, 0.45s slide-left for snappy social). Burn the price + realtor name into the corner overlay; let the music live in your editor (Suno-rendered 15-second loops are the fastest path to a cohesive soundtrack).",
      },
      {
        type: "p",
        text:
          "The order you upload is the order the photos play. Start with your strongest exterior, mid-cut to your statement room, end with the closing pull-back or a detail shot. The MLS field accepts the 16:9 horizontal cut; Reels and TikTok take the 9:16 vertical directly.",
      },
      {
        type: "cta",
        label: "Build a Done-For-You Reel — 60 free credits",
        href: "/video?mode=listing&category=done_for_you_reel",
        subhead: "Six photos in. One stitched MP4 out. No card required.",
      },
      { type: "h2", text: "What we got wrong (and you can skip)" },
      {
        type: "p",
        text:
          "Early attempts at this pipeline tried to feed multiple photos into one model call. Every model we tested — Seedance, Kling, even closed providers — produces incoherent output when given a batch. The reliable workflow is one photo per generation, then stitch. The model treats each photo as a deliberate frame instead of an averaged composite.",
      },
      {
        type: "p",
        text:
          "We also tried 'fancy' transitions — glitch wipes, spinning effects, zoom blurs. They distract from the property and reduce professionalism. Cross dissolves, fades, and clean cuts are what every luxury listing video editor on YouTube converges on, and what we ship by default.",
      },
    ],
  },

  {
    slug: "done-for-you-real-estate-reel-guide",
    title: "The Done-For-You Real Estate Reel: A 2026 Guide to Auto-Stitched Listing Videos",
    description: "What is a Done-For-You listing reel, when to use it, what it costs, and how the auto-stitch pipeline works. Plus the four style presets that determine the entire visual language.",
    publishedAt: "2026-05-06",
    readTime: 7,
    cover: "/vantage/done-for-you/house3/1.png",
    coverVideo: "/trenton/321-e-drumont-final-cut.mp4",
    category: "DONE-FOR-YOU · STITCH",
    keywords: [
      "done for you real estate video",
      "auto-stitched listing reel",
      "ai listing video stitch",
      "real estate reel maker",
      "ai video for realtors",
      "listing video for instagram reels",
    ],
    sections: [
      {
        type: "lede",
        text:
          "A Done-For-You Reel is the fastest path from a folder of listing photos to a finished, post-ready vertical MP4 with your price and realtor name baked in. No editor required. Here's exactly what's happening under the hood.",
      },
      { type: "h2", text: "What 'done-for-you' actually means" },
      {
        type: "p",
        text:
          "Three deliverables in one click: every photo becomes its own cinematic clip, the clips stitch together with luxury-grade cross-dissolves, and the final output gets your listing data (price, location, realtor, brokerage) burned into the frame. Total runtime: 15-30 seconds depending on photo count. Total wait: roughly the same as the output length.",
      },
      { type: "h2", text: "When to use Done-For-You vs. Listing Bundle" },
      {
        type: "ul",
        items: [
          "Use Done-For-You when you want a finished MP4 ready to post directly to Reels, TikTok, or the MLS without opening an editor.",
          "Use Listing Bundle when you want the six clips delivered separately so you can mix them yourself in CapCut, Premiere, or Final Cut.",
          "Done-For-You costs 110 credits at the floor; Listing Bundle starts at 90. Both run the same per-clip cinematography pipeline.",
        ],
      },
      { type: "h2", text: "The four style presets" },
      {
        type: "p",
        text:
          "Each preset controls three things: transition type, transition duration, and typography. They don't change the cinematography (camera moves are the same). They change how the cuts feel and how the price renders.",
      },
      {
        type: "ul",
        items: [
          "Editorial — 0.5s cross-dissolve, Cormorant Garamond serif price tag, magazine-grade pacing. The default for high-end listings.",
          "Cinema — 0.6s fade-through-black, DM Serif Display anamorphic feel with letterbox bars, luxury auto-ad pacing. For the most premium properties.",
          "Snappy — 0.45s slide-left transitions, Anton bold caps with yellow price, sharp directional reveals. Built for TikTok and Reels feed energy.",
          "Minimal — 0.9s slow dissolve with cubic easing, italic Cormorant tiny price chip, slow-only camera moves (no drone orbit, no fast parallax). Whisper-quiet for million-dollar-plus listings.",
        ],
      },
      { type: "h2", text: "What gets baked into the corner" },
      {
        type: "p",
        text:
          "Top-left: location. Bottom-left: price (large serif). Bottom-right: realtor name + brokerage. The watermark reads 'THE VANTAGE MEDIA' on free-tier outputs; paid tiers can toggle it off. Optional caption fades in over the top of the first half-second of every clip.",
      },
      { type: "h2", text: "The order you upload is the order they play" },
      {
        type: "p",
        text:
          "We don't try to re-sequence photos for you. The reel plays in upload order. The convention that works: open with your strongest exterior, mid-cut to your statement room (kitchen, primary suite, pool), end with a closing detail or pull-back establishing shot. Six photos is the sweet spot; three is the floor; six is the cap on the Done-For-You preset.",
      },
      {
        type: "cta",
        label: "Open the Done-For-You Reel studio",
        href: "/video?mode=listing&category=done_for_you_reel",
        subhead: "Upload 3-6 photos, pick a style preset, get a finished MP4.",
      },
    ],
  },

  {
    slug: "virtual-staging-with-ai",
    title: "Virtual Staging with AI: A Working 2026 Guide for Real Estate Photographers",
    description: "How AI virtual staging works in 2026, when to use it for empty listings, six style presets, and why the new generation of video staging beats static virtual furniture renders.",
    publishedAt: "2026-05-06",
    readTime: 8,
    cover: "/vantage/setup/after.jpeg",
    coverVideo: "/vantage/setup/video.mp4",
    category: "VIRTUAL STAGING · AI",
    keywords: [
      "ai virtual staging",
      "virtual staging real estate",
      "empty room ai staging",
      "video virtual staging",
      "ai furniture staging",
      "staging from photo",
    ],
    sections: [
      {
        type: "lede",
        text:
          "The 2026 generation of AI virtual staging isn't a static furniture render — it's a 10-second cinematic clip in which an empty room dresses itself in your chosen style and the camera glides through. Here's how the workflow runs and why video staging is replacing static staging in luxury markets.",
      },
      { type: "h2", text: "Why static virtual staging is fading" },
      {
        type: "p",
        text:
          "Static AI staging — drop furniture into an empty room and render a single still — was the 2023-2024 standard. The output is 'good enough for a brochure'. It's not enough for a feed where everything moves. A photo on Reels in 2026 is the algorithm telling itself you're not trying. The shift is to motion.",
      },
      { type: "h2", text: "How AI video staging actually works" },
      {
        type: "p",
        text:
          "Upload one photo of an empty room. The pipeline splits the 10-second output into two beats: the first 4 seconds is the dressing — furniture, rug, lamps, art, decor lift smoothly into final position. Beat boundary at second 5. The remaining 5 seconds is a slow camera dolly push-in through the now-styled space. Walls, windows, doors, floors, ceiling, and architectural features stay locked exactly to the source the entire time.",
      },
      { type: "h2", text: "Six staging style presets" },
      {
        type: "p",
        text:
          "The style preset controls the furniture, finishes, accents, and lighting direction. Pick by audience.",
      },
      {
        type: "ul",
        items: [
          "Modern — warm white walls, mid-tone European oak floor, brushed nickel + matte black, low-profile linen sofa, fiddle-leaf fig in the corner. Cool diffuse daylight, no hard shadows.",
          "Mid-century — walnut tones, mustard and teal accents, teak credenza on tapered legs, sunburst clock, atomic-era ceramics. Warm afternoon side light raking across the walnut.",
          "Coastal — driftwood, soft sea blue, sandy beige, jute, white linen, rope-and-glass pendant, dried beach grass. Bright soft diffuse light with sun-warm cast.",
          "Farmhouse — shiplap, distressed reclaimed wood, cream and forest green, mason-jar pendants, slipcovered linen sofa. Warm tungsten supplemented by daylight.",
          "Luxury Modern — deep navy + warm gold + Calacatta marble + unlacquered brass + lacquered black. Velvet sofa, cognac Italian leather lounge, alabaster pendant. Low-angle warm golden side light.",
          "Scandinavian — bright white walls, blonde oak floors, soft greys, layered creamy wool, paper-shade lamps, monstera. High-key diffuse daylight, almost shadowless.",
        ],
      },
      { type: "h2", text: "When NOT to use video virtual staging" },
      {
        type: "ul",
        items: [
          "Rooms that aren't empty. The model performs best on truly bare spaces. Existing furniture creates layout conflicts and the dressing phase looks awkward.",
          "Photos with people, animals, or strong shadows from off-camera occupants. The pipeline forbids humans in the output but the source still needs to be people-free.",
          "Listings where you've already shot real staged photography and just need motion. Use Animate Single instead — same camera-move library, no furniture invention.",
        ],
      },
      {
        type: "cta",
        label: "Try Virtual Staging — 50 credits",
        href: "/video?mode=listing&category=virtual_staging",
        subhead: "Upload one empty room. Get a 10-second styled walkthrough.",
      },
    ],
  },

  {
    slug: "best-music-for-listing-videos",
    title: "The Best Music for Real Estate Listing Videos in 2026 (Plus 30 Suno Prompts You Can Steal)",
    description: "What music actually retains viewers on listing reels. Genre matrix by property type. Plus 30 copy-paste Suno prompts grouped by reel style — luxury, cinema, snappy, minimal.",
    publishedAt: "2026-05-06",
    readTime: 6,
    cover: "/vantage/done-for-you/house3/3.png",
    category: "MUSIC · LISTING REELS",
    keywords: [
      "music for real estate videos",
      "listing video music",
      "suno real estate music",
      "best music for property videos",
      "instrumental for listing video",
      "ai music real estate",
    ],
    sections: [
      {
        type: "lede",
        text:
          "Listings with custom-fit background music retain viewers 35% longer than listings using stock soundtracks. The shift in 2026 is mood-based scoring — each property gets a sound profile designed for its emotional register. Here's the matrix and 30 ready-to-paste Suno prompts.",
      },
      { type: "h2", text: "The matrix" },
      {
        type: "ul",
        items: [
          "Luxury exterior with golden-hour grade — Editorial Strings, Orchestral Lift, Solo Piano · Bauhaus, Cello Drone.",
          "Mid-century or architect-designed home — Vintage Jazz Quartet, Tension Build, Slow-Motion Ballad.",
          "Coastal, beach, or vacation rental — Bossa Nova, Latin Groove, Afrobeats Smooth.",
          "Modern minimalist or glass-and-steel — Clockwork Pulse, Glass Marimba, Ambient Drift.",
          "Country, ranch, or farmhouse — Country Drive, Warm Acoustic.",
          "Urban condo or downtown loft — Lo-Fi Chillhop, UK Garage Skip, Funk Groove, Jazz Noir.",
          "Million-dollar-plus listing where the music should whisper — Solo Piano · Bauhaus, Water-Drop Piano, Vocal Synth Pad.",
          "TikTok or Reels feed energy — Indie Pop Bounce, Synthwave Drive, Trap Orchestral.",
        ],
      },
      { type: "h2", text: "How Suno-rendered music actually works on a reel" },
      {
        type: "p",
        text:
          "Suno generates two takes per prompt at 15 seconds each. Drop the WAV/MP3 onto your timeline in CapCut, Premiere, or Final Cut. Cut camera moves to the beat. The Vantage music library at /music ships 60 pre-rendered Suno tracks — 30 prompts × 2 variants — categorized by reel style.",
      },
      { type: "h2", text: "What to avoid" },
      {
        type: "ul",
        items: [
          "Vocal tracks. Vocals fight the listing details and overlap with any voiceover. Stay instrumental.",
          "Genres that don't match the property archetype. Trap on a Hudson Valley estate, country drive on a Manhattan penthouse — the dissonance kills retention.",
          "Tracks with hard tempo changes. Listing reels are 15-30 seconds. A track that builds for 12 seconds and drops at second 13 lands wrong with auto-stitched cuts.",
          "Anything with copyright detection risk. Stock libraries' 'royalty-free' tracks frequently still ContentID-trigger. Suno-rendered tracks are yours.",
        ],
      },
      {
        type: "cta",
        label: "Browse the Vantage music library",
        href: "/video?mode=listing&category=done_for_you_reel",
        subhead: "30 Suno prompts × 2 variants — preview, download, or copy the prompt.",
      },
    ],
  },
];

export const getPostBySlug = (slug: string) => BLOG_POSTS.find((p) => p.slug === slug);
