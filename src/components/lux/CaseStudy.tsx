import BeforeAfterSlider from "./BeforeAfterSlider";

interface Metric {
  label: string;
  value: string;
}

interface CaseStudyProps {
  index?: string;
  studio: string;
  city?: string;
  quote: string;
  body?: string;
  metrics: Metric[];
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  reverse?: boolean;
  href?: string;
}

const CaseStudy = ({
  index = "01",
  studio,
  city,
  quote,
  body,
  metrics,
  before,
  after,
  beforeLabel,
  afterLabel,
  reverse = false,
  href,
}: CaseStudyProps) => {
  return (
    <article className="grid md:grid-cols-12 gap-8 md:gap-16 items-center">
      <div className={`md:col-span-7 ${reverse ? "md:order-2" : ""}`}>
        <BeforeAfterSlider
          before={before}
          after={after}
          beforeLabel={beforeLabel}
          afterLabel={afterLabel}
          ratio="4/5"
        />
      </div>
      <div className={`md:col-span-5 ${reverse ? "md:order-1" : ""}`}>
        <div className="flex items-baseline gap-4 mb-8">
          <span className="lux-eyebrow" style={{ color: "var(--lux-rust)" }}>CASE STUDY · {index}</span>
          <span style={{ flex: 1, height: 1, background: "var(--lux-hairline-strong)" }} />
        </div>

        <h3 className="lux-display text-3xl md:text-5xl mb-2">
          {studio}
        </h3>
        {city && (
          <div className="lux-eyebrow mb-8" style={{ color: "var(--lux-brass)" }}>{city}</div>
        )}

        <blockquote className="lux-display-italic text-2xl md:text-3xl mb-6" style={{ color: "var(--lux-ink)", lineHeight: 1.3 }}>
          &ldquo;{quote}&rdquo;
        </blockquote>

        {body && (
          <p className="lux-prose mb-10" style={{ maxWidth: 460 }}>{body}</p>
        )}

        <div className="grid grid-cols-3 gap-4 lux-hairline-t pt-8">
          {metrics.map((m, i) => (
            <div key={i}>
              <div
                className="font-display"
                style={{ fontSize: "clamp(1.85rem, 3.6vw, 2.75rem)", color: "var(--lux-ink)", lineHeight: 1 }}
              >
                {m.value}
              </div>
              <div className="lux-eyebrow mt-3" style={{ color: "var(--lux-ash)" }}>{m.label}</div>
            </div>
          ))}
        </div>

        {href && (
          <a
            href={href}
            className="inline-flex items-center gap-3 lux-eyebrow mt-10"
            style={{ color: "var(--lux-ink)" }}
          >
            <span style={{ width: 24, height: 1, background: "var(--lux-ink)" }} /> READ THE FILM
          </a>
        )}
      </div>
    </article>
  );
};

export default CaseStudy;
