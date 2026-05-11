// Central credit configuration — single source of truth.
//
// REPLICATE COST MODEL (May 2026):
//   Seedance 1 Pro 1080p: $0.058/sec without audio, up to $0.15/sec at peak.
//   We target $0.15/sec for safety so margins survive a price hike or a
//   model swap to a costlier render path.
//
//   Per-render cost:
//     5s clip  → $0.75
//     10s clip → $1.50
//     Image step (gpt-image-2 / nano-banana / flux-kontext) → ~$0.04–0.10
//
// CREDIT VALUE: 1 credit = $0.06 (PRO pack tier). Lower tiers pay more
// per credit; STUDIO pack pays $0.05/credit. Average $0.07/credit.
//
// MARGIN TARGET: 60% gross on Replicate cost.
//   5s clip cost $0.75 → revenue target $1.88 → 30 credits @ $0.06.
//   10s clip cost $1.50 → revenue target $3.75 → 60 credits @ $0.06.
//
// All costs below recalibrated to that target.
export const CREDIT_COSTS = {
  photoEnhance: 10,           // ~$0.05 nano-banana cost
  // Listing videos — base unit is 5 credits per second of 1080p output
  listingVideo5s: 30,         // 5s @ 6 cr/sec
  listingVideo10s: 60,        // 10s @ 6 cr/sec
  // Construction transformation (2-call pipeline: AI before-image + Kling)
  transformationOwn5s: 35,
  transformationOwn10s: 65,
  transformationAI5s: 50,     // extra image-gen cost
  transformationAI10s: 80,
  // Cleanup & Setup transformations
  cleanupAI5s: 55,
  cleanupAI10s: 85,
  cleanupOwn5s: 40,
  cleanupOwn10s: 70,
  setupAI5s: 55,
  setupAI10s: 85,
  setupOwn5s: 40,
  setupOwn10s: 70,
  websiteConsultation: 10,
  durationUpcharge: 10,
} as const;

// Credit packs are now subscription-style: monthly billing or annual billing
// (same credits per cycle, 30% discount when paid annually + 2 bonus months
// of credits dropped on day one). The annual toggle on /pricing flips
// between price_monthly and price_annual.
//
// `popular` marks the "Most Chosen" sticker.
// `bestValue` marks the explicit "Best Value" sticker — used to anchor the
// pack we want users to land on (PRO at $79).
export const CREDIT_PACKS = [
  {
    id: "starter",
    name: "STARTER",
    credits: 200,
    price: 19, // legacy field — kept for any callers still reading .price
    price_monthly: 19,
    price_annual: 160,        // $13.33/mo equivalent — 30% off + 2-month bonus
    annual_credits_bonus: 400, // 2 extra months of credits at sign-up
    perCredit: "$0.095",
    savings: null,
    popular: false,
    bestValue: false,
    priceType: "starter",
    priceTypeAnnual: "starter_annual",
    valueCallout: "~5 TRANSFORMATION VIDEOS",
    features: [
      "5 transformation videos",
      "or 10 listing videos",
      "or mix and match freely",
      "Subtle watermark on every export · removed on BUILDER + above",
      "Credits valid 12 months from purchase",
    ],
  },
  {
    id: "builder",
    name: "BUILDER",
    credits: 500,
    price: 39,
    price_monthly: 39,
    price_annual: 328,         // ~$27.33/mo equivalent
    annual_credits_bonus: 1000,
    perCredit: "$0.078",
    savings: "save 18%",
    popular: true,
    bestValue: false,
    priceType: "standard",
    priceTypeAnnual: "standard_annual",
    valueCallout: "~12 TRANSFORMATION VIDEOS",
    features: [
      "12 transformation videos",
      "or 25 listing videos",
      "or mix and match freely",
      "Watermark removed on every export",
      "Credits valid 12 months from purchase",
    ],
  },
  {
    id: "pro",
    name: "PRO",
    credits: 1200,
    price: 79,
    price_monthly: 79,
    price_annual: 664,         // ~$55.33/mo equivalent — 30% off + 2-month bonus
    annual_credits_bonus: 2400,
    perCredit: "$0.066",
    savings: "save 31%",
    popular: false,
    bestValue: true,           // ← anchors users to the $79 tier
    priceType: "value",
    priceTypeAnnual: "value_annual",
    valueCallout: "~30 TRANSFORMATION VIDEOS",
    features: [
      "30 transformation videos",
      "or 60 listing videos",
      "or mix and match freely",
      "Watermark removed on every export",
      "Credits valid 12 months from purchase",
      "For weekly content creators",
    ],
  },
  {
    id: "studio",
    name: "STUDIO",
    credits: 3000,
    price: 149,
    price_monthly: 149,
    price_annual: 1252,        // ~$104.33/mo equivalent
    annual_credits_bonus: 6000,
    perCredit: "$0.050",
    savings: "save 47%",
    popular: false,
    bestValue: false,
    priceType: "pro_pack",
    priceTypeAnnual: "pro_pack_annual",
    valueCallout: "~75 TRANSFORMATION VIDEOS",
    features: [
      "75 transformation videos",
      "or 150 listing videos",
      "or mix and match freely",
      "Watermark removed on every export",
      "Credits valid 12 months from purchase",
      "For agencies and high-volume teams",
    ],
  },
] as const;

