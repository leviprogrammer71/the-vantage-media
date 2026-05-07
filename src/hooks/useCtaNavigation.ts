import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Centralised CTA routing used across the site.
 *
 * Default policy: every "Create Video" / "Get Started" / "New Film" CTA
 * funnels into the Done-For-You Reel — our flagship product. Contractor
 * and construction-transformation pages override with `kind: "transform"`
 * to route into the construction flow instead.
 *
 * Rules:
 *   - kind: "create"     → /video?mode=listing&category=done_for_you_reel  (default)
 *   - kind: "transform"  → /video?mode=transform                            (contractor pages)
 *   - kind: "demo"       → /demo
 *   - kind: "pricing"    → /credits
 *   - kind: "referral"   → /referral
 *
 *   Logged-out variants bounce through /login?returnUrl=… and Auth.tsx
 *   redirects post-auth.
 */
export type CtaKind = "create" | "transform" | "demo" | "pricing" | "referral";

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
        case "transform": {
          // Contractor / construction pages — the only audience that ships
          // away from Done-For-You.
          const path = "/video?mode=transform";
          return isLoggedIn ? path : `/login?returnUrl=${encodeURIComponent(path)}`;
        }
        case "create":
        default: {
          // Default: Done-For-You Reel. The flagship sell.
          const path = "/video?mode=listing&category=done_for_you_reel";
          return isLoggedIn ? path : `/login?returnUrl=${encodeURIComponent(path)}`;
        }
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
