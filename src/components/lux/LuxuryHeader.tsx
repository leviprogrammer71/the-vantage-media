import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";

interface LuxuryHeaderProps {
  variant?: "transparent" | "bone" | "ink";
}

const publicNavLinks = [
  { to: "/real-estate-photographers", label: "For Photographers" },
  { to: "/for-agents", label: "For Agents" },
  { to: "/for-airbnb", label: "Airbnb" },
  { to: "/pricing", label: "Pricing" },
];

const authedNavLinks = [
  { to: "/real-estate-photographers", label: "For Photographers" },
  { to: "/for-agents", label: "For Agents" },
  { to: "/gallery", label: "My Gallery" },
  { to: "/dashboard", label: "Dashboard" },
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
            return (
              <Link
                key={l.to}
                to={l.to}
                className="lux-eyebrow hover:opacity-100 transition-opacity"
                style={{
                  color: fg,
                  opacity: active ? 1 : 0.6,
                  letterSpacing: "0.18em",
                }}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                to="/credits"
                className="hidden md:inline-flex lux-eyebrow"
                style={{ color: fg, opacity: 0.7 }}
              >
                {credits ?? 0} CREDITS
              </Link>
              <Link
                to="/video?mode=transform"
                className="lux-eyebrow inline-flex items-center gap-3"
                style={{
                  color: variant === "ink" ? "var(--lux-ink)" : "var(--lux-bone)",
                  background: variant === "ink" ? "var(--lux-bone)" : "var(--lux-ink)",
                  padding: "14px 22px",
                  border: variant === "ink" ? "1px solid var(--lux-bone)" : "1px solid var(--lux-ink)",
                }}
              >
                NEW FILM →
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
                className="lux-eyebrow inline-flex items-center gap-3"
                style={{
                  color: variant === "ink" ? "var(--lux-ink)" : "var(--lux-bone)",
                  background: variant === "ink" ? "var(--lux-bone)" : "var(--lux-ink)",
                  padding: "14px 22px",
                  border: variant === "ink" ? "1px solid var(--lux-bone)" : "1px solid var(--lux-ink)",
                }}
              >
                BEGIN FREE →
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
          </div>
        </div>
      )}
    </header>
  );
};

export default LuxuryHeader;
