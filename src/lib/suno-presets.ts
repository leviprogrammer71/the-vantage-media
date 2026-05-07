/**
 * Suno music prompt library for The Vantage listing reels.
 *
 * Each preset is a copy-pasteable Suno prompt designed to produce a 15-second
 * cinematic loop suitable for a 9:16 listing reel. Prompts follow the
 * structure recommended in Suno's official guide:
 *   genre + tempo-feel + instrumentation + vocal intent + mix intent + mood +
 *   use-case context.
 *
 * Always include "instrumental only, no vocals" to avoid singing — listing
 * reels need to leave the audio space free for any agent voiceover.
 *
 * Pair each preset with one of the four reel styles:
 *  - editorial — refined, slow, magazine-grade
 *  - cinema    — restrained, premium, anamorphic
 *  - snappy    — bold, fast, social-feed energy
 *  - minimal   — quiet, space, just-the-price elegance
 */

export type ReelStyle = "editorial" | "cinema" | "snappy" | "minimal";

export interface SunoPreset {
  id: string;
  /** Short label shown in the music picker */
  label: string;
  /** One-line vibe description shown under the label */
  description: string;
  /** Full Suno prompt — copy/paste verbatim */
  prompt: string;
  /** Reel styles this preset pairs with best */
  matches: ReelStyle[];
  /** Property archetype this song fits — surfaced as a small caption */
  bestFor: string;
  /** Primary audio file served from /public/music/ — Suno-rendered MP3 */
  audio: string;
  /** Alternate Suno-rendered variant of the same prompt (Suno returns 2) */
  audioVariant?: string;
  /** Music category — used for grouping the picker UI by family */
  category:
    | "editorial-luxury"
    | "cinema-anamorphic"
    | "snappy-social"
    | "minimal-quiet"
    | "world-vacation"
    | "hybrid";
}

// Helper — every preset has two Suno-rendered variants. The picker UI lets
// users toggle between them. Both files live in /public/music/.
const MUSIC = (slug: string) => ({
  audio: `/music/${slug}.mp3`,
  audioVariant: `/music/${slug}__v2.mp3`,
});

