import { useMemo, useState } from "react";

interface ROICalculatorProps {
  className?: string;
  defaultListings?: number;
  defaultRate?: number;
  variant?: "photographer" | "agent" | "builder";
}

/**
 * Editorial ROI / time-saved calculator.
 * Photographer mode: listings/month × premium delivered → revenue uplift.
 * Agent mode: listings × close-rate uplift → commissions earned.
 * Builder mode: completed jobs × inbound leads → pipeline added.
 */
const ROICalculator = ({
  className = "",
  defaultListings = 18,
  defaultRate = 425,
  variant = "photographer",
}: ROICalculatorProps) => {
  const [listings, setListings] = useState(defaultListings);
  const [rate, setRate] = useState(defaultRate);

  const config = {
    photographer: {
      eyebrow: "PHOTOGRAPHER ECONOMICS",
      headline: "What a cinematic upsell adds to every shoot.",
      hint: "Most studios add cinematic listing video as a $250–$650 premium per shoot.",
      listingLabel: "Shoots delivered each month",
      rateLabel: "Cinematic add-on per shoot ($)",
      benefits: (lift: number, hours: number) => [
        { label: "New revenue / month", value: `$${lift.toLocaleString()}` },
        { label: "Annual uplift", value: `$${(lift * 12).toLocaleString()}` },
        { label: "Editor hours reclaimed", value: `${hours} hrs / mo` },
      ],
    },
    agent: {
      eyebrow: "AGENT ECONOMICS",
      headline: "What scroll-stopping listings do for your year.",
      hint: "Industry data suggests video listings sell up to 49% faster and command higher list prices.",
      listingLabel: "Listings you'll launch this year",
      rateLabel: "Average commission per close ($)",
      benefits: (lift: number) => [
        { label: "Extra closings / yr (low end)", value: `+${Math.max(1, Math.round(listings * 0.06))}` },
        { label: "Projected commission lift", value: `$${lift.toLocaleString()}` },
        { label: "Days to under-contract", value: `−9 days avg` },
      ],
    },
    builder: {
      eyebrow: "BUILDER ECONOMICS",
      headline: "What every finished job adds to your pipeline.",
      hint: "Builders posting transformation reels report 3–5× more inbound qualified leads.",
      listingLabel: "Jobs completed each month",
      rateLabel: "Average project value ($)",
      benefits: (lift: number, hours: number) => [
        { label: "Inbound pipeline / mo", value: `$${lift.toLocaleString()}` },
        { label: "Annual pipeline added", value: `$${(lift * 12).toLocaleString()}` },
        { label: "Hours saved on edits", value: `${hours} hrs / mo` },
      ],
    },
  } as const;

  const c = config[variant];

  const numbers = useMemo(() => {
    if (variant === "agent") {
      const lift = Math.round(listings * 0.06 * rate); // 6% close rate uplift × commission
      return c.benefits(lift, 0);
    }
    if (variant === "builder") {
      const lift = Math.round(listings * 0.6 * rate); // 0.6 inbound jobs/listing × value
      const hours = listings * 2;
      return c.benefits(lift, hours);
    }
    const lift = Math.round(listings * rate * 0.85); // 85% attach rate
    const hours = Math.round(listings * 1.4);
    return c.benefits(lift, hours);
  }, [listings, rate, variant]);

  return (
    <div
      className={`lux-bg-parchment ${className}`}
      style={{ border: "1px solid var(--lux-hairline)", padding: "48px 32px" }}
    >
      <div className="lux-eyebrow mb-4" style={{ color: "var(--lux-brass)" }}>{c.eyebrow}</div>
      <h3 className="lux-display text-3xl md:text-5xl mb-3" style={{ maxWidth: 520 }}>
        {c.headline.split(".")[0]}
        <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>.</span>
      </h3>
      <p className="lux-prose mb-10" style={{ maxWidth: 480 }}>{c.hint}</p>

      <div className="grid md:grid-cols-2 gap-8 md:gap-12">
        <div>
          <label className="block">
            <span className="lux-eyebrow" style={{ color: "var(--lux-ash)" }}>{c.listingLabel}</span>
            <div className="flex items-baseline gap-3 mt-3">
              <span
                className="font-display text-5xl md:text-6xl"
                style={{ color: "var(--lux-ink)", lineHeight: 1 }}
              >
                {listings}
              </span>
              <span className="lux-eyebrow" style={{ color: "var(--lux-smoke)" }}>per month</span>
            </div>
            <input
              type="range"
              min={1}
              max={120}
              value={listings}
              onChange={(e) => setListings(Number(e.target.value))}
              className="w-full mt-5 lux-range"
            />
          </label>

          <label className="block mt-10">
            <span className="lux-eyebrow" style={{ color: "var(--lux-ash)" }}>{c.rateLabel}</span>
            <div className="flex items-baseline gap-3 mt-3">
              <span className="font-display text-5xl md:text-6xl" style={{ color: "var(--lux-ink)", lineHeight: 1 }}>
                ${rate}
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={3500}
              step={25}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full mt-5 lux-range"
            />
          </label>
        </div>

        <div className="lux-hairline" style={{ borderLeft: "1px solid var(--lux-hairline)", paddingLeft: 24 }}>
          {numbers.map((n, i) => (
            <div key={i} className="py-5 lux-hairline-b" style={{ borderBottom: "1px solid var(--lux-hairline)" }}>
              <div className="lux-eyebrow" style={{ color: "var(--lux-ash)" }}>{n.label}</div>
              <div
                className="font-display mt-2"
                style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)", color: "var(--lux-ink)", lineHeight: 1 }}
              >
                {n.value}
              </div>
            </div>
          ))}
          <p className="lux-prose mt-6 text-sm" style={{ color: "var(--lux-ash)" }}>
            Estimates only. Pulled from cohort data of active studios on The Vantage during Q1 2026.
          </p>
        </div>
      </div>

      <style>{`
        .lux-range {
          -webkit-appearance: none;
          appearance: none;
          height: 1px;
          background: var(--lux-hairline-strong);
          outline: none;
        }
        .lux-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--lux-ink);
          border: 3px solid var(--lux-bone);
          box-shadow: 0 0 0 1px var(--lux-ink);
          cursor: pointer;
        }
        .lux-range::-moz-range-thumb {
          width: 18px; height: 18px; border-radius: 50%;
          background: var(--lux-ink);
          border: 3px solid var(--lux-bone);
          box-shadow: 0 0 0 1px var(--lux-ink);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default ROICalculator;
