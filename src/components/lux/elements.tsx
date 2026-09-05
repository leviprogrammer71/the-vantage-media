import type { CSSProperties, ReactNode } from "react";

/**
 * elements.tsx — the Vantage element library.
 *
 * Mirrors the structural language of the inspiration board (elements.png):
 * pill buttons, rounded input fields, tag pills, stat cards, phone mockups,
 * editorial CTA strips, handwritten annotations — rebuilt in Vantage tokens
 * (bone / cream / ink / rust / champagne) instead of the orange SaaS palette,
 * so the site gains that polish without losing brand equity.
 */

const MONO: CSSProperties = { fontFamily: "'Space Mono', ui-monospace, monospace" };

/* ── Pill button ─────────────────────────────────────────────────────── */
export function Pill({
  children,
  variant = "dark",
  as = "button",
  href,
  onClick,
  className,
  style,
}: {
  children: ReactNode;
  variant?: "dark" | "rust" | "light" | "ghost";
  as?: "button" | "a";
  href?: string;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}) {
  const palette: Record<string, CSSProperties> = {
    dark: { background: "var(--lux-ink)", color: "var(--lux-bone)", border: "1px solid var(--lux-ink)" },
    rust: { background: "var(--lux-rust)", color: "var(--lux-bone)", border: "1px solid var(--lux-rust)" },
    light: { background: "var(--lux-cream)", color: "var(--lux-ink)", border: "1px solid var(--lux-hairline-strong)" },
    ghost: { background: "transparent", color: "var(--lux-ink)", border: "1px solid var(--lux-hairline-strong)" },
  };
  const base: CSSProperties = {
    ...palette[variant],
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    borderRadius: 999,
    padding: "14px 26px",
    fontFamily: "Inter, sans-serif",
    fontSize: "0.86rem",
    fontWeight: 600,
    letterSpacing: "0.01em",
    cursor: "pointer",
    textDecoration: "none",
    transition: "transform .18s ease, opacity .18s ease",
    ...style,
  };
  if (as === "a") {
    return <a href={href} className={className} style={base}>{children}</a>;
  }
  return <button onClick={onClick} className={className} style={base}>{children}</button>;
}

/* ── Tag / label pill ────────────────────────────────────────────────── */
export function Tag({
  children,
  tone = "neutral",
  active = false,
  onClick,
}: {
  children: ReactNode;
  tone?: "neutral" | "rust" | "champagne";
  active?: boolean;
  onClick?: () => void;
}) {
  const tones: Record<string, CSSProperties> = {
    neutral: { background: active ? "var(--lux-ink)" : "transparent", color: active ? "var(--lux-bone)" : "var(--lux-ink)", border: `1px solid ${active ? "var(--lux-ink)" : "var(--lux-hairline-strong)"}` },
    rust: { background: "rgba(140,63,46,0.10)", color: "var(--lux-rust)", border: "1px solid rgba(140,63,46,0.25)" },
    champagne: { background: "rgba(217,179,126,0.16)", color: "var(--lux-brass)", border: "1px solid rgba(217,179,126,0.35)" },
  };
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      onClick={onClick}
      style={{
        ...tones[tone],
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "7px 15px",
        fontFamily: "Inter, sans-serif",
        fontSize: "0.74rem",
        fontWeight: 600,
        letterSpacing: "0.02em",
        cursor: onClick ? "pointer" : "default",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </Comp>
  );
}

/* ── Rounded input field (with optional leading icon slot) ───────────── */
export function Field({
  icon,
  ...props
}: { icon?: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "var(--lux-cream)",
        border: "1px solid var(--lux-hairline-strong)",
        borderRadius: 14,
        padding: "0 18px",
      }}
    >
      {icon && <span style={{ color: "var(--lux-ash)", display: "grid", placeItems: "center" }}>{icon}</span>}
      <input
        {...props}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          padding: "17px 0",
          fontFamily: "Inter, sans-serif",
          fontSize: "0.95rem",
          color: "var(--lux-ink)",
          ...props.style,
        }}
      />
    </div>
  );
}

