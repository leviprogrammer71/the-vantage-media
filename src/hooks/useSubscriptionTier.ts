/**
 * Returns the user's tier and the resulting watermark policy.
 *
 * Watermark gating (current policy):
 *   - Free (no purchase):     watermark BAKED IN, no toggle
 *   - STARTER ($30 pack):     watermark BAKED IN, no toggle
 *   - BUILDER ($39 pack) +:   watermark OFF by default, user can opt back in
 *   - PRO / STUDIO + annuals: same as BUILDER (off by default)
 *
 * We determine the tier from the user's credit_transactions ledger — every
 * Stripe purchase logs a row with description `Credit purchase: <priceType>`.
 * Any historical purchase of BUILDER ($39 / "standard") or higher removes the
 * watermark gate permanently (credits never expire-out the entitlement).
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type Tier = "free" | "starter" | "builder_plus" | "unknown";

// priceType strings that count as BUILDER or higher → watermark-free
const BUILDER_PLUS_PRICE_TYPES = new Set([
  "standard", "standard_annual",   // BUILDER monthly + annual
  "value",    "value_annual",      // PRO monthly + annual
  "pro_pack", "pro_pack_annual",   // STUDIO monthly + annual
  "pro",                           // legacy small sub
  "studio",                        // legacy mid sub
  "essentials_sub",
  "solo_agent",
]);

const STARTER_PRICE_TYPES = new Set([
  "starter", "starter_annual",
]);

export const useSubscriptionTier = () => {
  const { user, loading: authLoading } = useAuth();
  const [tier, setTier] = useState<Tier>("unknown");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setTier("free");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const check = async () => {
      try {
        // Pull every purchase ledger entry. We scan descriptions for the
        // priceType — the webhook logs `Credit purchase: <priceType>` and
        // subscription renewals log `Subscription renewal: <priceType>`.
        const { data, error } = await supabase
          .from("credit_transactions")
          .select("description, credits_amount, transaction_type")
          .eq("user_id", user.id)
          .eq("transaction_type", "purchase")
          .gt("credits_amount", 0);

        if (cancelled) return;
        if (error) {
          setTier("free");
          setLoading(false);
          return;
        }

        let foundBuilderPlus = false;
        let foundStarter = false;
        for (const row of data || []) {
          const desc = (row.description || "").toLowerCase();
          for (const pt of BUILDER_PLUS_PRICE_TYPES) {
            if (desc.includes(pt)) { foundBuilderPlus = true; break; }
          }
          if (foundBuilderPlus) break;
          for (const pt of STARTER_PRICE_TYPES) {
            if (desc.includes(pt)) { foundStarter = true; break; }
          }
        }

        const resolvedTier: Tier = foundBuilderPlus
          ? "builder_plus"
          : foundStarter
          ? "starter"
          : "free";

        setTier(resolvedTier);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setTier("free");
          setLoading(false);
        }
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return {
    tier,
    // Watermark removable = BUILDER ($39) or higher.
    isPaid: tier === "builder_plus",
    canRemoveWatermark: tier === "builder_plus",
    isFree: tier === "free" || tier === "starter",
    isStarter: tier === "starter",
    loading: loading || authLoading,
  };
};

export default useSubscriptionTier;
