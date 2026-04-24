import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useCtaNavigation } from "@/hooks/useCtaNavigation";

/**
 * ROI Calculator — Brief Task 7.
 * Pricing-page widget that converts "I don't know if this is worth it" objection
 * into a visceral positive-ROI moment.
 *
 * Industry-average assumptions (from the brief):
 *   views/video = 8,000
 *   enquiry rate = 0.2% of views
 *   close rate = 15% of enquiries
 *
 * Credit cost per transformation video (AI before) = 40 credits.
 * Using the BUILDER pack ($39 / 500 credits) → $0.078 per credit → ~$3.12 per video.
 */
const PER_VIDEO_VIEWS = 8_000;
const ENQUIRY_RATE = 0.002; // 0.2%
const CLOSE_RATE = 0.15;
const CREDITS_PER_VIDEO = 40;
const COST_PER_CREDIT = 39 / 500; // BUILDER pack unit economics

const currency = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const RoiCalculator = () => {
  const [jobValue, setJobValue] = useState(5000);
  const [referrals, setReferrals] = useState(2);
  const [videos, setVideos] = useState(4);
  const { destinationFor } = useCtaNavigation();

  const result = useMemo(() => {
    const monthlyViews = videos * PER_VIDEO_VIEWS;
    const enquiries = Math.round(monthlyViews * ENQUIRY_RATE);
    const newJobs = Math.max(1, Math.round(enquiries * CLOSE_RATE));
    const revenue = newJobs * jobValue;
    const creditCost = videos * CREDITS_PER_VIDEO * COST_PER_CREDIT;
    const roi = creditCost > 0 ? revenue / creditCost : 0;
    const totalRefJobs = referrals + newJobs;
    return { monthlyViews, enquiries, newJobs, revenue, creditCost, roi, totalRefJobs };
  }, [jobValue, referrals, videos]);

  return (
    <section
      aria-labelledby="roi-heading"
      className="my-12"
      style={{ background: "#0F0F0F", border: "1px solid #1F1F1F", padding: "32px", borderRadius: 0 }}
    >
      <p className="font-mono text-[11px] tracking-[3px] mb-2" style={{ color: "#E8C547" }}>
        ROI CALCULATOR
      </p>
      <h3
        id="roi-heading"
        className="font-display font-bold text-[24px] md:text-[32px] leading-tight mb-6"
        style={{ color: "#ffffff" }}
      >
        Do the math on your own numbers.
      </h3>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-5">
          <div>
            <label htmlFor="roi-job" className="block font-mono text-[11px] tracking-[1.5px] mb-2" style={{ color: "#AAAAAA" }}>
              YOUR AVERAGE JOB VALUE
            </label>
            <input
              id="roi-job"
              type="range"
              min={1000}
              max={50000}
              step={500}
              value={jobValue}
              onChange={(e) => setJobValue(Number(e.target.value))}
              className="w-full accent-[#E8C547]"
              aria-valuetext={currency(jobValue)}
            />
            <div className="text-[20px] font-display mt-1" style={{ color: "#ffffff" }}>{currency(jobValue)}</div>
          </div>

          <div>
            <label htmlFor="roi-ref" className="block font-mono text-[11px] tracking-[1.5px] mb-2" style={{ color: "#AAAAAA" }}>
              JOBS / MONTH FROM REFERRALS TODAY
            </label>
            <input
              id="roi-ref"
              type="range"
              min={0}
              max={20}
              value={referrals}
              onChange={(e) => setReferrals(Number(e.target.value))}
              className="w-full accent-[#E8C547]"
            />
            <div className="text-[20px] font-display mt-1" style={{ color: "#ffffff" }}>{referrals} / month</div>
          </div>

          <div>
            <label htmlFor="roi-vids" className="block font-mono text-[11px] tracking-[1.5px] mb-2" style={{ color: "#AAAAAA" }}>
              VIDEOS POSTED / MONTH
            </label>
            <input
              id="roi-vids"
              type="range"
              min={1}
              max={20}
              value={videos}
              onChange={(e) => setVideos(Number(e.target.value))}
              className="w-full accent-[#E8C547]"
            />
            <div className="text-[20px] font-display mt-1" style={{ color: "#ffffff" }}>{videos} videos</div>
          </div>
        </div>

        {/* Output */}
        <div
          className="p-6 flex flex-col gap-3"
          style={{ background: "rgba(232,197,71,0.06)", border: "1px solid rgba(232,197,71,0.25)" }}
        >
          <div className="flex justify-between text-[14px]" style={{ color: "#CCCCCC" }}>
            <span>Estimated views / month</span>
            <span style={{ color: "#ffffff" }}>{result.monthlyViews.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[14px]" style={{ color: "#CCCCCC" }}>
            <span>New enquiries</span>
            <span style={{ color: "#ffffff" }}>{result.enquiries}</span>
          </div>
          <div className="flex justify-between text-[14px]" style={{ color: "#CCCCCC" }}>
            <span>New jobs booked</span>
            <span style={{ color: "#ffffff" }}>{result.newJobs}</span>
          </div>
          <div className="flex justify-between text-[14px]" style={{ color: "#CCCCCC" }}>
            <span>Cost of credits</span>
            <span style={{ color: "#ffffff" }}>{currency(result.creditCost)}</span>
          </div>
          <hr style={{ borderColor: "rgba(232,197,71,0.15)" }} />
          <div className="flex justify-between items-end">
            <div>
              <div className="font-mono text-[10px] tracking-[1.5px]" style={{ color: "#AAAAAA" }}>REVENUE POTENTIAL</div>
              <div className="font-display text-[32px] md:text-[40px] font-bold leading-none" style={{ color: "#E8C547" }}>
                {currency(result.revenue)}
              </div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] tracking-[1.5px]" style={{ color: "#AAAAAA" }}>ROI</div>
              <div className="font-display text-[24px] md:text-[28px] font-bold" style={{ color: "#ffffff" }}>
                {result.roi >= 1000 ? "1000x+" : `${Math.round(result.roi)}x`}
              </div>
            </div>
          </div>
          <p className="text-[13px] leading-[1.6] mt-2" style={{ color: "#AAAAAA" }}>
            Based on your numbers, The Vantage could generate <strong style={{ color: "#ffffff" }}>{currency(result.revenue)}</strong> in new jobs for{" "}
            <strong style={{ color: "#ffffff" }}>{currency(result.creditCost)}</strong> in credits.
          </p>
          <Link
            to={destinationFor("create")}
            className="inline-block text-center font-display text-[15px] font-bold mt-2 px-5 py-3"
            style={{ backgroundColor: "#E8C547", color: "#000000", borderRadius: 0 }}
          >
            START WITH 50 FREE CREDITS →
          </Link>
        </div>
      </div>

      <p className="font-mono text-[10px] tracking-[1.5px] mt-4" style={{ color: "#666666" }}>
        ESTIMATES USE INDUSTRY AVERAGES: 8,000 VIEWS/VIDEO · 0.2% ENQUIRY RATE · 15% CLOSE RATE · BUILDER PACK ECONOMICS
      </p>
    </section>
  );
};

export default RoiCalculator;
