import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import LazyVideo from "@/components/lux/LazyVideo";
import { PROJECTS, PROJECT_STATS, type Project } from "@/data/projects";

/**
 * /examples — "The Gallery". A museum-style walk through real listings: the
 * reference photos that went in, and the films that came out. Driven entirely
 * by src/data/projects.ts (add a folder + entry to hang a new piece).
 */

/** Reveal-on-scroll for [data-reveal] elements (adds .is-visible). */
function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            obs.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);
}

function Exhibit({ project, index, dark }: { project: Project; index: number; dark: boolean }) {
  const p = project;
  const single = p.outputs.length === 1;
  const fg = dark ? "var(--lux-bone)" : "var(--lux-ink)";
  const hair = dark ? "rgba(244,239,230,0.16)" : "var(--lux-hairline)";
  return (
    <section
      className={`lux-section ${dark ? "lux-bg-ink lux-grain" : "lux-bg-bone"}`}
      style={{ color: fg }}
    >
      <div className="lux-container">
        {/* Museum plate */}
        <div data-reveal className="lux-reveal">
          <div className="flex items-baseline gap-4 mb-3" style={{ borderBottom: `1px solid ${hair}`, paddingBottom: 14 }}>
            <span
              style={{ fontFamily: "'Space Mono', ui-monospace, monospace", fontSize: "0.9rem", color: "var(--lux-rust)", letterSpacing: "0.1em" }}
            >
              N° {String(index + 1).padStart(2, "0")}
            </span>
            <span className="lux-eyebrow" style={{ color: dark ? "var(--lux-champagne)" : "var(--lux-brass)", fontSize: "0.6rem" }}>
              {p.refs.length} PHOTO{p.refs.length > 1 ? "S" : ""} IN · {p.outputs.length} FILM{p.outputs.length > 1 ? "S" : ""} OUT
            </span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="lux-display" style={{ fontSize: "clamp(2rem, 5vw, 4rem)", lineHeight: 0.98, letterSpacing: "-0.02em", color: fg }}>
              {p.address}
              {p.city && (
                <span className="lux-eyebrow" style={{ display: "block", marginTop: 10, color: dark ? "rgba(244,239,230,0.6)" : "var(--lux-ash)", fontSize: "0.72rem" }}>
                  {p.city}
                </span>
              )}
            </h2>
            <p className="lux-display-italic" style={{ fontSize: "clamp(1.1rem, 2.4vw, 1.7rem)", color: "var(--lux-rust)" }}>
              {p.tagline}
            </p>
          </div>
        </div>

        {/* THE INPUTS — contact sheet */}
        <div data-reveal className="lux-reveal mt-10">
          <div className="lux-eyebrow mb-3" style={{ color: dark ? "rgba(244,239,230,0.55)" : "var(--lux-ash)", fontSize: "0.6rem" }}>
            THE INPUTS · THEIR LISTING PHOTOS
          </div>
          {/* The inputs are half the story — show them at real size, not as
              thumbnails. Large tiles, wrapping grid. */}
          <div
            className="grid gap-3 lg:gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", maxWidth: p.refs.length <= 2 ? 460 : undefined }}
          >
            {p.refs.map((r) => (
              <img
                key={r}
                src={r}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="w-full"
                style={{
                  aspectRatio: "1 / 1",
                  objectFit: "cover",
                  borderRadius: 4,
                  border: `1px solid ${hair}`,
                }}
              />
            ))}
          </div>
          <div className="lux-eyebrow mt-3 flex items-center gap-2" style={{ color: "var(--lux-rust)", fontSize: "0.62rem", letterSpacing: "0.16em" }}>
            <span aria-hidden style={{ fontSize: 16 }}>↓</span> RENDERED INTO
          </div>
        </div>

        {/* THE FILMS — the outputs */}
        <div data-reveal className="lux-reveal mt-8">
          <div className="lux-eyebrow mb-4" style={{ color: dark ? "rgba(244,239,230,0.55)" : "var(--lux-ash)", fontSize: "0.6rem" }}>
            THE FILMS · WHAT CAME OUT
          </div>
          <div
            className="grid gap-4 lg:gap-5"
            style={{
              gridTemplateColumns: single
                ? "minmax(220px, 300px)"
                : "repeat(auto-fill, minmax(180px, 1fr))",
              maxWidth: single ? undefined : "100%",
            }}
          >
            {p.outputs.map((o) => (
              <figure key={o.video} className="m-0">
                <div className="relative w-full overflow-hidden lux-bg-ink" style={{ aspectRatio: "9 / 16", borderRadius: 4, border: `1px solid ${hair}` }}>
                  <LazyVideo src={o.video} poster={o.poster} className="absolute inset-0 w-full h-full" />
                </div>
                <figcaption
                  className="lux-eyebrow mt-2.5"
                  style={{ color: dark ? "var(--lux-champagne)" : "var(--lux-rust)", fontSize: "0.6rem", letterSpacing: "0.14em", fontWeight: 700 }}
                >
                  {o.label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        {/* The maker */}
        {p.quote && (
          <div data-reveal className="lux-reveal mt-10 flex items-start gap-3" style={{ maxWidth: 620 }}>
            <span
              className="grid place-items-center flex-shrink-0"
              style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${hair}`, color: dark ? "var(--lux-champagne)" : "var(--lux-brass)", fontFamily: "Inter, sans-serif", fontSize: 13, fontWeight: 700 }}
            >
              {(p.agent || "").split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </span>
            <p className="lux-prose" style={{ fontStyle: "italic", color: fg, opacity: 0.9, fontSize: "0.95rem", lineHeight: 1.5 }}>
              &ldquo;{p.quote}&rdquo;
              <span style={{ display: "block", fontStyle: "normal", marginTop: 6, fontSize: "0.78rem", opacity: 0.7 }}>
                {p.agent} · {p.role}
              </span>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Showcase() {
  useReveal();
  return (
    <>
      <Helmet>
        <title>The Gallery · Real Estate Reels Made With The Vantage</title>
        <meta
          name="description"
          content="A museum of real listing projects — see the reference photos that went in and the films that came out. Listing reels, virtual staging, transformations, camera moves, and more, made with The Vantage."
        />
        <link rel="canonical" href="https://thevantage.media/examples" />
        <meta property="og:title" content="The Vantage Gallery · Photos In, Films Out" />
        <meta property="og:description" content="Real listing projects — the reference photos and the finished films. Made with The Vantage." />
        <meta property="og:url" content="https://thevantage.media/examples" />
      </Helmet>

      <div className="min-h-screen lux-bg-bone" style={{ color: "var(--lux-ink)" }}>
        <LuxuryHeader variant="bone" />

        <main id="main-content">
          {/* HERO — compact plate. Visitors are here to SEE the work, so the
              first exhibit lands almost immediately. */}
          <section className="lux-bg-bone" style={{ borderBottom: "1px solid var(--lux-hairline)" }}>
            <div className="lux-container" style={{ paddingBlock: "44px" }}>
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-rust)" }}>
                    THE VANTAGE GALLERY · PHOTOS IN, FILMS OUT
                  </div>
                  <h1 className="lux-display" style={{ fontSize: "clamp(2rem, 4.5vw, 3.4rem)", lineHeight: 0.98, letterSpacing: "-0.02em" }}>
                    Real listings. <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>Real films.</span>
                  </h1>
                </div>
                <div className="flex items-center gap-7">
                  {[
                    { v: PROJECT_STATS.projects, l: "PROJECTS" },
                    { v: PROJECT_STATS.films, l: "FILMS" },
                    { v: "3 min", l: "EACH" },
                  ].map((s) => (
                    <div key={s.l}>
                      <div className="lux-display" style={{ fontSize: "1.6rem", lineHeight: 1 }}>{s.v}</div>
                      <div className="lux-eyebrow" style={{ color: "var(--lux-ash)", fontSize: "0.55rem", marginTop: 4 }}>{s.l}</div>
                    </div>
                  ))}
                  <Link to="/signup" className="lux-btn" style={{ background: "var(--lux-rust)", color: "var(--lux-bone)" }}>
                    TRY IT FREE →
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* EXHIBITS */}
          {PROJECTS.map((p, i) => (
            <Exhibit key={p.slug} project={p} index={i} dark={i % 2 === 1} />
          ))}

          {/* CLOSING CTA */}
          <section className="lux-section lux-bg-cream">
            <div className="lux-container text-center">
              <div data-reveal className="lux-reveal">
                <div className="lux-eyebrow mb-4" style={{ color: "var(--lux-rust)" }}>YOUR TURN</div>
                <h2 className="lux-display" style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)", lineHeight: 0.98 }}>
                  Hang your listing
                  <br />
                  <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>in the gallery.</span>
                </h2>
                <p className="lux-prose mt-6 mx-auto" style={{ maxWidth: 460 }}>
                  60 free credits — about one full reel. No card. Upload your photos and watch what comes out.
                </p>
                <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
                  <Link to="/signup" className="lux-btn" style={{ background: "var(--lux-rust)", color: "var(--lux-bone)" }}>
                    START FREE — 60 CREDITS →
                  </Link>
                  <Link to="/connect" className="lux-eyebrow inline-flex items-center gap-2" style={{ color: "var(--lux-ink)" }}>
                    ⚡ CONNECT TO CLAUDE →
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </main>

        <LuxuryFooter />
      </div>
    </>
  );
}
