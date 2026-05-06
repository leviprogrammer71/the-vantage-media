import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useCredits";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  Download,
  Trash2,
  Copy,
  Coins,
  AlertCircle,
  Film,
  Share2,
  Check,
  RefreshCw,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import ReferralNudge from "@/components/ReferralNudge";

interface Submission {
  id: string;
  transformation_type: string;
  build_type: string | null;
  video_style: string;
  project_description: string;
  status: string;
  prompt_status: string;
  output_video_url: string | null;
  output_video_path: string | null;
  generated_before_image_path: string | null;
  before_photo_paths: string[] | null;
  after_photo_paths: string[] | null;
  generated_video_prompt: string | null;
  video_type: string | null;
  is_public: boolean | null;
  created_at: string;
}

interface SignedUrls {
  [key: string]: string;
}

// Defensive resolver. Accepts:
//  - a full http(s) URL (already signed or public) → passthrough
//  - a `bucket/path/to/file.ext` style key → tries the named bucket first
//  - a bare path like `userId/timestamp/file.ext` → tries project-submissions
//    then property-photos (listing flow uploads land in property-photos)
async function signPath(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;

  // Already a URL? Just use it. (Listing flow stores signed URLs in
  // after_photo_paths after stripping query params.)
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const buckets = ["project-submissions", "property-photos"];
  for (const bucket of buckets) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600);
      if (!error && data?.signedUrl) return data.signedUrl;
    } catch {
      // try next bucket
    }
  }
  return null;
}

// Download from a storage path or full URL. Works on desktop, Android, and iOS.
// On iOS we prefer the Web Share API (Files / Photos integration) over a blob
// click, since iOS Safari ignores the `download` attribute.
async function downloadFile(pathOrUrl: string, filename: string) {
  const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isMobile = isiOS || /Android/i.test(navigator.userAgent);

  // 1. Get the actual bytes. Try our two buckets if it's a path; just fetch if it's a URL.
  let blob: Blob | null = null;
  try {
    if (pathOrUrl.startsWith("http")) {
      const res = await fetch(pathOrUrl);
      if (res.ok) blob = await res.blob();
    } else {
      for (const bucket of ["project-submissions", "property-photos"]) {
        const { data } = await supabase.storage.from(bucket).download(pathOrUrl);
        if (data) {
          blob = data;
          break;
        }
      }
    }
  } catch {
    /* fall through */
  }

  // 2. iOS Safari: Web Share API gives the user a real Save-to-Files / Save-to-Photos sheet.
  if (isiOS && blob && (navigator as any).canShare) {
    try {
      const file = new File([blob], filename, { type: blob.type || "video/mp4" });
      const shareData = { files: [file], title: filename } as any;
      if ((navigator as any).canShare(shareData)) {
        await (navigator as any).share(shareData);
        return;
      }
    } catch {
      /* fall through to anchor click */
    }
  }

  // 3. Anchor with download attribute — works on desktop and Android Chrome.
  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);

    // iOS without Web Share — open the blob in a new tab so user can long-press to save.
    if (isiOS) window.open(url, "_blank");
    return;
  }

  // 4. Last-resort fallback: signed URL with download disposition, opened in a new tab.
  if (!pathOrUrl.startsWith("http")) {
    for (const bucket of ["project-submissions", "property-photos"]) {
      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrl(pathOrUrl, 300, { download: filename });
      if (data?.signedUrl) {
        if (isMobile) window.open(data.signedUrl, "_blank");
        else {
          const a = document.createElement("a");
          a.href = data.signedUrl;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        return;
      }
    }
  }

  toast({ title: "Error", description: "Download failed — try opening the video and long-pressing to save", variant: "destructive" });
}

const getStatusBadge = (status: string, promptStatus: string) => {
  if (promptStatus === "error" || status === "error") {
    return { label: "FAILED", className: "bg-destructive/20 text-destructive border-destructive/30" };
  }
  if (promptStatus === "complete" || status === "delivered") {
    return { label: "✅ READY", className: "bg-green-500/20 text-green-600 border-green-500/30" };
  }
  if (promptStatus === "generating" || status === "in progress") {
    return { label: "GENERATING ⟳", className: "bg-amber-500/20 text-amber-600 border-amber-500/30 animate-pulse" };
  }
  return { label: "PROCESSING", className: "bg-muted text-muted-foreground border-border" };
};