export const SUNO_PRESETS: SunoPreset[] = [
  // ── EDITORIAL · LUXURY CINEMATIC (1–6) ────────────────────────────────────
  {
    id: "editorial_strings",
    label: "Editorial Strings",
    description: "Slow neoclassical strings with a piano melody — magazine cover energy.",
    prompt:
      "Cinematic neoclassical instrumental, 70 BPM slow ballad tempo, sustained warm strings opening on a major 7th, intimate close-mic'd grand piano playing a single arpeggiated motif, soft sub-bass swell, gentle brushed felt percussion, no drums, instrumental only no vocals, polished mastered mix with airy reverb, mood: aspirational and refined, 15 seconds, builds gently with a subtle string crescendo at the eight-second mark, use case: luxury real estate listing reel, in the style of Max Richter and Ólafur Arnalds.",
    matches: ["editorial", "cinema"],
    bestFor: "Estate homes · brownstones · architectural icons",
    category: "editorial-luxury",
    ...MUSIC("editorial-strings"),
  },
  {
    id: "editorial_piano_solo",
    label: "Solo Piano · Bauhaus",
    description: "Just a Steinway. One spotlight. Fashion-house elegance.",
    prompt:
      "Solo grand piano instrumental, 64 BPM intimate ballad tempo, single Steinway D piano in a softly reverberated concert hall, pedal-rich phrases, occasional left-hand counter-melody, instrumental only no vocals, mood: poised and cinematic with a touch of melancholy, structure: open on a single low note, develop a five-note motif, resolve at the twelve-second mark, 15 seconds, mix: warm wooden body of the piano forward, room reverb tail, in the style of Ludovico Einaudi and Nils Frahm.",
    matches: ["editorial", "minimal"],
    bestFor: "Penthouses · architect-designed homes · gallery-feel interiors",
    category: "editorial-luxury",
    ...MUSIC("solo-piano-bauhaus"),
  },
  {
    id: "editorial_orchestral_lift",
    label: "Orchestral Lift",
    description: "Strings + brass swell that opens up like the first wide reveal.",
    prompt:
      "Cinematic orchestral instrumental, 80 BPM stately tempo, full string section sustaining a major chord, low cello drone, soft French horn entering at the four-second mark, distant timpani roll under, no drums no percussion no vocals instrumental only, mood: triumphant and elegant, structure: opens quietly, builds slowly with strings climbing, brass enters, resolves on a sustained major chord at second 14, 15 seconds, mix: lush hall reverb, wide stereo image, in the style of Hans Zimmer's quieter work and James Newton Howard.",
    matches: ["cinema", "editorial"],
    bestFor: "Hilltop estates · golf-course homes · grand exteriors",
    category: "editorial-luxury",
    ...MUSIC("orchestral-lift"),
  },
  {
    id: "editorial_warm_acoustic",
    label: "Warm Acoustic",
    description: "Fingerstyle nylon guitar and brushed kit — quietly hopeful.",
    prompt:
      "Warm acoustic instrumental, 78 BPM relaxed tempo, fingerstyle nylon-string classical guitar leading, soft brushed jazz drum kit, upright double bass walking lightly, faint Rhodes electric piano underneath, instrumental only no vocals, mood: warm welcoming and quietly hopeful, structure: gentle melody on guitar, bass enters at four seconds, brushes at six seconds, ends on a sustained chord at twelve seconds, 15 seconds, mix: organic woody acoustic warmth, in the style of Charlie Haden and Pat Metheny.",
    matches: ["editorial"],
    bestFor: "Cottages · cabins · craftsman homes · family ranches",
    category: "editorial-luxury",
    ...MUSIC("warm-acoustic"),
  },
  {
    id: "editorial_cello_drone",
    label: "Cello Drone",
    description: "Single cello sustains underneath a vibraphone tinkle. Heritage.",
    prompt:
      "Minimalist instrumental, 60 BPM slow drone tempo, sustained solo cello holding a low D, vibraphone tinkling a sparse bell-like melody on top, distant marimba accents, dust-of-strings reverb, no drums no vocals instrumental only, mood: heritage timeless and contemplative, structure: cello drone throughout, vibraphone enters at second three with five sparse notes, ends on the cello sustaining alone at second 14, 15 seconds, mix: dry intimate cello forward, ethereal vibraphone reverb tail, in the style of Arvo Pärt's tintinnabuli technique.",
    matches: ["cinema", "minimal"],
    bestFor: "Historic homes · museums · stone heritage properties",
    category: "editorial-luxury",
    ...MUSIC("cello-drone"),
  },
  {
    id: "editorial_french_chamber",
    label: "Parisian Chamber",
    description: "Accordion + upright bass + brushed snare — Avenue Montaigne energy.",
    prompt:
      "French chamber jazz instrumental, 90 BPM relaxed swing tempo, intimate accordion playing a wistful melody in a minor key, upright double bass walking lightly, brushed snare drum, occasional muted trumpet phrase, no vocals instrumental only, mood: elegant Parisian and slightly nostalgic, 15 seconds, mix: warm 1950s jazz club acoustics, in the style of Yann Tiersen's Amélie soundtrack.",
    matches: ["editorial", "cinema"],
    bestFor: "Pied-à-terres · brownstones · French-influenced homes · café-adjacent listings",
    category: "editorial-luxury",
    ...MUSIC("parisian-chamber"),
  },

  // ── CINEMA · ANAMORPHIC PREMIUM (7–12) ────────────────────────────────────
  {
    id: "cinema_anthem",
    label: "Hero Anthem",
    description: "Slow build to a wide cinematic peak. Movie-trailer.",
    prompt:
      "Cinematic trailer-style instrumental, 90 BPM stately tempo, low piano ostinato in octaves, swelling strings rising from low to high register, distant taiko-style cinematic boom drums entering at the seven-second mark, brass fanfare hint at second twelve, instrumental only no vocals, mood: confident heroic and cinematic, structure: ostinato builds, drums enter, brass peaks, resolves into a sustained chord, 15 seconds, mix: lush orchestral hall with wide stereo placement, in the style of Hans Zimmer's Inception and Interstellar.",
    matches: ["cinema"],
    bestFor: "Architectural showcases · waterfront mansions · luxury auto-ad-feel listings",
    category: "cinema-anamorphic",
    ...MUSIC("hero-anthem"),
  },
  {
    id: "cinema_tension_build",
    label: "Tension Build",
    description: "Pulsing cellos + heartbeat sub kick. Anticipation.",
    prompt:
      "Cinematic suspense instrumental, 100 BPM pulsing tempo, staccato cello ostinato eighth-notes in a minor key, heartbeat sub-bass kick on the downbeat, sparse high-string sustains adding tension, no melody until second eleven where a single solo violin enters, instrumental only no vocals, mood: anticipatory and intriguing, 15 seconds, mix: tight close-mic strings, deep sub-bass, restrained reverb, in the style of Jóhann Jóhannsson and Cliff Martinez.",
    matches: ["cinema", "snappy"],
    bestFor: "Mid-century moderns · Hollywood Hills homes · architect statements",
    category: "cinema-anamorphic",
    ...MUSIC("tension-build"),
  },
  {
    id: "cinema_slow_motion",
    label: "Slow-Motion Ballad",
    description: "Half-time hi-hats + reverbed Rhodes. Dreamlike.",
    prompt:
      "Cinematic dream-pop instrumental, 75 BPM half-time feel, dreamy reverbed Rhodes electric piano, soft brushed drum kit playing half-time hi-hats, breathing sub-bass, distant ambient pad with shimmer reverb, no drums on the snare backbeat, no vocals instrumental only, mood: dreamy nostalgic and contemplative, 15 seconds, mix: lush ambient reverb with a tape saturation warmth, in the style of Beach House instrumentals and Mac DeMarco's quieter work.",
    matches: ["cinema", "editorial"],
    bestFor: "Coastal homes · sunset-balcony listings · resort properties",
    category: "cinema-anamorphic",
    ...MUSIC("slow-motion-ballad"),
  },
  {
    id: "cinema_ambient_pad",
    label: "Ambient Drift",
    description: "Just synth pad and air. Lets the visuals lead.",
    prompt:
      "Ambient instrumental, 60 BPM drone tempo, lush analog synth pad sustained throughout in a major key, occasional bell-tone shimmer, deep sub-bass drone, no drums no rhythm no vocals instrumental only, mood: serene contemplative and spacious, 15 seconds, mix: cathedral reverb, wide stereo, almost weightless, in the style of Brian Eno's Music for Airports and Stars of the Lid.",
    matches: ["minimal", "cinema"],
    bestFor: "Modern minimalist homes · gallery interiors · meditation studios",
    category: "cinema-anamorphic",
    ...MUSIC("ambient-drift"),
  },
  {
    id: "cinema_post_rock",
    label: "Post-Rock Crescendo",
    description: "Tremolo guitar build to a Sigur Rós wash.",
    prompt:
      "Post-rock instrumental, 85 BPM building tempo, tremolo-picked clean electric guitar with reverb and delay, sustained string pad underneath, soft kick drum quarter-notes entering at second six, glockenspiel tinkle adding sparkle at second ten, no vocals instrumental only, mood: euphoric melancholic and atmospheric, structure: builds slowly, peaks at second twelve, sustains the wash through to fifteen, 15 seconds, mix: ethereal ambient reverb wash, in the style of Sigur Rós and Explosions in the Sky.",
    matches: ["cinema", "editorial"],
    bestFor: "Mountain homes · expansive landscapes · drone-aerial-heavy listings",
    category: "cinema-anamorphic",
    ...MUSIC("post-rock-crescendo"),
  },
  {
    id: "cinema_jazz_noir",
    label: "Jazz Noir",
    description: "Walking bass + muted trumpet. Late-night urban.",
    prompt:
      "Film-noir jazz instrumental, 72 BPM slow swing tempo, upright double bass walking, brushed jazz drum kit on the snare, muted trumpet playing a smoky melody in a minor key, vibraphone color tones, no vocals instrumental only, mood: late-night urban sophistication and a touch of mystery, 15 seconds, mix: 1950s smoky jazz club acoustics, intimate and warm, in the style of Miles Davis Birth of the Cool and the Chinatown soundtrack.",
    matches: ["cinema", "editorial"],
    bestFor: "Manhattan condos · downtown lofts · penthouses with city views",
    category: "cinema-anamorphic",
    ...MUSIC("jazz-noir"),
  },

  // ── SNAPPY · SOCIAL FEED ENERGY (13–19) ──────────────────────────────────
  {
    id: "snappy_indie_pop",
    label: "Indie Pop Bounce",
    description: "Upbeat indie kit + clap. TikTok house tour energy.",
    prompt:
      "Upbeat indie pop instrumental, 120 BPM driving tempo, bright acoustic guitar strumming on the upbeat, clean electric guitar arpeggios, claps on beats two and four, kick drum on every downbeat, bouncy electric bass, glockenspiel sparkle on top, no vocals instrumental only, mood: cheerful warm and inviting, 15 seconds, mix: modern pop polish with present low-end, in the style of Vampire Weekend instrumentals and Two Door Cinema Club.",
    matches: ["snappy"],
    bestFor: "Family homes · suburban listings · agent-on-camera tours",
    category: "snappy-social",
    ...MUSIC("indie-pop-bounce"),
  },
  {
    id: "snappy_lofi_chill",
    label: "Lo-Fi Chillhop",
    description: "Boom-bap kit + dusty Rhodes. Lo-fi tour vibe.",
    prompt:
      "Lo-fi chillhop instrumental, 85 BPM laid-back boom-bap tempo, dusty filtered Rhodes electric piano playing a warm chord progression, classic boom-bap drum kit with vinyl crackle, deep sub-bass on the downbeats, occasional tape stop and sample chops, no vocals instrumental only, mood: cozy nostalgic and effortlessly cool, 15 seconds, mix: tape saturation and analog warmth, deliberate vinyl noise floor, in the style of Nujabes and J Dilla.",
    matches: ["snappy", "minimal"],
    bestFor: "Starter homes · urban condos · loft conversions · Airbnb-target listings",
    category: "snappy-social",
    ...MUSIC("lo-fi-chillhop"),
  },
  {
    id: "snappy_house_drop",
    label: "Luxury House Beat",
    description: "Deep house four-on-the-floor. Las Vegas penthouse.",
    prompt:
      "Deep house instrumental, 122 BPM four-on-the-floor tempo, classic 909 kick drum, crisp closed hi-hats on the eighth notes, deep filtered analog synth bass, lush warm chord pads, vinyl crackle texture, sidechained pad pumping with the kick, no vocals instrumental only, mood: sophisticated nighttime confident and luxurious, 15 seconds, mix: Berlin club polish with deep sub-bass, in the style of Maceo Plex and Jamie Jones.",
    matches: ["snappy", "cinema"],
    bestFor: "Luxury rentals · poolside listings · Vegas / Miami / LA penthouses",
    category: "snappy-social",
    ...MUSIC("luxury-house-beat"),
  },
  {
    id: "snappy_funk_groove",
    label: "Funk Groove",
    description: "Slap bass + Clavinet. Confident, walks like a Dame.",
    prompt:
      "Modern funk instrumental, 108 BPM medium-tempo groove, slap electric bass leading with rhythmic pops, Clavinet stabs on the offbeats, tight funk drum kit with ghost notes on the snare, brass section hits on the chorus marker, no vocals instrumental only, mood: confident smooth and a little bit cocky, 15 seconds, mix: 1970s funk warmth with modern punch, in the style of Vulfpeck and Tower of Power.",
    matches: ["snappy"],
    bestFor: "Urban brownstones · creative-loft listings · agent-with-personality tours",
    category: "snappy-social",
    ...MUSIC("funk-groove"),
  },
  {
    id: "snappy_uk_garage",
    label: "UK Garage Skip",
    description: "Skippy 2-step kit. London new-build.",
    prompt:
      "UK garage instrumental, 130 BPM 2-step skip tempo, swung skipping kick-snare pattern, crisp shaker on the offbeats, deep wobbly bass, glassy synth chord pads, vocal-chop atmosphere with no actual vocals, instrumental only, mood: cool stylish and forward-leaning, 15 seconds, mix: club-ready sub-bass and crisp top end, in the style of MJ Cole and Disclosure.",
    matches: ["snappy"],
    bestFor: "New-build condos · city flats · modern UK / EU listings",
    category: "snappy-social",
    ...MUSIC("uk-garage-skip"),
  },
  {
    id: "snappy_country_drive",
    label: "Country Drive",
    description: "Banjo-stomp kick. Texas ranch listing.",
    prompt:
      "Modern country instrumental, 110 BPM driving tempo, banjo plucking the melody, acoustic guitar strumming, stomp-clap percussion on beats two and four, kick drum on every downbeat, slide guitar accents, no vocals instrumental only, mood: warm Americana confident and outdoorsy, 15 seconds, mix: modern Nashville polish with organic instruments forward, in the style of Avicii's Hey Brother and modern country crossover.",
    matches: ["snappy"],
    bestFor: "Ranches · farmhouses · Texas / Carolina / Tennessee listings",
    category: "snappy-social",
    ...MUSIC("country-drive"),
  },
  {
    id: "snappy_latin_groove",
    label: "Latin Groove",
    description: "Reggaeton dembow + horns. Miami / Southwest.",
    prompt:
      "Latin pop instrumental, 95 BPM dembow tempo, classic reggaeton kick-snare-snare pattern, bright nylon guitar arpeggios, brass horn stabs on the chorus marker, conga and timbale fills, deep electric bass, no vocals instrumental only, mood: warm celebratory and golden-hour, 15 seconds, mix: Latin pop sheen with present rhythm section, in the style of J Balvin instrumentals and Bad Bunny's quieter tracks.",
    matches: ["snappy", "cinema"],
    bestFor: "Miami condos · Southwest adobes · vacation rentals · resort listings",
    category: "world-vacation",
    ...MUSIC("latin-groove"),
  },

  // ── MINIMAL · QUIET ELEGANCE (20–24) ─────────────────────────────────────
  {
    id: "minimal_clock_pulse",
    label: "Clockwork Pulse",
    description: "Just a metronomic Rhodes pulse. Hyper-modern.",
    prompt:
      "Minimal techno instrumental, 100 BPM steady metronomic tempo, single Rhodes electric piano note pulsing eighth-notes throughout, deep 808 sub-bass on the downbeat, soft hi-hat ticks, no melody, no chords, no vocals instrumental only, mood: hyper-modern futuristic and confidently restrained, 15 seconds, mix: dry intimate close-mic, in the style of Aphex Twin's Selected Ambient Works and Boards of Canada.",
    matches: ["minimal"],
    bestFor: "Glass-and-steel modern · architect minimals · Calatrava-feel exteriors",
    category: "minimal-quiet",
    ...MUSIC("clockwork-pulse"),
  },
  {
    id: "minimal_kalimba",
    label: "Kalimba Light",
    description: "Just kalimba and air. Bali villa.",
    prompt:
      "Minimal world instrumental, 70 BPM relaxed tempo, solo kalimba playing a sparse pentatonic melody, distant tabla finger taps, deep singing-bowl drone, soft handpan pings, no vocals instrumental only, mood: serene meditative and earthy, 15 seconds, mix: organic acoustic warmth with dry close-mic, in the style of Nadav Cohen and contemporary world ambient.",
    matches: ["minimal"],
    bestFor: "Tropical villas · Bali / Tulum listings · meditation-room features",
    category: "world-vacation",
    ...MUSIC("kalimba-light"),
  },
  {
    id: "minimal_glass_marimba",
    label: "Glass Marimba",
    description: "Marimba + glass harmonica. Fragile & expensive.",
    prompt:
      "Minimal contemporary instrumental, 65 BPM gentle tempo, marimba playing a sparse five-note melody, glass harmonica sustained tones underneath, distant celesta tinkle, no rhythm section no vocals instrumental only, mood: fragile beautiful and expensive, 15 seconds, mix: high-fidelity classical recording quality with detailed reverb, in the style of Steve Reich's mallet works.",
    matches: ["minimal", "editorial"],
    bestFor: "Architect homes · museum-feel listings · gallery interiors",
    category: "minimal-quiet",
    ...MUSIC("glass-marimba"),
  },
  {
    id: "minimal_vocal_synth",
    label: "Vocal Synth Pad",
    description: "Wordless choir pad. Atmospheric & cathedral.",
    prompt:
      "Minimal ambient instrumental, 60 BPM drone tempo, wordless choir-style synth pad sustained throughout in a major key, no actual vocals just synthesized choir tones, soft sub-bass drone, occasional bell-tone, no drums no rhythm no vocals instrumental only, mood: spacious sacred and contemplative, 15 seconds, mix: cathedral reverb with wide stereo image, in the style of Arvo Pärt and Eric Whitacre.",
    matches: ["minimal", "cinema"],
    bestFor: "Estate homes with double-height ceilings · churches converted to residences · sacred-feel spaces",
    category: "minimal-quiet",
    ...MUSIC("vocal-synth-pad"),
  },
  {
    id: "minimal_water_drops",
    label: "Water-Drop Piano",
    description: "Sparse droplet piano. Spa quiet.",
    prompt:
      "Minimal piano instrumental, 60 BPM very slow tempo, single grand piano playing isolated single notes spaced widely apart in a major key, distant water-drop foley sound effects, no other instruments no vocals instrumental only, mood: spa-like meditative and weightless, 15 seconds, mix: dry close-mic piano with subtle room reverb, in the style of Harold Budd and Sakamoto.",
    matches: ["minimal"],
    bestFor: "Spa listings · pool-and-water-feature properties · zen / wellness homes",
    category: "minimal-quiet",
    ...MUSIC("water-drop-piano"),
  },

  // ── HYBRID & SPECIALIST (25–30) ──────────────────────────────────────────
  {
    id: "hybrid_synthwave",
    label: "Synthwave Drive",
    description: "1984 chrome. Miami pastels.",
    prompt:
      "Synthwave instrumental, 110 BPM driving tempo, retro analog Juno-style synth pads, gated reverb snare on beats two and four, electronic hand-clap, deep arpeggiated synth bass, sparkly DX7 bell lead playing a melody, no vocals instrumental only, mood: nostalgic 1984 confident and chrome, 15 seconds, mix: 1980s gated reverb polish with modern low-end, in the style of Kavinsky and The Midnight.",
    matches: ["snappy", "cinema"],
    bestFor: "Miami art-deco condos · 1980s-renovated homes · sunset-pool listings",
    category: "hybrid",
    ...MUSIC("synthwave-drive"),
  },
  {
    id: "hybrid_trap_orchestral",
    label: "Trap Orchestral",
    description: "808s + cellos. Modern luxury anthem.",
    prompt:
      "Hybrid trap-orchestral instrumental, 75 BPM half-time trap tempo, deep 808 sub-bass on beats one and three, crisp trap hi-hat rolls, full string section sustaining lush chords, French horn melody on top, no vocals instrumental only, mood: modern luxury confident and current, 15 seconds, mix: trap sub-bass weight under cinematic strings, in the style of Hans Zimmer's modern hybrid scores and Travis Scott instrumentals.",
    matches: ["snappy", "cinema"],
    bestFor: "Modern luxury · footballer mansions · LA / Atlanta / Houston listings",
    category: "hybrid",
    ...MUSIC("trap-orchestral"),
  },
  {
    id: "hybrid_afrobeat",
    label: "Afrobeats Smooth",
    description: "Smooth Afrobeats kit + warm guitar. Caribbean luxury.",
    prompt:
      "Smooth Afrobeats instrumental, 102 BPM medium tempo, signature Afrobeats kick-snare pattern, log drum bass, warm clean electric guitar arpeggios, marimba accents, distant choir-like synth pad, no vocals instrumental only, mood: warm celebratory and golden, 15 seconds, mix: modern Afro-pop polish with deep low-end, in the style of Burna Boy instrumentals and Wizkid's Made in Lagos.",
    matches: ["snappy"],
    bestFor: "Tropical / Caribbean rentals · warm-climate vacation listings",
    category: "world-vacation",
    ...MUSIC("afrobeats-smooth"),
  },
  {
    id: "hybrid_bossa_nova",
    label: "Bossa Nova",
    description: "Nylon guitar + soft brushes. Beachside Rio.",
    prompt:
      "Bossa nova instrumental, 88 BPM relaxed tempo, classical nylon-string guitar playing the signature bossa rhythm, brushed jazz drum kit, upright double bass walking, soft Rhodes electric piano sustaining chords, occasional muted trumpet phrase, no vocals instrumental only, mood: warm relaxed and sophisticated, 15 seconds, mix: warm 1960s Brazilian jazz acoustics, in the style of João Gilberto and Antônio Carlos Jobim.",
    matches: ["editorial", "snappy"],
    bestFor: "Beachfront listings · Rio / Lisbon / coastal Portugal · vacation rentals",
    category: "world-vacation",
    ...MUSIC("bossa-nova"),
  },
  {
    id: "hybrid_vintage_jazz_quartet",
    label: "Vintage Jazz Quartet",
    description: "Hammond B3 swirl. Mid-century modern showcase.",
    prompt:
      "Vintage jazz instrumental, 98 BPM medium swing tempo, Hammond B3 organ leading the melody with Leslie speaker swirl, jazz drum kit playing on the ride cymbal, upright double bass walking, clean jazz electric guitar comping, no vocals instrumental only, mood: confident classy and unmistakably mid-century, 15 seconds, mix: 1960s Blue Note label warmth and intimacy, in the style of Jimmy Smith and Booker T. & the M.G.'s.",
    matches: ["editorial", "snappy"],
    bestFor: "Mid-century moderns · Eichlers · 1960s renovations · Palm Springs",
    category: "hybrid",
    ...MUSIC("vintage-jazz-quartet"),
  },
  {
    id: "hybrid_orchestral_house",
    label: "Orchestral House",
    description: "Strings over a four-on-the-floor kick. Yacht.",
    prompt:
      "Orchestral house instrumental, 118 BPM steady four-on-the-floor tempo, full string section sustaining lush chord progressions, classic house kick drum on every downbeat, sidechained synth pad pumping with the kick, distant choir pad shimmer, deep filtered synth bass, no actual vocals just choir-style synth tones, instrumental only, mood: aspirational confident and panoramic, 15 seconds, mix: glossy modern dance polish with strings forward, in the style of Above & Beyond and the more cinematic Eric Prydz tracks.",
    matches: ["cinema", "snappy"],
    bestFor: "Yacht-club listings · waterfront condos · resort estates · Riviera homes",
    category: "hybrid",
    ...MUSIC("orchestral-house"),
  },

  // ── BONUS · DARK TRAINING ROOM ────────────────────────────────────────────
  // Extra Suno track in the library that doesn't map to any of the original
  // 30 prompts — high-tension cinematic for new-build / construction reels.
  {
    id: "bonus_dark_training_room",
    label: "Dark Training Room",
    description: "Tense cinematic loop — felt synth pulse, distant percussion, gym-energy build.",
    prompt:
      "Cinematic tension instrumental, 95 BPM driving pulse, deep felt-synth ostinato in a minor key, distant taiko-style percussion entering at the four-second mark, sub-bass pulses with each downbeat, sparse string sustains adding height, a single rising synth riser at second twelve, no vocals instrumental only, mood: high-stakes confident and athletic, 15 seconds, mix: dark cinematic weight with present low-end punch, in the style of Hans Zimmer's Dark Knight cues and modern ad scores.",
    matches: ["snappy", "cinema"],
    bestFor: "Construction / build reels · gym & wellness conversions · new-build showcases",
    category: "hybrid",
    ...MUSIC("dark-training-room"),
  },
];

