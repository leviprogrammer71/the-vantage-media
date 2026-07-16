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
    if (mode === "setup") return "setup";
    if (mode === "cleanup") return "cleanup";
    // Default + ?mode=listing → unified Listing Videos flow.
    // The 3-card select screen has been retired (May 16, 2026): everything
    // lives under "Animate Single" inside ListingVideoFlow now.
    return "listing";
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

  // ── June 6, 2026 — sync mode from the URL on client-side navigation ──
  // Bug fix: the Animate Single picker (rendered inside ListingVideoFlow
  // while videoMode="listing") navigates to /video?mode=transform|setup|
  // cleanup. That changes the query string but does NOT remount this page,
  // so the useState initializers above never re-run and videoMode stayed
  // "listing" — clicking "Transformation/Setup/Cleanup" appeared to do
  // nothing. This effect re-reads ?mode= on every searchParams change and
  // updates both videoMode and transformationCategory accordingly.
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "transform") {
      setVideoMode("transform");
      setTransformationCategory("construction");
    } else if (mode === "setup") {
      setVideoMode("setup");
      setTransformationCategory("setup");
    } else if (mode === "cleanup") {
      setVideoMode("cleanup");
      setTransformationCategory("cleanup");
    } else if (mode === "listing" || mode === null) {
      setVideoMode("listing");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
        {/* One continuous bone surface — the previous bg-background (near-white)
            wrapper made inner lux-bone blocks read as awkward floating boxes
            with white gutters around them. */}
        <div className="min-h-screen pb-24" style={{ background: "var(--lux-bone)" }}>
        {/* Header */}
        <header
          className="sticky top-0 z-50"
          style={{
            background: "var(--lux-bone)",
            borderBottom: "1px solid var(--lux-hairline)",
            paddingTop: "env(safe-area-inset-top, 0px)",
          }}
        >
          <div
            className="px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 flex items-center justify-between"
            style={{ minHeight: 62 }}
          >
            <div className="flex items-center gap-2 sm:gap-3">
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
              {/* Brand wordmark — links home, matching the homepage. */}
              <Link
                to="/"
                className="flex items-baseline gap-2 no-underline"
                style={{ color: "var(--lux-ink)" }}
                title="Back to The Vantage home"
              >
                <span className="lux-display-italic" style={{ fontSize: 21, lineHeight: 1, letterSpacing: "0.005em" }}>
                  The Vantage
                </span>
              </Link>
              <span
                className="lux-eyebrow hidden sm:inline"
                style={{ color: "var(--lux-ash)", marginLeft: 2 }}
              >
                {videoMode === "select"
                  ? "· CREATE"
                  : videoMode === "listing"
                  ? "· LISTING VIDEO"
                  : videoMode === "transform"
                  ? "· TRANSFORMATION"
                  : videoMode === "setup"
                  ? "· SETUP"
                  : "· CLEANUP"}
              </span>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                to="/"
                className="lux-eyebrow hidden md:inline-flex items-center gap-1.5 hover:opacity-100 transition-opacity"
                style={{ color: "var(--lux-ink)", opacity: 0.7 }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> HOME
              </Link>
              <div
                className="flex items-center gap-1.5 px-2.5 py-1"
                style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline-strong)" }}
              >
                <Coins className="h-4 w-4" style={{ color: "var(--lux-rust)" }} />
                <span className="font-semibold text-sm" style={{ color: "var(--lux-ink)" }}>
                  {credits ?? 0}
                </span>
              </div>
              <Link to="/pricing" className="lux-eyebrow" style={{ color: "var(--lux-ink)", opacity: 0.78 }}>
                GET CREDITS
              </Link>
            </div>
          </div>
        </header>

        <main id="main-content" className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 2xl:px-24 py-6 lg:py-10 space-y-5">
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

          {/* The 3-card select screen has been retired. Setup, Cleanup, and
              Transformation are now all accessible inside Animate Single
              (within ListingVideoFlow). The select branch below is retained
              for legacy navigation but is never reached because the default
              mode is "listing". */}
          {false && videoMode === "select" && (
            <>
              <div className="text-center space-y-1">
                <h1 className="lux-display text-2xl font-bold tracking-tight">
                  CREATE A VIDEO
                </h1>
                <p className="lux-prose text-sm" style={{ color: "var(--lux-ash)" }}>Three products. One upload. Cinematic output.</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* I. Camera Movement (consolidates listing video features) */}
                <button
                  onClick={() => setVideoMode("listing")}
                  className="text-left rounded-none border transition-all overflow-hidden"
                  style={{ backgroundColor: "var(--lux-bone)", borderColor: "var(--lux-hairline)", color: "var(--lux-ink)" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--lux-cream)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--lux-bone)"}
                >
                  <video
                    src="/vantage/animate-single/result.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full aspect-[4/3] object-cover"
                    style={{ background: "var(--lux-ink)" }}
                  />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <span className="lux-display-italic text-3xl" style={{ color: "var(--lux-rust)" }}>I.</span>
                    </div>
                    <h2 className="lux-display text-xl font-bold tracking-wide mb-1">
                      CAMERA MOVEMENT
                    </h2>
                    <p className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>EVERY MOVE, EVERY EFFECT</p>
                    <p className="lux-prose text-sm leading-relaxed mb-3" style={{ color: "var(--lux-ash)" }}>
                      Turn one or more photos into cinematic Reels. Animate single, sun-to-sun, virtual staging, sketch-to-real, done-for-you reels. Every camera move and effect we offer.
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--lux-hairline)" }}>
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--lux-brass)" }}>PHOTOGRAPHERS · AGENTS · BROKERAGES</span>
                      <span className="text-xs font-semibold" style={{ color: "var(--lux-ink)" }}>Begin →</span>
                    </div>
                  </div>
                </button>

                {/* II. Setup */}
                <button
                  onClick={() => { setVideoMode("setup"); setTransformationCategory("setup"); }}
                  className="text-left rounded-none border transition-all overflow-hidden"
                  style={{ backgroundColor: "var(--lux-bone)", borderColor: "var(--lux-hairline)", color: "var(--lux-ink)" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--lux-cream)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--lux-bone)"}
                >
                  <video
                    src="/vantage/setup/video.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full aspect-[4/3] object-cover"
                    style={{ background: "var(--lux-ink)" }}
                  />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <span className="lux-display-italic text-3xl" style={{ color: "var(--lux-rust)" }}>II.</span>
                    </div>
                    <h2 className="lux-display text-xl font-bold tracking-wide mb-1">
                      SETUP
                    </h2>
                    <p className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>EMPTY → FINISHED</p>
                    <p className="lux-prose text-sm leading-relaxed mb-3" style={{ color: "var(--lux-ash)" }}>
                      Upload the before and after. We animate the build sequence — empty room becoming furnished, raw site becoming finished home, bare table becoming styled. Anchored at both ends so the transformation actually completes.
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--lux-hairline)" }}>
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--lux-brass)" }}>CONTRACTORS · STAGERS · VENUES</span>
                      <span className="text-xs font-semibold" style={{ color: "var(--lux-ink)" }}>Begin →</span>
                    </div>
                  </div>
                </button>

                {/* III. Cleanup */}
                <button
                  onClick={() => { setVideoMode("cleanup"); setTransformationCategory("cleanup"); }}
                  className="text-left rounded-none border transition-all overflow-hidden"
                  style={{ backgroundColor: "var(--lux-bone)", borderColor: "var(--lux-hairline)", color: "var(--lux-ink)" }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--lux-cream)"}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--lux-bone)"}
                >
                  <video
                    src="/vantage/cleanup/result.mp4"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full aspect-[4/3] object-cover"
                    style={{ background: "var(--lux-ink)" }}
                  />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <span className="lux-display-italic text-3xl" style={{ color: "var(--lux-rust)" }}>III.</span>
                    </div>
                    <h2 className="lux-display text-xl font-bold tracking-wide mb-1">
                      CLEANUP
                    </h2>
                    <p className="lux-eyebrow mb-2" style={{ color: "var(--lux-brass)" }}>CLUTTERED → CLEAN</p>
                    <p className="lux-prose text-sm leading-relaxed mb-3" style={{ color: "var(--lux-ash)" }}>
                      Upload the before and after. We animate the cleanup — junk fades, surfaces clear, the room resolves to its restored state. Anchored to your final photo so the end state always matches what you shot.
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: "var(--lux-hairline)" }}>
                      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--lux-brass)" }}>CLEANUP CREWS · RESTORERS · HAULERS</span>
                      <span className="text-xs font-semibold" style={{ color: "var(--lux-ink)" }}>Begin →</span>
                    </div>
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
          {videoMode === "listing" && (
            <ListingVideoFlow initialCategory={searchParams.get("category") as any} />
          )}
        </main>
        </div>
      </ErrorBoundary>
    </>
  );
}
