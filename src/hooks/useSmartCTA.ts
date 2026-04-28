import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the correct CTA destination for the primary "Create Video" action.
 * Defaults to the Listing Bundle flow — that's the "done-for-you" reel that
 * lands the highest-value first impression for real estate buyers (the core ICP).
 * - Logged out → /login?returnUrl=/video?mode=listing
 * - Logged in  → /video?mode=listing
 *
 * Prefer `useCtaNavigation` for new code — it supports multiple CTA kinds.
 */
export const useSmartCTA = () => {
  const { user, loading } = useAuth();
  const destination = user
    ? "/video?mode=listing"
    : "/login?returnUrl=%2Fvideo%3Fmode%3Dlisting";
  return { destination, isLoggedIn: !!user, loading };
};
