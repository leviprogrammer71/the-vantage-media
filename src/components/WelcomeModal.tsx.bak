import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const WELCOMED_KEY = "vantage_welcomed";

export function WelcomeModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(WELCOMED_KEY) === "true") return;

    // Check if this is a new user (created within last 60s)
    const isNew =
      new Date().getTime() - new Date(user.created_at).getTime() < 60000;

    if (!isNew) {
      localStorage.setItem(WELCOMED_KEY, "true");
      return;
    }

    // Grant 50 free credits (only inserts if no row exists)
    supabase
      .from("user_credits")
      .upsert(
        { user_id: user.id, credits: 50 },
        { onConflict: "user_id", ignoreDuplicates: true }
      )
      .then(() => {
        setShow(true);
      });
  }, [user]);

  // Progress bar animation + auto-redirect
  useEffect(() => {
    if (!show) return;
    const start = Date.now();
    const duration = 2500;
    const tick = () => {
      const elapsed = Date.now() - start;
      const pct = Math.min(elapsed / duration, 1);
      setProgress(pct * 100);
      if (pct < 1) {
        requestAnimationFrame(tick);
      } else {
        localStorage.setItem(WELCOMED_KEY, "true");
        navigate("/video?mode=transform");
      }
    };
    requestAnimationFrame(tick);
  }, [show, navigate]);

  const handleSkip = () => {
    localStorage.setItem(WELCOMED_KEY, "true");
    setShow(false);
    navigate("/video?mode=transform");
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-8"
      style={{ background: "#0A0A0A" }}
    >
      {/* Skip */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-6 font-mono text-[12px] bg-transparent border-none cursor-pointer"
        style={{ color: "#444444" }}
      >
        Skip →
      </button>

      <div className="text-center space-y-4">
        <div className="text-[56px]">🎁</div>
        <h2
          className="font-display font-bold text-[72px] leading-[0.9]"
          style={{ color: "#E8C547" }}
        >
          YOU'RE IN.
        </h2>
        <p className="font-mono text-[14px]" style={{ color: "#ffffff" }}>
          50 credits added to your account.
        </p>
        <p className="text-[15px]" style={{ color: "#AAAAAA" }}>
          That's enough for 12 transformation videos.
        </p>

        {/* Progress bar */}
        <div
          className="w-full max-w-[300px] mx-auto mt-6"
          style={{ height: 4, background: "#1A1A1A" }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "#E8C547",
              transition: "width 0.05s linear",
            }}
          />
        </div>
      </div>
    </div>
  );
}
