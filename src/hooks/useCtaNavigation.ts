import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Centralised CTA routing used across the site.
 *
 * Rules:
 *   - Any "Create Video" / "Get Started" / "New Film" CTA defaults to the
 *     Listing Bundle flow (the done-for-you reel — highest first-impression value):
 *       logged out  →  /login?returnUrl=/video?mode=listing
 *       logged in   →  /video?mode=listing
 *   - Any "See Demo" CTA → /demo (both states)
 *   - Any pricing/credits CTA:
 *       logged out  →  /login?returnUrl=/credits
 *       logged in   →  /credits
 *   - After login, Auth.tsx reads `returnUrl` and redirects there.
 */
export type CtaKind = "create" | "demo" | "pricing" | "referral";

export const useCtaNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();
  const isLoggedIn = !!user;

  const destinationFor = useCallback(
    (kind: CtaKind): string => {
      switch (kind) {
        case "demo":
          return "/demo";
        case "pricing":
          return isLoggedIn ? "/credits" : "/login?returnUrl=%2Fcredits";
        case "referral":
          return isLoggedIn ? "/referral" : "/login?returnUrl=%2Freferral";
        case "create":
        default:
          return isLoggedIn
            ? "/video?mode=listing"
            : "/login?returnUrl=%2Fvideo%3Fmode%3Dlisting";
      }
    },
    [isLoggedIn]
  );

  const go = useCallback(
    (kind: CtaKind) => {
      const to = destinationFor(kind);
      if (to === location.pathname + location.search) return;
      navigate(to);
    },
    [destinationFor, location.pathname, location.search, navigate]
  );

  const labelFor = useCallback(
    (kind: CtaKind): string => {
      if (kind === "create") return isLoggedIn ? "Create Video" : "Get Started Free";
      if (kind === "demo") return "See Demo";
      if (kind === "pricing") return isLoggedIn ? "Buy Credits" : "See Pricing";
      if (kind === "referral") return "Refer a Mate";
      return "Continue";
    },
    [isLoggedIn]
  );

  return { destinationFor, go, labelFor, isLoggedIn, loading };
};

export default useCtaNavigation;
