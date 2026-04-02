import { useState, useEffect } from "react";
import { X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Don't show if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Don't show if dismissed
    if (localStorage.getItem("vantage_install_dismissed") === "true") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!showBanner || !isMobile) return null;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem("vantage_install_dismissed", "true");
    setShowBanner(false);
  };

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 rounded-lg border-l-4 border-l-[hsl(47,76%,59%)] bg-[#1A1A1A] p-4 shadow-2xl md:hidden"
      style={{ paddingBottom: "calc(16px + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <Smartphone className="h-6 w-6 text-[hsl(47,76%,59%)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">Add to home screen</p>
          <p className="text-xs text-muted-foreground">Works offline · No App Store needed</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            onClick={handleInstall}
            className="bg-[hsl(47,76%,59%)] text-black hover:bg-[hsl(47,76%,49%)] text-xs h-8 px-3"
          >
            Install
          </Button>
          <button onClick={handleDismiss} className="text-muted-foreground hover:text-white p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
