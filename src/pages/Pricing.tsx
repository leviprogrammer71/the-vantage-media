import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import Marquee from "@/components/lux/Marquee";
import SectionHeading from "@/components/lux/SectionHeading";
import ROICalculator from "@/components/lux/ROICalculator";
import StatStrip from "@/components/lux/StatStrip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CREDIT_PACKS, CREDIT_COSTS, SUBSCRIPTION_PLANS } from "@/lib/credit-config";
import { Loader2, Lock, Zap, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

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
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  // Default to annual — anchors higher AOV + lower churn, and the cents-per-month math reads better
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");

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
      // Redirect to sign-in, preserving the user's intent to return to /pricing
      const returnUrl = encodeURIComponent("/pricing");
      navigate(`/login?returnUrl=${returnUrl}`);
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
          {/* URGENCY MARQUEE */}
          <div className="lux-bg-cream py-4" style={{ borderBottom: "1px solid var(--lux-hairline)" }}>
            <Marquee
              items={[
                "23 photographers signed up today",
                "8 listing reels generated this hour",
                "Founder pricing — Free 50 credits ends in 45 days",
                "Join the studio — 47 creators active now",
              ]}
            />
          </div>

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
                    No subscriptions.
                    <br />
                    Credits never
                    <br />
                    <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>expire.</span>
                  </h1>
                </div>
                <div className="lg:col-span-5">
                  <p className="lux-prose" style={{ fontSize: 19, color: "var(--lux-ink)" }}>
                    Pay once. Use for months. Top up anytime the studio's busy. No subscriptions to cancel, no expiry dates, no hidden tiers.
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

          {/* VS RENDY — Why choose Vantage */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container mb-16">
              <div className="mb-12 p-6 lux-bg-parchment" style={{ border: "1px solid var(--lux-hairline)" }}>
                <h3 className="lux-display text-2xl mb-4" style={{ color: "var(--lux-ink)" }}>vs. Rendy.io</h3>
                <div className="space-y-3 text-sm" style={{ color: "var(--lux-ink)", lineHeight: 1.8 }}>
                  <p>Six listing categories, not two. Floor-plan-to-walkthrough native. 2-clip transformation reels — moment plus reveal. 1080p Seedance 2.0. Built by photographers who shoot $5M+ listings. Real-estate-native shot types and vibes.</p>
                </div>
              </div>
            </div>
          </section>

          {/* TESTIMONIAL STRIP */}
          <section className="lux-section lux-bg-bone" style={{ paddingTop: 0 }}>
            <div className="lux-container">
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { quote: "Pays for itself the first week.", author: "Maya Atwood", company: "Atwood Photographic" },
                  { quote: "We added it as a $450 line item the next morning.", author: "Jordan Park", company: "Meridian Visual Co." },
                  { quote: "Three minutes per film. We've quietly tripled our throughput.", author: "Sara Larsen", company: "House of Larsen" },
                ].map((t, i) => (
                  <div
                    key={i}
                    className="p-8 lux-bg-bone"
                    style={{ border: "1px solid var(--lux-hairline)" }}
                  >
                    <p className="lux-prose mb-4 italic">{t.quote}</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>
                          {t.author}
                        </div>
                        <div style={{ color: "var(--lux-ash)", fontSize: "0.875rem" }}>
                          {t.company}
                        </div>
                      </div>
                      <div style={{ color: "var(--lux-rust)" }}>★★★★★</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CREDIT PACKS */}
          <section className="lux-section lux-bg-cream">
            <div className="lux-container">
              <div className="mb-12 text-center">
                <SectionHeading
                  eyebrow="CREDIT PACKS"
                  title="Load once."
                  italic="Use forever."
                  lede="Buy credits, create films forever. No subscription, no expiry. Works for listing videos, transformations, photo enhancements in any mix."
                  align="center"
                  className="mb-12"
                />
                {/* Monthly/Annual Toggle */}
                <div className="flex items-center justify-center gap-4">
                  <span className="lux-prose" style={{ color: billingCycle === "monthly" ? "var(--lux-ink)" : "var(--lux-ash)" }}>
                    Monthly
                  </span>
                  <Switch
                    checked={billingCycle === "annual"}
                    onCheckedChange={(checked) => setBillingCycle(checked ? "annual" : "monthly")}
                    className="mx-2"
                  />
                  <span className="lux-prose flex items-center gap-2" style={{ color: billingCycle === "annual" ? "var(--lux-ink)" : "var(--lux-ash)" }}>
                    Annual <span style={{ color: "var(--lux-rust)", fontSize: "0.875rem", fontWeight: "600" }}>· Save 30%</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-4xl mx-auto">
                {CREDIT_PACKS.map((p) => {
                  const featured = p.popular;
                  return (
                    <div
                      key={p.id}
                      className="p-8 lg:p-10 relative flex flex-col"
                      style={{
                        background: featured ? "var(--lux-ink)" : "var(--lux-cream)",
                        border: `1px solid ${featured ? "var(--lux-ink)" : "var(--lux-hairline-strong)"}`,
                        color: featured ? "var(--lux-bone)" : "var(--lux-ink)",
                        minHeight: "480px",
                        boxShadow: featured ? "0 14px 40px rgba(14,14,12,0.18)" : "none",
                      }}
                    >
                      {featured && (
                        <span
                          className="lux-eyebrow absolute -top-3 left-7"
                          style={{
                            color: "var(--lux-ink)",
                            background: "var(--lux-champagne)",
                            padding: "6px 12px",
                            fontSize: "0.62rem",
                            letterSpacing: "0.18em",
                            zIndex: 2,
                          }}
                        >
                          ✦ MOST CHOSEN
                        </span>
                      )}

                      {/* Pack name */}
                      <div
                        className="lux-eyebrow"
                        style={{
                          color: featured ? "var(--lux-champagne)" : "var(--lux-rust)",
                          fontSize: "0.72rem",
                          letterSpacing: "0.2em",
                        }}
                      >
                        {p.name}
                      </div>

                      {/* PRICE — large, explicit color, never invisible */}
                      <div
                        className="lux-display mt-3"
                        style={{
                          fontSize: "clamp(2.6rem, 5vw, 3.6rem)",
                          lineHeight: 1,
                          color: featured ? "var(--lux-bone)" : "var(--lux-ink)",
                          fontWeight: 600,
                        }}
                      >
                        ${p.price}
                      </div>

                      {/* Credits count */}
                      <div
                        className="mt-2"
                        style={{
                          color: featured ? "rgba(244,239,230,0.85)" : "var(--lux-ink)",
                          fontSize: "1.05rem",
                          fontFamily: "Inter, sans-serif",
                          fontWeight: 500,
                        }}
                      >
                        {p.credits.toLocaleString()} credits
                      </div>

                      {/* Per-credit + savings */}
                      <div
                        className="mt-1"
                        style={{
                          color: featured ? "var(--lux-champagne)" : "var(--lux-rust)",
                          fontSize: "0.78rem",
                          fontFamily: "Inter, sans-serif",
                          fontWeight: 500,
                        }}
                      >
                        {p.perCredit} per credit{p.savings ? ` · ${p.savings}` : ""}
                      </div>

                      {/* Divider */}
                      <div
                        className="mt-5 mb-4"
                        style={{
                          borderTop: `1px solid ${featured ? "rgba(244,239,230,0.18)" : "var(--lux-hairline)"}`,
                        }}
                      />

                      {/* Features */}
                      <ul className="flex flex-col gap-2.5 flex-1">
                        {p.features.slice(0, 4).map((f, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2"
                            style={{
                              color: featured ? "rgba(244,239,230,0.92)" : "var(--lux-ink)",
                              fontFamily: "Inter, sans-serif",
                              fontSize: "0.85rem",
                              lineHeight: 1.45,
                            }}
                          >
                            <span
                              className="flex-shrink-0"
                              style={{
                                color: featured ? "var(--lux-champagne)" : "var(--lux-rust)",
                                marginTop: 2,
                                fontWeight: 700,
                              }}
                            >
                              —
                            </span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      <button
                        onClick={() => startCheckout(p.name, p.priceType, false)}
                        disabled={loadingPlan === p.priceType}
                        className="w-full mt-6 inline-flex items-center justify-center gap-3 transition-colors lux-eyebrow"
                        style={{
                          padding: "14px 18px",
                          background: featured ? "var(--lux-bone)" : "var(--lux-ink)",
                          color: featured ? "var(--lux-ink)" : "var(--lux-bone)",
                          border: featured ? "1px solid var(--lux-bone)" : "1px solid var(--lux-ink)",
                          fontSize: "0.7rem",
                          letterSpacing: "0.18em",
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

          {/* COMPARISON TABLE */}
          <section className="lux-section lux-bg-cream">
            <div className="lux-container">
              <div className="mb-16 text-center">
                <h2 className="lux-display mb-4" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
                  Free tier vs.
                  <br />
                  <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>studio scale.</span>
                </h2>
                <p className="lux-prose italic" style={{ maxWidth: 500, margin: "0 auto" }}>
                  See where the math pays for itself.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    name: "Free Tier",
                    badge: null,
                    bgClass: "lux-bg-bone",
                    textColor: "var(--lux-ink)",
                    rows: [
                      { label: "Films per month", value: "1 (preview)" },
                      { label: "Watermark", value: "Yes" },
                      { label: "Brand presets", value: "—" },
                      { label: "Private agent gallery", value: "—" },
                      { label: "Turnaround", value: "5 min" },
                      { label: "Cost per film", value: "n/a" },
                      { label: "Per-month total", value: "$0" },
                    ],
                  },
                  {
                    name: "Studio Plan",
                    badge: "RECOMMENDED",
                    bgClass: "lux-bg-ink",
                    textColor: "var(--lux-bone)",
                    rows: [
                      { label: "Films per month", value: "~160" },
                      { label: "Watermark", value: "✓" },
                      { label: "Brand presets", value: "✓" },
                      { label: "Private agent gallery", value: "✓" },
                      { label: "Turnaround", value: "5 min" },
                      { label: "Cost per film", value: "$0.42" },
                      { label: "Per-month total", value: "$129" },
                    ],
                  },
                  {
                    name: "Manual Service",
                    badge: null,
                    bgClass: "lux-bg-bone",
                    textColor: "var(--lux-ink)",
                    rows: [
                      { label: "Films per month", value: "1" },
                      { label: "Watermark", value: "None" },
                      { label: "Brand presets", value: "✓" },
                      { label: "Private agent gallery", value: "—" },
                      { label: "Turnaround", value: "5 days" },
                      { label: "Cost per film", value: "$1,800" },
                      { label: "Per-month total", value: "$1,800+" },
                    ],
                  },
                ].map((col, idx) => (
                  <div
                    key={idx}
                    className={`p-8 ${col.bgClass} relative`}
                    style={{ border: "1px solid var(--lux-hairline)", color: col.textColor }}
                  >
                    {col.badge && (
                      <div
                        className="lux-eyebrow absolute -top-3 left-8"
                        style={{
                          color: "var(--lux-ink)",
                          background: "var(--lux-champagne)",
                          padding: "6px 12px",
                        }}
                      >
                        {col.badge}
                      </div>
                    )}
                    <div className="lux-eyebrow mb-6" style={{ color: col.bgClass === "lux-bg-ink" ? "var(--lux-champagne)" : "var(--lux-brass)" }}>
                      {col.name}
                    </div>
                    <div className="space-y-4">
                      {col.rows.map((row, i) => (
                        <div key={i} className="flex flex-col gap-1 pb-4" style={{ borderBottom: "1px solid var(--lux-hairline)" }}>
                          <span className="text-xs" style={{ color: col.bgClass === "lux-bg-ink" ? "rgba(244,239,230,0.7)" : "var(--lux-ash)" }}>
                            {row.label}
                          </span>
                          <span className="lux-prose font-semibold" style={{ color: col.textColor }}>
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* MONEY-BACK GUARANTEE STRIP */}
          <section className="lux-section lux-bg-bone">
            <div className="lux-container">
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { icon: "🛡️", label: "30-DAY REFUND", desc: "No questions asked, full refund" },
                  { icon: "🔒", label: "256-BIT SSL", desc: "Bank-level encryption" },
                  { icon: "✕", label: "CANCEL ANYTIME", desc: "No long-term contracts" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="p-8 lux-bg-parchment text-center"
                    style={{ border: "1px solid var(--lux-hairline)" }}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
                      {item.icon}
                    </div>
                    <div className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>
                      {item.label}
                    </div>
                    <p style={{ color: "var(--lux-ash)", fontSize: "0.875rem" }}>
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* SUBSCRIPTION — 3-tier monthly retainer */}
          {SUBSCRIPTION_PLANS.length > 0 && (
            <section className="lux-section lg:py-32 lux-bg-bone">
              <div className="lux-container">
                <SectionHeading
                  eyebrow="MONTHLY RETAINER"
                  title="For trades and studios in"
                  italic="constant motion."
                  lede="Refresh every month. Cancel anytime. No penalty, no lock-in. Unused credits roll over."
                  align="center"
                  className="mb-16"
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
                  {SUBSCRIPTION_PLANS.map((plan) => {
                    const featured = plan.is_popular;
                    const isCustom = plan.price_monthly === null;
                    const annualMonthlyEquivalent =
                      plan.price_annual && plan.price_monthly
                        ? Math.round(plan.price_annual / 12)
                        : null;
                    const displayPrice = isCustom
                      ? "Custom"
                      : billingCycle === "annual" && annualMonthlyEquivalent
                      ? `$${annualMonthlyEquivalent}`
                      : `$${plan.price_monthly}`;

                    return (
                      <div
                        key={plan.id}
                        className="relative p-8 lg:p-10 flex flex-col"
                        style={{
                          background: featured ? "var(--lux-ink)" : "var(--lux-cream)",
                          color: featured ? "var(--lux-bone)" : "var(--lux-ink)",
                          border: `1px solid ${featured ? "var(--lux-ink)" : "var(--lux-hairline-strong)"}`,
                          minHeight: "560px",
                          boxShadow: featured ? "0 14px 40px rgba(14,14,12,0.18)" : "none",
                        }}
                      >
                        {featured && (
                          <div
                            className="lux-eyebrow absolute -top-3 left-8 px-3 py-1.5"
                            style={{
                              background: "var(--lux-champagne)",
                              color: "var(--lux-ink)",
                              fontSize: "0.62rem",
                              letterSpacing: "0.18em",
                            }}
                          >
                            ✦ MOST CHOSEN
                          </div>
                        )}

                        {/* Plan name + tagline */}
                        <div
                          className="lux-eyebrow"
                          style={{
                            color: featured ? "var(--lux-champagne)" : "var(--lux-rust)",
                            fontSize: "0.7rem",
                            letterSpacing: "0.2em",
                          }}
                        >
                          {plan.name}
                        </div>
                        <div
                          className="lux-display mt-2"
                          style={{
                            fontSize: "clamp(1.4rem, 2.4vw, 1.85rem)",
                            lineHeight: 1.1,
                            color: featured ? "var(--lux-bone)" : "var(--lux-ink)",
                          }}
                        >
                          {plan.tagline}
                        </div>

                        {/* PRICE — never invisible, explicit color, big */}
                        <div className="mt-6 flex items-baseline gap-2">
                          <span
                            className="lux-display"
                            style={{
                              fontSize: "clamp(2.6rem, 5vw, 3.6rem)",
                              lineHeight: 1,
                              color: featured ? "var(--lux-bone)" : "var(--lux-ink)",
                              fontWeight: 600,
                            }}
                          >
                            {displayPrice}
                          </span>
                          {!isCustom && (
                            <span
                              className="lux-prose"
                              style={{
                                color: featured ? "rgba(244,239,230,0.7)" : "var(--lux-ash)",
                                fontSize: "0.9rem",
                                fontFamily: "Inter, sans-serif",
                              }}
                            >
                              / month
                            </span>
                          )}
                        </div>
                        {!isCustom && billingCycle === "annual" && plan.price_annual && (
                          <div
                            className="mt-1"
                            style={{
                              color: featured ? "var(--lux-champagne)" : "var(--lux-rust)",
                              fontSize: "0.78rem",
                              fontFamily: "Inter, sans-serif",
                              fontWeight: 500,
                            }}
                          >
                            Billed annually · ${plan.price_annual.toLocaleString()}
                          </div>
                        )}
                        {!isCustom && plan.credits_monthly && (
                          <div
                            className="mt-2"
                            style={{
                              color: featured ? "rgba(244,239,230,0.85)" : "var(--lux-ink)",
                              fontSize: "0.85rem",
                              fontFamily: "Inter, sans-serif",
                            }}
                          >
                            {plan.credits_monthly.toLocaleString()} credits / month
                          </div>
                        )}

                        {/* Divider */}
                        <div
                          className="mt-6 mb-5"
                          style={{
                            borderTop: `1px solid ${featured ? "rgba(244,239,230,0.18)" : "var(--lux-hairline)"}`,
                          }}
                        />

                        {/* Features */}
                        <ul className="flex flex-col gap-2.5 flex-1">
                          {plan.features.map((f, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-2"
                              style={{
                                color: featured ? "rgba(244,239,230,0.92)" : "var(--lux-ink)",
                                fontFamily: "Inter, sans-serif",
                                fontSize: "0.875rem",
                                lineHeight: 1.5,
                              }}
                            >
                              <span
                                className="flex-shrink-0"
                                style={{
                                  color: featured ? "var(--lux-champagne)" : "var(--lux-rust)",
                                  marginTop: 2,
                                  fontWeight: 700,
                                }}
                              >
                                —
                              </span>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>

                        {/* CTA */}
                        {isCustom ? (
                          <Link
                            to="/contact"
                            className="w-full mt-6 inline-flex items-center justify-center gap-3 lux-eyebrow"
                            style={{
                              padding: "14px 18px",
                              background: featured ? "var(--lux-bone)" : "var(--lux-ink)",
                              color: featured ? "var(--lux-ink)" : "var(--lux-bone)",
                              border: `1px solid ${featured ? "var(--lux-bone)" : "var(--lux-ink)"}`,
                              fontSize: "0.7rem",
                              letterSpacing: "0.18em",
                            }}
                          >
                            SPEAK TO A LIAISON →
                          </Link>
                        ) : (
                          <button
                            onClick={() => startCheckout(plan.name, plan.id, true)}
                            disabled={loadingPlan === plan.id}
                            className="w-full mt-6 inline-flex items-center justify-center gap-3 lux-eyebrow"
                            style={{
                              padding: "14px 18px",
                              background: featured ? "var(--lux-bone)" : "var(--lux-ink)",
                              color: featured ? "var(--lux-ink)" : "var(--lux-bone)",
                              border: `1px solid ${featured ? "var(--lux-bone)" : "var(--lux-ink)"}`,
                              fontSize: "0.7rem",
                              letterSpacing: "0.18em",
                              opacity: loadingPlan === plan.id ? 0.6 : 1,
                              cursor: loadingPlan === plan.id ? "wait" : "pointer",
                            }}
                          >
                            {loadingPlan === plan.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <>BEGIN {plan.name} →</>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* THE TARIFF SHEET */}
          <section className="lux-section lux-bg-parchment">
            <div className="lux-container">
              <SectionHeading
                eyebrow="TARIFF SHEET"
                title="Cost per film."
                lede="Linear pricing. No surge. No multipliers. A 5-second film costs the same at 2am as 2pm."
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
                  eyebrow="THE ROI"
                  title="One film per week"
                  italic="buys itself instantly."
                  lede="Move the dials. See how much cinematic motion adds to your monthly billings. Numbers are conservative cohort averages."
                />
              </div>
              <div className="lg:col-span-7">
                <ROICalculator variant="photographer" defaultListings={20} defaultRate={425} />
              </div>
            </div>
          </section>

          {/* TRUST BAR */}
          <div className="lux-bg-parchment py-6 border-t border-b" style={{ borderColor: "var(--lux-hairline)" }}>
            <div className="lux-container">
              <div className="flex flex-wrap justify-center items-center gap-8 text-sm">
                <div className="flex items-center gap-2" style={{ color: "var(--lux-ash)" }}>
                  <Lock className="w-4 h-4" style={{ color: "var(--lux-brass)" }} />
                  256-bit SSL
                </div>
                <div className="flex items-center gap-2" style={{ color: "var(--lux-ash)" }}>
                  <ShieldCheck className="w-4 h-4" style={{ color: "var(--lux-brass)" }} />
                  Stripe-secured
                </div>
                <div className="flex items-center gap-2" style={{ color: "var(--lux-ash)" }}>
                  <Zap className="w-4 h-4" style={{ color: "var(--lux-brass)" }} />
                  GDPR compliant
                </div>
                <div style={{ color: "var(--lux-ash)" }}>30-day refund guarantee</div>
              </div>
            </div>
          </div>

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
                Fifty free credits.
                <br />
                <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>No card required.</span>
              </h2>
              <p className="lux-prose mt-8 mx-auto" style={{ maxWidth: 480 }}>
                Roughly twelve finished films. Test it on real work before spending a cent.
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
