import { useState } from "react";
import { Link } from "react-router-dom";
import { useCtaNavigation } from "@/hooks/useCtaNavigation";

/**
 * "Questions Tradies Actually Ask" — Brief Section E.
 * Answers the real objections tradies have, not generic SaaS FAQs.
 */
const faqs = [
  {
    q: "I don't have a before photo — does that matter?",
    a: "No. The AI builds the before state from your after photo — same angle, same space, stripped back to raw dirt or a worn pre-reno state. It's the whole point of the product.",
  },
  {
    q: "How long does it actually take?",
    a: "Upload your photo, fill in 2 fields, hit generate. Your cinematic 1080p video is ready in 3–5 minutes. No editing, no waiting days for a videographer.",
  },
  {
    q: "Is the video good enough to post?",
    a: "Yes. 1080×1920 vertical, cinematic grade, trending-audio ready. Post straight to TikTok, Instagram Reels, and YouTube Shorts — no extra editing required.",
  },
  {
    q: "What trades does it work for?",
    a: "Any trade that finishes a visual project. Landscaping, pools, kitchens, bathrooms, full builds, outdoor living, decking, concreting, tiling, painting. If you can photograph the finished work, you can use this.",
  },
  {
    q: "What happens when my credits run out?",
    a: "Buy more whenever you need them. No subscription, no auto-renewal, no hidden charges. Credits never expire. You're in control.",
  },
  {
    q: "Will it actually get me more jobs?",
    a: "We can't guarantee it — but the math is compelling. Average contractor transformation video gets 8K–50K views. Every 10K views typically produces 15–25 enquiries. Run your own numbers in the ROI calculator on the pricing page.",
  },
  {
    q: "Is my data and my clients' work kept private?",
    a: "Yes. Your photos and videos are stored securely in Supabase, only visible to your account, and never shared with third parties or used to train AI models.",
  },
  {
    q: "I'm not tech-savvy. Can I really do this?",
    a: "If you can take a photo on your phone, you can use The Vantage. One upload, one tap, one video. No learning curve.",
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
        aria-expanded={open}
      >
        <span className="font-mono text-[13px] pr-4" style={{ color: "#ffffff" }}>
          {q}
        </span>
        <span
          className="font-mono text-[18px] flex-shrink-0"
          style={{ color: "#E8C547" }}
        >
          {open ? "\u2212" : "+"}
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{
          maxHeight: open ? 400 : 0,
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
  const { destinationFor, isLoggedIn } = useCtaNavigation();

  return (
    <section id="faq" style={{ background: "#0A0A0A", padding: "80px 0" }}>
      <div className="max-w-[680px] mx-auto px-4">
        <p className="font-mono text-[11px] tracking-[3px] text-center mb-3" style={{ color: "#E8C547" }}>
          QUESTIONS TRADIES ACTUALLY ASK
        </p>
        <h2
          className="font-display font-bold text-[36px] md:text-[52px] text-center mb-10"
          style={{ color: "#ffffff" }}
        >
          Straight answers.
        </h2>
        {faqs.map((faq, i) => (
          <FAQItem key={i} q={faq.q} a={faq.a} />
        ))}

        <div className="text-center mt-10">
          <p className="text-[15px] mb-4" style={{ color: "#AAAAAA" }}>
            Still not sure? Try it free — no card, no commitment.
          </p>
          <Link
            to={destinationFor("create")}
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
