import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCredits } from "@/hooks/useUserCredits";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export function CreditsEmptyBanner() {
  const { user } = useAuth();
  const { credits } = useUserCredits();

  if (!user || credits === null || credits > 0) return null;

  return (
    <div
      className="w-full border-b px-4 py-3"
      style={{
        backgroundColor: "hsl(38 92% 50% / 0.08)",
        borderColor: "hsl(38 92% 50% / 0.2)",
      }}
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-bold text-primary" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              ⚡ YOU'RE OUT OF CREDITS
            </p>
            <p className="text-xs text-muted-foreground">
              Top up to keep creating transformation videos.
            </p>
          </div>
        </div>
        <Button size="sm" asChild className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
          <Link to="/pricing">GET MORE CREDITS →</Link>
        </Button>
      </div>
    </div>
  );
}
