import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import ConnectClaudePanel from "@/components/lux/ConnectClaudePanel";

/**
 * /connect — the Connect-to-Claude page. Signed-in agents mint a connector
 * token and follow the 3-step setup. Signed-out visitors are nudged to sign in.
 */
export default function ConnectClaude() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth?next=/connect");
  }, [loading, user, navigate]);

  return (
    <div style={{ background: "var(--lux-bone)", minHeight: "100vh" }}>
      <LuxuryHeader />
      <main className="mx-auto px-5 sm:px-8" style={{ maxWidth: 820, paddingTop: 48, paddingBottom: 80 }}>
        <div className="lux-eyebrow mb-3" style={{ color: "var(--lux-rust)" }}>
          <Link to="/dashboard" style={{ color: "var(--lux-ash)" }}>← DASHBOARD</Link>
        </div>
        <ConnectClaudePanel />
      </main>
      <LuxuryFooter />
    </div>
  );
}
