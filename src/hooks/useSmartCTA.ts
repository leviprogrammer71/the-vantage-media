import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the correct CTA destination for the primary "Create Video" action.
 * - Logged out → /login?returnUrl=/video?mode=transform
 * - Logged in  → /video?mode=transform
 *
 * The transform mode is the universal landing — it shows the category picker
 * which routes the user into Listing, Construction, Cleanup, or Setup.
 *
 * Prefer `useCtaNavigation` for new code — it supports multiple CTA kinds.
 */
export const useSmartCTA = () => {
  const { user, loading } = useAuth();
  const destination = user
    ? "/video?mode=transform"
    : "/login?returnUrl=%2Fvideo%3Fmode%3Dtransform";
  return { destination, isLoggedIn: !!user, loading };
};
