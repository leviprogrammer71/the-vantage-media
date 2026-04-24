interface Stat {
  value: string;
  label: string;
  caption?: string;
}

interface StatStripProps {
  stats: Stat[];
  variant?: "ink" | "bone" | "cream";
  className?: string;
}

const StatStrip = ({ stats, variant = "bone", className = "" }: StatStripProps) => {
  const palette =
    variant === "ink"
      ? { bg: "var(--lux-ink)", fg: "var(--lux-bone)", muted: "rgba(244,239,230,0.6)", line: "rgba(244,239,230,0.18)" }
      : variant === "cream"
      ? { bg: "var(--lux-cream)", fg: "var(--lux-ink)", muted: "var(--lux-ash)", line: "var(--lux-hairline)" }
      : { bg: "var(--lux-bone)", fg: "var(--lux-ink)", muted: "var(--lux-ash)", line: "var(--lux-hairline)" };

  return (
    <div
      className={className}
      style={{ background: palette.bg, color: palette.fg, borderTop: `1px solid ${palette.line}`, borderBottom: `1px solid ${palette.line}` }}
    >
      <div className="lux-container">
        <div
          className="grid grid-cols-2 md:grid-cols-4"
          style={{ borderInline: `1px solid transparent` }}
        >
          {stats.map((s, i) => (
            <div
              key={i}
              className="py-12 md:py-16 px-4 md:px-8"
              style={{
                borderRight: i < stats.length - 1 ? `1px solid ${palette.line}` : "none",
                borderBottom: i < 2 ? `1px solid ${palette.line}` : "none",
              }}
            >
              <div
                className="font-display"
                style={{
                  fontSize: "clamp(2.6rem, 5vw, 4rem)",
                  lineHeight: 0.95,
                  letterSpacing: "-0.02em",
                }}
              >
                {s.value}
              </div>
              <div className="lux-eyebrow mt-4" style={{ color: palette.muted }}>
                {s.label}
              </div>
              {s.caption && (
                <div className="mt-3 text-sm" style={{ color: palette.muted, fontStyle: "italic" }}>{s.caption}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatStrip;
