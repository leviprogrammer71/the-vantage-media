import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import SectionHeading from "@/components/lux/SectionHeading";
import ROICalculator from "@/components/lux/ROICalculator";
import StatStrip from "@/components/lux/StatStrip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CREDIT_PACKS, CREDIT_COSTS, SUBSCRIPTION_PLANS } from "@/lib/credit-config";
import { Loader2 } from "lucide-react";

const productLines = [
  { item: "Listing Film · 5s", credits: CREDIT_COSTS.listingVideo5s },
  { item: "Listing Film · 10s", credits: CREDIT_COSTS.listingVideo10s },
  { item: "Transformation · AI Before · 5s", credits: CREDIT_COSTS.transformationAI5s },
  { item: "Transformation · AI Before · 10s", credits: CREDIT_COSTS.transformationAI10s },
  { item: "Transformation · Your Before · 5s", credits: CREDIT_COSTS.transformationOwn5s },
  { item: "Photo Enhancement", credits: CREDIT_COSTS.photoEnhance },
  { item: "Studio Consultation", credits: CREDIT_COSTS.websiteConsultation },
];

const Pricing = () => {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      supabase
        .from("user_credits")
        .select("credits")
        .eq("user_id", user.id)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setCreditBalance(data.credits);
        });
    }
  }, [user]);

  const startCheckout = async (label: string, priceType: string, isSubscription: boolean) => {
    if (!user) {
      toast.error("Please sign in to continue.");
      return;
    }
    setLoadingPlan(priceType);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceType, isSubscription },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("Checkout did not return a URL.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to begin checkout.";
      toast.error(`${label}: ${message}`);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>The Price List — The Vantage</title>
        <meta
          name="description"
          content="Pay-as-you-create credits for cinematic listing films. No subscriptions. No tiers. Credits never expire."
        />
        <link rel="canonical" href="https://thevantage.co/pricing" />
      </Helmet>

      <div className="min-h-screen lux-bg-bone" style={{ color: "var(--lux-ink)" }}>
        <LuxuryHeader variant="bone" />

        <main id="main-content">
          {/* HERO */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container">
              <div className="grid lg:grid-cols-12 gap-12 items-end">
                <div className="lg:col-span-7">
                  <div className="lux-eyebrow mb-6 flex items-center gap-3" style={{ color: "var(--lux-rust)" }}>
                    <span style={{ display: "inline-block", width: 36, height: 1, background: "var(--lux-rust)" }} />
                    THE PRICE LIST · APRIL 2026
                  </div>
                  <h1
                    className="lux-display"
                    style={{ fontSize: "clamp(3rem, 8vw, 7rem)", lineHeight: 0.92, letterSpacing: "-0.022em" }}
                  >
                    Pay only for
                    <br />
                    the films you
                    <br />
                    actually <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>finish.</span>
                  </h1>
                </div>
                <div className="lg:col-span-5">
                  <p className="lux-prose" style={{ fontSize: 19 }}>
                    Credits, paid as you create. Top up when the studio is busy. No subscriptions to forget about. No tiers to outgrow. Credits never expire.
                  </p>
                  {creditBalance !== null && (
                    <div className="mt-8 p-6 lux-bg-cream" style={{ border: "1px solid var(--lux-hairline)" }}>
                      <div className="lux-eyebrow" style={{ color: "var(--lux-ash)" }}>YOUR ACCOUNT</div>
                      <div className="lux-display text-4xl mt-2">{creditBalance} <span className="lux-display-italic text-2xl" style={{ color: "var(--lux-ash)" }}>credits remaining</span></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* CREDIT PACKS */}
          <section className="lux-section lux-bg-cream">
            <div className="lux-container">
              <SectionHeading
                eyebrow="THE CREDIT PACKS"
                title="One purchase."
                italic="Years of films."
                lede="Each pack ships immediately. Credits never expire. Use them across photo enhancement, listing films, and transformation videos in any combination."
                align="center"
                className="mb-20"
              />

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {CREDIT_PACKS.map((p) => {
                  const featured = p.popular;
                  return (
                    <div
                      key={p.id}
                      className={`p-8 ${featured ? "lux-bg-ink" : "lux-bg-bone"} relative flex flex-col`}
                      style={{
                        border: "1px solid var(--lux-hairline)",
                        color: featured ? "var(--lux-bone)" : "var(--lux-ink)",
                      }}
                    >
                      {featured && (
                        <span
                          className="lux-eyebrow absolute -top-3 left-8"
                          style={{
                            color: "var(--lux-ink)",
                            background: "var(--lux-champagne)",
                            padding: "6px 12px",
                          }}
                        >
                          ✦ MOST CHOSEN
                        </span>
                      )}
                      <div className="lux-eyebrow" style={{ color: featured ? "var(--lux-champagne)" : "var(--lux-brass)" }}>
                        {p.name}
                      </div>
                      <div className="lux-display mt-4" style={{ fontSize: "clamp(2.4rem, 4vw, 3.4rem)", lineHeight: 1 }}>
                        ${p.price}
                      </div>
                      <div
                        className="lux-display-italic mt-3"
                        style={{ color: featured ? "rgba(244,239,230,0.8)" : "var(--lux-ash)", fontSize: 18 }}
                      >
                        {p.credits} credits
                      </div>
                      <div className="lux-eyebrow mt-2" style={{ color: featured ? "var(--lux-champagne)" : "var(--lux-rust)" }}>
                        {p.perCredit} / credit {p.savings ? `· ${p.savings.toUpperCase()}` : ""}
                      </div>

                      <ul className="mt-8 flex flex-col gap-3 flex-1">
                        {p.features.slice(0, 4).map((f, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-3 text-sm"
                            style={{ color: featured ? "rgba(244,239,230,0.85)" : "var(--lux-ink)", fontFamily: "Inter, sans-serif" }}
                          >
                            <span style={{ color: featured ? "var(--lux-champagne)" : "var(--lux-rust)", marginTop: 4 }}>—</span>
                            {f}
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => startCheckout(p.name, p.priceType, false)}
                        disabled={loadingPlan === p.priceType}
                        className="lux-eyebrow w-full mt-10 inline-flex items-center justify-center gap-3 transition-colors"
                        style={{
                          padding: "16px 20px",
                          background: featured ? "var(--lux-bone)" : "var(--lux-ink)",
                          color: featured ? "var(--lux-ink)" : "var(--lux-bone)",
                          border: featured ? "1px solid var(--lux-bone)" : "1px solid var(--lux-ink)",
                          opacity: loadingPlan === p.priceType ? 0.6 : 1,
                          cursor: loadingPlan === p.priceType ? "wait" : "pointer",
                        }}
                      >
                        {loadingPlan === p.priceType ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <>BUY {p.name} →</>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              <p className="lux-eyebrow text-center mt-10" style={{ color: "var(--lux-ash)" }}>
                ALL PRICES IN USD · CREDITS NEVER EXPIRE · USE ANYTIME
              </p>
            </div>
          </section>

          {/* SUBSCRIPTION */}
          {SUBSCRIPTION_PLANS.length > 0 && (
            <section className="lux-section lux-bg-bone">
              <div className="lux-container">
                <div className="grid lg:grid-cols-12 gap-12 items-center">
                  <div className="lg:col-span-5">
                    <SectionHeading
                      eyebrow="THE STANDING ORDER"
                      title="A monthly retainer,"
                      italic="for the working studio."
                      lede="If you create every week, set up a standing order. Credits refresh on the first. Cancel anytime."
                    />
                  </div>
                  <div className="lg:col-span-7">
                    {SUBSCRIPTION_PLANS.map((plan) => (
                      <div
                        key={plan.id}
                        className="p-10 lux-bg-cream"
                        style={{ border: "1px solid var(--lux-hairline)" }}
                      >
                        <div className="flex justify-between items-baseline mb-6">
                          <div>
                            <div className="lux-eyebrow" style={{ color: "var(--lux-rust)" }}>{plan.name}</div>
                            <div className="lux-display mt-2" style={{ fontSize: "clamp(2rem, 3.4vw, 2.6rem)" }}>
                              The Atelier Standing Order
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="lux-display" style={{ fontSize: "clamp(2.4rem, 4vw, 3.4rem)", lineHeight: 1 }}>
                              ${plan.price}
                            </div>
                            <div className="lux-eyebrow mt-2" style={{ color: "var(--lux-ash)" }}>/ {plan.period}</div>
                          </div>
                        </div>
                        <ul className="grid sm:grid-cols-2 gap-3 mb-8">
                          {plan.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "var(--lux-ink)", fontFamily: "Inter, sans-serif" }}>
                              <span style={{ color: "var(--lux-rust)", marginTop: 4 }}>—</span>
                              {f}
                            </li>
                          ))}
                        </ul>
                        <button
                          onClick={() => startCheckout(plan.name, plan.priceType, true)}
                          disabled={loadingPlan === plan.priceType}
                          className="lux-eyebrow inline-flex items-center gap-3"
                          style={{
                            padding: "16px 24px",
                            background: "var(--lux-ink)",
                            color: "var(--lux-bone)",
                            border: "1px solid var(--lux-ink)",
                          }}
                        >
                          {loadingPlan === plan.priceType ? <Loader2 size={14} className="animate-spin" /> : "BEGIN STANDING ORDER →"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* THE TARIFF SHEET */}
          <section className="lux-section lux-bg-parchment">
            <div className="lux-container">
              <SectionHeading
                eyebrow="THE TARIFF SHEET"
                title="What each thing costs."
                lede="Transparent pricing across every studio service. Credits convert linearly — no hidden multipliers, no surge pricing."
                align="center"
                className="mb-16"
              />

              <div className="max-w-3xl mx-auto" style={{ border: "1px solid var(--lux-hairline)" }}>
                {productLines.map((row, i) => (
                  <div
                    key={i}
                    className="flex items-baseline justify-between py-6 px-6"
                    style={{
                      borderBottom: i < productLines.length - 1 ? "1px solid var(--lux-hairline)" : "none",
                      background: i % 2 === 0 ? "var(--lux-bone)" : "var(--lux-parchment)",
                    }}
                  >
                    <span className="lux-display text-xl md:text-2xl" style={{ letterSpacing: "-0.012em" }}>
                      {row.item}
                    </span>
                    <span
                      className="lux-display-italic"
                      style={{ color: "var(--lux-rust)", fontSize: 22 }}
                    >
                      {row.credits} credits
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ROI */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">
              <div className="lg:col-span-5">
                <SectionHeading
                  eyebrow="DO THE MATH"
                  title="An invoice,"
                  italic="not an expense."
                  lede="Move the dials. See what cinematic motion adds to your monthly invoice. Numbers are conservative — pulled from active-studio cohort data, Q1 2026."
                />
              </div>
              <div className="lg:col-span-7">
                <ROICalculator variant="photographer" defaultListings={20} defaultRate={425} />
              </div>
            </div>
          </section>

          <StatStrip
            variant="ink"
            stats={[
              { value: "$0.42", label: "PER FILM · STUDIO PLAN" },
              { value: "0", label: "EXPIRY DAYS" },
              { value: "All", label: "MAJOR CARDS · APPLE PAY" },
              { value: "30 d", label: "REFUND WINDOW" },
            ]}
          />

          {/* FINAL CTA */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container text-center">
              <h2 className="lux-display" style={{ fontSize: "clamp(2.6rem, 6vw, 5.5rem)", lineHeight: 0.95 }}>
                Begin with fifty
                <br />
                <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>credits, free.</span>
              </h2>
              <p className="lux-prose mt-8 mx-auto" style={{ maxWidth: 480 }}>
                Roughly twelve finished films. Enough to test it on three real shoots before you ever reach for your card.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
                <Link to="/signup" className="lux-btn">
                  BEGIN FREE — 50 CREDITS →
                </Link>
                <Link to="/contact" className="lux-eyebrow inline-flex items-center gap-3" style={{ color: "var(--lux-ink)" }}>
                  <span style={{ display: "inline-block", width: 24, height: 1, background: "var(--lux-ink)" }} />
                  ENTERPRISE & WHITE-LABEL
                </Link>
              </div>
            </div>
          </section>
        </main>

        <LuxuryFooter />
      </div>
    </>
  );
};

export default Pricing;
