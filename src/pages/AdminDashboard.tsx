import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Users, Film, DollarSign, AlertTriangle, BarChart3, ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";

interface AdminStats {
  totalUsers: number;
  totalVideos: number;
  deliveredVideos: number;
  failedVideos: number;
  errorRate: string;
  popularTypes: { type: string; count: number }[];
}

const AdminDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login?redirect=/admin");
      return;
    }
    if (user) {
      checkAdmin();
    }
  }, [user, authLoading]);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await (supabase.from("user_roles") as any)
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
    if (data) fetchStats();
    else setLoading(false);
  };

  const fetchStats = async () => {
    try {
      // Total users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Video stats
      const { data: allSubs } = await (supabase.from("submissions") as any)
        .select("status, prompt_status, transformation_type");

      const totalVideos = allSubs?.length || 0;
      const delivered = allSubs?.filter((s: any) => s.status === "delivered").length || 0;
      const failed = allSubs?.filter((s: any) => s.prompt_status === "error" || s.status === "error").length || 0;
      const errorRate = totalVideos > 0 ? ((failed / totalVideos) * 100).toFixed(1) : "0";

      // Popular types
      const typeCounts: Record<string, number> = {};
      allSubs?.forEach((s: any) => {
        typeCounts[s.transformation_type] = (typeCounts[s.transformation_type] || 0) + 1;
      });
      const popularTypes = Object.entries(typeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setStats({
        totalUsers: totalUsers || 0,
        totalVideos,
        deliveredVideos: delivered,
        failedVideos: failed,
        errorRate,
        popularTypes,
      });
    } catch (err) {
      console.error("Error fetching admin stats:", err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have admin access.</p>
        </main>
      </div>
    );
  }

  const labels: Record<string, string> = {
    backyard_outdoor: "Backyard / Outdoor",
    full_home: "Full Home",
    interior_room: "Interior Room",
    pool_water: "Pool / Water",
    kitchen_bathroom: "Kitchen/Bath",
    landscaping: "Landscaping",
    exterior: "Exterior",
    interior: "Interior",
  };

  return (
    <>
      <Helmet><title>Admin Dashboard — The Vantage</title></Helmet>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 pt-24">
          <div className="flex items-center gap-3 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-3xl font-bold tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              ADMIN DASHBOARD
            </h1>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
            </div>
          ) : stats ? (
            <div className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-5 text-center">
                    <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="text-3xl font-bold">{stats.totalUsers}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Users</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5 text-center">
                    <Film className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="text-3xl font-bold">{stats.deliveredVideos}</p>
                    <p className="text-xs text-muted-foreground mt-1">Videos Delivered</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5 text-center">
                    <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" />
                    <p className="text-3xl font-bold">{stats.failedVideos}</p>
                    <p className="text-xs text-muted-foreground mt-1">Failed ({stats.errorRate}%)</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5 text-center">
                    <BarChart3 className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="text-3xl font-bold">{stats.totalVideos}</p>
                    <p className="text-xs text-muted-foreground mt-1">Total Submissions</p>
                  </CardContent>
                </Card>
              </div>

              {/* Popular types */}
              <Card>
                <CardContent className="p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-wider mb-4">Popular Transformation Types</h2>
                  <div className="space-y-3">
                    {stats.popularTypes.map((t) => (
                      <div key={t.type} className="flex items-center justify-between">
                        <span className="text-sm">{labels[t.type] || t.type.replace(/_/g, " ")}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${(t.count / stats.totalVideos) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-muted-foreground w-8 text-right">{t.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </main>
      </div>
    </>
  );
};

export default AdminDashboard;
