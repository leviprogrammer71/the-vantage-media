import { useState, useEffect } from "react";
import { Check } from "lucide-react";

interface TransformationProcessingProps {
  /** Step-list mode (transform/setup/cleanup flow). */
  currentStep?: number;
  completedSteps?: number[];
  showBeforeStep?: boolean;
  /** Simple-message mode (listing flow): just a centered loader + this label. */
  message?: string;
}

const allSteps = [
  { num: 1, label: "Reading your photo" },
  { num: 2, label: "Composing the before state" },
  { num: 3, label: "Writing the film prompt" },
  { num: 4, label: "Rendering your film" },
  { num: 5, label: "Complete" },
];

/**
 * Luxury-system render/processing screen. Two modes:
 *   • step-list — pass currentStep + completedSteps (+ showBeforeStep)
 *   • message   — pass `message` for a simple centered loader
 * Bone canvas, champagne ring spinner, Playfair heading, Space-Mono status.
 */
export function TransformationProcessing({
  currentStep,
  completedSteps = [],
  showBeforeStep = false,
  message,
}: TransformationProcessingProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  // The champagne ring spinner, shared by both modes.
  const Spinner = ({ size = 56 }: { size?: number }) => (
    <div
      className="lux-spin mx-auto"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "2px solid var(--lux-hairline-strong)",
        borderTopColor: "var(--lux-rust)",
      }}
    />
  );

  // ── Simple message mode ──
  if (message && currentStep === undefined) {
    return (
      <div className="lux-bg-bone min-h-[70vh] flex flex-col items-center justify-center px-6 text-center" style={{ color: "var(--lux-ink)" }}>
        <Spinner />
        <div className="lux-eyebrow mt-8" style={{ color: "var(--lux-rust)" }}>
          ✦ RENDERING · {timeStr}
        </div>
        <h2 className="lux-display mt-4" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>
          {message}
        </h2>
        <p className="lux-prose mt-4" style={{ maxWidth: 420 }}>
          About three minutes, rendered at 1080p. You can leave this page — your film lands in your gallery when it's done.
        </p>
        <div className="lux-eyebrow mt-8" style={{ color: "var(--lux-brass)", opacity: 0.7 }}>
          THE VANTAGE · SEEDANCE 2.0
        </div>
      </div>
    );
  }

  // ── Step-list mode ──
  const steps = showBeforeStep ? allSteps : allSteps.filter((s) => s.num !== 2);

  return (
    <div className="lux-bg-bone min-h-[70vh] flex flex-col items-center justify-center px-6" style={{ color: "var(--lux-ink)" }}>
      <div
        className="w-full max-w-md p-8 lux-bg-cream"
        style={{ border: "1px solid var(--lux-hairline-strong)" }}
      >
        <div className="lux-eyebrow mb-6" style={{ color: "var(--lux-rust)" }}>
          ✦ COMPOSING YOUR FILM
        </div>

        <div className="space-y-5">
          {steps.map((step) => {
            const isCompleted = completedSteps.includes(step.num);
            const isActive = currentStep === step.num;
            return (
              <div key={step.num} className="flex items-center gap-4">
                <div
                  className="flex items-center justify-center flex-shrink-0"
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: isCompleted ? "var(--lux-ink)" : "transparent",
                    border: isCompleted
                      ? "1px solid var(--lux-ink)"
                      : isActive
                        ? "1px solid var(--lux-rust)"
                        : "1px solid var(--lux-hairline-strong)",
                    color: isCompleted ? "var(--lux-bone)" : "var(--lux-ink)",
                  }}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : isActive ? (
                    <span
                      className="lux-spin"
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        border: "2px solid var(--lux-hairline-strong)",
                        borderTopColor: "var(--lux-rust)",
                      }}
                    />
                  ) : (
                    <span className="lux-eyebrow" style={{ color: "var(--lux-ash)", fontSize: 10 }}>{step.num}</span>
                  )}
                </div>
                <span
                  className="lux-prose"
                  style={{
                    fontSize: "0.95rem",
                    color: isCompleted || isActive ? "var(--lux-ink)" : "var(--lux-ash)",
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-8 pt-6 text-center" style={{ borderTop: "1px solid var(--lux-hairline)" }}>
          <div className="lux-display" style={{ fontSize: "2.2rem", lineHeight: 1, color: "var(--lux-ink)" }}>
            {timeStr}
          </div>
          <p className="lux-prose mt-3" style={{ fontSize: "0.85rem" }}>
            About three minutes, rendered at 1080p. You can leave this page — your film saves to your gallery when complete.
          </p>
          <div className="lux-eyebrow mt-5" style={{ color: "var(--lux-brass)", opacity: 0.7 }}>
            THE VANTAGE · SEEDANCE 2.0
          </div>
        </div>
      </div>
    </div>
  );
}
