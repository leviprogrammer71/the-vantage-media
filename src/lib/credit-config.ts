// Central credit configuration — single source of truth
export const CREDIT_COSTS = {
  photoEnhance: 10,
  listingVideo5s: 20,
  listingVideo10s: 30,
  // Construction transformation
  transformationOwn5s: 30,
  transformationOwn10s: 40,
  transformationAI5s: 40,
  transformationAI10s: 50,
  // Cleanup & Setup transformations (higher base cost)
  cleanupAI5s: 50,
  cleanupAI10s: 60,
  cleanupOwn5s: 40,
  cleanupOwn10s: 50,
  setupAI5s: 50,
  setupAI10s: 60,
  setupOwn5s: 40,
  setupOwn10s: 50,
  websiteConsultation: 10,
  durationUpcharge: 10,
} as const;

export const CREDIT_PACKS = [
  {
    id: "starter",
    name: "STARTER",
    credits: 200,
    price: 19,
    perCredit: "$0.095",
    savings: null,
    popular: false,
    priceType: "starter",
    valueCallout: "~5 TRANSFORMATION VIDEOS",
    features: [
      "5 transformation videos",
      "or 10 listing videos",
      "or mix and match freely",
      "Credits never expire",
    ],
  },
  {
    id: "builder",
    name: "BUILDER",
    credits: 500,
    price: 39,
    perCredit: "$0.078",
    savings: "save 18%",
    popular: true,
    priceType: "standard",
    valueCallout: "~12 TRANSFORMATION VIDEOS",
    features: [
      "12 transformation videos",
      "or 25 listing videos",
      "or mix and match freely",
      "Credits never expire",
      "Best value for active creators",
    ],
  },
  {
    id: "pro",
    name: "PRO",
    credits: 1200,
    price: 79,
    perCredit: "$0.066",
    savings: "save 31%",
    popular: false,
    priceType: "value",
    valueCallout: "~30 TRANSFORMATION VIDEOS",
    features: [
      "30 transformation videos",
      "or 60 listing videos",
      "or mix and match freely",
      "Credits never expire",
      "For weekly content creators",
    ],
  },
  {
    id: "studio",
    name: "STUDIO",
    credits: 3000,
    price: 149,
    perCredit: "$0.050",
    savings: "save 47%",
    popular: false,
    priceType: "pro_pack",
    valueCallout: "~75 TRANSFORMATION VIDEOS",
    features: [
      "75 transformation videos",
      "or 150 listing videos",
      "or mix and match freely",
      "Credits never expire",
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

export const FREE_SIGNUP_CREDITS = 50;

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
