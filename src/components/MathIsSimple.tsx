import { Link } from "react-router-dom";
import { useCtaNavigation } from "@/hooks/useCtaNavigation";

/**
 * "The Math Is Simple" stats section — Brief Section A.
 * Placed on the homepage between How-It-Works and Testimonials.
 * Purpose: CONCRETE ROI — tradies think in jobs and dollars, not impressions.
 */
const MathIsSimple = () => {
  const { destinationFor, isLoggedIn } = useCtaNavigation();

  const stats = [
    { value: "8K–50K", label: "AVG VIEWS ON A CONTRACTOR TRANSFORMATION VIDEO" },
    { value: "15–25", label: "AVG ENQUIRIES PER 10K VIEWS" },
    { value: "$0.08 vs $45", label: "COST PER ENQUIRY — THE VANTAGE vs A MARKETING AGENCY" },
  ];

  return (
    <section
      aria-labelledby="math-heading"
      style={{ background: "#0A0A0A", padding: "80px 0", borderTop: "1px solid #141414", borderBottom: "1px solid #141414" }}
    >
      <div className="max-w-[1100px] mx-auto px-4">
        <p className="font-mono text-[11px] tracking-[3px] text-center mb-3" style={{ color: "#E8C547" }}>
          THE MATH IS SIMPLE
        </p>
        <h2
          id="math-heading"
          className="font-display font-bold text-[32px] md:text-[48px] text-center leading-[1.05] mb-12"
          style={{ color: "#ffffff" }}
        >
          ONE AFTER PHOTO. THAT&apos;S ALL YOU NEED.
        </h2>

        <div className="grid gap-5 md:grid-cols-3">
          {stats.map((s, i) => (
            <div
              key={i}
              className="p-6 md:p-8 text-center"
              style={{ background: "#0F0F0F", border: "1px solid #1F1F1F" }}
            >
              <div
                className="font-display font-bold text-[34px] md:text-[44px] leading-none mb-3"
                style={{ color: "#E8C547" }}
              >
                {s.value}
              </div>
              <div className="font-mono text-[10px] tracking-[1.5px] leading-[1.6]" style={{ color: "#AAAAAA" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-[15px] md:text-[17px] leading-[1.6] mt-10 max-w-[620px] mx-auto" style={{ color: "#CCCCCC" }}>
          The AI builds the before. The AI makes the video. You post it. Jobs come in.
        </p>
        <div className="text-center mt-6">
          <Link
            to={destinationFor("create")}
            className="inline-block font-display text-[16px] font-bold px-[36px] py-[14px] transition-transform hover:scale-[1.03]"
            style={{ backgroundColor: "#E8C547", color: "#000000", borderRadius: 0 }}
          >
            {isLoggedIn ? "CREATE VIDEO →" : "GET 50 FREE CREDITS →"}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default MathIsSimple;
