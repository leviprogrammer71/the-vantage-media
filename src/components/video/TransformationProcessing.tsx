import { useState, useEffect } from "react";
import { Check, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface TransformationProcessingProps {
  currentStep: number;
  completedSteps: number[];
  showBeforeStep: boolean;
}

const allSteps = [
  { num: 1, label: "Analyzing your after photo..." },
  { num: 2, label: "Generating before state..." },
  { num: 3, label: "Writing video prompt..." },
  { num: 4, label: "Generating your video..." },
  { num: 5, label: "Complete" },
];

export function TransformationProcessing({
  currentStep,
  completedSteps,
  showBeforeStep,
}: TransformationProcessingProps) {
  const steps = showBeforeStep
    ? allSteps
    : allSteps.filter((s) => s.num !== 2);

  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-sm p-6 space-y-6">
        <div className="space-y-4">
          {steps.map((step) => {
            const isCompleted = completedSteps.includes(step.num);
            const isActive = currentStep === step.num;
            return (
              <div key={step.num} className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isActive
                      ? "border-2 border-primary bg-primary/10"
                      : "border-2 border-border bg-muted/30"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <span className="text-xs text-muted-foreground">{step.num}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "text-sm transition-all",
                    isCompleted ? "text-foreground font-medium" : isActive ? "text-foreground animate-pulse" : "text-muted-foreground"
                  )}
                >
                  {isCompleted && step.num === 5 ? "✓ Complete" : step.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="text-center space-y-3 pt-2">
          <p className="text-2xl font-mono text-primary font-bold tracking-wider">
            {timeStr}
          </p>
          <p className="text-sm text-muted-foreground">
            This takes 3-5 minutes. Your video is being rendered at 1080p.
          </p>
          <p className="text-xs text-muted-foreground">
            You can leave this page — your video will be saved to your gallery when complete.
          </p>
          <p className="text-xs font-mono text-primary">
            POWERED BY SEEDANCE 1.5 PRO
          </p>
        </div>
      </Card>
    </div>
  );
}