export const SUBSCRIPTION_PLANS = [
  {
    id: "solo_agent",
    name: "SOLO AGENT",
    tagline: "For the working agent",
    price_monthly: 199,
    price_annual: 1668,
    credits_monthly: 800,
    is_popular: false,
    features: [
      "100 listing reels per month",
      "All 4 video categories",
      "Brand bumper on every reel",
      "Unlimited AI staging styles",
      "Priority render queue",
    ],
  },
  {
    id: "studio",
    name: "STUDIO",
    tagline: "For the photographer or boutique brokerage",
    price_monthly: 299,
    price_annual: 2508,
    credits_monthly: 2000,
    is_popular: true,
    features: [
      "400 listing reels per month",
      "Everything in Solo Agent",
      "Custom brand presets (logo + color grade + intro)",
      "AI voiceover (ElevenLabs)",
      "Virtual staging unlimited",
      "Private agent gallery",
      "Stripe-secured invoicing",
    ],
  },
  {
    id: "brokerage",
    name: "THE HOUSE",
    tagline: "For brokerages, agencies, MLS partners",
    price_monthly: null,
    price_annual: null,
    credits_monthly: null,
    is_popular: false,
    features: [
      "White-label delivery",
      "Team seats (per-agent gallery)",
      "Bulk MLS handoff",
      "Dedicated studio liaison",
      "API access",
      "Custom render SLA",
    ],
  },
] as const;

export const FREE_SIGNUP_CREDITS = 60;

export function getTransformationCost(
  beforeMode: "ai" | "upload",
  duration: "5s" | "10s",
  category: "construction" | "cleanup" | "setup" = "construction"
): number {
  if (category === "cleanup") {
    if (beforeMode === "ai") return duration === "10s" ? CREDIT_COSTS.cleanupAI10s : CREDIT_COSTS.cleanupAI5s;
    return duration === "10s" ? CREDIT_COSTS.cleanupOwn10s : CREDIT_COSTS.cleanupOwn5s;
  }
  if (category === "setup") {
    if (beforeMode === "ai") return duration === "10s" ? CREDIT_COSTS.setupAI10s : CREDIT_COSTS.setupAI5s;
    return duration === "10s" ? CREDIT_COSTS.setupOwn10s : CREDIT_COSTS.setupOwn5s;
  }
  // Construction (default)
  if (beforeMode === "ai") return duration === "10s" ? CREDIT_COSTS.transformationAI10s : CREDIT_COSTS.transformationAI5s;
  return duration === "10s" ? CREDIT_COSTS.transformationOwn10s : CREDIT_COSTS.transformationOwn5s;
}

export function getListingCost(duration: "5s" | "10s"): number {
  return duration === "10s" ? CREDIT_COSTS.listingVideo10s : CREDIT_COSTS.listingVideo5s;
}

export function formatCredits(n: number): string {
  return n.toLocaleString();
}
