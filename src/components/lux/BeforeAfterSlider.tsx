import { useEffect, useRef, useState } from "react";

interface BeforeAfterSliderProps {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  caption?: string;
  ratio?: "16/9" | "9/16" | "4/5" | "1/1" | "21/9";
  initial?: number; // 0..100
  className?: string;
}

/**
 * Editorial before/after comparison slider.
 * Drag the handle (or hover) to reveal the AI-generated "before" beneath the photographer's "after".
 */
const BeforeAfterSlider = ({
  before,
  after,
  beforeLabel = "BEFORE",
  afterLabel = "AFTER",
  caption,
  ratio = "16/9",
  initial = 50,
  className = "",
}: BeforeAfterSliderProps) => {
  const [pos, setPos] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const ratioMap: Record<string, string> = {
    "16/9": "56.25%",
    "9/16": "177.78%",
    "4/5": "125%",
    "1/1": "100%",
    "21/9": "42.86%",
  };

  const updateFromClientX = (clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    setPos((x / rect.width) * 100);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => updateFromClientX(e.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging]);

  return (
    <figure className={`w-full ${className}`}>
      <div
        ref={wrapRef}
        className="relative w-full overflow-hidden lux-bg-cream select-none"
        style={{ paddingBottom: ratioMap[ratio] }}
        onPointerDown={(e) => {
          setDragging(true);
          updateFromClientX(e.clientX);
        }}
      >
        {/* AFTER image — photographer's polished shot, full underlay */}
        <img
          src={after}
          alt={afterLabel}
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />

        {/* BEFORE image — clipped to the left of the slider */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${pos}%` }}
        >
          <img
            src={before}
            alt={beforeLabel}
            draggable={false}
            className="absolute inset-0 h-full object-cover"
            style={{
              width: `${(100 / Math.max(pos, 0.01)) * 100}%`,
              minWidth: "100%",
            }}
            loading="lazy"
          />
        </div>

        {/* Labels */}
        <span
          className="absolute top-4 left-4 lux-eyebrow lux-text-bone"
          style={{ background: "rgba(14,14,12,0.62)", padding: "8px 12px", letterSpacing: "0.32em" }}
        >
          {beforeLabel}
        </span>
        <span
          className="absolute top-4 right-4 lux-eyebrow"
          style={{ background: "rgba(244,239,230,0.92)", color: "#0E0E0C", padding: "8px 12px", letterSpacing: "0.32em" }}
        >
          {afterLabel}
        </span>

        {/* Divider line + handle */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: `${pos}%`,
            width: 1,
            background: "rgba(244,239,230,0.85)",
            boxShadow: "0 0 0 0.5px rgba(14,14,12,0.2)",
            transform: "translateX(-0.5px)",
          }}
        >
          <button
            type="button"
            aria-label="Drag to compare"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 grid place-items-center"
            style={{
              width: 56,
              height: 56,
              borderRadius: 9999,
              background: "var(--lux-bone)",
              border: "1px solid var(--lux-hairline-strong)",
              boxShadow: "0 16px 32px -16px rgba(14,14,12,0.45)",
              cursor: dragging ? "grabbing" : "grab",
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              setDragging(true);
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M7 5L3 10L7 15" stroke="#0E0E0C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13 5L17 10L13 15" stroke="#0E0E0C" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      {caption && (
        <figcaption className="mt-5 lux-eyebrow lux-text-ash flex items-center gap-3" style={{ color: "var(--lux-ash)" }}>
          <span style={{ display: "inline-block", width: 24, height: 1, background: "var(--lux-hairline-strong)" }} />
          {caption}
        </figcaption>
      )}
    </figure>
  );
};

export default BeforeAfterSlider;
