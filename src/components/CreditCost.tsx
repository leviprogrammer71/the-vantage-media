import { Coins, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CreditCostProps {
  cost: number;
  currentCredits: number | null;
  label?: string;
  description?: string;
  variant?: "default" | "compact" | "badge";
  className?: string;
}

export const CreditCost = ({
  cost,
  currentCredits,
  label,
  description,
  variant = "default",
  className,
}: CreditCostProps) => {
  const hasEnough = currentCredits !== null && currentCredits >= cost;
  const isExact = currentCredits === cost;

  // Badge variant - minimal
  if (variant === "badge") {
    return (
      <Badge
        variant={hasEnough ? "secondary" : "destructive"}
        className={cn("text-xs", className)}
      >
        <Coins className="h-3 w-3 mr-1" />
        {cost} credit{cost > 1 ? "s" : ""}
      </Badge>
    );
  }

  // Compact variant - inline message
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm",
          hasEnough ? "text-muted-foreground" : "text-destructive",
          className
        )}
      >
        <Coins className={cn("h-4 w-4", hasEnough ? "text-amber-500" : "text-destructive")} />
        <span>
          This will use <strong>{cost}</strong> credit{cost > 1 ? "s" : ""}
          {!hasEnough && (
            <span className="ml-1 font-medium">(insufficient credits)</span>
          )}
        </span>
      </div>
    );
  }

  // Default variant - full display with context
  return (
    <div
      className={cn(
        "rounded-lg p-3 border",
        hasEnough
          ? "bg-muted/30 border-border"
          : "bg-destructive/10 border-destructive/30",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            hasEnough ? "bg-amber-100 dark:bg-amber-900/30" : "bg-destructive/10"
          )}
        >
          {hasEnough ? (
            <Coins className="h-4 w-4 text-amber-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {label && (
            <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
          )}
          <p className={cn("font-semibold text-sm", !hasEnough && "text-destructive")}>
            Cost: {cost} credit{cost > 1 ? "s" : ""}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
          {!hasEnough && (
            <p className="text-xs text-destructive font-medium mt-1">
              You need {cost - (currentCredits ?? 0)} more credit{cost - (currentCredits ?? 0) > 1 ? "s" : ""}
            </p>
          )}
          {isExact && hasEnough && (
            <p className="text-xs text-amber-600 font-medium mt-1">
              This will use your last credit{cost > 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Balance</p>
          <p className={cn("font-bold", !hasEnough && "text-destructive")}>
            {currentCredits ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
};
