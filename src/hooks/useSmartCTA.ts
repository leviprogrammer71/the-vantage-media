import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the correct CTA destination for the primary "Create Video" action.
 * - Logged out → /login?returnUrl=/video?mode=transform (preserves deep-link intent)
 * - Logged in  → /video?mode=transform
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
