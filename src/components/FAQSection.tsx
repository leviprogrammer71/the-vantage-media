import { useState } from "react";
import { Link } from "react-router-dom";
import { useSmartCTA } from "@/hooks/useSmartCTA";

const faqs = [
  {
    q: "Will the video actually look like my project?",
    a: "Yes. Our AI analyzes your after photo and reconstructs the exact same space before construction began — same angle, same lighting, same surroundings. Kling 2.5 Turbo Pro then renders a cinematic transformation with physically accurate construction sequences. Workers, tools, materials — all behaving like the real thing.",
  },
  {
    q: "I don't have a before photo. Is that OK?",
    a: "That's exactly what we built this for. Just upload your finished after photo — our AI generates the before state automatically. If you happen to have a before photo, you can upload that too for even better results.",
  },
  {
    q: "I'm not tech-savvy. Can I really do this?",
    a: "If you can take a photo on your phone and tap a button, you can use The Vantage. Upload, pick a style, and we handle everything else. Your video is ready to download and post in under 5 minutes.",
  },
  {
    q: "How many videos do I get for free?",
    a: "Your 50 free credits cover approximately 12 transformation videos — enough to fill your social media for weeks and start seeing real engagement. No credit card required. Credits never expire.",
  },
  {
    q: "What if the video doesn't look right?",
    a: "You only spend credits on successful generations. If anything fails, you won't be charged. You can regenerate with different styles, motion types, and settings at any time until you're happy with the result.",
  },
  {
    q: "What format are the videos?",
    a: "9:16 vertical for TikTok and Instagram Reels by default — the format that gets the most engagement. Also available in 16:9 for YouTube and your website. All videos are 1080p MP4, ready to upload directly. No editing required.",
  },
  {
    q: "Do other contractors actually get leads from these videos?",
    a: "Transformation videos are the #1 performing content type for contractors on social media. Before-and-after reveals trigger curiosity and are scientifically proven to drive higher engagement. Our users report 3-5x more views and DMs compared to static photo posts.",
  },
  {
    q: "Can I also enhance my photos for listings?",
    a: "Absolutely. We also offer AI photo enhancement — sky replacement, twilight conversion, virtual staging, decluttering, HDR balancing, and more. Perfect for MLS listings. Every enhancement is designed to be photorealistic and MLS-compliant.",
  },
];

const FAQItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #1A1A1A" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-6 text-left bg-transparent border-none cursor-pointer"
        type="button"
      >
        <span className="font-mono text-[13px]" style={{ color: "#ffffff" }}>
          {q}
        </span>
        <span
          className="font-mono text-[18px] flex-shrink-0 ml-4"
          style={{ color: "#E8C547" }}
        >
          {open ? "\u2212" : "+"}
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{
          maxHeight: open ? 300 : 0,
          opacity: open ? 1 : 0,
        }}
      >
        <p
          className="text-[15px] leading-[1.7] pb-6"
          style={{ color: "#AAAAAA" }}
        >
          {a}
        </p>
      </div>
    </div>
  );
};

const FAQSection = () => {
  const { destination, isLoggedIn } = useSmartCTA();

  return (
    <section style={{ background: "#0A0A0A", padding: "100px 0" }}>
      <div className="max-w-[680px] mx-auto px-4">
        <h2
          className="font-display font-bold text-[40px] md:text-[56px] text-center mb-12"
          style={{ color: "#ffffff" }}
        >
          QUESTIONS?
        </h2>
        {faqs.map((faq, i) => (
          <FAQItem key={i} q={faq.q} a={faq.a} />
        ))}

        <div className="text-center mt-10">
          <p className="text-[15px] mb-4" style={{ color: "#AAAAAA" }}>
            Still not sure? Try it free — no commitment.
          </p>
          <Link
            to={destination}
            className="font-mono text-[12px] underline"
            style={{ color: "#E8C547" }}
          >
            {isLoggedIn ? "Create your video now \u2192" : "Get 50 free credits \u2192"}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
