import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Coins,
  CreditCard,
  LayoutDashboard,
  Images,
  Settings,
  LogOut,
  Menu,
  Home,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface GenerateTopNavProps {
  credits: number;
  onMenuClick: () => void;
}

export function GenerateTopNav({ credits, onMenuClick }: GenerateTopNavProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Home className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl hidden sm:inline">
              PropertyLens AI
            </span>
          </Link>
        </div>

        {/* Center Section - Credits Display */}
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-2 rounded-lg border transition-colors",
            credits === 0
              ? "bg-destructive/10 border-destructive/30"
              : credits < 5
              ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
              : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
          )}
        >
          <Coins
            className={cn(
              "h-6 w-6",
              credits === 0 ? "text-destructive" : "text-amber-600"
            )}
          />
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Credits</span>
            <span
              className={cn(
                "text-xl font-bold",
                credits === 0 ? "text-destructive" : "text-amber-600"
              )}
            >
              {credits}
            </span>
          </div>
          {credits < 5 && credits > 0 && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
          )}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 hidden sm:flex"
            onClick={() => navigate("/pricing")}
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Buy Credits
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate("/")}>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/gallery")}>
                <Images className="h-4 w-4 mr-2" />
                Gallery
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
