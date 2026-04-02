import { Link } from "react-router-dom";
import AppearOnScroll from "./AppearOnScroll";
import { useSmartCTA } from "@/hooks/useSmartCTA";

const steps = [
  {
    num: "01",
    icon: "📸",
    title: "UPLOAD ONE PHOTO",
    body: "Snap a photo of your finished project. That's it — no before photo needed. Our AI generates the before state automatically.",
  },
  {
    num: "02",
    icon: "🎬",
    title: "AI BUILDS YOUR VIDEO",
    body: "Kling 2.5 Turbo Pro creates a cinematic 1080p transformation video. Workers, tools, materials — all animated with real physics. Ready in 3-5 minutes.",
  },
  {
    num: "03",
    icon: "📈",
    title: "POST IT. GET LEADS.",
    body: "Download and post directly to TikTok, Instagram Reels, or YouTube Shorts. Our users average 3-5x more engagement than static photos.",
  },
];

const HowItWorksSection = () => {
  const { destination, isLoggedIn } = useSmartCTA();

  return (
    <section style={{ background: "#0A0A0A", padding: "100px 0" }}>
      <div className="max-w-4xl mx-auto px-4">
        <h2
          className="font-display font-bold text-[40px] md:text-[56px] text-center mb-4"
          style={{ color: "#ffffff" }}
        >
          THREE STEPS TO
          <br />
          <span style={{ color: "#E8C547" }}>MORE CLIENTS</span>
        </h2>
        <p
          className="text-center text-[15px] mb-12 max-w-[440px] mx-auto"
          style={{ color: "#AAAAAA" }}
        >
          No video editing skills needed. No expensive videographers. Just your phone and 3 minutes.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <AppearOnScroll key={i} delay={i * 150}>
              <div
                className="relative p-8"
                style={{ background: "#1A1A1A" }}
              >
                <span
                  className="absolute top-4 right-4 font-mono text-[48px] font-bold leading-none select-none"
                  style={{ color: "#E8C547", opacity: 0.3 }}
                >
                  {step.num}
                </span>
                <div className="text-[36px] mb-4">{step.icon}</div>
                <h3
                  className="font-display font-bold text-[28px] mb-3"
                  style={{ color: "#ffffff" }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-[14px] leading-[1.7]"
                  style={{ color: "#AAAAAA" }}
                >
                  {step.body}
                </p>
              </div>
            </AppearOnScroll>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to={destination}
            className="inline-block font-display text-[18px] font-bold px-10 py-4 transition-transform hover:scale-105"
            style={{
              backgroundColor: "#E8C547",
              color: "#000000",
              borderRadius: 0,
            }}
          >
            {isLoggedIn ? "CREATE YOUR VIDEO →" : "TRY IT FREE — 50 CREDITS →"}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
