import { Link, useLocation } from "react-router-dom";
import { Home, Film, FolderOpen, Coins, Eye, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";

const loggedInTabs = [
  { path: "/", icon: Home, label: "HOME" },
  { path: "/video", icon: Film, label: "CREATE" },
  { path: "/gallery", icon: FolderOpen, label: "GALLERY" },
  { path: "/credits", icon: Coins, label: "CREDITS" },
];

const loggedOutTabs = [
  { path: "/", icon: Home, label: "HOME" },
  { path: "/demo", icon: Eye, label: "DEMO" },
  { path: "/credits", icon: Coins, label: "PRICING" },
  { path: "/login", icon: User, label: "SIGN IN" },
];

export function MobileBottomNav() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  if (!isMobile) return null;

  if (location.pathname.startsWith("/login") || location.pathname.startsWith("/signup") || location.pathname.startsWith("/share")) {
    return null;
  }

  const tabs = user ? loggedInTabs : loggedOutTabs;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] flex items-stretch border-t border-[#1A1A1A] md:hidden"
      style={{
        height: "calc(60px + env(safe-area-inset-bottom, 0px))",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "#0A0A0A",
      }}
    >
      {tabs.map(({ path, icon: Icon, label }) => {
        const isActive = path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
        return (
          <Link
            key={path}
            to={path}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 pt-2 transition-colors duration-150",
              isActive ? "text-[#E8C547]" : "text-[#444444]"
            )}
          >
            <Icon className="h-[22px] w-[22px]" />
            <span
              className="text-[9px] tracking-[1px]"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
