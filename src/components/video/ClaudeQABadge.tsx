import { useEffect, useRef, useState } from "react";
import { claudeReviewVideo, type QAResult } from "@/hooks/useClaudeQA";

interface ClaudeQABadgeProps {
  /** The finished clip/reel URL to review. */
  videoUrl: string;
  /** Optional source photos the clip was made from — sharpens the check. */
  sourcePhotoUrls?: string[];
  /** Called when the user clicks "Re-generate" on a flagged clip. */
  onReroll?: () => void;
  className?: string;
}

/**
 * Agentic QA badge. On mount it asks Claude to review a few frames of the
 * finished clip and renders a small verdict chip. If Claude flags a defect it
 * shows the issue(s) and a Re-generate button (via onReroll). Entirely
 * non-blocking and fail-safe: on "unavailable" it renders nothing, so a good
 * reel is never nagged and QA problems never disrupt the result view.
 */
export function ClaudeQABadge({ videoUrl, sourcePhotoUrls = [], onReroll, className }: ClaudeQABadgeProps) {
  const [state, setState] = useState<"checking" | QAResult["verdict"]>("checking");
  const [result, setResult] = useState<QAResult | null>(null);
  const ranFor = useRef<string | null>(null);

  useEffect(() => {
    if (!videoUrl || ranFor.current === videoUrl) return;
    ranFor.current = videoUrl;
    let alive = true;
    setState("checking");
    claudeReviewVideo(videoUrl, sourcePhotoUrls).then((r) => {
      if (!alive) return;
      setResult(r);
      setState(r.verdict);
    });
    return () => { alive = false; };
  }, [videoUrl, sourcePhotoUrls]);

  // Nothing to show when QA couldn't run — never a false alarm.
  if (state === "unavailable") return null;

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 12px",
    borderRadius: 999,
    fontFamily: "Inter, sans-serif",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.02em",
  };

  if (state === "checking") {
    return (
      <div className={className} style={{ ...base, background: "var(--lux-cream)", border: "1px solid var(--lux-hairline)", color: "var(--lux-ash)" }}>
        <span className="animate-pulse">◆</span> Claude is reviewing this clip…
      </div>
    );
  }

  if (state === "pass") {
    return (
      <div className={className} style={{ ...base, background: "rgba(46,110,66,0.10)", border: "1px solid rgba(46,110,66,0.30)", color: "#2E6E42" }}>
        <span>✓</span> Claude QA: clean{result?.score ? ` · ${result.score}/100` : ""}
      </div>
    );
  }

  // "review" — a defect was flagged.
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "12px 14px",
        borderRadius: 12,
        background: "rgba(140,63,46,0.06)",
        border: "1px solid rgba(140,63,46,0.28)",
        color: "var(--lux-ink)",
        fontFamily: "Inter, sans-serif",
        maxWidth: 420,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 12.5, color: "var(--lux-rust)" }}>
        <span>⚠</span> Claude flagged this clip for review
      </div>
      {result?.summary && (
        <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, color: "var(--lux-ink)", opacity: 0.9 }}>{result.summary}</p>
      )}
      {result?.issues?.length ? (
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, lineHeight: 1.5, color: "var(--lux-ink)", opacity: 0.85 }}>
          {result.issues.slice(0, 4).map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      ) : null}
      {onReroll && (
        <button
          onClick={onReroll}
          className="lux-eyebrow"
          style={{
            alignSelf: "flex-start",
            marginTop: 2,
            background: "var(--lux-rust)",
            color: "var(--lux-bone)",
            border: "none",
            padding: "9px 16px",
            borderRadius: 8,
            fontSize: 11,
            letterSpacing: "0.14em",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ↻ RE-GENERATE
        </button>
      )}
    </div>
  );
}

export default ClaudeQABadge;
