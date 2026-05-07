import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

interface ReelClip {
  src: string;
  poster?: string;
  label: string;
  byline?: string;
  /** Optional fallback still image used when the video can't load (e.g. asset
   *  missing on Vercel deploy or upstream timeout). */
  fallback?: string;
}

interface VideoReelProps {
  clips: ReelClip[];
  className?: string;
  eyebrow?: string;
  title?: string;
}

/**
 * Cinematic vertical reel — auto-plays, muted by default. Premium controls.
 * Used in homepage and real-estate page hero showcase.
 */
const VideoReel = ({ clips, className = "", eyebrow = "FILM REEL", title = "Recently delivered" }: VideoReelProps) => {
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [failedSrcs, setFailedSrcs] = useState<Record<string, boolean>>({});
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (playing) v.play().catch(() => {});
    else v.pause();
  }, [muted, playing, active]);

  const next = () => setActive((i) => (i + 1) % clips.length);
  const prev = () => setActive((i) => (i - 1 + clips.length) % clips.length);

  const current = clips[active];

  return (
    <div className={className}>
      <div className="flex items-end justify-between mb-8 gap-6">
        <div>
          <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-brass)" }}>{eyebrow}</div>
          <h3 className="lux-display text-3xl md:text-4xl">{title}</h3>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={prev}
            className="lux-eyebrow w-10 h-10 grid place-items-center border lux-hairline hover:bg-ink hover:text-bone transition-colors"
            aria-label="Previous clip"
          >
            ←
          </button>
          <button
            onClick={next}
            className="lux-eyebrow w-10 h-10 grid place-items-center border lux-hairline hover:bg-ink hover:text-bone transition-colors"
            aria-label="Next clip"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-6 md:gap-8 items-start">
        {/* Active clip — large vertical 9:16 */}
        <div className="md:col-span-7">
          <div
            className="relative w-full overflow-hidden lux-bg-ink"
            style={{ paddingBottom: "56.25%", boxShadow: "var(--lux-shadow-deep)" }}
          >
            {failedSrcs[current.src] ? (
              <img
                src={current.fallback ?? current.poster ?? ""}
                alt={current.label}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <video
                ref={videoRef}
                key={current.src}
                src={current.src}
                poster={current.poster ?? current.fallback}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                loop
                playsInline
                muted={muted}
                preload="metadata"
                onError={() =>
                  setFailedSrcs((m) => ({ ...m, [current.src]: true }))
                }
                onStalled={() =>
                  setFailedSrcs((m) => ({ ...m, [current.src]: true }))
                }
              />
            )}
            {/* Bottom hairline overlay */}
            <div className="absolute inset-x-0 bottom-0 p-5 md:p-7 flex items-end justify-between"
              style={{ background: "linear-gradient(to top, rgba(14,14,12,0.78) 0%, rgba(14,14,12,0) 100%)" }}
            >
              <div>
                <div className="lux-eyebrow" style={{ color: "rgba(244,239,230,0.7)" }}>Now playing</div>
                <div className="font-display text-xl md:text-2xl mt-2" style={{ color: "var(--lux-bone)" }}>{current.label}</div>
                {current.byline && (
                  <div className="lux-eyebrow mt-2" style={{ color: "var(--lux-champagne)" }}>{current.byline}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPlaying((p) => !p)}
                  className="w-10 h-10 grid place-items-center border"
                  style={{ borderColor: "rgba(244,239,230,0.4)", color: "var(--lux-bone)" }}
                  aria-label={playing ? "Pause" : "Play"}
                >
                  {playing ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button
                  onClick={() => setMuted((m) => !m)}
                  className="w-10 h-10 grid place-items-center border"
                  style={{ borderColor: "rgba(244,239,230,0.4)", color: "var(--lux-bone)" }}
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Reel index list — every row is a click-to-play button. Theme is
            locked for the dark-ink background this reel always renders on
            (Index.tsx + RealEstatePhotographers.tsx wrap it in lux-bg-ink).
            On bone backgrounds the colours flip via the optional bg prop
            wrap below. */}
        <div className="md:col-span-5 pt-4" style={{ borderTop: "1px solid rgba(244,239,230,0.18)" }}>
          {clips.map((c, i) => {
            const isActive = i === active;
            return (
              <button
                key={c.src}
                onClick={() => setActive(i)}
                className="w-full text-left flex items-center justify-between py-5 transition-colors group cursor-pointer"
                style={{
                  borderBottom: "1px solid rgba(244,239,230,0.14)",
                  background: isActive ? "rgba(140,63,46,0.08)" : "transparent",
                  paddingLeft: 12,
                  paddingRight: 12,
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(244,239,230,0.04)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <div className="flex items-center gap-5">
                  <span
                    className="lux-eyebrow w-8 inline-block"
                    style={{
                      color: isActive ? "var(--lux-champagne)" : "var(--lux-brass)",
                      fontWeight: 700,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div
                      className="font-display text-lg md:text-xl transition-colors"
                      style={{
                        color: isActive ? "var(--lux-champagne)" : "var(--lux-bone)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {c.label}
                    </div>
                    {c.byline && (
                      <div
                        className="lux-eyebrow mt-1.5 transition-colors"
                        style={{
                          color: isActive ? "rgba(244,239,230,0.85)" : "rgba(244,239,230,0.62)",
                          fontSize: "0.62rem",
                          letterSpacing: "0.16em",
                          fontWeight: 600,
                        }}
                      >
                        {c.byline}
                      </div>
                    )}
                  </div>
                </div>
                <span
                  className="lux-eyebrow inline-flex items-center gap-1.5 transition-transform group-hover:translate-x-1"
                  style={{
                    color: isActive ? "var(--lux-champagne)" : "var(--lux-bone)",
                    opacity: isActive ? 1 : 0.7,
                    fontSize: "0.62rem",
                    letterSpacing: "0.18em",
                    fontWeight: 700,
                  }}
                >
                  {isActive ? (
                    <>
                      <span
                        style={{
                          width: 6, height: 6,
                          borderRadius: 9999,
                          background: "var(--lux-champagne)",
                          animation: "pulse 1.6s ease-in-out infinite",
                        }}
                      />
                      PLAYING
                    </>
                  ) : (
                    <>PLAY →</>
                  )}
                </span>
              </button>
            );
          })}
          <p
            className="lux-eyebrow mt-5 text-center"
            style={{
              color: "rgba(244,239,230,0.5)",
              fontSize: "0.58rem",
              letterSpacing: "0.22em",
              fontWeight: 600,
            }}
          >
            ↑ TAP ANY TITLE TO PLAY
          </p>
        </div>

        {/* Pulse keyframes for the playing dot */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0.35; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default VideoReel;
