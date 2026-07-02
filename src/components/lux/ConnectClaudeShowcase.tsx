import { Link } from "react-router-dom";
import { Plug, ArrowRight } from "lucide-react";

/**
 * ConnectClaudeShowcase — landing-page feature block for the Claude connector.
 * Positioned high on the homepage as a headline feature: paste a listing link
 * into Claude, get a finished reel back. Left = a chat mockup; right = pitch + CTA.
 */
export default function ConnectClaudeShowcase() {
  return (
    <section className="lux-section lux-bg-ink lux-grain" style={{ color: "var(--lux-bone)" }}>
      <div className="lux-container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* LEFT — Claude chat mockup */}
          <div
            className="order-2 lg:order-1"
            style={{ background: "var(--lux-onyx, #17170f)", border: "1px solid var(--lux-hairline-strong)", padding: 0 }}
          >
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: "1px solid var(--lux-hairline-strong)" }}
            >
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--lux-rust)" }} />
              <span className="lux-eyebrow" style={{ fontSize: "0.58rem", color: "rgba(244,239,230,0.6)" }}>
                CLAUDE · THE VANTAGE CONNECTED
              </span>
            </div>
            <div className="p-5 space-y-4" style={{ fontFamily: "Inter, sans-serif", fontSize: "0.86rem" }}>
              {/* user bubble */}
              <div className="flex justify-end">
                <div style={{ background: "var(--lux-champagne, #d9c9a3)", color: "var(--lux-ink)", padding: "10px 14px", maxWidth: "80%", borderRadius: 2 }}>
                  Make me a reel for this listing: zillow.com/homedetails/…
                </div>
              </div>
              {/* claude bubble */}
              <div className="flex justify-start">
                <div style={{ background: "rgba(244,239,230,0.06)", color: "var(--lux-bone)", padding: "12px 14px", maxWidth: "88%", border: "1px solid var(--lux-hairline-strong)", borderRadius: 2 }}>
                  <div className="lux-eyebrow mb-2" style={{ fontSize: "0.55rem", color: "var(--lux-champagne)" }}>
                    ✦ USING VANTAGE_CREATE_REEL_FROM_URL
                  </div>
                  Pulled 9 photos + the address. Your reel is ready:
                  <div className="mt-2 flex items-center gap-2" style={{ color: "var(--lux-champagne)" }}>
                    <span>▶</span> <span style={{ textDecoration: "underline" }}>listing-reel.mp4</span>
                  </div>
                  <div className="mt-2" style={{ fontSize: "0.78rem", color: "rgba(244,239,230,0.75)" }}>
                    Caption + hashtags below — ready to post.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — pitch */}
          <div className="order-1 lg:order-2">
            <div className="lux-eyebrow inline-flex items-center gap-2 mb-4" style={{ color: "var(--lux-champagne)" }}>
              <Plug size={13} /> NEW · WORKS INSIDE CLAUDE
            </div>
            <h2 className="lux-display" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.02 }}>
              Your listings become reels <em style={{ color: "var(--lux-champagne)" }}>without opening the app.</em>
            </h2>
            <p className="lux-prose mt-5" style={{ fontSize: "1rem", color: "rgba(244,239,230,0.8)", maxWidth: 520 }}>
              Connect The Vantage to Claude once. Then paste a Zillow or Airbnb link — or drop your own
              photos — into any chat and get a finished, captioned reel back in minutes. The system does
              the fetching, the filming, and the copy. You just ask.
            </p>
            <ul className="mt-6 space-y-2 lux-prose" style={{ fontSize: "0.92rem", color: "rgba(244,239,230,0.85)" }}>
              <li>— One-click connector token, tied to your account</li>
              <li>— Reels still land in your Vantage gallery</li>
              <li>— Caption + hashtags written for you, ready to post</li>
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link to="/connect" className="lux-btn lux-btn-bone inline-flex items-center gap-2">
                CONNECT TO CLAUDE <ArrowRight size={15} />
              </Link>
              <Link to="/connect" className="lux-eyebrow" style={{ color: "var(--lux-champagne)" }}>
                SEE HOW IT WORKS
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
