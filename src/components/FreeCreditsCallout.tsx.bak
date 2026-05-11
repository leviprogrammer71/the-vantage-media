import { Link } from "react-router-dom";
import { useSmartCTA } from "@/hooks/useSmartCTA";

const cols = [
  {
    icon: "🎁",
    headline: "50 FREE CREDITS",
    headlineColor: "#E8C547",
    sub: "when you create an account",
  },
  {
    icon: "⚡",
    headline: "12 TRANSFORMATION VIDEOS",
    headlineColor: "#ffffff",
    sub: "with your free credits",
  },
  {
    icon: "💳",
    headline: "NO CARD REQUIRED",
    headlineColor: "#ffffff",
    sub: "start creating immediately",
  },
];

const FreeCreditsCallout = () => {
  const { destination, isLoggedIn } = useSmartCTA();

  return (
    <section
      style={{
        background: "#111111",
        borderTop: "1px solid #1A1A1A",
        borderBottom: "1px solid #1A1A1A",
        padding: "40px 0",
      }}
    >
      <div className="max-w-4xl mx-auto px-4">
        {/* Desktop */}
        <div className="hidden md:flex items-center justify-center gap-0">
          {cols.map((col, i) => (
            <div key={i} className="flex items-center">
              <div className="text-center px-8">
                <div className="text-[32px] mb-2">{col.icon}</div>
                <div
                  className="font-display font-bold text-[32px] leading-none"
                  style={{ color: col.headlineColor }}
                >
                  {col.headline}
                </div>
                <p className="font-mono text-[11px] mt-1" style={{ color: "#AAAAAA" }}>
                  {col.sub}
                </p>
              </div>
              {i < cols.length - 1 && (
                <div className="flex-shrink-0" style={{ width: 1, height: 40, background: "#222222" }} />
              )}
            </div>
          ))}
        </div>

        {/* Mobile */}
        <div className="flex md:hidden flex-col items-center gap-6">
          {cols.map((col, i) => (
            <div key={i} className="flex flex-col items-center">
              {i > 0 && (
                <div
                  className="w-2 h-2 rounded-full mb-6"
                  style={{ background: "#E8C547" }}
                />
              )}
              <div className="text-[32px] mb-2">{col.icon}</div>
              <div
                className="font-display font-bold text-[28px] leading-none text-center"
                style={{ color: col.headlineColor }}
              >
                {col.headline}
              </div>
              <p className="font-mono text-[11px] mt-1" style={{ color: "#AAAAAA" }}>
                {col.sub}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-6">
          <Link
            to={destination}
            className="font-mono text-[12px] underline"
            style={{ color: "#E8C547" }}
          >
            {isLoggedIn ? "Create your video now →" : "Create your free account →"}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FreeCreditsCallout;