/* ── Stat card (the "12× / 2 min / 8 / 100+" row) ───────────────────── */
export function StatCard({ value, label, hint }: { value: ReactNode; label: string; hint?: string }) {
  return (
    <div style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)", borderRadius: 16, padding: "22px 20px" }}>
      <div className="lux-display" style={{ fontSize: "clamp(1.7rem, 3vw, 2.4rem)", lineHeight: 1, color: "var(--lux-ink)" }}>
        {value}
      </div>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: "0.82rem", color: "var(--lux-ink)", opacity: 0.75, marginTop: 8 }}>
        {label}
      </div>
      {hint && <div style={{ ...MONO, fontSize: "0.64rem", color: "var(--lux-ash)", marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

/* ── Card surface ────────────────────────────────────────────────────── */
export function Card({
  children,
  tone = "cream",
  className,
  style,
}: {
  children: ReactNode;
  tone?: "cream" | "bone" | "ink";
  className?: string;
  style?: CSSProperties;
}) {
  const tones: Record<string, CSSProperties> = {
    cream: { background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)", color: "var(--lux-ink)" },
    bone: { background: "var(--lux-bone)", border: "1px solid var(--lux-hairline-strong)", color: "var(--lux-ink)" },
    ink: { background: "var(--lux-ink)", border: "1px solid var(--lux-ink)", color: "var(--lux-bone)" },
  };
  return (
    <div className={className} style={{ ...tones[tone], borderRadius: 18, padding: 24, ...style }}>
      {children}
    </div>
  );
}

/* ── Handwritten annotation (the inspo's arrow notes) ────────────────── */
export function HandNote({
  children,
  arrow = "none",
  style,
}: {
  children: ReactNode;
  arrow?: "left" | "right" | "down" | "none";
  style?: CSSProperties;
}) {
  const glyph = arrow === "left" ? "↙" : arrow === "right" ? "↘" : arrow === "down" ? "↓" : "";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontStyle: "italic",
        fontSize: "0.95rem",
        color: "var(--lux-rust)",
        ...style,
      }}
    >
      {arrow === "left" && <span aria-hidden style={{ fontStyle: "normal" }}>{glyph}</span>}
      {children}
      {(arrow === "right" || arrow === "down") && <span aria-hidden style={{ fontStyle: "normal" }}>{glyph}</span>}
    </span>
  );
}

/* ── Phone mockup (the reel preview frame) ───────────────────────────── */
export function PhoneMock({
  children,
  label,
  style,
}: {
  children: ReactNode;
  label?: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{ position: "relative", ...style }}>
      <div
        style={{
          borderRadius: 34,
          background: "var(--lux-ink)",
          padding: 9,
          boxShadow: "0 30px 70px -34px rgba(14,14,12,0.55)",
        }}
      >
        <div style={{ position: "relative", borderRadius: 26, overflow: "hidden", aspectRatio: "9/16", background: "#000" }}>
          {children}
          {label && (
            <div
              style={{
                position: "absolute", left: 14, bottom: 16, color: "#fff",
                fontFamily: "Inter, sans-serif", fontWeight: 700, fontSize: "1.05rem",
                textShadow: "0 2px 12px rgba(0,0,0,.5)", lineHeight: 1.15,
              }}
            >
              {label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Editorial CTA strip (dark panel + image, from the inspo footer) ─── */
export function EditorialStrip({
  eyebrow,
  title,
  body,
  cta,
  image,
}: {
  eyebrow?: string;
  title: ReactNode;
  body?: string;
  cta?: ReactNode;
  image?: string;
}) {
  return (
    <div className="grid md:grid-cols-2" style={{ borderRadius: 20, overflow: "hidden", border: "1px solid var(--lux-hairline)" }}>
      <div style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", padding: "44px 38px" }}>
        {eyebrow && <div className="lux-eyebrow mb-4" style={{ color: "var(--lux-champagne)", fontSize: "0.58rem" }}>{eyebrow}</div>}
        <div className="lux-display" style={{ fontSize: "clamp(1.7rem, 3.4vw, 2.5rem)", lineHeight: 1.04, color: "var(--lux-bone)" }}>
          {title}
        </div>
        {body && (
          <p className="lux-prose mt-4" style={{ color: "rgba(244,239,230,0.78)", fontSize: "0.92rem", maxWidth: 380 }}>
            {body}
          </p>
        )}
        {cta && <div className="mt-7">{cta}</div>}
      </div>
      <div style={{ minHeight: 240, background: "var(--lux-cream)" }}>
        {image && <img src={image} alt="" aria-hidden loading="lazy" className="w-full h-full object-cover" style={{ minHeight: 240 }} />}
      </div>
    </div>
  );
}

/* ── Trust logo row (grayscale partner logos) ───────────────────────── */
export function TrustRow({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
      {items.map((t) => (
        <span
          key={t}
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "0.85rem",
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: "var(--lux-ash)",
            opacity: 0.65,
          }}
        >
          {t}
        </span>
      ))}
    </div>
  );
}
