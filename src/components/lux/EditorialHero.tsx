import { Link } from "react-router-dom";
import { useSmartCTA } from "@/hooks/useSmartCTA";

interface EditorialHeroProps {
  eyebrow?: string;
  edition?: string;
  title?: React.ReactNode;
  italic?: React.ReactNode;
  subtitle?: string;
  primaryCta?: { label: string; to: string };
  secondaryCta?: { label: string; to: string };
  backgroundImage?: string;
  rightImage?: string;
  byline?: string;
}

const EditorialHero = ({
  eyebrow = "VOLUME I · ISSUE No. 04",
  edition = "Spring · Twenty Twenty Six",
  title,
  italic,
  subtitle = "One photograph. A scroll-stopping cinematic listing film. Delivered before your client's coffee gets cold.",
  primaryCta,
  secondaryCta,
  backgroundImage = "/vantage/ranch-build/input.png",
  rightImage,
  byline = "PHOTOGRAPHED BY THE VANTAGE STUDIO",
}: EditorialHeroProps) => {
  const { destination, isLoggedIn } = useSmartCTA();
  const pCta = primaryCta ?? { label: isLoggedIn ? "ENTER THE STUDIO →" : "BEGIN FREE — 50 CREDITS →", to: destination };
  const sCta = secondaryCta ?? { label: "VIEW THE REEL", to: "/gallery" };

  return (
    <section className="lux-bg-bone lux-grain relative overflow-hidden">
      {/* Top edition strip */}
      <div className="lux-container">
        <div
          className="flex items-center justify-between py-5"
          style={{ borderBottom: "1px solid var(--lux-hairline)" }}
        >
          <span className="lux-eyebrow" style={{ color: "var(--lux-rust)" }}>
            ✦ {eyebrow}
          </span>
          <span
            className="lux-display-italic hidden md:inline"
            style={{ fontSize: 14, color: "var(--lux-ash)" }}
          >
            {edition}
          </span>
          <span className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>
            № {(Math.floor(Math.random() * 999) + 100).toString().padStart(3, "0")}
          </span>
        </div>
      </div>

      <div className="lux-container pt-16 pb-20 md:pt-24 md:pb-28 relative">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-end">
          {/* Headline column */}
          <div className="lg:col-span-7">
            <div className="lux-eyebrow mb-8 flex items-center gap-3" style={{ color: "var(--lux-brass)" }}>
              <span style={{ display: "inline-block", width: 36, height: 1, background: "var(--lux-brass)" }} />
              FOR THE WORLD'S MOST EXACTING PHOTOGRAPHERS, AGENTS & BUILDERS
            </div>

            <h1
              className="lux-display"
              style={{
                fontSize: "clamp(3rem, 8vw, 7.5rem)",
                lineHeight: 0.92,
                letterSpacing: "-0.022em",
              }}
            >
              {title ?? (
                <>
                  Your finest
                  <br />
                  frame, set
                  <br />
                  in <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>motion.</span>
                </>
              )}
            </h1>

            <p
              className="lux-prose mt-10"
              style={{ maxWidth: 520, fontSize: 18 }}
            >
              {subtitle}
            </p>

            <div className="mt-12 flex flex-wrap items-center gap-5">
              <Link to={pCta.to} className="lux-btn">
                {pCta.label}
              </Link>
              <Link to={sCta.to} className="lux-eyebrow inline-flex items-center gap-3" style={{ color: "var(--lux-ink)" }}>
                <span style={{ display: "inline-block", width: 24, height: 1, background: "var(--lux-ink)" }} />
                {sCta.label}
              </Link>
            </div>

            <div
              className="mt-16 grid grid-cols-3 gap-6 max-w-xl"
              style={{ borderTop: "1px solid var(--lux-hairline)", paddingTop: 24 }}
            >
              {[
                { v: "3 min", l: "RENDER TIME" },
                { v: "1080p", l: "VERTICAL · 9:16" },
                { v: "0$", l: "TO BEGIN" },
              ].map((s, i) => (
                <div key={i}>
                  <div className="font-display text-2xl md:text-3xl" style={{ letterSpacing: "-0.02em" }}>
                    {s.v}
                  </div>
                  <div className="lux-eyebrow mt-2" style={{ color: "var(--lux-ash)" }}>
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Image column */}
          <div className="lg:col-span-5">
            <div
              className="relative w-full overflow-hidden"
              style={{
                paddingBottom: "125%",
                boxShadow: "var(--lux-shadow-deep)",
              }}
            >
              <img
                src={rightImage ?? backgroundImage}
                alt=""
                className="absolute inset-0 w-full h-full object-cover lux-kenburns"
                loading="eager"
                fetchPriority="high"
              />
              <div
                className="absolute bottom-0 left-0 right-0 px-6 py-5 flex items-center justify-between"
                style={{
                  background: "linear-gradient(to top, rgba(14,14,12,0.85), rgba(14,14,12,0))",
                }}
              >
                <span className="lux-eyebrow" style={{ color: "rgba(244,239,230,0.85)" }}>{byline}</span>
                <span
                  className="lux-display-italic"
                  style={{ color: "var(--lux-bone)", fontSize: 14 }}
                >
                  Frame I.
                </span>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <span className="lux-eyebrow" style={{ color: "var(--lux-ash)" }}>NO. 47 / OF 248 STUDIOS THIS WEEK</span>
              <span className="lux-eyebrow" style={{ color: "var(--lux-rust)" }}>● LIVE</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EditorialHero;
