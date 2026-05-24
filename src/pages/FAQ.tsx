import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import SectionHeading from "@/components/lux/SectionHeading";

const groups = [
  {
    title: "The Studio",
    items: [
      {
        q: "What does the studio actually deliver?",
        a: "A single 8–12 second cinematic film, 1080p, vertical 9:16, with a slow drone-style camera move, parallax depth, and real motion physics. No watermark on paid plans. No audio — keep your sound design yours.",
      },
      {
        q: "Do I need a 'before' photograph?",
        a: "Only for Setup / Cleanup / Transformation morphs. For Done-For-You Reels, Camera Movement, Sun-to-Dusk, Virtual Staging, Sketch-to-Real, and Floor Plan walkthroughs you upload one photo (or a handful) and we render the rest.",
      },
      {
        q: "How long does a render take?",
        a: "Three minutes is the typical wall-clock time from upload to finished MP4. Done-For-You Reels (6 clips auto-stitched) take 3–5 minutes. Single-clip animations finish in about 90 seconds.",
      },
      {
        q: "What formats do you export?",
        a: "Native 9:16 vertical 1080p MP4 — uploads cleanly to Reels, TikTok, Shorts, Zillow, Realtor.com, and the MLS without re-encoding.",
      },
      {
        q: "Is this MLS-safe? What about AI-disclosure laws?",
        a: "Every export carries a built-in AI-disclosure tag, plus a one-click link to the original photo for buyers. Compliant with CA AB-723, CO HB24-1147, and every major MLS we've checked. We track the disclosure rules and update the layer when local law changes.",
      },
    ],
  },
  {
    title: "Pricing & Credits",
    items: [
      {
        q: "Do credits expire?",
        a: "Credits are valid 12 months from your most recent purchase. Buying more credits resets the 12-month clock for your whole balance, so active users effectively never see expiry.",
      },
      {
        q: "What does a typical render cost in credits?",
        a: "Done-For-You Reel: 50 credits. Animate Single (one camera move on one photo): 10 credits. Virtual Staging / Sun-to-Dusk / Sketch-to-Real / Floor Plan: 15 credits each. Listing Bundle (6 clips, delivered separately): 45 credits. Setup / Cleanup / Transformation: 12–15 credits.",
      },
      {
        q: "Can I get a refund?",
        a: "Yes. PRO ($79) and STUDIO ($149.99) include a 30-day money-back guarantee — refund the month if you don't love it, no calls, no forms. STARTER ($39) doesn't include the guarantee but you can cancel anytime and keep your remaining credits.",
      },
      {
        q: "What's the difference between the three tiers?",
        a: "STARTER ($39 / 500 credits) is the watermark trial. PRO ($79 / 1,200 credits) removes the watermark, adds brand presets (logo + agent name), priority render queue, and the 30-day money-back. STUDIO ($149.99 / 2,800 credits) adds team seats for up to 5 agents and MLS-ready exports with disclosure URLs.",
      },
    ],
  },
  {
    title: "Output & Compliance",
    items: [
      {
        q: "Does the video look fake?",
        a: "It's the same photo you uploaded — we just add cinematic camera motion to it. No invented walls, no morphing furniture, no plastic AI sheen. The Reel feels like a steadicam shot because mathematically that's what it is.",
      },
      {
        q: "Will this replace my videographer?",
        a: "It replaces the $300–$1,000 cinematic listing add-on you stopped offering because turnaround was too slow. It does not replace a fully narrated property tour with a drone operator on site. Complement, not substitute.",
      },
      {
        q: "Who owns the videos?",
        a: "You do. Full commercial rights to every Reel delivered on your account, including for client resale. We never use your photographs to train future models.",
      },
      {
        q: "Can my brokerage use it?",
        a: "Yes. STUDIO ($149.99) includes 5 agent seats and MLS-ready exports. For larger teams or brokerage-branded galleries, email hello@thevantage.media.",
      },
    ],
  },
  {
    title: "Privacy & Data",
    items: [
      {
        q: "Do you train on my photos?",
        a: "No. Your photographs are processed for your render and then deleted from our pipelines within 30 days. We never train future models on customer images. Full provenance documentation available on request.",
      },
      {
        q: "Where are renders processed?",
        a: "Our render fleet runs in US-East and EU-West regions on dedicated GPU clusters. Enterprise House plan customers can request region pinning.",
      },
    ],
  },
];

const FAQ = () => (
  <>
    <Helmet>
      <title>Quiet Questions — The Vantage</title>
      <meta name="description" content="Asked, often. Answered, plainly. Everything you need to know about the studio, pricing, and workflow." />
      <link rel="canonical" href="https://thevantage.media/faq" />
    </Helmet>

    <div className="min-h-screen lux-bg-bone" style={{ color: "var(--lux-ink)" }}>
      <LuxuryHeader variant="bone" />

      <main id="main-content">
        <section className="lux-section lux-bg-bone">
          <div className="lux-container">
            <div className="grid lg:grid-cols-12 gap-12">
              <div className="lg:col-span-4 lg:sticky lg:top-32 lg:self-start">
                <SectionHeading
                  eyebrow="QUIET QUESTIONS"
                  title="Asked, often."
                  italic="Answered, plainly."
                  lede="Everything we get asked most weeks. If you can't find what you need, our liaisons answer email within four working hours."
                />
                <Link to="/contact" className="lux-eyebrow inline-flex items-center gap-3 mt-10" style={{ color: "var(--lux-ink)" }}>
                  <span style={{ display: "inline-block", width: 24, height: 1, background: "var(--lux-ink)" }} />
                  EMAIL A LIAISON
                </Link>
              </div>

              <div className="lg:col-span-8">
                {groups.map((g, gi) => (
                  <div key={g.title} className={gi > 0 ? "mt-20" : ""}>
                    <div className="lux-eyebrow mb-8" style={{ color: "var(--lux-rust)" }}>
                      ✦ {g.title.toUpperCase()}
                    </div>
                    {g.items.map((f, i) => (
                      <details
                        key={i}
                        className="group py-7"
                        style={{ borderBottom: "1px solid var(--lux-hairline)" }}
                      >
                        <summary className="flex items-baseline justify-between cursor-pointer list-none">
                          <span
                            className="lux-display text-2xl md:text-3xl pr-8"
                            style={{ letterSpacing: "-0.012em" }}
                          >
                            {f.q}
                          </span>
                          <span
                            className="lux-display-italic flex-shrink-0 transition-transform group-open:rotate-45"
                            style={{ color: "var(--lux-rust)", fontSize: 32, lineHeight: 1 }}
                          >
                            +
                          </span>
                        </summary>
                        <p className="lux-prose mt-5" style={{ maxWidth: 640 }}>{f.a}</p>
                      </details>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <LuxuryFooter />
    </div>
  </>
);

export default FAQ;
