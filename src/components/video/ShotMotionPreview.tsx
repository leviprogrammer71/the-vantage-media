import type { ShotType } from "@/lib/shot-types";

/**
 * ShotMotionPreview — animated SVG indicator that shows what each camera
 * move *does* without requiring a preview video file.
 *
 * Each shot type renders a stylized "viewport" rectangle (the frame the
 * camera sees) plus an animated arrow or transform that illustrates the
 * direction and character of the move. Loops continuously so the user can
 * read it at a glance.
 *
 * Why: we previously relied on /public/vantage/animate-single/{id}.mp4 for
 * each shot, but those files were never dropped, so every card rendered
 * as a black panel. This component fixes that with no asset dependency.
 */

interface Props {
  shotId: ShotType;
  isSelected: boolean;
}

const COLORS = {
  // Stroke (the "frame" outline + arrows)
  ink: "#F4EFE6", // bone on ink card / ink on bone card (set via CSS)
  champagne: "#C9A96E",
  rust: "#A85D3A",
};

export function ShotMotionPreview({ shotId, isSelected }: Props) {
  // Color tokens flip based on selection state — keep the indicator
  // legible regardless of card background.
  const stroke = isSelected ? COLORS.champagne : COLORS.champagne;
  const accent = isSelected ? COLORS.rust : COLORS.rust;
  const frameStroke = isSelected ? "rgba(244,239,230,0.4)" : "rgba(244,239,230,0.55)";

  return (
    <svg
      viewBox="0 0 240 320"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
      aria-hidden="true"
    >
      {/* Background frame: stylized 9:16 viewport so all cards share
          a consistent "you're looking through a camera" metaphor. */}
      <rect
        x="50"
        y="40"
        width="140"
        height="240"
        rx="4"
        ry="4"
        fill="none"
        stroke={frameStroke}
        strokeWidth="1.5"
      />
      <text
        x="120"
        y="305"
        textAnchor="middle"
        fill={frameStroke}
        fontFamily="'Inter', sans-serif"
        fontSize="9"
        letterSpacing="2"
        style={{ textTransform: "uppercase" }}
      >
        Camera Path
      </text>

      {renderMotion(shotId, stroke, accent)}
    </svg>
  );
}

