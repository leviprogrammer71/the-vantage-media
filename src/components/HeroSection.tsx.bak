import { Link } from "react-router-dom";
import { useSmartCTA } from "@/hooks/useSmartCTA";

const HeroSection = () => {
  const { destination, isLoggedIn } = useSmartCTA();

  const handleScrollToExamples = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("examples")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
      <img
        src="/hero-still.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-center"
        style={{ filter: "brightness(0.25)", zIndex: 0 }}
        loading="eager"
      />

      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(to bottom, rgba(10,10,10,0.3) 0%, rgba(10,10,10,0.7) 60%, rgba(10,10,10,1) 100%)",
          zIndex: 1,
        }}
      />

      <div className="relative z-[2] max-w-[800px] mx-auto px-4 text-center">
        <p
          className="font-mono text-[11px] tracking-[3px] mb-6"
          style={{ color: "#E8C547" }}
        >
          TRUSTED BY 2,400+ CONTRACTORS & BUILDERS
        </p>

        <h1
          className="font-display font-bold text-[52px] md:text-[84px] leading-[0.9] mb-6"
          style={{
            color: "#ffffff",
            textShadow: "0 2px 20px rgba(0,0,0,0.8)",
          }}
        >
          YOUR BEST WORK
          <br />
          <span style={{ color: "#E8C547" }}>DESERVES MORE LEADS.</span>
        </h1>

        <p
          className="text-[16px] md:text-[18px] leading-[1.6] max-w-[540px] mx-auto mb-6"
          style={{ color: "#CCCCCC" }}
        >
          Upload one photo. Get a cinematic before-and-after transformation video that stops the scroll on TikTok and Instagram. More views. More calls. More jobs.
        </p>

        <Link
          to={destination}
          className="inline-flex items-center gap-3 mx-auto mb-8 no-underline"
          style={{
            background: "rgba(232,197,71,0.12)",
            border: "1px solid rgba(232,197,71,0.3)",
            padding: "14px 24px",
          }}
        >
          <span className="text-[24px]">🎁</span>
          <span className="font-mono text-[12px]" style={{ color: "#E8C547" }}>
            {isLoggedIn ? "CREATE YOUR NEXT TRANSFORMATION VIDEO" : "50 FREE CREDITS — ENOUGH FOR 12 VIDEOS. NO CARD."}
          </span>
          <span style={{ color: "#E8C547" }}>→</span>
        </Link>

        <div className="flex items-center justify-center gap-8 flex-wrap">
          <Link
            to={destination}
            className="inline-block font-display text-[20px] font-bold px-[52px] py-[18px] transition-transform hover:scale-105"
            style={{
              backgroundColor: "#E8C547",
              color: "#000000",
              borderRadius: 0,
            }}
          >
            {isLoggedIn ? "CREATE VIDEO →" : "START FREE — NO CARD →"}
          </Link>
          <button
            onClick={handleScrollToExamples}
            className="font-mono text-[12px] underline cursor-pointer bg-transparent border-none"
            style={{ color: "#AAAAAA" }}
          >
            SEE EXAMPLES ↓
          </button>
        </div>

        <p
          className="font-mono text-[10px] tracking-[2px] mt-6"
          style={{ color: "#666666" }}
        >
          1080P · 9:16 VERTICAL · READY IN MINUTES · 50 FREE CREDITS
        </p>
      </div>
    </section>
  );
};

export default HeroSection;
