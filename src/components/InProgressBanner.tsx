import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function InProgressBanner() {
  const { user } = useAuth();
  const [inProgressId, setInProgressId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      const { data } = await (supabase.from("submissions") as any)
        .select("id")
        .eq("user_id", user.id)
        .or("status.eq.in progress,prompt_status.eq.generating")
        .limit(1);

      if (data && data.length > 0) {
        setInProgressId(data[0].id);
      } else {
        setInProgressId(null);
      }
    };

    check();
  }, [user]);

  if (!inProgressId) return null;

  return (
    <div
      className="w-full border-b border-primary/30 px-4 py-3"
      style={{ backgroundColor: "hsl(38 92% 50% / 0.1)" }}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-primary animate-spin" />
          <div>
            <p className="text-sm font-bold text-primary" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              ⟳ YOUR VIDEO IS STILL GENERATING
            </p>
            <p className="text-xs text-muted-foreground">
              We'll notify you by email when it's ready.
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" asChild className="shrink-0 border-primary/30 text-primary hover:bg-primary/10">
          <Link to="/gallery">View Progress →</Link>
        </Button>
      </div>
    </div>
  );
}
