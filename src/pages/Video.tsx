import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { TransformationFlow } from "@/components/video/TransformationFlow";
import { ListingVideoForm } from "@/components/video/ListingVideoForm";
import {
  ArrowLeft,
  Coins,
  Loader2,
  Video,
} from "lucide-react";

type VideoMode = "select" | "listing" | "transform";
export type TransformationCategory = "construction" | "cleanup" | "setup";

export default function VideoPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { credits } = useCredits();

  const getInitialMode = (): VideoMode => {
    const mode = searchParams.get("mode");
    if (mode === "transform") return "transform";
    if (mode === "listing") return "listing";
    return "select";
  };

  const [videoMode, setVideoMode] = useState<VideoMode>(getInitialMode);
  const [transformationCategory, setTransformationCategory] = useState<TransformationCategory | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login?redirect=/video");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status" aria-live="polite" aria-label="Loading">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <>
      <Helmet>
        <title>Create a Video — The Vantage</title>
        <meta name="description" content="Create cinematic transformation or listing videos powered by AI." />
      </Helmet>

      <ErrorBoundary>
        <div className="min-h-screen bg-background pb-24">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
          <div className="px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                aria-label="Go back"
                onClick={() => {
                  if (videoMode === "transform" && transformationCategory !== null) {
                    setTransformationCategory(null);
                  } else if (videoMode !== "select") {
                    setVideoMode("select");
                    setTransformationCategory(null);
                  } else {
                    navigate(-1);
                  }
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                <span className="font-semibold">
                  {videoMode === "select"
                    ? "Create a Video"
                    : videoMode === "transform" && !transformationCategory
                    ? "Choose Type"
                    : videoMode === "transform"
                    ? "Transformation Video"
                    : "Listing Video"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-semibold text-primary text-sm">
                  {credits ?? 0}
                </span>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-8 text-xs">
                <Link to="/pricing">Get Credits</Link>
              </Button>
            </div>
          </div>
        </header>

        <main id="main-content" className="px-4 py-6 max-w-lg mx-auto space-y-5">
          {/* Breadcrumb when in a mode */}
          {videoMode !== "select" && (
            <button
              onClick={() => {
                if (videoMode === "transform" && transformationCategory !== null) {
                  setTransformationCategory(null);
                } else {
                  setVideoMode("select");
                  setTransformationCategory(null);
                }
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              {videoMode === "transform" && transformationCategory !== null
                ? "Back to transformation types"
                : "Back to video types"}
            </button>
          )}

          {videoMode === "select" && (
            <>
              <div className="text-center space-y-1">
                <h1 className="lux-display text-2xl font-bold tracking-tight">
                  CREATE A VIDEO
                </h1>
                <p className="lux-prose text-sm" style={{ color: "var(--lux-ash)" }}>Two formats. One upload. Cinematic output.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setVideoMode("transform")}
                  className="text-left p-5 rounded-none border transition-all hover:shadow-lg"
                  style={{ backgroundColor: "var(--lux-bone)", borderColor: "var(--lux-hairline)", color: "var(--lux-ink)" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-5xl">🏗️</span>
                    <span className="lux-eyebrow text-[9px]" style={{ color: "var(--lux-brass)" }}>NEW</span>
                  </div>
                  <h2 className="lux-display text-lg font-bold tracking-wide mb-2">
                    TRANSFORMATION VIDEO
                  </h2>
                   <p className="lux-prose text-xs leading-relaxed mb-3" style={{ color: "var(--lux-ash)" }}>
                    Upload the finished shot. We recreate the before state and render a cinematic build, cleanup, or setup video. Built for TikTok and Reels.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono" style={{ color: "var(--lux-ash)" }}>from 30 credits</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--lux-ink)" }}>Start Transformation →</span>
                  </div>
                </button>

                <button
                  onClick={() => setVideoMode("listing")}
                  className="text-left p-5 rounded-none border transition-all hover:shadow-lg"
                  style={{ backgroundColor: "var(--lux-bone)", borderColor: "var(--lux-hairline)", color: "var(--lux-ink)" }}
                >
                  <div className="mb-3">
                    <span className="text-5xl">🏠</span>
                  </div>
                  <h2 className="lux-display text-lg font-bold tracking-wide mb-2">
                    LISTING VIDEO
                  </h2>
                   <p className="lux-prose text-xs leading-relaxed mb-3" style={{ color: "var(--lux-ash)" }}>
                     One photo of a room or exterior. We render a smooth cinematic showcase — no AI hallucinations, just real camera movement. Built for MLS and social.
                   </p>
                   <div className="flex items-center justify-between">
                     <span className="text-xs font-mono" style={{ color: "var(--lux-ash)" }}>2 credits</span>
                     <span className="text-xs font-semibold" style={{ color: "var(--lux-ink)" }}>Create Listing Video →</span>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* Transformation category selection */}
          {videoMode === "transform" && !transformationCategory && (
            <>
              <div className="text-center space-y-1">
                <h1 className="lux-display text-2xl font-bold tracking-tight">
                  WHAT ARE YOU TRANSFORMING?
                </h1>
              </div>

              <p className="lux-eyebrow text-center">
                Create → Transformation → Choose Type
              </p>

              <div className="space-y-3">
                {/* Construction */}
                <button
                  onClick={() => setTransformationCategory("construction")}
                  className="w-full text-left p-6 rounded-none transition-all hover:shadow-lg"
                  style={{ backgroundColor: "var(--lux-bone)", border: "1px solid var(--lux-hairline)" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-5xl">🏗️</span>
                    <span className="lux-eyebrow text-[8px]" style={{ color: "var(--lux-brass)" }}>POPULAR</span>
                  </div>
                  <h2 className="lux-display text-[22px] font-bold tracking-wide mb-2">
                    CONSTRUCTION TRANSFORMATION
                  </h2>
                  <p className="lux-prose text-xs leading-relaxed mb-3" style={{ color: "var(--lux-ash)" }}>
                    Upload the finished shot. We reconstruct the raw site before you broke ground and render a cinematic build arc.
                    Contractors, landscapers, pool builders, renovators.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono" style={{ color: "var(--lux-ash)" }}>from 40 credits</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--lux-ink)" }}>Start →</span>
                  </div>
                </button>

                {/* Cleanup */}
                <button
                  onClick={() => setTransformationCategory("cleanup")}
                  className="w-full text-left p-6 rounded-none transition-all hover:shadow-lg"
                  style={{ backgroundColor: "var(--lux-bone)", border: "1px solid var(--lux-hairline)" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-5xl">🧹</span>
                    <span className="lux-eyebrow text-[8px]" style={{ color: "var(--lux-brass)" }}>NEW</span>
                  </div>
                  <h2 className="lux-display text-[22px] font-bold tracking-wide mb-2">
                    CLEANUP TRANSFORMATION
                  </h2>
                  <p className="lux-prose text-xs leading-relaxed mb-3" style={{ color: "var(--lux-ash)" }}>
                    Upload the cleaned shot. We recreate the messy before — rubbish, junk, debris — and render a dramatic cleanup reveal.
                    Rubbish removal, junk hauling, hoarding cleanouts, site clearance.
                  </p>
                  <div className="flex items-center justify-between">
                     <span className="text-xs font-mono" style={{ color: "var(--lux-ash)" }}>from 50 credits</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--lux-ink)" }}>Start →</span>
                   </div>
                </button>

                {/* Setup */}
                <button
                  onClick={() => setTransformationCategory("setup")}
                  className="w-full text-left p-6 rounded-none transition-all hover:shadow-lg"
                  style={{ backgroundColor: "var(--lux-bone)", border: "1px solid var(--lux-hairline)" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-5xl">✨</span>
                    <span className="lux-eyebrow text-[8px]" style={{ color: "var(--lux-brass)" }}>NEW</span>
                  </div>
                  <h2 className="lux-display text-[22px] font-bold tracking-wide mb-2">
                    SETUP TRANSFORMATION
                  </h2>
                  <p className="lux-prose text-xs leading-relaxed mb-3" style={{ color: "var(--lux-ash)" }}>
                    Upload the styled shot. We recreate the empty unstyled before and render a satisfying setup reveal.
                    Event setups, catering, venue styling, hospitality.
                  </p>
                  <div className="flex items-center justify-between">
                     <span className="text-xs font-mono" style={{ color: "var(--lux-ash)" }}>from 50 credits</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--lux-ink)" }}>Start →</span>
                   </div>
                </button>
              </div>
            </>
          )}

          {videoMode === "transform" && transformationCategory && (
            <TransformationFlow transformationCategory={transformationCategory} />
          )}
          {videoMode === "listing" && <ListingVideoForm />}
        </main>
        </div>
      </ErrorBoundary>
    </>
  );
}
