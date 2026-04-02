import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the correct CTA destination:
 * - Logged out → /login
 * - Logged in → /video?mode=transform
 */
export const useSmartCTA = () => {
  const { user, loading } = useAuth();
  const destination = user ? "/video?mode=transform" : "/login";
  return { destination, isLoggedIn: !!user, loading };
};
