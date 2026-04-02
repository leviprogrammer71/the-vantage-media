import { useState, useEffect } from "react";
import { Zap, ArrowRight, Lock, Infinity, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "motion/react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CREDIT_PACKS, CREDIT_COSTS, SUBSCRIPTION_PLANS, formatCredits } from "@/lib/credit-config";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const creditCostItems = [
  { emoji: "🎬", title: "Transformation Video", subtitle: "(AI before)", cost: `${CREDIT_COSTS.transformationAI5s} credits` },
  { emoji: "🏠", title: "Listing Video", subtitle: "(5 seconds)", cost: `${CREDIT_COSTS.listingVideo5s} credits` },
  { emoji: "🎬", title: "Transformation Video", subtitle: "(own before)", cost: `${CREDIT_COSTS.transformationOwn5s} credits` },
  { emoji: "📸", title: "Photo Enhance", subtitle: "", cost: `${CREDIT_COSTS.photoEnhance} credits` },
  { emoji: "🎬", title: "Any 10s video", subtitle: "", cost: `+${CREDIT_COSTS.durationUpcharge} credits` },
  { emoji: "💬", title: "Consultation", subtitle: "", cost: `${CREDIT_COSTS.websiteConsultation} credits` },
];

const Pricing = () => {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [fallbackModal, setFallbackModal] = useState<{ name: string; credits: number; price: number } | null>(null);
  const [mobileBannerDismissed, setMobileBannerDismissed] = useState(
    () => localStorage.getItem("vantage_pricing_banner_dismissed") === "true"
  );

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

  const handleCheckout = async (pack: typeof CREDIT_PACKS[number]) => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    setLoadingPlan(pack.priceType);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceType: pack.priceType, isSubscription: false },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        setFallbackModal({ name: pack.name, credits: pack.credits, price: pack.price });
      }
    } catch {
      setFallbackModal({ name: pack.name, credits: pack.credits, price: pack.price });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleSubscription = async (plan: typeof SUBSCRIPTION_PLANS[number]) => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    setLoadingPlan(plan.priceType);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceType: plan.priceType, isSubscription: true },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        setFallbackModal({ name: plan.name, credits: plan.credits, price: plan.price });
      }
    } catch {
      setFallbackModal({ name: plan.name, credits: plan.credits, price: plan.price });
    } finally {
      setLoadingPlan(null);
    }
  };

  const dismissBanner = () => {
    setMobileBannerDismissed(true);
    localStorage.setItem("vantage_pricing_banner_dismissed", "true");
  };

  // Sort packs: popular first on mobile
  const sortedPacks = [...CREDIT_PACKS].sort((a, b) => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      if (a.popular && !b.popular) return -1;
      if (!a.popular && b.popular) return 1;
    }
    return 0;
  });

  return (
    <>
      <Helmet>
        <title>Buy Credits — The Vantage</title>
        <meta name="description" content="Buy Vantage Credits to create transformation and listing videos. Credits never expire. No subscriptions." />
      </Helmet>
      <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
        <Header />

        {/* Mobile sticky banner */}
        {!mobileBannerDismissed && (
          <div
            className="md:hidden fixed top-[56px] left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
            style={{ background: "#E8C547", color: "#0A0A0A" }}
          >
            <span className="font-mono text-[11px] font-bold">
              ⭐ Best value: 500 credits for $39
            </span>
            <button onClick={dismissBanner} className="bg-transparent border-none text-[#0A0A0A] text-lg cursor-pointer">✕</button>
          </div>
        )}

        <main className="pt-24 pb-20">
          <div className="px-4 max-w-6xl mx-auto">

            {/* HEADER */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <p className="font-mono text-[11px] tracking-[3px] mb-5" style={{ color: "#E8C547" }}>
                ⚡ CREDITS NEVER EXPIRE · USE ANYTIME
              </p>

              <h1
                className="font-display font-bold text-[48px] md:text-[72px] leading-[0.9] mb-5"
                style={{ color: "#ffffff" }}
              >
                GET HUNDREDS
                <br />
                OF CREDITS.
                <br />
                <span className="text-[40px] md:text-[56px]">
                  SPEND LESS THAN
                  <br />
                  A CUP OF COFFEE.
                </span>
              </h1>

              <p className="text-[16px] md:text-[18px] max-w-[560px] mx-auto mb-6 leading-relaxed" style={{ color: "#AAAAAA" }}>
                Every credit you buy stays in your account forever. No subscriptions. No monthly fees. No pressure. Just create when you're ready.
              </p>

              {user && creditBalance !== null && (
                <div
                  className="inline-flex items-center gap-2 px-5 py-2"
                  style={{ border: "1px solid #E8C547", background: "rgba(232,197,71,0.1)" }}
                >
                  <Zap className="h-4 w-4" style={{ color: "#E8C547" }} />
                  <span className="font-mono text-[13px]" style={{ color: "#E8C547" }}>
                    {creditBalance === 0
                      ? "You have 0 credits — get started below"
                      : `You currently have ${formatCredits(creditBalance)} credits`}
                  </span>
                </div>
              )}
            </motion.div>

            {/* WHAT DO CREDITS DO */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="mb-12 max-w-[640px] mx-auto"
            >
              <div style={{ background: "#111111", padding: 32 }}>
                <h3 className="font-mono text-[11px] tracking-[2px] mb-6" style={{ color: "#E8C547" }}>
                  WHAT DO CREDITS DO?
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {creditCostItems.map((item, i) => (
                    <div key={i} className="text-center">
                      <div className="text-[28px] mb-2">{item.emoji}</div>
                      <p className="font-mono text-[11px] mb-1" style={{ color: "#ffffff" }}>
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="font-mono text-[10px] mb-2" style={{ color: "#666" }}>{item.subtitle}</p>
                      )}
                      <p className="font-display font-bold text-[28px]" style={{ color: "#E8C547" }}>
                        {item.cost.replace(" credits", "")}
                      </p>
                      <p className="font-mono text-[9px]" style={{ color: "#666" }}>credits</p>
                    </div>
                  ))}
                </div>
                <p className="font-mono text-[11px] text-center mt-6" style={{ color: "#555" }}>
                  Based on the 500 credit Builder pack, each transformation video costs $3.12
                </p>
              </div>
            </motion.div>

            {/* PRICING CARDS */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mb-16"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {sortedPacks.map((pack) => (
                  <div
                    key={pack.id}
                    className="relative flex flex-col p-8"
                    style={{
                      background: "#1A1A1A",
                      border: pack.popular ? "2px solid #E8C547" : "1px solid #222222",
                      boxShadow: pack.popular ? "0 0 40px rgba(232,197,71,0.1)" : "none",
                    }}
                  >
                    {pack.popular && (
                      <div
                        className="absolute -top-[14px] left-1/2 -translate-x-1/2 font-mono text-[10px] font-bold tracking-[2px] px-4 py-1"
                        style={{ background: "#E8C547", color: "#0A0A0A" }}
                      >
                        MOST POPULAR
                      </div>
                    )}

                    <p
                      className="font-mono text-[10px] tracking-[2px] mb-4"
                      style={{ color: pack.popular ? "#E8C547" : "#AAAAAA" }}
                    >
                      {pack.name}
                    </p>

                    <div className="mb-1">
                      <span
                        className={`font-display font-bold leading-none ${pack.popular ? "text-[112px]" : "text-[96px]"}`}
                        style={{ color: pack.popular ? "#E8C547" : "#ffffff" }}
                      >
                        {formatCredits(pack.credits)}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] tracking-[2px] mb-5" style={{ color: "#E8C547" }}>
                      CREDITS
                    </p>

                    <div className="mb-1">
                      <span
                        className={`font-bold ${pack.popular ? "text-[48px]" : "text-[40px]"}`}
                        style={{ color: "#ffffff" }}
                      >
                        ${pack.price}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] mb-5" style={{ color: "#555" }}>
                      {pack.perCredit} per credit
                      {pack.savings && <span style={{ color: "#E8C547" }}> · {pack.savings}</span>}
                    </p>

                    <div style={{ borderTop: "1px solid #1E1E1E" }} className="pt-4 mb-2">
                      <p className="font-display font-bold text-[18px] mb-4" style={{ color: "#E8C547" }}>
                        {pack.valueCallout}
                      </p>
                    </div>

                    <ul className="space-y-2.5 mb-6 flex-1">
                      {pack.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: "#E8C547" }} />
                          <span className="font-mono text-[11px] leading-relaxed" style={{ color: "#AAAAAA" }}>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      className="w-full font-mono text-[12px] tracking-[1px] uppercase"
                      style={{
                        height: pack.popular ? 56 : 52,
                        background: pack.popular ? "#E8C547" : "transparent",
                        color: pack.popular ? "#0A0A0A" : "#ffffff",
                        border: pack.popular ? "none" : "1px solid #333",
                        fontFamily: pack.popular ? "'Bebas Neue', sans-serif" : "'Space Mono', monospace",
                        fontSize: pack.popular ? 16 : 12,
                        cursor: "pointer",
                      }}
                      onClick={() => handleCheckout(pack)}
                      disabled={loadingPlan === pack.priceType}
                    >
                      {loadingPlan === pack.priceType ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Processing…
                        </span>
                      ) : (
                        <>
                          GET {formatCredits(pack.credits)} CREDITS{pack.popular ? " →" : ""}
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* SUBSCRIPTION PLAN */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-16"
            >
              <h2
                className="font-display font-bold text-[32px] md:text-[40px] text-center mb-3"
                style={{ color: "#ffffff" }}
              >
                OR SUBSCRIBE MONTHLY
              </h2>
              <p className="text-center font-mono text-[12px] mb-8" style={{ color: "#666" }}>
                Automatic monthly credits · Cancel anytime
              </p>
              <div className="max-w-[400px] mx-auto">
                {SUBSCRIPTION_PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className="relative flex flex-col p-8"
                    style={{
                      background: "#1A1A1A",
                      border: "2px solid #E8C547",
                      boxShadow: "0 0 40px rgba(232,197,71,0.08)",
                    }}
                  >
                    <p
                      className="font-mono text-[10px] tracking-[2px] mb-4"
                      style={{ color: "#E8C547" }}
                    >
                      {plan.name}
                    </p>

                    <div className="mb-1">
                      <span
                        className="font-display font-bold text-[96px] leading-none"
                        style={{ color: "#E8C547" }}
                      >
                        {formatCredits(plan.credits)}
                      </span>
                    </div>
                    <p className="font-mono text-[11px] tracking-[2px] mb-2" style={{ color: "#E8C547" }}>
                      CREDITS / MONTH
                    </p>

                    <div className="mb-5">
                      <span className="font-bold text-[48px]" style={{ color: "#ffffff" }}>
                        ${plan.price}
                      </span>
                      <span className="font-mono text-[13px] ml-1" style={{ color: "#666" }}>/month</span>
                    </div>

                    <ul className="space-y-2.5 mb-6 flex-1">
                      {plan.features.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" style={{ color: "#E8C547" }} />
                          <span className="font-mono text-[11px] leading-relaxed" style={{ color: "#AAAAAA" }}>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      className="w-full font-display text-[16px] tracking-[1px] uppercase cursor-pointer"
                      style={{
                        height: 56,
                        background: "#E8C547",
                        color: "#0A0A0A",
                        border: "none",
                      }}
                      onClick={() => handleSubscription(plan)}
                      disabled={loadingPlan === plan.priceType}
                    >
                      {loadingPlan === plan.priceType ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Processing…
                        </span>
                      ) : (
                        <>SUBSCRIBE →</>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>

            <div className="mb-16">
              <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto text-center">
                {[
                  { icon: "🔒", label: "Secure checkout", sub: "via Stripe" },
                  { icon: "⚡", label: "Credits added", sub: "instantly" },
                  { icon: "♾️", label: "Never expires", sub: "no pressure" },
                ].map((t, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className="text-[20px]">{t.icon}</span>
                    <span className="font-mono text-[12px]" style={{ color: "#AAAAAA" }}>{t.label}</span>
                    <span className="font-mono text-[10px]" style={{ color: "#555" }}>{t.sub}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* MATH PROOF */}
            <div className="max-w-[640px] mx-auto mb-16">
              <div style={{ background: "#111111", padding: 40 }}>
                <h2
                  className="font-display font-bold text-[32px] md:text-[40px] text-center mb-6"
                  style={{ color: "#ffffff" }}
                >
                  THE MATH IS SIMPLE.
                </h2>
                <p className="text-[16px] leading-relaxed text-center mb-4" style={{ color: "#AAAAAA" }}>
                  A professional videographer charges{" "}
                  <span style={{ color: "#ffffff", fontWeight: 600 }}>$500–$2,000</span>{" "}
                  per construction video.
                </p>
                <p className="text-[16px] leading-relaxed text-center mb-4" style={{ color: "#AAAAAA" }}>
                  With The Vantage Builder Pack:
                  <br />
                  <span style={{ color: "#E8C547", fontWeight: 700 }}>500 credits</span> = 12 transformation videos ={" "}
                  <span style={{ color: "#E8C547", fontWeight: 700, fontSize: 20 }}>$3.25 per video</span>.
                </p>
                <p className="text-center">
                  <span className="font-display font-bold text-[36px]" style={{ color: "#E8C547" }}>
                    That's 99% cheaper.
                  </span>
                </p>
              </div>
            </div>

          </div>
        </main>
        <Footer />
      </div>

      {/* FALLBACK MODAL */}
      <Dialog open={!!fallbackModal} onOpenChange={() => setFallbackModal(null)}>
        <DialogContent className="bg-[#111] border-[#222] rounded-none max-w-md border-t-4" style={{ borderTopColor: "#E8C547" }}>
          <DialogHeader className="text-center pt-2">
            <div className="mx-auto mb-3">
              <Zap className="h-10 w-10" style={{ color: "#E8C547" }} />
            </div>
            <DialogTitle className="font-display text-3xl" style={{ color: "#ffffff" }}>ALMOST THERE</DialogTitle>
          </DialogHeader>
          <p className="text-[14px] text-center leading-relaxed mb-5" style={{ color: "#AAAAAA" }}>
            We're finalizing our payment system. To purchase credits right now, email us and we'll set you up within the hour.
          </p>
          {fallbackModal && (
            <Button
              className="w-full rounded-none font-mono text-xs uppercase tracking-wider h-11"
              style={{ background: "#E8C547", color: "#0A0A0A" }}
              asChild
            >
              <a
                href={`mailto:hello@thevantage.co?subject=Credits Purchase — ${fallbackModal.name}&body=Hi, I'd like to purchase the ${fallbackModal.name} pack (${formatCredits(fallbackModal.credits)} credits for $${fallbackModal.price}).`}
              >
                📧 Email Us to Buy Credits
              </a>
            </Button>
          )}
          <button
            onClick={() => setFallbackModal(null)}
            className="text-xs text-center mt-2 transition-colors bg-transparent border-none cursor-pointer"
            style={{ color: "#555" }}
          >
            Close
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Pricing;
