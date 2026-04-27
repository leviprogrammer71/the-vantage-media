import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";

interface InsufficientCreditsModalProps {
  open: boolean;
  onClose: () => void;
  required: number;
  available: number;
}

export function InsufficientCreditsModal({
  open,
  onClose,
  required,
  available,
}: InsufficientCreditsModalProps) {
  const short = required - available;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm rounded-none lux-bg-ink" style={{ border: "1px solid var(--lux-hairline-strong)" }}>
        <DialogHeader className="text-center items-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ background: "rgba(201, 169, 110, 0.15)" }}>
            <AlertCircle className="h-6 w-6" style={{ color: "var(--lux-champagne)" }} />
          </div>
          <DialogTitle className="lux-display text-lg" style={{ color: "var(--lux-bone)" }}>
            NOT ENOUGH CREDITS
          </DialogTitle>
          <DialogDescription className="lux-prose text-sm space-y-1 mt-3" style={{ color: "var(--lux-smoke)" }}>
            <span className="block">
              This video needs <span className="font-semibold" style={{ color: "var(--lux-champagne)" }}>{required} credits</span>.
            </span>
            <span className="block">
              You have <span className="font-semibold" style={{ color: "var(--lux-champagne)" }}>{available} credits</span> remaining.
            </span>
            <span className="block font-semibold" style={{ color: "var(--lux-rust)" }}>
              You're {short} credits short.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="lux-btn-ghost flex-1"
            style={{ borderColor: "var(--lux-hairline-strong)", color: "var(--lux-bone)" }}
          >
            Cancel
          </button>
          <Link
            to="/pricing"
            onClick={onClose}
            className="lux-btn flex-1 text-center"
            style={{ background: "var(--lux-rust)", color: "var(--lux-bone)", border: "1px solid var(--lux-rust)" }}
          >
            GET MORE CREDITS →
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
