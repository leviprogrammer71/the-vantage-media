import { Link } from "react-router-dom";
import { useCtaNavigation } from "@/hooks/useCtaNavigation";

/**
 * Referral prompt — Brief Task 11.
 * Lightweight nudge shown on post-create and gallery screens:
 * "Love your video? Get 3 more free by inviting a mate."
 */
interface Props {
  className?: string;
}

const ReferralNudge = ({ className = "" }: Props) => {
  const { destinationFor } = useCtaNavigation();
  return (
    <aside
      className={`flex flex-col md:flex-row items-start md:items-center gap-4 justify-between p-5 ${className}`}
      style={{
        background: "linear-gradient(90deg, rgba(232,197,71,0.08), rgba(232,197,71,0.02))",
        border: "1px solid rgba(232,197,71,0.25)",
      }}
      aria-label="Referral offer"
    >
      <div>
        <p className="font-mono text-[10px] tracking-[2px] mb-1" style={{ color: "#E8C547" }}>
          REFER A MATE · GET 50 CREDITS
        </p>
        <p className="text-[15px] leading-[1.5]" style={{ color: "#ffffff" }}>
          Love your video? Get <strong>3 more free</strong> by inviting another tradie. They get 50 credits. You get 50 credits.
        </p>
      </div>
      <Link
        to={destinationFor("referral")}
        className="inline-block font-display text-[14px] font-bold px-5 py-3 whitespace-nowrap"
        style={{ backgroundColor: "#E8C547", color: "#000000", borderRadius: 0 }}
      >
        GRAB YOUR LINK →
      </Link>
    </aside>
  );
};

export default ReferralNudge;
