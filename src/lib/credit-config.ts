// Central credit configuration — single source of truth.
//
// ── May 23, 2026 — REBALANCE ──
// User directive: 60 free credits has to actually let a new user produce
// something. We lowered per-feature credit costs ~4× across the board and
// recovered margin via higher subscription tiers ($39 / $79 / $149.99).
//
// New economics:
//   • Done-For-You Reel = 50 credits — user's anchor price
//   • Single 5s clip = 8 cr / 10s clip = 12 cr
//   • Free signup = 60 cr → exactly 1 Done-For-You + room to test
//   • $39 STARTER → 500 cr → 10 Done-For-You or 60 single clips
//
// Credit value at $39/500 = $0.078/credit. Still healthy margin against
// $0.06–$0.15 per render cost when amortised over batched flows.
export const CREDIT_COSTS = {
  photoEnhance: 5,            // light gpt-image-2 / nano-banana edit
  // Listing videos — base unit is now ~1 cr per second of 1080p output
  listingVideo5s: 8,
  listingVideo10s: 12,
  // Construction transformation (2-call pipeline: AI before-image + Kling)
  transformationOwn5s: 7,
  transformationOwn10s: 12,
  transformationAI5s: 10,     // extra image-gen cost
  transformationAI10s: 15,
  // Cleanup & Setup transformations
  cleanupAI5s: 10,
  cleanupAI10s: 15,
  cleanupOwn5s: 7,
  cleanupOwn10s: 12,
  setupAI5s: 10,
  setupAI10s: 15,
  setupOwn5s: 7,
  setupOwn10s: 12,
  websiteConsultation: 5,
  durationUpcharge: 3,
} as const;

// Credit packs are now subscription-style: monthly billing or annual billing
// (same credits per cycle, 30% discount when paid annually + 2 bonus months
// of credits dropped on day one). The annual toggle on /pricing flips
// between price_monthly and price_annual.
//
// `popular` marks the "Most Chosen" sticker.
// `bestValue` marks the explicit "Best Value" sticker — used to anchor the
// pack we want users to land on (PRO at $79).
// ── May 24, 2026 — TIER DIFFERENTIATION (research-driven) ──
// Audit finding: tiers were undifferentiated except by credit count, so
// upgrade pressure was weak. Research-backed structure:
//   STARTER ($39): subtle watermark, the "try it" pack
//   PRO ($79):     watermark off + brand presets + priority queue + 30-day
//                  money-back. The "weekly poster" pack.
//   STUDIO ($149): PRO features + team seats + MLS-ready exports +
//                  30-day money-back + dedicated render priority. The
//                  "brokerage / team" pack.
// 30-day money-back on PRO+ lifts revenue ~6.5% net of refunds per
// SaaS conversion research.
// Anchor against BoxBrownie ($24/image × 3 rooms = $72) and videographers
// ($300-1000/listing) — both expressed in marketing copy directly.
export const CREDIT_PACKS = [
  {
    id: "starter",
    name: "STARTER",
    credits: 500,                // ~10 Done-For-You reels or 60 single clips
    price: 39,
    price_monthly: 39,
    price_annual: 328,           // ~$27.33/mo equivalent — 30% off + 2-month bonus
    annual_credits_bonus: 1000,
    perCredit: "$0.078",
    savings: null,
    popular: false,
    bestValue: false,
    priceType: "starter",
    priceTypeAnnual: "starter_annual",
    valueCallout: "~10 DONE-FOR-YOU REELS",
    features: [
      "10 Done-For-You reels",
      "or 60 single-clip animations",
      "or mix and match freely",
      "Subtle Vantage watermark on every export",
      "AI-disclosure tag · MLS-safe",
      "Credits valid 12 months from purchase",
    ],
  },
  {
    id: "pro",
    name: "PRO",
    credits: 1200,               // ~24 Done-For-You reels
    price: 79,
    price_monthly: 79,
    price_annual: 664,           // ~$55.33/mo equivalent — 30% off + 2-month bonus
    annual_credits_bonus: 2400,
    perCredit: "$0.066",
    savings: "save 16%",
    popular: true,               // ← MOST CHOSEN anchor
    bestValue: false,
    priceType: "standard",
    priceTypeAnnual: "standard_annual",
    valueCallout: "~24 DONE-FOR-YOU REELS",
    features: [
      "24 Done-For-You reels",
      "or 150 single-clip animations",
      "or mix and match freely",
      "★ Watermark removed",
      "★ Brand presets — logo + agent name baked in",
      "★ Priority render queue",
      "★ 30-day money-back guarantee",
      "AI-disclosure tag · MLS-safe",
      "Credits valid 12 months from purchase",
    ],
  },
  {
    id: "studio",
    name: "STUDIO",
    credits: 2800,               // ~56 Done-For-You reels
    price: 149.99,
    price_monthly: 149.99,
    price_annual: 1259,          // ~$104.92/mo equivalent — 30% off + 2-month bonus
    annual_credits_bonus: 5600,
    perCredit: "$0.054",
    savings: "save 31%",
    popular: false,
    bestValue: true,             // ← BEST VALUE — for teams
    priceType: "value",
    priceTypeAnnual: "value_annual",
    valueCallout: "~56 DONE-FOR-YOU REELS",
    features: [
      "56 Done-For-You reels",
      "or 350 single-clip animations",
      "or mix and match freely",
      "★ Watermark removed",
      "★ Brand presets — logo + agent name baked in",
      "★ Priority render queue",
      "★ 30-day money-back guarantee",
      "★ Team seats — invite up to 5 agents",
      "★ MLS-ready exports + agent disclosure URL",
      "AI-disclosure tag · MLS-safe",
      "Credits valid 12 months from purchase",
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
