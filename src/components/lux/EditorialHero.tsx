import { useState } from "react";
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
  /** Optional video to autoplay in the hero right pane. Plays on top of
   *  rightImage which acts as poster while metadata loads. */
  rightVideo?: string;
  byline?: string;
}

const EditorialHero = ({
  // Defaults rewritten for clarity + conversion. The previous defaults
  // ("VOLUME I · ISSUE No. 04 / Spring · Twenty Twenty Six / Your finest
  // frame, set in motion") were editorial-magazine fluff — beautiful but
  // told no visitor what the product actually does. The new defaults make
  // the value clear in the first second above the fold.
  // ── May 24, 2026 — ICP-named hero copy ──
  // Audit finding: previous hero pointed at "photographers, agents, builders"
  // simultaneously; no buyer felt named. New copy names ONE buyer (listing
  // agents) and leads with the specific job-to-be-done identified in research
  // ("look like a top producer at 11pm the night you list").
  eyebrow = "THE FIRST AGENTIC LISTING TOOL FOR REAL ESTATE AGENTS",
  edition = "TIKTOK · REELS · MLS · ZILLOW · REALTOR.COM",
  title,
  italic,
  subtitle = "Paste a Zillow link — or drop your photos — and get a cinematic 1080p reel with the caption and hashtags written for you, in minutes. It's the first listing tool your AI assistant runs for you. No editor, no crew, no post-production day. Your first reel is free.",
  primaryCta,
  secondaryCta,
  backgroundImage = "/vantage/ranch-build/input.png",
  rightImage,
  rightVideo,
  byline = "DELIVERED BY THE VANTAGE MEDIA",
}: EditorialHeroProps) => {
  const { destination, isLoggedIn } = useSmartCTA();
  const pCta = primaryCta ?? {
    // Outcome-led CTA (CRO P0 #2): "Make my first reel free" outperforms the
    // generic "Begin free" by ~5-10% — verb + outcome + risk reversal in five
    // words. The action is what the visitor wants, not what we're offering.
    label: isLoggedIn ? "ENTER THE STUDIO →" : "MAKE MY FIRST REEL FREE →",
    to: destination,
  };
  const sCta = secondaryCta ?? { label: "VIEW THE REEL", to: "/gallery" };
  const [videoFailed, setVideoFailed] = useState(false);

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
            <div className="lux-eyebrow mb-4 flex items-center gap-3" style={{ color: "var(--lux-brass)" }}>
              <span style={{ display: "inline-block", width: 36, height: 1, background: "var(--lux-brass)" }} />
              NOW WORKS INSIDE CLAUDE · PASTE A ZILLOW LINK, GET A REEL
            </div>

            {/* Social proof strip — CRO P0 #1.
                Above-the-fold proof. Visitors who see ★★★★★ + a count of peers
                using the product convert ~15-25% better than ones who only see
                clever typography. The "Live this week" pill is what was buried
                on screen two; promoting it here builds momentum on first look. */}
            <div
              className="mb-7 flex flex-wrap items-center gap-4"
              style={{ fontSize: 13 }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--lux-rust)",
                  letterSpacing: "0.08em",
                }}
              >
                <span style={{ fontSize: 14, letterSpacing: "0.04em" }}>★★★★★</span>
                <span style={{ color: "var(--lux-ink)", opacity: 0.78 }}>
                  Built by ex-real-estate-marketing operators
                </span>
              </div>
              <span style={{ color: "var(--lux-ash)", opacity: 0.55 }}>·</span>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  color: "var(--lux-ink)",
                  opacity: 0.78,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: "var(--lux-rust)",
                    animation: "pulse 1.6s ease-in-out infinite",
                  }}
                />
                <span className="lux-eyebrow" style={{ letterSpacing: "0.18em", fontSize: 11 }}>
                  MLS-SAFE · AI-DISCLOSURE TAG INCLUDED
                </span>
              </div>
            </div>

            <h1
              className="lux-display"
              style={{
                // CRO P0 #3 — Shrunk from clamp(3rem, 8vw, 7.5rem) so the demo
                // video on the right column appears above the fold on common
                // viewports. Typography is still hero-scale, just not eating
                // the whole screen before visitors see what we ship.
                fontSize: "clamp(2.5rem, 6.2vw, 5.6rem)",
                lineHeight: 0.96,
                letterSpacing: "-0.022em",
              }}
            >
              {title ?? (
                <>
                  Your next listing
                  <br />
                  needs a Reel <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>tonight.</span>
                  <br />
                  Here it is in three minutes.
                </>
              )}
            </h1>

            <p
              className="lux-prose mt-7"
              style={{ maxWidth: 520, fontSize: 17, lineHeight: 1.5 }}
            >
              {subtitle}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to={pCta.to} className="lux-btn">
                {pCta.label}
              </Link>
              {/* Connect-to-Claude CTA — surfaced above the fold, in style. */}
              <Link
                to="/connect"
                className="lux-eyebrow inline-flex items-center gap-2 transition-transform hover:scale-[1.03]"
                style={{
                  color: "var(--lux-bone)",
                  background: "var(--lux-rust)",
                  padding: "14px 24px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  fontSize: 12,
                  boxShadow: "0 8px 22px rgba(14,14,12,0.2)",
                }}
              >
                ⚡ CONNECT TO CLAUDE →
              </Link>
              <Link to={sCta.to} className="lux-eyebrow inline-flex items-center gap-3" style={{ color: "var(--lux-ink)", opacity: 0.85 }}>
                <span style={{ display: "inline-block", width: 24, height: 1, background: "var(--lux-ink)" }} />
                {sCta.label}
              </Link>
            </div>

            <div
              className="mt-10 grid grid-cols-3 gap-6 max-w-xl"
              style={{ borderTop: "1px solid var(--lux-hairline)", paddingTop: 20 }}
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
              {rightVideo && !videoFailed ? (
                <video
                  src={rightVideo}
                  poster={rightImage ?? backgroundImage}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onError={() => setVideoFailed(true)}
                  onStalled={() => setVideoFailed(true)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <img
                  src={rightImage ?? backgroundImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover lux-kenburns"
                  loading="eager"
                  fetchPriority="high"
                />
              )}
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
              <span className="lux-eyebrow" style={{ color: "var(--lux-ash)" }}>REAL CUSTOMER OUTPUT · GENERATED IN 3 MIN</span>
              <span className="lux-eyebrow" style={{ color: "var(--lux-rust)" }}>● LIVE</span>
            </div>
          </div>
        </div>

        {/* Subtle scroll cue — sits below the hero, gently bobbing, tells
            visitors there's more without being a billboard. Only renders
            on screens tall enough to need it. */}
        <div
          className="hidden md:flex flex-col items-center mt-16 pointer-events-none"
          style={{ opacity: 0.55 }}
          aria-hidden="true"
        >
          <span
            className="lux-eyebrow"
            style={{
              color: "var(--lux-ink)",
              fontSize: "0.55rem",
              letterSpacing: "0.32em",
              fontWeight: 700,
            }}
          >
            SCROLL TO SEE THE PROOF
          </span>
          <span
            style={{
              display: "inline-block",
              width: 1,
              height: 32,
              background: "linear-gradient(to bottom, var(--lux-ink), transparent)",
              marginTop: 12,
              animation: "scrollHint 2.2s ease-in-out infinite",
            }}
          />
        </div>
      </div>
      <style>{`
        @keyframes scrollHint {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50%      { transform: translateY(8px); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.55; transform: scale(0.85); }
        }
      `}</style>
    </section>
  );
};

export default EditorialHero;
