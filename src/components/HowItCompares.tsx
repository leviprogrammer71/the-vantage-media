/**
 * "How It Compares" trust table — Brief Section B.
 * Placed on the pricing page, above the credit packs.
 */
const rows: { label: string; vantage: string; videographer: string; agency: string; diy: string }[] = [
  { label: "Cost per video",       vantage: "$1.30–$5.20",   videographer: "$500–$3,000", agency: "$300–$800/mo", diy: "Hours of your time" },
  { label: "Time to ready",        vantage: "3–5 minutes",   videographer: "Days to weeks", agency: "Days to weeks", diy: "Hours" },
  { label: "Before photo needed",  vantage: "No",            videographer: "Yes",          agency: "Yes",            diy: "Yes" },
  { label: "Cinematic quality",    vantage: "Yes",           videographer: "Yes",          agency: "Sometimes",      diy: "No" },
  { label: "TikTok / Reels ready", vantage: "Yes",           videographer: "Requires edit", agency: "Sometimes",     diy: "Requires edit" },
];

const Cell = ({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) => (
  <td
    className="px-3 md:px-4 py-3 md:py-4 text-[13px] md:text-[14px] align-top"
    style={{
      borderBottom: "1px solid #1F1F1F",
      background: highlight ? "rgba(232,197,71,0.05)" : "transparent",
      color: highlight ? "#E8C547" : "#CCCCCC",
      fontWeight: highlight ? 600 : 400,
    }}
  >
    {children}
  </td>
);

const HowItCompares = () => (
  <section aria-labelledby="compare-heading" className="my-12 md:my-16">
    <p className="font-mono text-[11px] tracking-[3px] text-center mb-2" style={{ color: "#E8C547" }}>
      HOW IT COMPARES
    </p>
    <h2 id="compare-heading" className="font-display font-bold text-[26px] md:text-[36px] text-center mb-8" style={{ color: "#ffffff" }}>
      The Vantage vs the alternatives
    </h2>

    <div className="overflow-x-auto" data-scroll-container>
      <table className="w-full min-w-[620px] border-collapse" style={{ background: "#0F0F0F" }}>
        <thead>
          <tr>
            <th className="px-3 md:px-4 py-3 text-left font-mono text-[11px] tracking-[1.5px]" style={{ color: "#AAAAAA", borderBottom: "1px solid #2A2A2A" }}>
              {""}
            </th>
            <th className="px-3 md:px-4 py-3 text-left font-mono text-[11px] tracking-[1.5px]" style={{ color: "#E8C547", borderBottom: "1px solid #2A2A2A", background: "rgba(232,197,71,0.08)" }}>
              THE VANTAGE
            </th>
            <th className="px-3 md:px-4 py-3 text-left font-mono text-[11px] tracking-[1.5px]" style={{ color: "#AAAAAA", borderBottom: "1px solid #2A2A2A" }}>
              VIDEOGRAPHER
            </th>
            <th className="px-3 md:px-4 py-3 text-left font-mono text-[11px] tracking-[1.5px]" style={{ color: "#AAAAAA", borderBottom: "1px solid #2A2A2A" }}>
              AGENCY
            </th>
            <th className="px-3 md:px-4 py-3 text-left font-mono text-[11px] tracking-[1.5px]" style={{ color: "#AAAAAA", borderBottom: "1px solid #2A2A2A" }}>
              DIY EDIT
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="px-3 md:px-4 py-3 md:py-4 font-display text-[14px]" style={{ color: "#ffffff", borderBottom: "1px solid #1F1F1F" }}>
                {r.label}
              </td>
              <Cell highlight>{r.vantage}</Cell>
              <Cell>{r.videographer}</Cell>
              <Cell>{r.agency}</Cell>
              <Cell>{r.diy}</Cell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

export default HowItCompares;
