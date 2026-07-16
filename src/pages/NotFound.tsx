import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";

/** 404 — styled to the luxury editorial system so even a dead end feels on-brand. */
const NotFound = () => {
  return (
    <>
      <Helmet>
        <title>Page Not Found — The Vantage</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="min-h-screen lux-bg-bone flex flex-col" style={{ color: "var(--lux-ink)" }}>
        <LuxuryHeader variant="bone" />
        <main className="flex-1 flex items-center">
          <div className="lux-container text-center py-24">
            <div className="lux-eyebrow mb-6" style={{ color: "var(--lux-rust)" }}>
              LOST FRAME · 404
            </div>
            <h1 className="lux-display" style={{ fontSize: "clamp(4rem, 14vw, 11rem)", lineHeight: 0.9, letterSpacing: "-0.03em" }}>
              404
            </h1>
            <p className="lux-display-italic mt-4" style={{ fontSize: "clamp(1.2rem, 3vw, 1.8rem)", color: "var(--lux-rust)" }}>
              This page didn&rsquo;t make the final cut.
            </p>
            <p className="lux-prose mt-5 mx-auto" style={{ maxWidth: 420, color: "var(--lux-ash)" }}>
              The address may have moved or never existed. The studio, the
              gallery, and your reels are all still exactly where you left them.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
              <Link to="/" className="lux-btn" style={{ background: "var(--lux-ink)", color: "var(--lux-bone)" }}>
                ← BACK TO THE STUDIO
              </Link>
              <Link to="/examples" className="lux-eyebrow inline-flex items-center gap-2" style={{ color: "var(--lux-ink)" }}>
                SEE THE GALLERY →
              </Link>
            </div>
          </div>
        </main>
        <LuxuryFooter />
      </div>
    </>
  );
};

export default NotFound;
