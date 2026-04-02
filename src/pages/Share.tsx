import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, Copy, Check, Eye, ExternalLink } from "lucide-react";
import { Helmet } from "react-helmet-async";
import logo from "@/assets/logo.png";

interface SharedVideo {
  id: string;
  transformation_type: string;
  build_type: string | null;
  created_at: string;
  video_url: string | null;
  before_url: string | null;
  after_url: string | null;
  share_views: number;
}

const getTransformationLabel = (type: string) => {
  const labels: Record<string, string> = {
    backyard_outdoor: "BACKYARD / OUTDOOR",
    full_home: "FULL HOME",
    interior_room: "INTERIOR ROOM",
    pool_water: "POOL / WATER",
    kitchen_bathroom: "KITCHEN / BATH",
    landscaping: "LANDSCAPING",
    exterior: "EXTERIOR",
    interior: "INTERIOR",
  };
  return labels[type] || type.replace(/_/g, " ").toUpperCase();
};

const getBuildLabel = (type: string | null) => {
  if (!type) return null;
  const labels: Record<string, string> = {
    team_build: "TEAM BUILD",
    diy: "DIY",
    contractor: "CONTRACTOR",
  };
  return labels[type] || type.replace(/_/g, " ").toUpperCase();
};

const Share = () => {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SharedVideo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSharedVideo = async () => {
      if (!id) { setError(true); setLoading(false); return; }
      try {
        const { data: json, error: fnError } = await supabase.functions.invoke(
          "get-shared-video",
          { body: { id } }
        );
        if (fnError || json?.error) throw new Error("Not found");
        setData(json);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchSharedVideo();
  }, [id]);

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/share/${id}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareUrl = `https://thevantage.co/share/${id}`;
  const ogTitle = data ? `${getTransformationLabel(data.transformation_type)} Transformation — The Vantage` : "Transformation Video — The Vantage";
  const ogDescription = "Watch this incredible before and after construction transformation video. Made with The Vantage.";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <>
        <Helmet><title>Not Found — The Vantage</title></Helmet>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
          <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            VIDEO NOT FOUND
          </h1>
          <p className="text-muted-foreground text-center max-w-md">
            This video may have been removed or made private by its creator.
          </p>
          <Button asChild className="mt-4">
            <Link to="/">GO TO HOMEPAGE</Link>
          </Button>
        </div>
      </>
    );
  }

  const buildLabel = getBuildLabel(data.build_type);

  return (
    <>
      <Helmet>
        <title>{ogTitle}</title>
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        {data.after_url && <meta property="og:image" content={data.after_url} />}
        <meta property="og:url" content={shareUrl} />
        <meta property="og:type" content="video.other" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        {data.after_url && <meta name="twitter:image" content={data.after_url} />}
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Minimal header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="The Vantage" className="h-8" />
          </Link>
          <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link to="/login?returnUrl=/video?mode=transform">
              Create your own <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </header>

        {/* Main content */}
        <main className="max-w-[640px] mx-auto px-4 py-8 md:py-12">
          {/* Badge */}
          <div className="text-center mb-2">
            <span
              className="inline-block text-[10px] tracking-[0.2em] text-primary font-semibold uppercase px-3 py-1 rounded-full border border-primary/30 bg-primary/10"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              ⚡ TRANSFORMATION VIDEO
            </span>
          </div>

          {/* Title */}
          <h1
            className="text-center text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-1"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            {getTransformationLabel(data.transformation_type)}
          </h1>

          {buildLabel && (
            <p
              className="text-center text-xs text-muted-foreground tracking-[0.15em] mb-6"
              style={{ fontFamily: "'Space Mono', monospace" }}
            >
              {buildLabel}
            </p>
          )}

          {/* Video player */}
          {data.video_url ? (
            <div className="relative w-full rounded-lg overflow-hidden bg-card border border-border mb-6">
              <div className="aspect-[9/16] max-h-[70vh] mx-auto">
                <video
                  src={data.video_url}
                  autoPlay
                  muted
                  loop
                  controls
                  playsInline
                  className="w-full h-full object-contain bg-black"
                />
              </div>
            </div>
          ) : (
            <div className="aspect-[9/16] max-h-[70vh] mx-auto bg-card rounded-lg border border-border flex items-center justify-center mb-6">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Before / After */}
          {(data.before_url || data.after_url) && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="space-y-1">
                <span
                  className="text-[10px] tracking-[0.15em] text-muted-foreground uppercase block"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  BEFORE
                </span>
                {data.before_url ? (
                  <img
                    src={data.before_url}
                    alt="Before"
                    className="w-full rounded-md object-cover aspect-[4/3] cursor-pointer hover:opacity-80 transition-opacity border border-border"
                    onClick={() => setFullscreenImage(data.before_url)}
                  />
                ) : (
                  <div className="w-full rounded-md bg-muted aspect-[4/3] flex items-center justify-center border border-border">
                    <span className="text-xs text-muted-foreground">No image</span>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <span
                  className="text-[10px] tracking-[0.15em] text-primary uppercase block"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  AFTER
                </span>
                {data.after_url ? (
                  <img
                    src={data.after_url}
                    alt="After"
                    className="w-full rounded-md object-cover aspect-[4/3] cursor-pointer hover:opacity-80 transition-opacity border border-border"
                    onClick={() => setFullscreenImage(data.after_url)}
                  />
                ) : (
                  <div className="w-full rounded-md bg-muted aspect-[4/3] flex items-center justify-center border border-border">
                    <span className="text-xs text-muted-foreground">No image</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Share actions */}
          <div className="flex flex-wrap gap-2 justify-center mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1.5 text-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1.5 text-xs"
            >
              <a href="https://www.tiktok.com/upload" target="_blank" rel="noopener noreferrer" title="Download first, then upload">
                📱 Share to TikTok
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1.5 text-xs"
            >
              <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" title="Download first, then upload">
                📸 Share to Instagram
              </a>
            </Button>
          </div>

          {/* View count */}
          <p className="text-center text-xs text-muted-foreground mb-10" style={{ fontFamily: "'Space Mono', monospace" }}>
            <Eye className="h-3.5 w-3.5 inline mr-1" />
            {data.share_views} views
          </p>

          {/* Conversion panel */}
          <div className="rounded-lg bg-primary p-6 md:p-8 text-center mb-10">
            <h2
              className="text-2xl md:text-3xl font-bold tracking-tight text-primary-foreground mb-2"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              WANT VIDEOS LIKE THIS?
            </h2>
            <p className="text-sm text-primary-foreground/80 mb-4 max-w-md mx-auto">
              Create cinematic transformation videos from your after photos. Powered by Kling 2.5 Turbo Pro. Ready in minutes.
            </p>
            <Button asChild size="lg" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-bold">
              <Link to="/login?returnUrl=/video?mode=transform">CREATE YOUR OWN VIDEO →</Link>
            </Button>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pb-8" style={{ fontFamily: "'Space Mono', monospace" }}>
            © 2025 The Vantage · thevantage.co
          </div>
        </main>

        {/* Fullscreen modal */}
        <Dialog open={!!fullscreenImage} onOpenChange={() => setFullscreenImage(null)}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden">
            {fullscreenImage && <img src={fullscreenImage} alt="Fullscreen" className="w-full h-auto" />}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Share;
