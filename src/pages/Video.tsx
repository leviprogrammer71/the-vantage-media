import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserCredits } from "@/hooks/useUserCredits";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Helmet } from "react-helmet-async";
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
  const { credits } = useUserCredits();

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
                <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  CREATE A VIDEO
                </h1>
                <p className="text-sm text-muted-foreground">Choose what you want to make.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setVideoMode("transform")}
                  className="text-left p-5 rounded-none border-2 border-primary/60 transition-all hover:border-primary hover:shadow-lg"
                  style={{ backgroundColor: "#1A1A1A" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-5xl">🏗️</span>
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-none">NEW</Badge>
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-wide mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    TRANSFORMATION VIDEO
                  </h2>
                   <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    Upload your finished after photo. We generate the before state and create a cinematic construction arc video. Perfect for TikTok and Instagram Reels.
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-primary font-mono">from 3 credits</span>
                    <span className="text-xs text-primary font-semibold">Start Transformation →</span>
                  </div>
                </button>

                <button
                  onClick={() => setVideoMode("listing")}
                  className="text-left p-5 rounded-none border border-border/60 transition-all hover:border-primary/50 hover:shadow-lg"
                  style={{ backgroundColor: "#1A1A1A" }}
                >
                  <div className="mb-3">
                    <span className="text-5xl">🏠</span>
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-wide mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    LISTING VIDEO
                  </h2>
                   <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                     Upload a photo of a room or property exterior. We create a smooth cinematic showcase video with no hallucinations. Perfect for MLS and social media.
                   </p>
                   <div className="flex items-center justify-between">
                     <span className="text-xs text-muted-foreground font-mono">2 credits</span>
                     <span className="text-xs text-muted-foreground font-semibold">Create Listing Video →</span>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* Transformation category selection */}
          {videoMode === "transform" && !transformationCategory && (
            <>
              <div className="text-center space-y-1">
                <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                  WHAT ARE YOU TRANSFORMING?
                </h1>
              </div>

              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#555555" }}>
                Create → Transformation → Choose Type
              </p>

              <div className="space-y-3">
                {/* Construction */}
                <button
                  onClick={() => setTransformationCategory("construction")}
                  className="w-full text-left p-6 rounded-none transition-all hover:shadow-lg"
                  style={{ backgroundColor: "#1A1A1A", border: "1px solid #E8C547" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-5xl">🏗️</span>
                    <span style={{
                      background: "rgba(232,197,71,0.15)",
                      border: "1px solid rgba(232,197,71,0.4)",
                      color: "#E8C547",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "9px",
                      padding: "3px 8px",
                    }}>POPULAR</span>
                  </div>
                  <h2 className="text-[22px] font-bold text-white tracking-wide mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    CONSTRUCTION TRANSFORMATION
                  </h2>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#AAAAAA", lineHeight: 1.6, marginBottom: "12px" }}>
                    Upload your finished after photo. We reconstruct what the space looked like before construction began and generate a cinematic build video.
                    Perfect for contractors, landscapers, pool builders, and renovators.
                  </p>
                  <div className="flex items-center justify-between">
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "#E8C547" }}>from 40 credits</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#E8C547" }}>Start →</span>
                  </div>
                </button>

                {/* Cleanup */}
                <button
                  onClick={() => setTransformationCategory("cleanup")}
                  className="w-full text-left p-6 rounded-none transition-all hover:shadow-lg"
                  style={{ backgroundColor: "#1A1A1A", border: "1px solid #222222" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-5xl">🧹</span>
                    <span style={{
                      background: "#1A1A1A",
                      border: "1px solid #333333",
                      color: "#F5F5F0",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "9px",
                      padding: "3px 8px",
                    }}>NEW</span>
                  </div>
                  <h2 className="text-[22px] font-bold text-white tracking-wide mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    CLEANUP TRANSFORMATION
                  </h2>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#AAAAAA", lineHeight: 1.6, marginBottom: "12px" }}>
                    Upload your cleaned finished space. We generate what it looked like before — full of rubbish, junk, and debris — then create a dramatic cleanup reveal video.
                    Perfect for rubbish removal, junk hauling, hoarding cleanouts, and site cleanup.
                  </p>
                  <div className="flex items-center justify-between">
                     <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "#E8C547" }}>from 50 credits</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#AAAAAA" }}>Start →</span>
                   </div>
                </button>

                {/* Setup */}
                <button
                  onClick={() => setTransformationCategory("setup")}
                  className="w-full text-left p-6 rounded-none transition-all hover:shadow-lg"
                  style={{ backgroundColor: "#1A1A1A", border: "1px solid #222222" }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-5xl">✨</span>
                    <span style={{
                      background: "#1A1A1A",
                      border: "1px solid #333333",
                      color: "#F5F5F0",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "9px",
                      padding: "3px 8px",
                    }}>NEW</span>
                  </div>
                  <h2 className="text-[22px] font-bold text-white tracking-wide mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                    SETUP TRANSFORMATION
                  </h2>
                  <p style={{ fontFamily: "Inter, sans-serif", fontSize: "13px", color: "#AAAAAA", lineHeight: 1.6, marginBottom: "12px" }}>
                    Upload your finished setup or styled space. We generate what it looked like before — empty and unstyled — then create a satisfying setup reveal video.
                    Perfect for event setups, catering, venue styling, and hospitality.
                  </p>
                  <div className="flex items-center justify-between">
                     <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "11px", color: "#E8C547" }}>from 50 credits</span>
                    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "12px", color: "#AAAAAA" }}>Start →</span>
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
    </>
  );
}
