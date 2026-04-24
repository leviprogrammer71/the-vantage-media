import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditBalance } from "@/components/CreditBalance";
import {
  Image,
  Sparkles,
  Clock,
  TrendingUp,
  Video,
  FolderOpen,
  Loader2,
  ArrowRight,
} from "lucide-react";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";

interface Enhancement {
  id: string;
  original_image_url: string;
  enhanced_image_url: string | null;
  preset_used: string;
  created_at: string;
  status: string;
}

interface Stats {
  totalEnhancements: number;
  savedToGallery: number;
  creditsUsed: number;
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { credits, loading: creditsLoading } = useCredits();
  const navigate = useNavigate();
  const [recentEnhancements, setRecentEnhancements] = useState<Enhancement[]>([]);
  const [stats, setStats] = useState<Stats>({ totalEnhancements: 0, savedToGallery: 0, creditsUsed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch recent enhancements
      const { data: enhancements, error: enhError } = await supabase
        .from("enhancements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (enhError) throw enhError;
      setRecentEnhancements(enhancements || []);

      // Calculate stats
      const { data: allEnhancements } = await supabase
        .from("enhancements")
        .select("id, saved_to_gallery, credits_used");

      if (allEnhancements) {
        setStats({
          totalEnhancements: allEnhancements.length,
          savedToGallery: allEnhancements.filter((e) => e.saved_to_gallery).length,
          creditsUsed: allEnhancements.reduce((sum, e) => sum + (e.credits_used || 0), 0),
        });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPresetLabel = (preset: string) => {
    const labels: Record<string, string> = {
      "bright-clear": "Bright & Clear",
      "natural-light": "Natural Light",
      "high-contrast": "High Contrast",
      "overcast-sunny": "Overcast to Sunny",
      twilight: "Twilight",
    };
    return labels[preset] || preset;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LuxuryHeader variant="bone" />
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here's an overview of your account.
          </p>
        </div>

        {/* Credits Balance - Prominent */}
        <div className="mb-6">
          <CreditBalance
            credits={credits}
            loading={creditsLoading}
            variant="default"
            showUpsell={true}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-medium">Enhancements</CardTitle>
              <Sparkles className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold">{stats.totalEnhancements}</div>
              <p className="text-[10px] text-muted-foreground">Photos enhanced</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-medium">Saved</CardTitle>
              <FolderOpen className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold">{stats.savedToGallery}</div>
              <p className="text-[10px] text-muted-foreground">In gallery</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-medium">Credits Used</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold">{stats.creditsUsed}</div>
              <p className="text-[10px] text-muted-foreground">Total spent</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
              <CardTitle className="text-xs font-medium">Videos</CardTitle>
              <Video className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-xl font-bold">0</div>
              <p className="text-[10px] text-muted-foreground">Generated</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Enhance a Photo
              </CardTitle>
              <CardDescription>
                Transform your property photos with AI-powered enhancements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/generate">
                  Start Enhancing
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Create Listing Video
              </CardTitle>
              <CardDescription>
                Turn enhanced photos into cinematic video clips
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link to="/pricing">
                  View Pricing
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Enhancements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Enhancements</CardTitle>
              <CardDescription>Your latest photo enhancements</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/gallery">
                View All
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentEnhancements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Image className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No enhancements yet</p>
                <Button variant="link" asChild className="mt-2">
                  <Link to="/generate">Create your first enhancement</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {recentEnhancements.map((enhancement) => (
                  <div
                    key={enhancement.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="h-14 w-20 rounded overflow-hidden bg-muted flex-shrink-0">
                      {enhancement.enhanced_image_url ? (
                        <img
                          src={enhancement.enhanced_image_url}
                          alt="Enhanced"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Image className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {getPresetLabel(enhancement.preset_used)}
                        </Badge>
                        <Badge
                          variant={enhancement.status === "completed" ? "default" : "outline"}
                          className="text-xs"
                        >
                          {enhancement.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(enhancement.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <LuxuryFooter />
    </div>
  );
};

export default Dashboard;
