import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

interface ReelClip {
  src: string;
  poster?: string;
  label: string;
  byline?: string;
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
            <video
              ref={videoRef}
              key={current.src}
              src={current.src}
              poster={current.poster}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              loop
              playsInline
              muted={muted}
              preload="metadata"
            />
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

        {/* Reel index list */}
        <div className="md:col-span-5 lux-hairline-t pt-4">
          {clips.map((c, i) => {
            const isActive = i === active;
            return (
              <button
                key={c.src}
                onClick={() => setActive(i)}
                className="w-full text-left flex items-center justify-between py-5 lux-hairline-b transition-colors group"
                style={{ borderBottom: "1px solid var(--lux-hairline)" }}
              >
                <div className="flex items-center gap-5">
                  <span
                    className="lux-eyebrow w-8 inline-block"
                    style={{ color: isActive ? "var(--lux-rust)" : "var(--lux-brass)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div
                      className="font-display text-lg md:text-xl"
                      style={{ color: isActive ? "var(--lux-rust)" : "var(--lux-ink)" }}
                    >
                      {c.label}
                    </div>
                    {c.byline && (
                      <div className="text-xs mt-1" style={{ color: "var(--lux-ash)", letterSpacing: "0.04em" }}>{c.byline}</div>
                    )}
                  </div>
                </div>
                <span
                  className="lux-eyebrow"
                  style={{ color: isActive ? "var(--lux-rust)" : "var(--lux-smoke)" }}
                >
                  {isActive ? "● PLAYING" : "↗"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VideoReel;
