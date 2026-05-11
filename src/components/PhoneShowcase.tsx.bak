import { Link } from "react-router-dom";
import { useSmartCTA } from "@/hooks/useSmartCTA";

const PhoneMockup = ({
  videoSrc,
  label,
  rotation,
  comment,
}: {
  videoSrc: string;
  label: string;
  rotation: string;
  comment: string;
}) => (
  <div className="flex flex-col items-center flex-shrink-0 snap-center">
    <div
      className="relative overflow-hidden"
      style={{
        width: 220,
        height: 400,
        background: "#000000",
        border: "8px solid #2A2A2A",
        borderRadius: 36,
        transform: rotation,
        boxShadow:
          "0 40px 80px rgba(0,0,0,0.8), inset 0 0 0 1px #333333, 0 0 40px rgba(232,197,71,0.06)",
      }}
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 z-10"
        style={{
          width: 90,
          height: 24,
          background: "#000",
          borderRadius: "0 0 16px 16px",
        }}
      />
      <video
        src={videoSrc}
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
    <p
      className="font-mono text-[10px] tracking-[2px] mt-4 text-center"
      style={{ color: "#555555" }}
    >
      {label}
    </p>
  </div>
);

const PhoneShowcase = () => {
  const { destination, isLoggedIn } = useSmartCTA();

  return (
    <section
      id="examples"
      style={{ background: "#0A0A0A", padding: "80px 0" }}
    >
      <div className="max-w-[800px] mx-auto px-4 text-center">
        <p
          className="font-mono text-[10px] tracking-[2px] mb-4"
          style={{ color: "#E8C547" }}
        >
          REAL RESULTS · GENERATED IN MINUTES
        </p>
        <h2
          className="font-display font-bold text-[40px] md:text-[56px] leading-[0.9] mb-12"
          style={{ color: "#ffffff" }}
        >
          SEE WHAT THE VANTAGE CREATES
        </h2>
      </div>

      {/* Desktop phones */}
      <div className="hidden md:flex items-end justify-center gap-8">
        <PhoneMockup
          videoSrc="/videos/transform-1.mp4"
          label="TRANSFORMATION 1"
          rotation="rotate(4deg) translateY(8px)"
          comment="USER VIDEO 1"
        />
        <PhoneMockup
          videoSrc="/videos/transform-2.mp4"
          label="TRANSFORMATION 2"
          rotation="rotate(-4deg) translateY(8px)"
          comment="USER VIDEO 2"
        />
      </div>

      {/* Mobile horizontal scroll */}
      <div
        className="flex md:hidden gap-5 px-8 overflow-x-auto snap-x snap-mandatory pb-4 scroll-hide"
      >
        <PhoneMockup
          videoSrc="/videos/transform-1.mp4"
          label="TRANSFORMATION 1"
          rotation="none"
          comment="USER VIDEO 1"
        />
        <PhoneMockup
          videoSrc="/videos/transform-2.mp4"
          label="TRANSFORMATION 2"
          rotation="none"
          comment="USER VIDEO 2"
        />
      </div>
      <p
        className="md:hidden font-mono text-[10px] text-center mt-2"
        style={{ color: "#444444" }}
      >
        swipe for more ›
      </p>

      {/* CTA below phones */}
      <div className="text-center mt-12 px-4">
        <h3
          className="font-display font-bold text-[36px] mb-3"
          style={{ color: "#ffffff" }}
        >
          READY TO CREATE YOURS?
        </h3>
        <p className="font-mono text-[12px] mb-6" style={{ color: "#AAAAAA" }}>
          {isLoggedIn ? "Start creating your transformation video" : "Start with 50 free credits — no card needed"}
        </p>
        <Link
          to={destination}
          className="inline-block font-display text-[18px] font-bold px-12 py-4 mx-auto"
          style={{
            backgroundColor: "#E8C547",
            color: "#000000",
            borderRadius: 0,
          }}
        >
          {isLoggedIn ? "CREATE VIDEO →" : "GET STARTED FREE →"}
        </Link>
      </div>
    </section>
  );
};

export default PhoneShowcase;
