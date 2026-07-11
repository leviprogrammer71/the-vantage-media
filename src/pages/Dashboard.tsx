import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { Loader2, Film, FolderOpen, TrendingUp, Plug, ArrowRight, Clock } from "lucide-react";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";

interface Submission {
  id: string;
  created_at: string;
  transformation_type: string | null;
  video_type: string | null;
  output_video_url: string | null;
  output_video_path: string | null;
  status: string | null;
}

interface Stats {
  reelsMade: number;
  inGallery: number;
  creditsUsed: number;
}

const prettyType = (s: Submission): string => {
  const t = (s.transformation_type || s.video_type || "reel").replace(/_/g, " ");
  return t.replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const { credits, loading: creditsLoading } = useCredits();
  const navigate = useNavigate();
  const [recent, setRecent] = useState<Submission[]>([]);
  const [stats, setStats] = useState<Stats>({ reelsMade: 0, inGallery: 0, creditsUsed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/login?redirect=/dashboard");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const uid = user!.id;
      // Recent reels
      const { data: subs } = await supabase
        .from("submissions")
        .select("id, created_at, transformation_type, video_type, output_video_url, output_video_path, status")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(6);
      setRecent((subs as Submission[]) || []);

      // Totals
      const { count: reelsMade } = await supabase
        .from("submissions").select("id", { count: "exact", head: true }).eq("user_id", uid);
      const { count: inGallery } = await supabase
        .from("submissions").select("id", { count: "exact", head: true })
        .eq("user_id", uid).not("output_video_url", "is", null);

      // Credits spent (sum of negative ledger entries)
      const { data: tx } = await supabase
        .from("credit_transactions").select("credits_amount").eq("user_id", uid);
      const creditsUsed = (tx || [])
        .filter((t: { credits_amount: number }) => t.credits_amount < 0)
        .reduce((s: number, t: { credits_amount: number }) => s + Math.abs(t.credits_amount), 0);

      setStats({ reelsMade: reelsMade ?? 0, inGallery: inGallery ?? 0, creditsUsed });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--lux-bone)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--lux-rust)" }} />
      </div>
    );
  }

  const firstName = (user?.email || "there").split("@")[0];
  const statCards = [
    { label: "REELS MADE", value: stats.reelsMade, sub: "Total generated", icon: Film },
    { label: "IN GALLERY", value: stats.inGallery, sub: "Saved reels", icon: FolderOpen },
    { label: "CREDITS USED", value: stats.creditsUsed.toLocaleString(), sub: "All-time spend", icon: TrendingUp },
    { label: "CREDITS LEFT", value: (credits ?? 0).toLocaleString(), sub: "Available now", icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--lux-bone)" }}>
      <LuxuryHeader variant="bone" />
      <main className="mx-auto px-5 sm:px-8" style={{ maxWidth: 1100, paddingTop: 44, paddingBottom: 80 }}>
        <div className="mb-2 lux-eyebrow" style={{ color: "var(--lux-brass)" }}>YOUR STUDIO</div>
        <h1 className="lux-display" style={{ fontSize: "clamp(2rem,4vw,2.8rem)", lineHeight: 1.02, color: "var(--lux-ink)" }}>
          Welcome back, <em style={{ color: "var(--lux-rust)" }}>{firstName}</em>.
        </h1>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-8">
          {statCards.map((s) => (
            <div key={s.label} className="p-5" style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)" }}>
              <div className="flex items-center justify-between">
                <span className="lux-eyebrow" style={{ color: "var(--lux-ash)", fontSize: "0.6rem" }}>{s.label}</span>
                <s.icon className="h-4 w-4" style={{ color: "var(--lux-brass)" }} />
              </div>
              <div className="font-display mt-3" style={{ fontSize: "1.9rem", letterSpacing: "-0.02em", color: "var(--lux-ink)" }}>{s.value}</div>
              <div className="lux-prose" style={{ fontSize: "0.72rem", color: "var(--lux-ash)" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Primary actions */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div className="p-6 flex flex-col" style={{ background: "var(--lux-ink)", color: "var(--lux-bone)" }}>
            <Film className="h-6 w-6 mb-3" style={{ color: "var(--lux-champagne)" }} />
            <h3 className="lux-display" style={{ fontSize: "1.4rem" }}>Make a Reel</h3>
            <p className="lux-prose mt-2 flex-1" style={{ fontSize: "0.85rem", color: "rgba(244,239,230,0.8)" }}>
              Upload photos or a listing link and get a cinematic reel in minutes.
            </p>
            <Link to="/video?mode=listing" className="lux-btn lux-btn-bone mt-4 inline-flex items-center gap-2 self-start">
              START <ArrowRight size={14} />
            </Link>
          </div>

          <div className="p-6 flex flex-col" style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline-strong)", borderLeft: "2px solid var(--lux-rust)" }}>
            <Plug className="h-6 w-6 mb-3" style={{ color: "var(--lux-rust)" }} />
            <h3 className="lux-display" style={{ fontSize: "1.4rem", color: "var(--lux-ink)" }}>Connect to Claude</h3>
            <p className="lux-prose mt-2 flex-1" style={{ fontSize: "0.85rem", color: "var(--lux-ink)" }}>
              Make reels by chatting — paste a Zillow link into Claude and get one back.
            </p>
            <Link to="/connect" className="lux-btn mt-4 inline-flex items-center gap-2 self-start" style={{ background: "var(--lux-rust)", color: "var(--lux-bone)" }}>
              CONNECT <ArrowRight size={14} />
            </Link>
          </div>

          <div className="p-6 flex flex-col" style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)" }}>
            <FolderOpen className="h-6 w-6 mb-3" style={{ color: "var(--lux-brass)" }} />
            <h3 className="lux-display" style={{ fontSize: "1.4rem", color: "var(--lux-ink)" }}>Your Gallery</h3>
            <p className="lux-prose mt-2 flex-1" style={{ fontSize: "0.85rem", color: "var(--lux-ink)" }}>
              Every reel you've made, ready to download and post.
            </p>
            <Link to="/gallery" className="lux-eyebrow mt-4 inline-flex items-center gap-2 self-start" style={{ color: "var(--lux-ink)" }}>
              VIEW GALLERY <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Recent reels */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>RECENT REELS</h2>
            <Link to="/gallery" className="lux-eyebrow inline-flex items-center gap-1.5" style={{ color: "var(--lux-ink)", opacity: 0.7 }}>
              VIEW ALL <ArrowRight size={13} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="p-10 text-center" style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)" }}>
              <Film className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--lux-ash)" }} />
              <p className="lux-prose" style={{ color: "var(--lux-ink)" }}>No reels yet.</p>
              <Link to="/video?mode=listing" className="lux-eyebrow inline-block mt-3" style={{ color: "var(--lux-rust)" }}>
                MAKE YOUR FIRST REEL →
              </Link>
            </div>
          ) : (
            <div className="divide-y" style={{ borderTop: "1px solid var(--lux-hairline)" }}>
              {recent.map((s) => (
                <Link
                  key={s.id}
                  to="/gallery"
                  className="flex items-center gap-4 py-4 no-underline"
                  style={{ borderBottom: "1px solid var(--lux-hairline)", color: "var(--lux-ink)" }}
                >
                  <div className="grid place-items-center flex-shrink-0" style={{ width: 48, height: 48, background: "var(--lux-ink)" }}>
                    <Film size={18} style={{ color: "var(--lux-champagne)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="lux-prose" style={{ fontWeight: 600, fontSize: "0.9rem" }}>{prettyType(s)}</div>
                    <div className="lux-eyebrow inline-flex items-center gap-1.5 mt-1" style={{ color: "var(--lux-ash)", fontSize: "0.6rem" }}>
                      <Clock size={11} /> {formatDate(s.created_at)}
                    </div>
                  </div>
                  <span className="lux-eyebrow" style={{ color: s.output_video_url ? "var(--lux-brass)" : "var(--lux-ash)", fontSize: "0.6rem" }}>
                    {s.output_video_url ? "READY" : (s.status || "").toUpperCase()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <LuxuryFooter />
    </div>
  );
};

export default Dashboard;
