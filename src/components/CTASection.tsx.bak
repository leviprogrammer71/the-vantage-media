import { Link } from "react-router-dom";
import { useSmartCTA } from "@/hooks/useSmartCTA";

const CTASection = () => {
  const { destination, isLoggedIn } = useSmartCTA();

  return (
    <section style={{ backgroundColor: "#E8C547", padding: "100px 0" }}>
      <div className="max-w-[600px] mx-auto px-4 text-center">
        <p
          className="font-mono text-[12px] tracking-[3px] mb-6"
          style={{ color: "#666600" }}
        >
          EVERY DAY YOU WAIT IS A LEAD LOST
        </p>
        <h2
          className="font-display font-bold text-[52px] md:text-[76px] leading-[0.9] mb-6"
          style={{ color: "#000000" }}
        >
          YOUR WORK
          <br />
          DESERVES TO
          <br />
          GO VIRAL.
        </h2>
        <p
          className="text-[18px] leading-[1.6] max-w-[460px] mx-auto mb-8"
          style={{ color: "#333333" }}
        >
          Your competitors are posting static photos. You're about to post cinematic transformation videos. 50 free credits. No card. Start now.
        </p>
        <Link
          to={destination}
          className="inline-block font-display text-[22px] font-bold px-14 py-5 transition-transform hover:scale-105"
          style={{
            backgroundColor: "#000000",
            color: "#ffffff",
            borderRadius: 0,
          }}
        >
          {isLoggedIn ? "CREATE YOUR VIDEO →" : "GET 50 FREE CREDITS →"}
        </Link>
        <p
          className="font-mono text-[11px] mt-4"
          style={{ color: "#666600" }}
        >
          50 free credits · no card required · create in minutes
        </p>
      </div>
    </section>
  );
};

export default CTASection;
