import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";

/**
 * /welcome — New-signup celebration screen (Brief Task 9)
 * - Shows animated 50-credit counter
 * - Auto-redirects to ?next= (or /video?mode=transform) after 3s
 * - Only intended for accounts created in the last 60s; older users bypass automatically
 */
const Welcome = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();
  const [count, setCount] = useState(0);

  // Parse ?next= safely (same-origin path only)
  const rawNext = searchParams.get("next") || "";
  let next = "/video?mode=transform";
  try {
    const decoded = decodeURIComponent(rawNext);
    if (decoded.startsWith("/") && !decoded.startsWith("//")) next = decoded;
  } catch { /* ignore */ }

  // If user is not newly created (>60s old), skip straight to destination
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/login"); return; }
    const createdAtRaw = (user as any).created_at;
    const createdAt = createdAtRaw ? new Date(createdAtRaw).getTime() : 0;
    if (!createdAt || Date.now() - createdAt > 60_000) {
      navigate(next, { replace: true });
    }
  }, [user, loading, navigate, next]);

  // Animate 0 → 50 over ~1.2s
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const duration = 1200;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setCount(Math.round(50 * p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto-redirect 3s after mount
  useEffect(() => {
    const t = setTimeout(() => navigate(next, { replace: true }), 3000);
    return () => clearTimeout(t);
  }, [navigate, next]);

  return (
    <>
      <Helmet>
        <title>You&apos;re in — The Vantage</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div
        className="min-h-screen flex flex-col items-center justify-center text-center px-6 page-fade-in"
        style={{ background: "#0A0A0A", color: "#ffffff" }}
      >
        <p className="font-mono text-[11px] tracking-[3px] mb-4" style={{ color: "#E8C547" }}>
          WELCOME TO THE VANTAGE
        </p>
        <h1 className="font-display font-bold text-[48px] md:text-[72px] leading-[0.95] mb-6">
          YOU&apos;RE IN.
        </h1>
        <div
          className="mb-6 px-8 py-5"
          style={{ background: "rgba(232,197,71,0.08)", border: "1px solid rgba(232,197,71,0.3)" }}
        >
          <div className="font-display font-bold text-[56px] md:text-[80px] leading-none" style={{ color: "#E8C547" }}>
            {count}
          </div>
          <div className="font-mono text-[11px] tracking-[2px] mt-1" style={{ color: "#CCCCCC" }}>
            FREE CREDITS ADDED
          </div>
        </div>
        <p className="text-[15px] md:text-[17px] max-w-[480px] mb-8" style={{ color: "#BBBBBB" }}>
          That&apos;s enough for your first full transformation video. No card. No time limit.
        </p>
        <button
          onClick={() => navigate(next, { replace: true })}
          className="inline-block font-display text-[18px] font-bold px-[44px] py-[16px] transition-transform hover:scale-[1.03]"
          style={{ backgroundColor: "#E8C547", color: "#000000", borderRadius: 0 }}
        >
          CREATE YOUR FIRST VIDEO →
        </button>
        <p className="font-mono text-[10px] tracking-[2px] mt-6" style={{ color: "#666666" }}>
          REDIRECTING AUTOMATICALLY…
        </p>
      </div>
    </>
  );
};

export default Welcome;
