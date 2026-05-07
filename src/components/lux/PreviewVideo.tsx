import { useEffect, useRef, useState } from "react";

interface PreviewVideoProps {
  /** mp4 url */
  src: string;
  /** still-image fallback rendered behind the video — also used as the
   *  video element's poster, and as the visual when the video can't load
   *  or is still buffering. Required so cards never render black. */
  poster: string;
  alt: string;
  className?: string;
  /** Tailwind/inline class for the container's aspect ratio */
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
  /** Only start loading the video when it scrolls into view. Default: true.
   *  Avoids loading 6+ videos on homepage initial paint. */
  lazy?: boolean;
}

/**
 * Drop-in replacement for `<video autoPlay muted loop>` that solves the
 * black-flash issue we kept hitting on the homepage product cards.
 *
 * How it works:
 *  1. Static poster IMG renders at z-index 1, full opacity, always visible.
 *  2. Video renders at z-index 2 with opacity 0 by default.
 *  3. When the video fires `canplay`, fade opacity to 1 over 350ms.
 *  4. If the video errors or never reaches canplay, the poster stays visible.
 *  5. With `lazy={true}`, the video src is only set once the element is in
 *     the viewport — saves bandwidth on homepages with many cards.
 */
export default function PreviewVideo({
  src,
  poster,
  alt,
  className = "",
  containerClassName = "",
  containerStyle,
  lazy = true,
}: PreviewVideoProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(!lazy);
  const [ready, setReady] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (!lazy || shouldLoad) return;
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShouldLoad(true);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [lazy, shouldLoad]);

  return (
    <div
      ref={wrapRef}
      className={`relative overflow-hidden ${containerClassName}`}
      style={containerStyle}
    >
      {/* Poster — always rendered behind, always visible until video fades in */}
      <img
        src={poster}
        alt={alt}
        loading="lazy"
        className={`absolute inset-0 w-full h-full object-cover ${className}`}
      />

      {/* Video — fades in over the poster once it can play */}
      {shouldLoad && !errored && (
        <video
          src={src}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onCanPlay={() => setReady(true)}
          onError={() => setErrored(true)}
          onStalled={() => setErrored(true)}
          className={`absolute inset-0 w-full h-full object-cover ${className}`}
          style={{
            opacity: ready ? 1 : 0,
            transition: "opacity 350ms ease-out",
          }}
        />
      )}
    </div>
  );
}
