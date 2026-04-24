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
        a: "No. We reconstruct the prior state from architectural cues in your finished frame. That's the heart of the studio. One photo in. A full transformation out.",
      },
      {
        q: "How long does a render take?",
        a: "Average across the studio is 3 minutes 14 seconds. Studio plan subscribers see 90 seconds. House plan: 45 seconds.",
      },
      {
        q: "What formats do you export?",
        a: "Vertical 9:16, square 1:1, and horizontal 16:9 — every render delivers all three simultaneously, ready for any MLS field, Reels, TikTok, YouTube Shorts, or Vimeo.",
      },
    ],
  },
  {
    title: "Pricing & Credits",
    items: [
      {
        q: "Do credits expire?",
        a: "Never. Credits never expire on any pack. Subscription credits refresh monthly but unused credits roll over.",
      },
      {
        q: "What does a typical film cost in credits?",
        a: "A 5-second listing film: 20 credits. A 10-second transformation with AI before: 50 credits. A photo enhancement: 10 credits. The Studio pack ($129 for 650 credits) works out to roughly $0.42 per finished film at volume.",
      },
      {
        q: "Can I get a refund?",
        a: "Yes. We offer a 30-day refund window on all credit packs. Subscriptions can be cancelled anytime — you keep your remaining credits.",
      },
    ],
  },
  {
    title: "Workflow & Trade",
    items: [
      {
        q: "Will this replace my videographer?",
        a: "It replaces the $1,500 cinematic listing add-on you stopped offering because the margins were thin. It does not replace a fully scripted property tour. We're a complement, not a substitute.",
      },
      {
        q: "Who owns the films?",
        a: "You do. Full commercial rights to every film delivered on your account, including for client resale. We never use your photographs to train future models.",
      },
      {
        q: "Can my brokerage white-label this?",
        a: "Yes. The House plan includes white-label delivery, brokerage-branded galleries, agent seats, and a dedicated liaison. Speak to us.",
      },
      {
        q: "Do you integrate with my existing tools?",
        a: "Yes — we integrate with Pixifi, Iris, ShootProof, HoneyBook, Compass tools, Side Inc., kvCORE, Sierra, BoomTown, and the major MLS platforms. Native API + Zapier.",
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
      <link rel="canonical" href="https://thevantage.co/faq" />
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
