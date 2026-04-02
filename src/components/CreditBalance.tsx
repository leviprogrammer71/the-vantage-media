import { Link } from "react-router-dom";
import { Coins, AlertTriangle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CreditBalanceProps {
  credits: number | null;
  loading?: boolean;
  variant?: "default" | "compact" | "inline";
  showUpsell?: boolean;
  className?: string;
}

export const CreditBalance = ({
  credits,
  loading = false,
  variant = "default",
  showUpsell = true,
  className,
}: CreditBalanceProps) => {
  const isLow = credits !== null && credits < 30;
  const isEmpty = credits !== null && credits < 1;

  if (loading) {
    return (
      <div className={cn("animate-pulse", className)}>
        {variant === "inline" ? (
          <span className="h-4 w-12 bg-muted rounded inline-block" />
        ) : (
          <div className="h-16 bg-muted rounded-lg" />
        )}
      </div>
    );
  }

  // Inline variant - just shows credit count
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-1.5", className)}>
        <Coins className={cn("h-4 w-4", isEmpty ? "text-destructive" : "text-amber-500")} />
        <span className={cn("font-semibold text-sm", isEmpty && "text-destructive")}>
          {credits ?? 0}
        </span>
        {isLow && (
          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300 ml-1">
            Low
          </Badge>
        )}
      </div>
    );
  }

  // Compact variant - small card
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "rounded-lg p-3 flex items-center justify-between",
          isEmpty
            ? "bg-destructive/10 border border-destructive/30"
            : isLow
            ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
            : "bg-muted/50 border border-border",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Coins className={cn("h-5 w-5", isEmpty ? "text-destructive" : "text-amber-500")} />
          <div>
            <p className="text-xs text-muted-foreground">Vantage Credits</p>
            <p className={cn("font-bold", isEmpty && "text-destructive")}>{credits ?? 0}</p>
          </div>
        </div>
        {showUpsell && isLow && (
          <Button size="sm" variant="outline" className="text-xs" asChild>
            <Link to="/pricing">Add More</Link>
          </Button>
        )}
      </div>
    );
  }

  // Default variant - full card with upsell
  return (
    <Card
      className={cn(
        isEmpty
          ? "border-destructive/30 bg-destructive/5"
          : isLow
          ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10"
          : "border-border",
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                isEmpty
                  ? "bg-destructive/10"
                  : isLow
                  ? "bg-amber-100 dark:bg-amber-900/30"
                  : "bg-muted"
              )}
            >
              {isEmpty ? (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              ) : (
                <Coins className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Vantage Credits</p>
              <p className={cn("text-2xl font-bold", isEmpty && "text-destructive")}>
                {credits ?? 0}
              </p>
            </div>
          </div>
        </div>

        {showUpsell && isLow && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">
              {isEmpty
                ? "You're out of credits! Add more to continue."
                : "You're running low on credits."}
            </p>
            <Button size="sm" className="w-full" asChild>
              <Link to="/pricing">
                {isEmpty ? "Get Credits" : "Add More Credits"}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
