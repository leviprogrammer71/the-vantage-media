import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";

interface LuxuryHeaderProps {
  variant?: "transparent" | "bone" | "ink";
}

const publicNavLinks = [
  { to: "/for-agents", label: "For Agents" },
  { to: "/examples", label: "Examples" },
  { to: "/for-airbnb", label: "Airbnb" },
  { to: "/blog", label: "Blog" },
  { to: "/pricing", label: "Pricing" },
];

// Single account hub = /profile (shows credits, stats, identity, sign-out).
// Dashboard was redundant with Profile, so it now redirects to /profile and
// the credits pill on the right is the account entry point.
const authedNavLinks = [
  { to: "/connect", label: "Connect to Claude" },
  { to: "/gallery", label: "My Gallery" },
  { to: "/examples", label: "Examples" },
  { to: "/blog", label: "Blog" },
  { to: "/pricing", label: "Pricing" },
];

const LuxuryHeader = ({ variant = "bone" }: LuxuryHeaderProps) => {
  const { user } = useAuth();
  const { credits } = useCredits();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const bg =
    variant === "transparent"
      ? "transparent"
      : variant === "ink"
      ? "var(--lux-ink)"
      : "var(--lux-bone)";
  const fg = variant === "ink" ? "var(--lux-bone)" : "var(--lux-ink)";
  const hairline = variant === "ink" ? "rgba(244,239,230,0.12)" : "var(--lux-hairline)";
  const navLinks = user ? authedNavLinks : publicNavLinks;

  return (
    <header
      className="sticky top-0 z-[100] transition-colors duration-500"
      style={{
        background: bg,
        color: fg,
        borderBottom: `1px solid ${hairline}`,
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="lux-container flex items-center justify-between" style={{ minHeight: 76 }}>
        <Link to="/" className="flex items-baseline gap-2 no-underline" style={{ color: fg }}>
          <span
            className="lux-display-italic"
            style={{ fontSize: 24, letterSpacing: "0.005em", lineHeight: 1 }}
          >
            The Vantage
          </span>
          <span
            className="lux-eyebrow hidden md:inline"
            style={{ color: variant === "ink" ? "var(--lux-champagne)" : "var(--lux-brass)" }}
          >
            EST. 2026
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-9">
          {navLinks.map((l) => {
            const active = location.pathname === l.to;
            const isConnect = l.to === "/connect";
            return (
              <Link
                key={l.to}
                to={l.to}
                className="lux-eyebrow hover:opacity-100 transition-opacity"
                style={{
                  color: isConnect ? "var(--lux-brass)" : fg,
                  // Higher base opacity so links read as clickable, not decoration.
                  opacity: active || isConnect ? 1 : 0.82,
                  letterSpacing: "0.18em",
                  fontWeight: isConnect ? 700 : undefined,
                }}
              >
                {l.label}
                {isConnect && (
                  <sup style={{ color: "var(--lux-rust)", fontSize: 8, marginLeft: 4, letterSpacing: 0, fontWeight: 700 }}>
                    NEW
                  </sup>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                to="/profile"
                className="hidden md:inline-flex items-center gap-2 lux-eyebrow transition-transform hover:scale-[1.03]"
                style={{
                  color: fg,
                  border: `1px solid ${variant === "ink" ? "rgba(244,239,230,0.25)" : "var(--lux-hairline-strong)"}`,
                  borderRadius: 999,
                  padding: "9px 16px",
                  fontSize: 11.5,
                  letterSpacing: "0.14em",
                  fontWeight: 600,
                }}
                title="Your account — credits, reels, billing, sign out"
              >
                <span style={{ color: "var(--lux-brass)" }}>◆</span>
                {(credits ?? 0).toLocaleString()} CREDITS
              </Link>
              {/* Logged-in NEW FILM goes to the category picker so users can
                  see ALL 7 films, not just Done-For-You. Marketing CTAs on
                  unauthenticated landing pages still deep-link straight to
                  DFY — that's the conversion funnel. But once you're in the
                  product, every film should be one click away. */}
              <Link
                to="/create"
                className="lux-eyebrow inline-flex items-center gap-2 transition-transform hover:scale-[1.04]"
                style={{
                  color: "var(--lux-bone)",
                  background: "var(--lux-rust)",
                  padding: "15px 30px",
                  minHeight: 48,
                  fontSize: 12.5,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  boxShadow: "0 8px 22px rgba(14,14,12,0.22)",
                }}
              >
                MAKE A REEL →
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="lux-eyebrow hidden md:inline"
                style={{ color: fg, opacity: 0.7 }}
              >
                SIGN IN
              </Link>
              <Link
                to="/signup"
                className="lux-eyebrow inline-flex items-center gap-2 transition-transform hover:scale-[1.04]"
                style={{
                  color: "var(--lux-bone)",
                  background: "var(--lux-rust)",
                  padding: "15px 30px",
                  minHeight: 48,
                  fontSize: 12.5,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  boxShadow: "0 8px 22px rgba(14,14,12,0.22)",
                }}
              >
                START FREE →
              </Link>
            </>
          )}
          <button
            className="lg:hidden grid place-items-center w-10 h-10"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            style={{ color: fg }}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden" style={{ background: bg, borderTop: `1px solid ${hairline}` }}>
          <div className="lux-container py-8 flex flex-col gap-5">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="lux-eyebrow"
                style={{ color: fg, opacity: 0.8, fontSize: 12, letterSpacing: "0.24em" }}
              >
                {l.label}
              </Link>
            ))}
            {user && (
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="lux-eyebrow"
                style={{ color: "var(--lux-brass)", fontSize: 12, letterSpacing: "0.24em", fontWeight: 700 }}
              >
                ◆ ACCOUNT · {(credits ?? 0).toLocaleString()} CREDITS
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default LuxuryHeader;
