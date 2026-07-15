import { useEffect, useRef, useState } from "react";

/**
 * LazyVideo — defers video network load until the element is near the
 * viewport, then autoplays muted + looping.
 *
 * Why: the homepage and landing pages render a dozen+ autoplay <video>
 * tags. With raw <video autoPlay> every one of them begins downloading on
 * page load, saturating the connection and pushing out the metrics that
 * matter (LCP, total blocking, time-to-interactive). This component holds
 * back the `src` until an IntersectionObserver says the tile is within
 * ~300px of the viewport, then attaches it and plays. Offscreen videos
 * cost nothing until the user scrolls to them.
 *
 * Drop-in replacement for a muted autoplay loop:
 *   <video src={x} autoPlay muted loop playsInline className=… />
 *   →  <LazyVideo src={x} className=… />
 */
interface LazyVideoProps {
  src: string;
  poster?: string;
  className?: string;
  style?: React.CSSProperties;
  /** Root margin for the observer — how early to start loading. */
  rootMargin?: string;
  /** object-fit for the inner video. Defaults to "cover". */
  fit?: "cover" | "contain";
}

export default function LazyVideo({
  src,
  poster,
  className,
  style,
  rootMargin = "300px",
  fit = "cover",
}: LazyVideoProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // If IntersectionObserver isn't available (very old browser), just
    // load eagerly so nothing silently fails to render.
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin]);

  // Once visible, attach src + play. Autoplay can be blocked; ignore.
  useEffect(() => {
    if (!visible) return;
    const v = videoRef.current;
    if (!v) return;
    v.play().catch(() => {/* autoplay may be blocked — poster stays */});
  }, [visible]);

  // The wrapper takes the caller's className (typically "absolute inset-0
  // w-full h-full") which makes it a positioning context for the inner
  // <video>. We do NOT force an inline position so the className's
  // absolute/relative wins.
  return (
    <div ref={containerRef} className={className} style={style}>
      <video
        ref={videoRef}
        src={visible ? src : undefined}
        poster={poster}
        muted
        loop
        playsInline
        preload={visible ? "metadata" : "none"}
        className={`absolute inset-0 w-full h-full ${fit === "contain" ? "object-contain" : "object-cover"}`}
      />
    </div>
  );
}