// Each motion is a small animated SVG composition. Animations use SMIL
// (<animate> + <animateTransform>) so they play on every browser without
// extra JS — and they loop forever so the user always sees the preview.
function renderMotion(shotId: ShotType, stroke: string, accent: string) {
  const dur = "2.4s";

  switch (shotId) {
    // ── LINEAR ───────────────────────────────────────────────────────
    case "push_in":
      return (
        <g>
          {/* Outer → inner rectangle zooming in (push) */}
          <rect x="70" y="60" width="100" height="200" rx="3" fill="none" stroke={accent} strokeWidth="1.5">
            <animate attributeName="x" values="70;105" dur={dur} repeatCount="indefinite" />
            <animate attributeName="y" values="60;120" dur={dur} repeatCount="indefinite" />
            <animate attributeName="width" values="100;30" dur={dur} repeatCount="indefinite" />
            <animate attributeName="height" values="200;80" dur={dur} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.85;0.15" dur={dur} repeatCount="indefinite" />
          </rect>
          {/* Center forward arrow */}
          <g transform="translate(120 160)" stroke={stroke} strokeWidth="2.5" fill="none" strokeLinecap="round">
            <line x1="0" y1="0" x2="0" y2="-40" />
            <polyline points="-8,-32 0,-40 8,-32" />
          </g>
          <text x="120" y="220" textAnchor="middle" fill={stroke} fontSize="11" letterSpacing="1.5" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>Push In</text>
        </g>
      );

    case "pull_out":
      return (
        <g>
          <rect x="105" y="120" width="30" height="80" rx="2" fill="none" stroke={accent} strokeWidth="1.5">
            <animate attributeName="x" values="105;70" dur={dur} repeatCount="indefinite" />
            <animate attributeName="y" values="120;60" dur={dur} repeatCount="indefinite" />
            <animate attributeName="width" values="30;100" dur={dur} repeatCount="indefinite" />
            <animate attributeName="height" values="80;200" dur={dur} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.85;0.15" dur={dur} repeatCount="indefinite" />
          </rect>
          <g transform="translate(120 160)" stroke={stroke} strokeWidth="2.5" fill="none" strokeLinecap="round">
            <line x1="0" y1="-40" x2="0" y2="0" />
            <polyline points="-8,-8 0,0 8,-8" />
          </g>
          <text x="120" y="220" textAnchor="middle" fill={stroke} fontSize="11" letterSpacing="1.5" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>Pull Out</text>
        </g>
      );

    case "establishing":
      return (
        <g>
          {/* Tight detail → wide master */}
          <rect x="100" y="140" width="40" height="40" rx="2" fill="none" stroke={accent} strokeWidth="1.5">
            <animate attributeName="x" values="100;60" dur="3s" repeatCount="indefinite" />
            <animate attributeName="y" values="140;70" dur="3s" repeatCount="indefinite" />
            <animate attributeName="width" values="40;120" dur="3s" repeatCount="indefinite" />
            <animate attributeName="height" values="40;180" dur="3s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.9;0.2" dur="3s" repeatCount="indefinite" />
          </rect>
          <g transform="translate(120 160)" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round">
            <line x1="-22" y1="-22" x2="-32" y2="-32" /><polyline points="-32,-22 -32,-32 -22,-32" />
            <line x1="22" y1="-22" x2="32" y2="-32" /><polyline points="22,-32 32,-32 32,-22" />
            <line x1="-22" y1="22" x2="-32" y2="32" /><polyline points="-32,22 -32,32 -22,32" />
            <line x1="22" y1="22" x2="32" y2="32" /><polyline points="32,22 32,32 22,32" />
          </g>
          <text x="120" y="220" textAnchor="middle" fill={stroke} fontSize="11" letterSpacing="1.5" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>Wide Reveal</text>
        </g>
      );

    // ── LATERAL ──────────────────────────────────────────────────────
    case "truck_left":
    case "slide_left":
      return (
        <g>
          {/* Camera body marker sliding right→left */}
          <g stroke={accent} strokeWidth="1.5" fill="none">
            <line x1="60" y1="160" x2="180" y2="160" strokeDasharray="4 4" opacity="0.5" />
          </g>
          <g transform="translate(180 160)">
            <animateTransform attributeName="transform" type="translate" values="180 160; 60 160; 180 160" dur="3.6s" repeatCount="indefinite" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
            <rect x="-14" y="-10" width="28" height="20" rx="2" fill="none" stroke={accent} strokeWidth="1.5" />
            <circle cx="0" cy="0" r="4" fill={accent} />
          </g>
          <g transform="translate(120 200)" stroke={stroke} strokeWidth="2.5" fill="none" strokeLinecap="round">
            <line x1="-30" y1="0" x2="30" y2="0" />
            <polyline points="-22,-8 -30,0 -22,8" />
          </g>
          <text x="120" y="240" textAnchor="middle" fill={stroke} fontSize="11" letterSpacing="1.5" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>{shotId === "slide_left" ? "Slide Left" : "Truck Left"}</text>
        </g>
      );

    case "truck_right":
    case "slide_right":
      return (
        <g>
          <g stroke={accent} strokeWidth="1.5" fill="none">
            <line x1="60" y1="160" x2="180" y2="160" strokeDasharray="4 4" opacity="0.5" />
          </g>
          <g transform="translate(60 160)">
            <animateTransform attributeName="transform" type="translate" values="60 160; 180 160; 60 160" dur="3.6s" repeatCount="indefinite" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
            <rect x="-14" y="-10" width="28" height="20" rx="2" fill="none" stroke={accent} strokeWidth="1.5" />
            <circle cx="0" cy="0" r="4" fill={accent} />
          </g>
          <g transform="translate(120 200)" stroke={stroke} strokeWidth="2.5" fill="none" strokeLinecap="round">
            <line x1="-30" y1="0" x2="30" y2="0" />
            <polyline points="22,-8 30,0 22,8" />
          </g>
          <text x="120" y="240" textAnchor="middle" fill={stroke} fontSize="11" letterSpacing="1.5" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>{shotId === "slide_right" ? "Slide Right" : "Truck Right"}</text>
        </g>
      );

    case "pan_left":
      return (
        <g>
          {/* Stationary camera (filled circle), rotating sight-line */}
          <circle cx="120" cy="200" r="8" fill={accent} />
          <g transform="translate(120 200)" stroke={accent} strokeWidth="1.5" fill="none">
            <line x1="0" y1="0" x2="0" y2="-90">
              <animateTransform attributeName="transform" type="rotate" values="40;-40;40" dur="3s" repeatCount="indefinite" />
            </line>
          </g>
          <path d="M 80 100 Q 120 80 160 100" stroke={stroke} strokeWidth="2" fill="none" />
          <polyline points="88,96 80,100 88,108" stroke={stroke} strokeWidth="2" fill="none" />
          <text x="120" y="250" textAnchor="middle" fill={stroke} fontSize="11" letterSpacing="1.5" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>Pan Left</text>
        </g>
      );

    case "pan_right":
      return (
        <g>
          <circle cx="120" cy="200" r="8" fill={accent} />
          <g transform="translate(120 200)" stroke={accent} strokeWidth="1.5" fill="none">
            <line x1="0" y1="0" x2="0" y2="-90">
              <animateTransform attributeName="transform" type="rotate" values="-40;40;-40" dur="3s" repeatCount="indefinite" />
            </line>
          </g>
          <path d="M 80 100 Q 120 80 160 100" stroke={stroke} strokeWidth="2" fill="none" />
          <polyline points="152,96 160,100 152,108" stroke={stroke} strokeWidth="2" fill="none" />
          <text x="120" y="250" textAnchor="middle" fill={stroke} fontSize="11" letterSpacing="1.5" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>Pan Right</text>
        </g>
      );

    case "parallax_left":
      return (
        <g>
          {/* Two staggered planes drifting at different speeds */}
          <rect x="80" y="100" width="20" height="120" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.9">
            <animate attributeName="x" values="160;60;160" dur="3.4s" repeatCount="indefinite" />
          </rect>
          <rect x="120" y="120" width="30" height="100" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.5">
            <animate attributeName="x" values="160;80;160" dur="3.4s" repeatCount="indefinite" />
          </rect>
          <g transform="translate(120 250)" stroke={stroke} strokeWidth="2.5" fill="none" strokeLinecap="round">
            <line x1="-30" y1="0" x2="30" y2="0" />
            <polyline points="-22,-8 -30,0 -22,8" />
          </g>
          <text x="120" y="285" textAnchor="middle" fill={stroke} fontSize="10" letterSpacing="1.5" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>Parallax Left</text>
        </g>
      );

    case "parallax_right":
      return (
        <g>
          <rect x="120" y="100" width="20" height="120" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.9">
            <animate attributeName="x" values="60;160;60" dur="3.4s" repeatCount="indefinite" />
          </rect>
          <rect x="90" y="120" width="30" height="100" fill="none" stroke={stroke} strokeWidth="1.5" opacity="0.5">
            <animate attributeName="x" values="60;130;60" dur="3.4s" repeatCount="indefinite" />
          </rect>
          <g transform="translate(120 250)" stroke={stroke} strokeWidth="2.5" fill="none" strokeLinecap="round">
            <line x1="-30" y1="0" x2="30" y2="0" />
            <polyline points="22,-8 30,0 22,8" />
          </g>
          <text x="120" y="285" textAnchor="middle" fill={stroke} fontSize="10" letterSpacing="1.5" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>Parallax Right</text>
        </g>
      );

    // ── VERTICAL ─────────────────────────────────────────────────────
    case "tilt_up":
      return (
        <g>
          <circle cx="120" cy="200" r="8" fill={accent} />
          <g transform="translate(120 200)" stroke={accent} strokeWidth="1.5" fill="none">
            <line x1="0" y1="0" x2="80" y2="0">
              <animateTransform attributeName="transform" type="rotate" values="-30;-90;-30" dur="3s" repeatCount="indefinite" />
            </line>
          </g>
          <g transform="translate(180 100)" stroke={stroke} strokeWidth="2.5" fill="none" strokeLinecap="round">
            <line x1="0" y1="40" x2="0" y2="-10" />
            <polyline points="-8,-2 0,-10 8,-2" />
          </g>
          <text x="120" y="250" textAnchor="middle" fill={stroke} fontSize="11" letterSpacing="1.5" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>Tilt Up</text>
        </g>
      );

    case "tilt_down":
      return (
        <g>
          <circle cx="120" cy="100" r="8" fill={accent} />
          <g transform="translate(120 100)" stroke={accent} strokeWidth="1.5" fill="none">
            <line x1="0" y1="0" x2="80" y2="0">
              <animateTransform attributeName="transform" type="rotate" values="60;30;60" dur="3s" repeatCount="indefinite" />
            </line>
          </g>
          <g transform="translate(180 200)" stroke={stroke} strokeWidth="2.5" fill="none" strokeLinecap="round">
            <line x1="0" y1="-40" x2="0" y2="10" />
            <polyline points="-8,2 0,10 8,2" />
          </g>
          <text x="120" y="250" textAnchor="middle" fill={stroke} fontSize="11" letterSpacing="1.5" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>Tilt Down</text>
        </g>
      );

    case "pedestal_up":
      return (
        <g>
          <g stroke={accent} strokeWidth="1.5" fill="none">
            <line x1="120" y1="60" x2="120" y2="260" strokeDasharray="4 4" opacity="0.5" />
          </g>
          <g>
            <animateTransform attributeName="transform" type="translate" values="0 60; 0 -60; 0 60" dur="3.6s" repeatCount="indefinite" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
            <rect x="106" y="190" width="28" height="20" rx="2" fill="none" stroke={accent} strokeWidth="1.5" />
            <circle cx="120" cy="200" r="4" fill={accent} />
          </g>
          <g transform="translate(170 160)" stroke={stroke} strokeWidth="2.5" fill="none" strokeLinecap="round">
            <line x1="0" y1="40" x2="0" y2="-40" />
            <polyline points="-8,-32 0,-40 8,-32" />
          </g>
          <text x="120" y="290" textAnchor="middle" fill={stroke} fontSize="11" letterSpacing="1.5" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>Pedestal Up</text>
        </g>
      );

    case "pedestal_down":
      return (
        <g>
          <g stroke={accent} strokeWidth="1.5" fill="none">
            <line x1="120" y1="60" x2="120" y2="260" strokeDasharray="4 4" opacity="0.5" />
          </g>
          <g>
            <animateTransform attributeName="transform" type="translate" values="0 -60; 0 60; 0 -60" dur="3.6s" repeatCount="indefinite" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
            <rect x="106" y="130" width="28" height="20" rx="2" fill="none" stroke={accent} strokeWidth="1.5" />
            <circle cx="120" cy="140" r="4" fill={accent} />
          </g>
          <g transform="translate(170 160)" stroke={stroke} strokeWidth="2.5" fill="none" strokeLinecap="round">
            <line x1="0" y1="-40" x2="0" y2="40" />
            <polyline points="-8,32 0,40 8,32" />
          </g>
          <text x="120" y="290" textAnchor="middle" fill={stroke} fontSize="11" letterSpacing="1.5" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>Pedestal Down</text>
        </g>
      );

    // ── ROTATIONAL ───────────────────────────────────────────────────
    case "orbit_left":
      return (
        <g>
          {/* Subject in center, camera orbiting counter-clockwise */}
          <circle cx="120" cy="160" r="14" fill={accent} opacity="0.85" />
          <circle cx="120" cy="160" r="60" fill="none" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
          <g>
            <animateTransform attributeName="transform" type="rotate" from="0 120 160" to="-360 120 160" dur="4s" repeatCount="indefinite" />
            <rect x="106" y="86" width="28" height="20" rx="2" fill="none" stroke={accent} strokeWidth="1.5" />
            <circle cx="120" cy="96" r="4" fill={accent} />
          </g>
          <text x="120" y="250" textAnchor="middle" fill={stroke} fontSize="11" letterSpacing="1.5" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>Orbit Left</text>
        </g>
      );

    case "orbit_right":
      return (
        <g>
          <circle cx="120" cy="160" r="14" fill={accent} opacity="0.85" />
          <circle cx="120" cy="160" r="60" fill="none" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.5" />
          <g>
            <animateTransform attributeName="transform" type="rotate" from="0 120 160" to="360 120 160" dur="4s" repeatCount="indefinite" />
            <rect x="106" y="86" width="28" height="20" rx="2" fill="none" stroke={accent} strokeWidth="1.5" />
            <circle cx="120" cy="96" r="4" fill={accent} />
          </g>
          <text x="120" y="250" textAnchor="middle" fill={stroke} fontSize="11" letterSpacing="1.5" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>Orbit Right</text>
        </g>
      );

    case "camera_roll":
      return (
        <g>
          <g transform="translate(120 160)">
            <animateTransform attributeName="transform" type="rotate" values="-12 0 0; 12 0 0; -12 0 0" dur="3s" repeatCount="indefinite" />
            <g transform="translate(-50 -34)">
              <rect width="100" height="68" rx="4" fill="none" stroke={accent} strokeWidth="2" />
              <text x="50" y="40" textAnchor="middle" fill={stroke} fontSize="9" letterSpacing="2" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>HORIZON</text>
            </g>
          </g>
          <text x="120" y="250" textAnchor="middle" fill={stroke} fontSize="11" letterSpacing="1.5" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>Camera Roll</text>
        </g>
      );

    // ── ARCHITECTURAL ────────────────────────────────────────────────
    case "architectural":
      return (
        <g>
          {/* A perfectly level slider rail */}
          <line x1="55" y1="160" x2="185" y2="160" stroke={accent} strokeWidth="2" />
          <line x1="55" y1="156" x2="55" y2="164" stroke={accent} strokeWidth="2" />
          <line x1="185" y1="156" x2="185" y2="164" stroke={accent} strokeWidth="2" />
          <g>
            <animateTransform attributeName="transform" type="translate" values="-65 0; 65 0; -65 0" dur="4s" repeatCount="indefinite" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" />
            <rect x="106" y="150" width="28" height="20" rx="2" fill="none" stroke={stroke} strokeWidth="1.5" />
            <circle cx="120" cy="160" r="4" fill={stroke} />
          </g>
          <text x="120" y="220" textAnchor="middle" fill={stroke} fontSize="11" letterSpacing="1.5" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>Architectural</text>
        </g>
      );

    default:
      return (
        <g>
          <text x="120" y="170" textAnchor="middle" fill={stroke} fontSize="11" letterSpacing="2" fontFamily="'Inter', sans-serif" style={{ textTransform: "uppercase" }}>Preview</text>
        </g>
      );
  }
}
