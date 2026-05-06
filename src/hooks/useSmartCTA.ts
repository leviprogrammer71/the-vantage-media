import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the correct CTA destination for the primary "Create Video" action.
 *
 * Listing videos are the company's primary product (one photo → social-ready
 * cinematic reel). Every top-level CTA on the site should funnel here.
 *
 * - destination       — universal listing entry (/video?mode=listing)
 * - destinationFor(c) — deep-link directly into a specific category card,
 *                      e.g. destinationFor("done_for_you_reel") for the
 *                      auto-stitched done-for-you reel.
 *
 * Logged-out users land on /login?returnUrl=… and bounce back to the same
 * deep link after auth.
 */
export type ListingCategoryDeepLink =
  | "done_for_you_reel"
  | "listing_bundle"
  | "animate_single"
  | "sun_to_sun"
  | "virtual_staging"
  | "sketch_to_real";

const buildPath = (category?: ListingCategoryDeepLink) =>
  category ? `/video?mode=listing&category=${category}` : "/video?mode=listing";

export const useSmartCTA = () => {
  const { user, loading } = useAuth();

  const destinationFor = (category?: ListingCategoryDeepLink) => {
    const target = buildPath(category);
    return user ? target : `/login?returnUrl=${encodeURIComponent(target)}`;
  };

  const destination = destinationFor();

  return { destination, destinationFor, isLoggedIn: !!user, loading };
};
