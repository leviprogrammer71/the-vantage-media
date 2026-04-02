import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useUserCredits = () => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!user) {
      setCredits(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await (supabase.from("user_credits") as any)
        .select("credits")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user credits:", error);
        setCredits(0);
      } else {
        setCredits(data?.credits ?? 0);
      }
    } catch (err) {
      console.error("Error fetching user credits:", err);
      setCredits(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const deductCredits = useCallback(async (amount: number, description: string, submissionId?: string) => {
    if (!user || credits === null || credits < amount) return false;

    try {
      // Deduct
      const { error: updateError } = await (supabase.from("user_credits") as any)
        .update({
          credits: credits - amount,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      // Log transaction
      await (supabase.from("credit_transactions") as any).insert([{
        user_id: user.id,
        credits_amount: -amount,
        transaction_type: "video_generation",
        description,
        ...(submissionId ? { submission_id: submissionId } : {}),
      }]);

      setCredits((prev) => (prev !== null ? prev - amount : null));
      return true;
    } catch (err) {
      console.error("Error deducting credits:", err);
      return false;
    }
  }, [user, credits]);

  return { credits, loading, fetchCredits, deductCredits };
};
