import { Link } from "react-router-dom";

const cols = [
  {
    title: "The Studio",
    links: [
      { to: "/", label: "Home" },
      { to: "/gallery", label: "The Reel" },
      { to: "/pricing", label: "Pricing" },
      { to: "/contact", label: "Contact" },
    ],
  },
  {
    title: "For Whom",
    links: [
      { to: "/real-estate-photographers", label: "Real Estate Photographers" },
      { to: "/for-agents", label: "Listing Agents" },
      { to: "/for-airbnb", label: "Airbnb Hosts" },
      { to: "/for-agencies", label: "Agencies & Brokerages" },
    ],
  },
  {
    title: "Industries",
    links: [
      { to: "/landscaping", label: "Landscapers" },
      { to: "/pool-builders", label: "Pool Builders" },
      { to: "/kitchen-renovation", label: "Kitchen Renovation" },
      { to: "/bathroom-renovation", label: "Bathroom Renovation" },
    ],
  },
  {
    title: "Account",
    links: [
      { to: "/login", label: "Sign In" },
      { to: "/signup", label: "Begin Free" },
      { to: "/dashboard", label: "Dashboard" },
      { to: "/privacy-policy", label: "Privacy" },
    ],
  },
];

const LuxuryFooter = () => {
  return (
    /* Bottom padding accounts for the sticky CTA bar (~72px) overlaying the viewport
       bottom on landing pages. Without it, the copyright line gets cropped. */
    <footer className="lux-bg-ink lux-grain" style={{ color: "var(--lux-bone)", paddingBottom: 88 }}>
      <div className="lux-container" style={{ paddingTop: 96, paddingBottom: 48 }}>
        <div className="grid lg:grid-cols-12 gap-12 mb-20">
          <div className="lg:col-span-4">
            <div className="lux-display-italic" style={{ fontSize: 40, lineHeight: 1, color: "var(--lux-bone)" }}>
              The Vantage<span style={{ color: "var(--lux-rust)" }}>.</span>
            </div>
            <div className="lux-eyebrow mt-3" style={{ color: "var(--lux-champagne)" }}>
              CINEMATIC LISTING FILMS · EST. 2026
            </div>
            <p className="lux-prose mt-8 max-w-sm" style={{ color: "rgba(244,239,230,0.7)" }}>
              The world's first single-frame transformation studio. One photo in.
              A scroll-stopping listing film out — delivered in minutes, not days.
            </p>

            <div className="mt-10">
              <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-champagne)" }}>SUBSCRIBE</div>
              <form
                className="flex border-b"
                style={{ borderColor: "rgba(244,239,230,0.3)" }}
                onSubmit={(e) => e.preventDefault()}
              >
                <input
                  type="email"
                  placeholder="your@studio.com"
                  className="flex-1 bg-transparent outline-none py-3 text-base"
                  style={{ color: "var(--lux-bone)" }}
                />
                <button
                  type="submit"
                  className="lux-eyebrow"
                  style={{ color: "var(--lux-champagne)" }}
                >
                  →
                </button>
              </form>
              <p className="text-xs mt-3" style={{ color: "rgba(244,239,230,0.5)" }}>
                Monthly dispatch. New films, behind-the-scenes, & studio releases.
              </p>
            </div>
          </div>

          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-10">
            {cols.map((c) => (
              <div key={c.title}>
                <div className="lux-eyebrow mb-6" style={{ color: "var(--lux-champagne)" }}>
                  {c.title}
                </div>
                <ul className="flex flex-col gap-3">
                  {c.links.map((l) => (
                    <li key={l.to}>
                      <Link
                        to={l.to}
                        className="lux-serif text-lg hover:text-champagne transition-colors"
                        style={{ color: "var(--lux-bone)" }}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div
          className="flex flex-col md:flex-row justify-between gap-6 pt-8"
          style={{ borderTop: "1px solid rgba(244,239,230,0.12)" }}
        >
          <div className="lux-eyebrow" style={{ color: "rgba(244,239,230,0.5)" }}>
            © {new Date().getFullYear()} THE VANTAGE STUDIO · ALL RIGHTS RESERVED
          </div>
          <div className="flex gap-8">
            <a href="https://www.instagram.com" className="lux-eyebrow" style={{ color: "rgba(244,239,230,0.7)" }}>INSTAGRAM</a>
            <a href="https://www.tiktok.com" className="lux-eyebrow" style={{ color: "rgba(244,239,230,0.7)" }}>TIKTOK</a>
            <a href="https://vimeo.com" className="lux-eyebrow" style={{ color: "rgba(244,239,230,0.7)" }}>VIMEO</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LuxuryFooter;
