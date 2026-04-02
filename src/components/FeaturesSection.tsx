import { Link } from "react-router-dom";
import { useSmartCTA } from "@/hooks/useSmartCTA";

const categories = [
  { emoji: "🏗️", label: "CONTRACTORS", sub: "Show the full build story" },
  { emoji: "🌿", label: "LANDSCAPERS", sub: "Bare dirt to dream yard" },
  { emoji: "🏊", label: "POOL BUILDERS", sub: "Empty lot to backyard oasis" },
  { emoji: "🏠", label: "RENOVATORS", sub: "Dated to modern in seconds" },
  { emoji: "🪴", label: "DESIGNERS", sub: "Concept to reality, on camera" },
  { emoji: "🏘️", label: "DEVELOPERS", sub: "Ground-up builds that sell" },
];

const FeaturesSection = () => {
  const { destination, isLoggedIn } = useSmartCTA();

  return (
    <section style={{ background: "#0D0D0D", padding: "100px 0" }}>
      <div className="max-w-4xl mx-auto px-4">
        <h2
          className="font-display font-bold text-[40px] md:text-[56px] text-center leading-[0.9] mb-4"
          style={{ color: "#ffffff" }}
        >
          BUILT FOR PEOPLE
          <br />
          WHO <span style={{ color: "#E8C547" }}>BUILD THINGS</span>
        </h2>
        <p
          className="text-center text-[15px] mb-12 max-w-[420px] mx-auto"
          style={{ color: "#AAAAAA" }}
        >
          If you transform spaces for a living, this is the marketing tool you've been missing.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((cat, i) => (
            <div
              key={i}
              className="text-center p-7 transition-all duration-200 cursor-default hover:-translate-y-1"
              style={{
                background: "#1A1A1A",
                border: "1px solid #222222",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "#E8C547";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = "#222222";
              }}
            >
              <div className="text-[36px] mb-3">{cat.emoji}</div>
              <span
                className="font-mono text-[11px] tracking-[2px] block"
                style={{ color: "#E8C547" }}
              >
                {cat.label}
              </span>
              <span
                className="text-[12px] mt-1 block"
                style={{ color: "#888888" }}
              >
                {cat.sub}
              </span>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to={destination}
            className="font-mono text-[12px] underline"
            style={{ color: "#E8C547" }}
          >
            {isLoggedIn ? "Create your video now →" : "Start free — 50 credits, no card →"}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
