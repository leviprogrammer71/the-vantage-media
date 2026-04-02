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
      <DialogContent className="sm:max-w-sm rounded-none" style={{ background: "#1A1A1A", border: "1px solid #333" }}>
        <DialogHeader className="text-center items-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-2" style={{ background: "rgba(232,197,71,0.15)" }}>
            <AlertCircle className="h-6 w-6" style={{ color: "#E8C547" }} />
          </div>
          <DialogTitle className="text-lg font-bold tracking-tight" style={{ color: "#ffffff" }}>
            NOT ENOUGH CREDITS
          </DialogTitle>
          <DialogDescription className="text-sm space-y-1" style={{ color: "#AAAAAA" }}>
            <span className="block">
              This video needs <span className="font-semibold" style={{ color: "#ffffff" }}>{required} credits</span>.
            </span>
            <span className="block">
              You have <span className="font-semibold" style={{ color: "#ffffff" }}>{available} credits</span> remaining.
            </span>
            <span className="block font-semibold" style={{ color: "#E8C547" }}>
              You're {short} credits short.
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-none"
            style={{ borderColor: "#333", color: "#AAAAAA" }}
          >
            Cancel
          </Button>
          <Button asChild className="flex-1 rounded-none" style={{ background: "#E8C547", color: "#0A0A0A" }}>
            <Link to="/pricing" onClick={onClose}>
              GET MORE CREDITS →
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
