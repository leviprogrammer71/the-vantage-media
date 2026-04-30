/**
 * Returns the user's tier and the resulting watermark policy.
 *
 * Free tier: AI · THE VANTAGE watermark is BAKED IN to every output.
 *            Users can't turn it off — it's part of the free deal.
 *
 * Paid tier: Watermark is OFF by default. Users can opt back in via a toggle
 *            on the result screen if they want the branding for credibility.
 */
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type Tier = "free" | "paid" | "unknown";

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
        // Active subscription = paid. Anything else = free.
        const { data, error } = await supabase
          .from("user_subscriptions")
          .select("subscription_status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          // If query errors (table missing, RLS, etc.), fall back to free
          setTier("free");
          setLoading(false);
          return;
        }
        const status = (data?.subscription_status || "").toLowerCase();
        const isPaid = status === "active" || status === "trialing";
        setTier(isPaid ? "paid" : "free");
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
    isPaid: tier === "paid",
    isFree: tier === "free",
    loading: loading || authLoading,
  };
};

export default useSubscriptionTier;
