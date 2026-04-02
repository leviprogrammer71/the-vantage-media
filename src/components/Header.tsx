import { Link } from "react-router-dom";
import { useState } from "react";
import { LogOut, User, Coins, Video, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCredits } from "@/hooks/useUserCredits";
import { ThemeToggle } from "./ThemeToggle";
import logo from "@/assets/logo.png";

const Header = () => {
  const { user, signOut } = useAuth();
  const { credits } = useUserCredits();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-[100] border-b border-[#1A1A1A] transition-all duration-300"
      style={{
        background: "#0A0A0A",
        paddingTop: "env(safe-area-inset-top, 0px)",
      }}
    >
      <div className="px-4 max-w-7xl mx-auto" style={{ minHeight: "56px" }}>
        <div className="flex items-center justify-between" style={{ height: "56px" }}>
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            {/* Desktop: image logo */}
            <img src={logo} alt="TheVantage" className="h-12 md:h-16 w-auto hidden md:block" />
            {/* Mobile: text logo */}
            <span
              className="md:hidden text-[13px] tracking-[3px] text-[#E8C547]"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              THE VANTAGE
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {user ? (
              <>
                <Link
                  to="/video"
                  className="text-base font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  <Video className="h-4 w-4" />
                  Video 🔥
                </Link>
                <Link
                  to="/gallery"
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
                >
                  <FolderOpen className="h-4 w-4" />
                  Gallery
                </Link>
                <Link
                  to="/credits"
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Buy Credits
                </Link>

                <ThemeToggle />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-2 hover:bg-muted">
                      <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-2 py-1.5">
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/gallery" className="cursor-pointer gap-2">
                        <FolderOpen className="h-4 w-4" />
                        My Gallery
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/credits" className="cursor-pointer gap-2">
                        <Coins className="h-4 w-4" />
                        Buy Credits
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5 flex items-center gap-2">
                      <Coins className="h-4 w-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">{credits ?? 0} credits</span>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive gap-2">
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link
                  to="/video"
                  className="text-base font-medium text-foreground hover:text-primary transition-colors flex items-center gap-2"
                >
                  Video 🔥
                </Link>
                <Link
                  to="/demo"
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Demo
                </Link>
                <Link
                  to="/credits"
                  className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Buy Credits
                </Link>
                <ThemeToggle />
                <Button asChild variant="outline" size="sm">
                  <Link to="/login">Sign In</Link>
                </Button>
              </>
            )}
          </nav>

          {/* Mobile Right Side */}
          <div className="flex items-center gap-2 md:hidden">
            {user ? (
              <Link to="/credits"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E8C547] text-[#E8C547]"
                style={{ background: "#1A1A1A", fontFamily: "'Space Mono', monospace", fontSize: "11px" }}
              >
                💰 {credits ?? 0} credits
              </Link>
            ) : (
              <Link
                to="/login"
                className="text-[13px] text-[#E8C547]"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
