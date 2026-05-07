import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UseCreditsReturn {
  credits: number | null;
  loading: boolean;
  error: string | null;
  refreshCredits: () => Promise<void>;
  deductCredits: (amount: number, description: string, submissionId?: string) => Promise<boolean>;
}

export const useCredits = (): UseCreditsReturn => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshCredits = useCallback(async () => {
    // CRITICAL: reset state immediately when no user OR when user changes,
    // so we never display a previous user's credits while the new query
    // is in flight. The previous version left `credits` at its prior
    // value during the loading window, which is what made every visitor
    // briefly see admin's count when admin had been logged in before.
    setCredits(null);

    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("credits_balance, user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching credits:", fetchError);
        setError(fetchError.message);
        setCredits(0);
        return;
      }

      // Defensive: confirm the row we got back belongs to the current
      // user. If anything is misconfigured at the RLS layer, this catches
      // it instead of silently displaying someone else's credits.
      if (data && data.user_id !== user.id) {
        console.error("[useCredits] RLS leak: profile.user_id !== auth user.id", {
          profileUserId: data.user_id,
          authUserId: user.id,
        });
        setError("Account isolation error — please sign out and back in.");
        setCredits(0);
        return;
      }

      // No profile row yet (signup trigger may not have run). Auto-create
      // one with the standard 50-credit grant — defense in depth, since
      // the trigger now upserts but a race could land before it.
      if (!data) {
        const { error: insertErr } = await supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            email: user.email ?? null,
            credits_balance: 50,
          });
        if (insertErr) {
          console.error("[useCredits] auto-profile insert failed:", insertErr);
          setCredits(0);
        } else {
          setCredits(50);
        }
        return;
      }

      setCredits(data.credits_balance ?? 0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Error fetching credits:", err);
      setError(errorMessage);
      setCredits(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits, user]);

  const deductCredits = useCallback(
    async (amount: number, description: string, submissionId?: string): Promise<boolean> => {
      if (!user || credits === null || credits < amount) {
        setError("Insufficient credits");
        return false;
      }

      // CRITICAL: deduction goes through the server-side `deduct_credits`
      // RPC, never a client-side update. The previous version read the
      // balance, computed `credits - amount`, and wrote it back from the
      // browser — which let two simultaneous deductions race AND let a
      // malicious client write any number it wanted (the RLS policy on
      // profiles allowed self-update). The RPC does an atomic
      // SELECT…FOR UPDATE inside a transaction and inserts the ledger
      // row in the same shot, with a unique index ensuring the same
      // (user, submission, type) tuple can never be debited twice.
      try {
        const { data, error: rpcError } = await supabase.rpc("deduct_credits", {
          p_user_id: user.id,
          p_amount: amount,
          p_description: description,
          p_submission_id: submissionId ?? null,
          p_transaction_type: "video_generation",
        });

        if (rpcError) {
          // Idempotent duplicate — treat as success since the original
          // charge already landed.
          if (rpcError.message?.includes("duplicate_charge")) {
            return true;
          }
          throw rpcError;
        }

        const newBalance = typeof data === "number" ? data : credits - amount;
        setCredits(newBalance);
        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error("Error deducting credits:", err);
        setError(errorMessage);
        return false;
      }
    },
    [user, credits]
  );

  return { credits, loading, error, refreshCredits, deductCredits };
};
