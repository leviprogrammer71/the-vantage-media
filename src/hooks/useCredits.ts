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
    if (!user) {
      setCredits(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select("credits_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching credits:", fetchError);
        setError(fetchError.message);
        setCredits(0);
      } else {
        setCredits(data?.credits_balance ?? 0);
      }
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

      try {
        // Update credits balance in profiles table
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            credits_balance: credits - amount,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);

        if (updateError) {
          throw updateError;
        }

        // Log transaction
        const { error: transactionError } = await supabase.from("credit_transactions").insert([
          {
            user_id: user.id,
            credits_amount: -amount,
            transaction_type: "video_generation",
            description,
            ...(submissionId ? { submission_id: submissionId } : {}),
          },
        ]);

        if (transactionError) {
          throw transactionError;
        }

        setCredits((prev) => (prev !== null ? prev - amount : null));
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