/**
 * Suggest the top three Suno presets for a given reel style + property hint.
 * Used by the music picker in ListingVideoFlow to surface the best options
 * without overwhelming the user.
 */
/**
 * Auto-suggest the canonical song for a Done-For-You style. The Vantage
 * stitcher uses this to bake a default soundtrack into every DFY reel
 * unless the user explicitly opts out — pulled from feel/title alignment
 * with each reel-style aesthetic.
 *
 *   editorial → Editorial Strings  (slow neoclassical, magazine cover)
 *   cinema    → Hero Anthem        (trailer-style orchestral build)
 *   snappy    → Indie Pop Bounce   (bright TikTok / Reels energy)
 *   minimal   → Solo Piano · Bauhaus (whisper-quiet refined)
 */
const STYLE_TO_DEFAULT_SONG: Record<ReelStyle, string> = {
  editorial: "editorial_strings",
  cinema:    "cinema_anthem",
  snappy:    "snappy_indie_pop",
  minimal:   "editorial_piano_solo",
};

export function defaultSongForStyle(style: ReelStyle): SunoPreset | null {
  const id = STYLE_TO_DEFAULT_SONG[style];
  return SUNO_PRESETS.find((p) => p.id === id) ?? null;
}

export function suggestPresets(
  style: ReelStyle,
  propertyHint?: string,
): SunoPreset[] {
  const matching = SUNO_PRESETS.filter((p) => p.matches.includes(style));
  if (!propertyHint) return matching.slice(0, 3);
  const hint = propertyHint.toLowerCase();
  const scored = matching.map((p) => ({
    preset: p,
    score: hint && p.bestFor.toLowerCase().includes(hint) ? 1 : 0,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.preset);
}
