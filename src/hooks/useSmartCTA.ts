import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the correct CTA destination for the primary "Create Video" action.
 *
 * Done-For-You Reel is the company's flagship product (auto-stitched
 * 15–30s social reel from 3–6 listing photos, with price + realtor name
 * baked in). Every top-level CTA on the site funnels here by default.
 *
 * Exceptions:
 *  - Contractor / industry pages → /video?mode=transform (they sell
 *    construction transformation reels, not listing reels).
 *  - Specific feature cards on the homepage menu → destinationFor("…")
 *    deep-link straight into that feature's upload step.
 *
 * Logged-out users land on /login?returnUrl=… and bounce back to the same
 * deep link after auth.
 */
export type ListingCategoryDeepLink =
  | "done_for_you_reel"
  | "animate_single"
  | "sun_to_sun"
  | "virtual_staging"
  | "sketch_to_real";

export type CtaAudience =
  | "default"      // listing → Done-For-You Reel
  | "contractor"   // industry / construction → transform
  | "agent"        // agent landing → Done-For-You Reel
  | "photographer" // photographer landing → Done-For-You Reel
  | "airbnb";      // Airbnb landing → Done-For-You Reel

const buildListingPath = (category?: ListingCategoryDeepLink) =>
  category ? `/video?mode=listing&category=${category}` : "/video?mode=listing";

const buildTransformPath = () => "/video?mode=transform";

export const useSmartCTA = (audience: CtaAudience = "default") => {
  const { user, loading } = useAuth();

  const destinationFor = (category?: ListingCategoryDeepLink) => {
    const target = buildListingPath(category);
    return user ? target : `/login?returnUrl=${encodeURIComponent(target)}`;
  };

  // Audience-specific primary CTA. Contractors land in the transform flow;
  // everyone else lands on the Done-For-You Reel — our flagship sell.
  const audiencePath = (() => {
    if (audience === "contractor") return buildTransformPath();
    if (audience === "photographer") return buildListingPath("done_for_you_reel");
    return buildListingPath("done_for_you_reel");
  })();

  const destination = user
    ? audiencePath
    : `/login?returnUrl=${encodeURIComponent(audiencePath)}`;

  // Friendly CTA label per audience, used by hero CTAs.
  const ctaLabel = (() => {
    if (audience === "contractor") {
      return user ? "ENTER THE STUDIO →" : "BEGIN A TRANSFORMATION REEL — FREE →";
    }
    if (audience === "photographer") {
      return user ? "BUILD A LISTING BUNDLE →" : "BEGIN A LISTING BUNDLE — FREE →";
    }
    return user ? "BUILD A DONE-FOR-YOU REEL →" : "BEGIN FREE — DONE-FOR-YOU REEL →";
  })();

  return {
    destination,
    destinationFor,
    ctaLabel,
    audience,
    isLoggedIn: !!user,
    loading,
  };
};
