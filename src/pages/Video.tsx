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
import { ListingVideoFlow } from "@/components/video/ListingVideoFlow";
import {
  ArrowLeft,
  Coins,
  Loader2,
  Video,
} from "lucide-react";

type VideoMode = "select" | "listing" | "transform" | "setup" | "cleanup";
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
    if (mode === "setup") return "setup";
    if (mode === "cleanup") return "cleanup";
    return "select";
  };

  // Initialise transformationCategory from the URL too — without this, landing on
  // /video?mode=transform from a CTA leaves transformationCategory null and the
  // render conditional `videoMode === "transform" && transformationCategory` is
  // false, producing a blank page.
  const getInitialCategory = (): TransformationCategory | null => {
    const mode = searchParams.get("mode");
    if (mode === "transform") return "construction";
    if (mode === "setup") return "setup";
    if (mode === "cleanup") return "cleanup";
    return null;
  };

  const [videoMode, setVideoMode] = useState<VideoMode>(getInitialMode);
  const [transformationCategory, setTransformationCategory] = useState<TransformationCategory | null>(getInitialCategory);

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
                  if (transformationCategory !== null) {
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
                    : videoMode === "listing"
                    ? "Listing Videos"
                    : videoMode === "transform" && !transformationCategory
                    ? "Choose Type"
                    : videoMode === "transform"
                    ? "Transformation Videos"
                    : videoMode === "setup"
                    ? "Setup Videos"
                    : "Cleanup Videos"}
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
                if (transformationCategory !== null) {
                  setTransformationCategory(null);
                } else {
                  setVideoMode("select");
                  setTransformationCategory(null);
                }
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to video types
            </button>
          )}

          {videoMode === "select" && (
            <>
              <div className="text-center space-y-1">
                <h1 className="lux-display text-2xl font-bold tracking-tight">
                  CREATE A VIDEO
                </h1>
                <p className="lux-prose text-sm" style={{ color: "var(--lux-ash)" }}>Four products. One upload. Cinematic output.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* I. Listing Videos */}
                <button
                  onClick={() => setVideoMode("listing")}
                  className="text-left p-5 rounded-none border transition-all"
                  style={{ backgroundColor: "var(--lux-bone)", borderColor: "var(--lux-hairline)", color: "var(--lux-ink)" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--lux-cream)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--lux-bone)"}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="lux-display-italic text-3xl" style={{ color: "var(--lux-rust)" }}>I.</span>
                  </div>
                  <h2 className="lux-display text-xl font-bold tracking-wide mb-1">
                    LISTING VIDEOS
                  </h2>
                  <p className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>FOR THE LISTING ON THE MARKET</p>
                  <p className="lux-prose text-sm leading-relaxed mb-3" style={{ color: "var(--lux-ash)" }}>
                    Turn one or more listing photos into cinematic Reels. Six camera moves, optional Just-Listed signage, multi-photo compilations. Built for real estate photographers and listing agents.
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--lux-hairline)" }}>
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--lux-brass)" }}>PHOTOGRAPHERS · AGENTS · BROKERAGES</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--lux-ink)" }}>Begin →</span>
                  </div>
                </button>

                {/* II. Transformation Videos */}
                <button
                  onClick={() => { setVideoMode("transform"); setTransformationCategory("construction"); }}
                  className="text-left p-5 rounded-none border transition-all"
                  style={{ backgroundColor: "var(--lux-bone)", borderColor: "var(--lux-hairline)", color: "var(--lux-ink)" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--lux-cream)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--lux-bone)"}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="lux-display-italic text-3xl" style={{ color: "var(--lux-rust)" }}>II.</span>
                  </div>
                  <h2 className="lux-display text-xl font-bold tracking-wide mb-1">
                    TRANSFORMATION VIDEOS
                  </h2>
                  <p className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>FOR FINISHED CONSTRUCTION & RENOVATION</p>
                  <p className="lux-prose text-sm leading-relaxed mb-3" style={{ color: "var(--lux-ash)" }}>
                    Upload one finished after photo. We generate the raw bare-site before and animate the build sequence. Kitchen remodels, full builds, exteriors.
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--lux-hairline)" }}>
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--lux-brass)" }}>CONTRACTORS · RENOVATORS · BUILDERS</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--lux-ink)" }}>Begin →</span>
                  </div>
                </button>

                {/* III. Setup Videos */}
                <button
                  onClick={() => { setVideoMode("setup"); setTransformationCategory("setup"); }}
                  className="text-left p-5 rounded-none border transition-all"
                  style={{ backgroundColor: "var(--lux-bone)", borderColor: "var(--lux-hairline)", color: "var(--lux-ink)" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--lux-cream)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--lux-bone)"}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="lux-display-italic text-3xl" style={{ color: "var(--lux-rust)" }}>III.</span>
                  </div>
                  <h2 className="lux-display text-xl font-bold tracking-wide mb-1">
                    SETUP VIDEOS
                  </h2>
                  <p className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>FOR EVENT VENUES & STYLED SPACES</p>
                  <p className="lux-prose text-sm leading-relaxed mb-3" style={{ color: "var(--lux-ash)" }}>
                    Upload one styled after photo. We generate the empty unstyled before and animate the setup sequence. Event venues, caterers, hospitality.
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--lux-hairline)" }}>
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--lux-brass)" }}>VENUES · CATERERS · STYLISTS</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--lux-ink)" }}>Begin →</span>
                  </div>
                </button>

                {/* IV. Cleanup Videos */}
                <button
                  onClick={() => { setVideoMode("cleanup"); setTransformationCategory("cleanup"); }}
                  className="text-left p-5 rounded-none border transition-all"
                  style={{ backgroundColor: "var(--lux-bone)", borderColor: "var(--lux-hairline)", color: "var(--lux-ink)" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--lux-cream)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--lux-bone)"}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="lux-display-italic text-3xl" style={{ color: "var(--lux-rust)" }}>IV.</span>
                  </div>
                  <h2 className="lux-display text-xl font-bold tracking-wide mb-1">
                    CLEANUP VIDEOS
                  </h2>
                  <p className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>FOR CLEANED & RESTORED SPACES</p>
                  <p className="lux-prose text-sm leading-relaxed mb-3" style={{ color: "var(--lux-ash)" }}>
                    Upload one cleaned after photo. We generate the cluttered messy before and animate the cleanup sequence. Rubbish removal, hoarding cleanouts, restoration.
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--lux-hairline)" }}>
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--lux-brass)" }}>CLEANUP CREWS · RESTORERS · HAULERS</span>
                    <span className="text-xs font-semibold" style={{ color: "var(--lux-ink)" }}>Begin →</span>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* Transformation, Setup, Cleanup Flows */}
          {videoMode === "transform" && transformationCategory && (
            <TransformationFlow transformationCategory={transformationCategory} />
          )}
          {videoMode === "setup" && transformationCategory && (
            <TransformationFlow transformationCategory={transformationCategory} />
          )}
          {videoMode === "cleanup" && transformationCategory && (
            <TransformationFlow transformationCategory={transformationCategory} />
          )}
          {videoMode === "listing" && <ListingVideoFlow />}
        </main>
        </div>
      </ErrorBoundary>
    </>
  );
}
