interface MarqueeProps {
  items: string[];
  separator?: string;
  className?: string;
  reverse?: boolean;
}

const Marquee = ({ items, separator = "✦", className = "", reverse = false }: MarqueeProps) => {
  const list = (
    <>
      {items.map((it, i) => (
        <span key={i} className="lux-eyebrow flex items-center gap-12" style={{ color: "var(--lux-ink)" }}>
          {it}
          <span style={{ color: "var(--lux-champagne)" }}>{separator}</span>
        </span>
      ))}
    </>
  );

  return (
    <div
      className={`overflow-hidden lux-hairline-t lux-hairline-b py-5 ${className}`}
      style={{ borderTop: "1px solid var(--lux-hairline)", borderBottom: "1px solid var(--lux-hairline)" }}
    >
      <div className={`lux-marquee ${reverse ? "lux-marquee-reverse" : ""}`}>
        {list}
        {list}
      </div>
      <style>{`.lux-marquee-reverse { animation-direction: reverse; }`}</style>
    </div>
  );
};

export default Marquee;