const Gallery = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { credits } = useCredits();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedUrls, setSignedUrls] = useState<SignedUrls>({});
  const [signingUrls, setSigningUrls] = useState(true);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [videoErrors, setVideoErrors] = useState<Record<string, boolean>>({});

  // Re-sign a single submission's video URL — used when a video <video> tag
  // fails (signed URL probably expired) to recover without a full reload.
  const refreshVideoUrl = useCallback(async (submission: Submission) => {
    const newUrl = submission.output_video_path
      ? await signPath(submission.output_video_path)
      : submission.output_video_url ?? null;
    if (newUrl) {
      setSignedUrls((prev) => ({ ...prev, [`video-${submission.id}`]: newUrl }));
      setVideoErrors((prev) => ({ ...prev, [submission.id]: false }));
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/login?redirect=/gallery");
    }
  }, [user, authLoading, navigate]);

  const fetchSubmissions = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSubmissions(data || []);
    } catch (err) {
      console.error("Error fetching submissions:", err);
      toast({ title: "Error", description: "Failed to load gallery", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("user-submissions")
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "submissions",
        filter: `user_id=eq.${user.id}`,
      }, async (payload: any) => {
        const updated = payload.new as Submission;
        setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
        if (updated.output_video_path && updated.prompt_status === "complete") {
          const videoUrl = await signPath(updated.output_video_path);
          if (videoUrl) setSignedUrls((prev) => ({ ...prev, [`video-${updated.id}`]: videoUrl }));
          toast({ title: "✅ Your video is ready!" });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Sign URLs
  useEffect(() => {
    const signAllUrls = async () => {
      setSigningUrls(true);
      const urlMap: SignedUrls = {};
      const tasks: Promise<void>[] = [];
      for (const s of submissions) {
        if (s.generated_before_image_path) {
          tasks.push(signPath(s.generated_before_image_path).then((url) => { if (url) urlMap[`gen-before-${s.id}`] = url; }));
        }
        if (s.before_photo_paths?.[0]) {
          tasks.push(signPath(s.before_photo_paths[0]).then((url) => { if (url) urlMap[`before-${s.id}`] = url; }));
        }
        if (s.after_photo_paths?.[0]) {
          tasks.push(signPath(s.after_photo_paths[0]).then((url) => { if (url) urlMap[`after-${s.id}`] = url; }));
        }
        // Prefer the saved URL (listing flow stores a Replicate URL or signed
        // URL directly). Fall back to signing the storage path.
        if (s.output_video_url) {
          urlMap[`video-${s.id}`] = s.output_video_url;
        } else if (s.output_video_path) {
          tasks.push(signPath(s.output_video_path).then((url) => { if (url) urlMap[`video-${s.id}`] = url; }));
        }
      }
      await Promise.all(tasks);
      setSignedUrls(urlMap);
      setSigningUrls(false);
    };
    if (submissions.length > 0) signAllUrls();
    else setSigningUrls(false);
  }, [submissions]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("submissions").delete().eq("id", id);
      if (error) throw error;
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Deleted", description: "Submission removed" });
    } catch (err) {
      console.error("Delete error:", err);
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  };

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast({ title: "Copied", description: "Video prompt copied to clipboard" });
  };

  const getTransformationLabel = (type: string) => {
    const labels: Record<string, string> = {
      backyard_outdoor: "Backyard / Outdoor", full_home: "Full Home", interior_room: "Interior Room",
      pool_water: "Pool / Water", kitchen_bathroom: "Kitchen/Bath", landscaping: "Landscaping",
      exterior: "Exterior", interior: "Interior",
    };
    return labels[type] || type.replace(/_/g, " ");
  };

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-live="polite" aria-label="Loading gallery"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <Helmet><title>My Gallery — The Vantage</title></Helmet>
      <div className="min-h-screen bg-background">
        <LuxuryHeader variant="bone" />
        <main id="main-content" className="container mx-auto px-4 py-8 pt-24">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>MY GALLERY</h1>
              <p className="text-muted-foreground mt-1 text-sm">Your videos, before images, and after photos.</p>
            </div>
            <Link to="/pricing">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer">
                <Coins className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">{credits ?? 0} credits</span>
              </div>
            </Link>
          </div>

          <ReferralNudge className="mb-8" />

          {/* Loading skeleton */}
          {loading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-video w-full" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </Card>
              ))}
            </div>
          ) : submissions.length === 0 ? (
            /* Empty state */
            <Card className="p-12">
              <div className="text-center">
                <div className="text-6xl mb-4">🎬</div>
                <h2 className="text-xl font-bold mb-2 tracking-tight" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>NO VIDEOS YET</h2>
                {credits !== null && credits > 0 ? (
                  <>
                    <p className="text-primary font-bold text-lg mb-1" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                      You have {credits} credits ready.
                    </p>
                    <p className="text-muted-foreground mb-6 text-sm max-w-sm mx-auto">Use them to create your first video.</p>
                  </>
                ) : (
                  <p className="text-muted-foreground mb-6 text-sm max-w-sm mx-auto">Your transformation videos will appear here.</p>
                )}
                <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link to="/video?mode=transform">CREATE YOUR FIRST VIDEO →</Link>
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {submissions.map((submission) => {
                const isListing = submission.video_type === "listing";
                const beforeUrl = signedUrls[`gen-before-${submission.id}`] ?? signedUrls[`before-${submission.id}`];
                const afterUrl = signedUrls[`after-${submission.id}`];
                const videoUrl = signedUrls[`video-${submission.id}`];
                const hasVideo = Boolean(videoUrl);
                const isGenerating = submission.prompt_status === "generating" || submission.status === "in progress";
                const isError = submission.prompt_status === "error";
                const statusBadge = getStatusBadge(submission.status, submission.prompt_status);

                return (
                  <Card key={submission.id} className={`overflow-hidden ${isError ? "border-destructive/50" : ""}`}>
                    {/* Video / Status */}
                    <div className="relative aspect-video bg-muted">
                      {hasVideo && !videoErrors[submission.id] ? (
                        <video
                          src={videoUrl}
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="w-full h-full object-cover"
                          controls
                          onError={() => setVideoErrors((prev) => ({ ...prev, [submission.id]: true }))}
                        />
                      ) : hasVideo && videoErrors[submission.id] ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-card p-4 text-center">
                          <Film className="h-8 w-8 text-muted-foreground/50" />
                          <p className="text-xs text-muted-foreground">Preview unavailable. Try refreshing the link or downloading directly.</p>
                          <Button size="sm" variant="outline" onClick={() => refreshVideoUrl(submission)} className="gap-1.5 text-xs">
                            <RefreshCw className="h-3 w-3" /> Refresh link
                          </Button>
                        </div>
                      ) : isGenerating ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-card">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="text-sm font-mono text-primary font-semibold animate-pulse">GENERATING...</p>
                          <p className="text-xs text-muted-foreground">This takes 3-5 minutes</p>
                        </div>
                      ) : isError ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-card">
                          <AlertCircle className="h-8 w-8 text-destructive" />
                          <p className="text-sm font-mono text-destructive font-semibold">GENERATION FAILED</p>
                        </div>
                      ) : signingUrls ? (
                        <Skeleton className="w-full h-full" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-card">
                          <Film className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Images */}
                    {isListing ? (
                      afterUrl && (
                        <div className="p-3 space-y-1">
                          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Source Photo</span>
                          <img src={afterUrl} alt="Source" className="w-full rounded-md object-cover aspect-[4/3] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setFullscreenImage(afterUrl)} />
                        </div>
                      )
                    ) : (
                      (beforeUrl || afterUrl) && (
                        <div className="grid grid-cols-2 gap-px bg-border">
                          <div className="bg-background p-3 space-y-1">
                            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">Before</span>
                            {beforeUrl ? (
                              <img src={beforeUrl} alt={`${getTransformationLabel(submission.transformation_type)} transformation - before state`} width={400} height={300} loading="lazy" className="w-full rounded-md object-cover aspect-[4/3] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setFullscreenImage(beforeUrl)} />
                            ) : (
                              <div className="w-full rounded-md bg-muted aspect-[4/3] flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">No before image</span>
                              </div>
                            )}
                          </div>
                          <div className="bg-background p-3 space-y-1">
                            <span className="text-[10px] font-mono text-primary uppercase tracking-widest">After</span>
                            {afterUrl ? (
                              <img src={afterUrl} alt={`${getTransformationLabel(submission.transformation_type)} transformation - after result`} width={400} height={300} loading="lazy" className="w-full rounded-md object-cover aspect-[4/3] cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setFullscreenImage(afterUrl)} />
                            ) : (
                              <div className="w-full rounded-md bg-muted aspect-[4/3] flex items-center justify-center">
                                <span className="text-xs text-muted-foreground">No after image</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}

                    {/* Info */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="secondary"
                          className={isListing ? "text-[10px] bg-muted text-foreground" : "text-[10px] bg-primary/20 text-primary border-primary/30"}
                        >
                          {isListing ? "LISTING VIDEO" : "TRANSFORMATION"}
                        </Badge>
                        <span className="text-xs font-mono text-primary font-semibold">
                          {getTransformationLabel(submission.transformation_type)}
                        </span>
                        <Badge className={`text-[10px] border ${statusBadge.className}`}>
                          {statusBadge.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(submission.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </p>

                      <div className="flex gap-2 pt-1 flex-wrap">
                        {(submission.output_video_path || submission.output_video_url) && (
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                            onClick={() => downloadFile(
                              submission.output_video_path || submission.output_video_url!,
                              `vantage-${submission.video_type || "video"}-${submission.id}.mp4`
                            )}>
                            <Download className="h-3.5 w-3.5" /> Video
                          </Button>
                        )}
                        {submission.generated_before_image_path && (
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                            onClick={() => downloadFile(submission.generated_before_image_path!, `vantage-before-${submission.id}.jpg`)}>
                            <Download className="h-3.5 w-3.5" /> Before
                          </Button>
                        )}
                        {submission.after_photo_paths?.[0] && (
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                            onClick={() => downloadFile(submission.after_photo_paths![0], `vantage-after-${submission.id}.jpg`)}>
                            <Download className="h-3.5 w-3.5" /> After
                          </Button>
                        )}
                        {submission.generated_video_prompt && (
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                            onClick={() => handleCopyPrompt(submission.generated_video_prompt!)}>
                            <Copy className="h-3.5 w-3.5" /> Prompt
                          </Button>
                        )}
                        {submission.output_video_path && (
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs"
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/share/${submission.id}`);
                              toast({ title: "Link copied!", description: "Share it anywhere." });
                            }}>
                            <Share2 className="h-3.5 w-3.5" /> Share
                          </Button>
                        )}
                        {/* Regenerate button */}
                        {(submission.status === "delivered" || isError) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10"
                            onClick={() => {
                              const params = new URLSearchParams({
                                mode: "transform",
                                type: submission.transformation_type,
                                ...(submission.build_type ? { build: submission.build_type } : {}),
                              });
                              navigate(`/video?${params.toString()}`);
                            }}
                          >
                            <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-destructive hover:text-destructive ml-auto"
                          onClick={() => setDeleteConfirmId(submission.id)} disabled={deletingId === submission.id}>
                          {deletingId === submission.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                      {/* Public share toggle */}
                      {submission.output_video_path && (
                        <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
                          <span className="text-[10px] text-muted-foreground" style={{ fontFamily: "'Space Mono', monospace" }}>
                            Public share
                          </span>
                          <Switch
                            checked={submission.is_public !== false}
                            onCheckedChange={async (checked) => {
                              try {
                                await supabase
                                  .from("submissions")
                                  .update({ is_public: checked })
                                  .eq("id", submission.id);
                                setSubmissions((prev) =>
                                  prev.map((s) => s.id === submission.id ? { ...s, is_public: checked } : s)
                                );
                                toast({
                                  title: checked ? "Video is now public" : "Video is now private",
                                  description: checked ? "Anyone with the link can view it." : "Share link is disabled.",
                                });
                              } catch {
                                toast({ title: "Error", description: "Failed to update", variant: "destructive" });
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
        <LuxuryFooter />

        <Dialog open={!!fullscreenImage} onOpenChange={() => setFullscreenImage(null)}>
          <DialogContent className="max-w-3xl p-1 overflow-hidden">
            {fullscreenImage && (
              <div className="relative">
                <img src={fullscreenImage} alt="Fullscreen" className="w-full h-auto rounded" />
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute bottom-3 right-3 gap-1.5"
                  onClick={() => {
                    const a = document.createElement("a");
                    a.href = fullscreenImage;
                    a.target = "_blank";
                    a.rel = "noopener";
                    a.click();
                  }}
                >
                  <Download className="h-4 w-4" /> Save
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this transformation?</AlertDialogTitle>
              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default Gallery;
