import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const slides = [
  // Slide 1 — Home screen icon demo
  (
    <div className="w-full h-full flex flex-col items-center justify-center relative" style={{ background: "linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%)" }}>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {Array.from({ length: 12 }).map((_, i) => {
          if (i === 5) {
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: "#000",
                    boxShadow: "0 0 20px rgba(232,197,71,0.4)",
                    border: "1px solid #E8C547",
                  }}
                >
                  <span className="font-display font-bold text-[28px]" style={{ color: "#E8C547" }}>V</span>
                </div>
                <span className="text-[10px]" style={{ color: "#fff" }}>The Vantage</span>
              </div>
            );
          }
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "#2A2A2A" }} />
              <span className="text-[10px]" style={{ color: "#555" }}>App</span>
            </div>
          );
        })}
      </div>
      <p className="absolute bottom-6 font-mono text-[10px]" style={{ color: "#E8C547" }}>Installed on home screen</p>
    </div>
  ),
  // Slide 2 — Create screen
  (
    <div className="w-full h-full flex flex-col" style={{ background: "#0A0A0A" }}>
      <div className="text-center py-3">
        <span className="font-mono text-[11px] font-bold" style={{ color: "#E8C547" }}>THE VANTAGE</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
        <h3 className="font-display font-bold text-[24px]" style={{ color: "#fff" }}>CREATE VIDEO</h3>
        <div
          className="w-full h-28 flex items-center justify-center"
          style={{ border: "2px dashed #E8C547", borderRadius: 0 }}
        >
          <span className="text-[14px]" style={{ color: "#888" }}>📸 Upload after photo</span>
        </div>
        <div className="w-full py-3 text-center font-display text-[16px] font-bold" style={{ background: "#E8C547", color: "#000" }}>
          AI GENERATE IT
        </div>
      </div>
      <div className="flex items-center justify-around py-3 border-t" style={{ borderColor: "#1A1A1A" }}>
        {["🏠", "🎬", "📁", "💰"].map((e, i) => (
          <span key={i} className="text-[20px]">{e}</span>
        ))}
      </div>
    </div>
  ),
  // Slide 3 — Video ready
  (
    <div className="w-full h-full flex flex-col items-center justify-center px-4 gap-3" style={{ background: "#0A0A0A" }}>
      <p className="font-mono text-[12px] font-bold" style={{ color: "#E8C547" }}>✅ VIDEO READY</p>
      <div className="w-full h-32 flex items-center justify-center" style={{ background: "#1A1A1A" }}>
        <span className="text-[36px]">▶</span>
      </div>
      <h4 className="font-display font-bold text-[16px]" style={{ color: "#fff" }}>BACKYARD TRANSFORMATION</h4>
      <div className="flex gap-3 w-full">
        <div className="flex-1 py-2 text-center font-mono text-[11px] font-bold" style={{ background: "#E8C547", color: "#000" }}>⬇ DOWNLOAD</div>
        <div className="flex-1 py-2 text-center font-mono text-[11px] font-bold" style={{ border: "1px solid #333", color: "#fff" }}>🔗 SHARE</div>
      </div>
      <p className="font-mono text-[10px]" style={{ color: "#555" }}>4 credits used · 196 remaining</p>
    </div>
  ),
];

const PWAInstallSection = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [activeTab, setActiveTab] = useState<"iphone" | "android">("iphone");

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setActiveSlide((s) => (s + 1) % 3);
    }, 3500);
    return () => clearInterval(timer);
  }, [paused]);

  const iphoneSteps = [
    "Open thevantage.media in Safari",
    "Tap the Share icon ↑ at the bottom",
    'Scroll down and tap "Add to Home Screen"',
    'Tap "Add" — done ✓',
  ];

  const androidSteps = [
    "Open thevantage.media in Chrome",
    "Tap the menu ⋮ in the top right",
    'Tap "Add to Home Screen"',
    'Tap "Add" — done ✓',
  ];

  const steps = activeTab === "iphone" ? iphoneSteps : androidSteps;

  return (
    <section style={{ background: "#111111", padding: "100px 0" }}>
      <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row gap-16 items-center">
        {/* Left column */}
        <div className="flex-1 max-w-[480px]">
          <p className="font-mono text-[10px] tracking-[2px] mb-4" style={{ color: "#E8C547" }}>
            📱 WORKS AS A NATIVE APP
          </p>
          <h2 className="font-display font-bold text-[40px] md:text-[52px] leading-[0.9] mb-8" style={{ color: "#fff" }}>
            INSTALL ON YOUR
            <br />HOME SCREEN.
            <br />FREE. NO APP STORE.
          </h2>

          {/* Feature rows */}
          <div className="flex flex-col gap-5 mb-8">
            {[
              { icon: "⚡", title: "INSTANT ACCESS", desc: "Opens like a native app. No browser bar. No loading delay. Always one tap away." },
              { icon: "📁", title: "YOUR GALLERY OFFLINE", desc: "View and download past videos even when you're on a job site with no signal." },
              { icon: "🔔", title: "VIDEO READY ALERTS", desc: "Your phone notifies you the moment your 1080p video is ready to download." },
            ].map((f, i) => (
              <div key={i}>
                <p className="font-mono text-[12px] font-bold" style={{ color: "#fff" }}>
                  {f.icon} {f.title}
                </p>
                <p className="font-mono text-[12px] mt-1" style={{ color: "#AAAAAA" }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Install steps card */}
          <div style={{ background: "#1A1A1A", borderLeft: "3px solid #E8C547", padding: 24 }}>
            <div className="flex gap-4 mb-4">
              {(["iphone", "android"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="font-mono text-[12px] font-bold pb-1 bg-transparent border-none cursor-pointer"
                  style={{
                    color: activeTab === tab ? "#E8C547" : "#555",
                    borderBottom: activeTab === tab ? "2px solid #E8C547" : "2px solid transparent",
                  }}
                >
                  {tab === "iphone" ? "iPhone" : "Android"}
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              {steps.map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className="flex-shrink-0 flex items-center justify-center font-mono text-[11px] font-bold"
                    style={{
                      width: 24, height: 24, borderRadius: "50%",
                      background: "#E8C547", color: "#000",
                    }}
                  >
                    {i + 1}
                  </div>
                  <span className="font-mono text-[12px]" style={{ color: "#AAAAAA" }}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <Link
            to="/demo"
            className="inline-block mt-6 font-display text-[16px] font-bold px-8 py-3"
            style={{ background: "#E8C547", color: "#000", borderRadius: 0 }}
          >
            SEE THE DEMO →
          </Link>
        </div>

        {/* Right column — Phone mockup */}
        <div className="flex flex-col items-center">
          <div
            className="relative overflow-hidden"
            style={{
              width: 260, height: 520,
              background: "#000", border: "8px solid #2A2A2A",
              borderRadius: 40,
              boxShadow: "0 40px 80px rgba(0,0,0,0.8), inset 0 0 0 1px #333, 0 0 40px rgba(232,197,71,0.06)",
            }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* Notch */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 z-10"
              style={{ width: 90, height: 24, background: "#000", borderRadius: "0 0 16px 16px" }}
            />
            {slides[activeSlide]}
          </div>

          {/* Dots */}
          <div className="flex gap-2 mt-4">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveSlide(i)}
                className="border-none cursor-pointer p-0"
                style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: activeSlide === i ? "#E8C547" : "#333",
                }}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PWAInstallSection;
