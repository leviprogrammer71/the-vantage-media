import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { useSmartCTA } from "@/hooks/useSmartCTA";

const StickyCTA = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { destination, isLoggedIn } = useSmartCTA();

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed left-0 right-0 z-50 p-3 bg-background/95 backdrop-blur-md border-t border-border md:hidden" style={{ bottom: "calc(60px + env(safe-area-inset-bottom, 0px))" }}>
      <Button
        asChild
        size="lg"
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-base py-5 rounded-xl"
      >
        <Link to={destination}>
          {isLoggedIn ? "Create Your Video" : "Get 50 Free Credits"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
};

export default StickyCTA;
