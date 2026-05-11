import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import { LogOut, CreditCard, Calendar, Mail, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProfileRow {
  email: string | null;
  full_name: string | null;
  credits_balance: number;
  credits_expire_at: string | null;
  created_at: string | null;
}

export default function Profile() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login?returnUrl=/profile", { replace: true });
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("email, full_name, credits_balance, credits_expire_at, created_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const p = data as ProfileRow | null;
      setProfile(p);
      setFullName(p?.full_name ?? "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate("/", { replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  const handleSaveName = async () => {
    if (!user) return;
    setSavingName(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Saved", description: "Your name has been updated." });
    } catch (err) {
      toast({
        title: "Error",
        description: (err as Error).message || "Couldn't save your name.",
        variant: "destructive",
      });
    } finally {
      setSavingName(false);
    }
  };

  const expiryInfo = computeExpiry(profile?.credits_expire_at);

  return (
    <div style={{ background: "var(--lux-bone)", minHeight: "100vh" }}>
      <LuxuryHeader />

      <main className="lux-container" style={{ paddingTop: 64, paddingBottom: 96 }}>
        <header style={{ marginBottom: 48 }}>
          <div className="lux-eyebrow" style={{ color: "var(--lux-brass)", marginBottom: 12 }}>
            ACCOUNT
          </div>
          <h1
            className="lux-display"
            style={{ color: "var(--lux-ink)", fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 1.02 }}
          >
            Your studio
          </h1>
          <p
            style={{
              color: "rgba(26,26,26,0.62)",
              fontSize: 17,
              marginTop: 12,
              maxWidth: 560,
              lineHeight: 1.5,
            }}
          >
            Manage your account, watch your credits, and sign out when you&rsquo;re done.
          </p>
        </header>

        {loading || authLoading ? (
          <div style={{ color: "rgba(26,26,26,0.5)" }} className="lux-eyebrow">
            LOADING&hellip;
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Identity */}
            <section
              style={{
                background: "white",
                border: "1px solid var(--lux-hairline)",
                padding: 28,
              }}
            >
              <div className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>
                IDENTITY
              </div>
              <div style={{ marginTop: 18 }}>
                <Row
                  icon={<Mail size={16} />}
                  label="EMAIL"
                  value={profile?.email || user?.email || "—"}
                />
                <Row
                  icon={<Calendar size={16} />}
                  label="MEMBER SINCE"
                  value={formatDate(profile?.created_at)}
                />
              </div>
              <div style={{ marginTop: 20 }}>
                <label
                  className="lux-eyebrow"
                  style={{
                    color: "rgba(26,26,26,0.55)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <User size={14} />
                  FULL NAME
                </label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Add your full name"
                  style={{
                    width: "100%",
                    marginTop: 8,
                    padding: "12px 14px",
                    background: "var(--lux-bone)",
                    border: "1px solid var(--lux-hairline)",
                    color: "var(--lux-ink)",
                    fontSize: 15,
                  }}
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="lux-eyebrow"
                  style={{
                    marginTop: 12,
                    background: "transparent",
                    border: "1px solid var(--lux-ink)",
                    color: "var(--lux-ink)",
                    padding: "10px 18px",
                    cursor: savingName ? "wait" : "pointer",
                    opacity: savingName ? 0.6 : 1,
                  }}
                >
                  {savingName ? "SAVING…" : "SAVE NAME"}
                </button>
              </div>
            </section>

            {/* Credits */}
            <section
              style={{
                background: "var(--lux-ink)",
                color: "var(--lux-bone)",
                padding: 28,
              }}
            >
              <div className="lux-eyebrow" style={{ color: "var(--lux-champagne)" }}>
                CREDITS
              </div>
              <div
                style={{
                  fontFamily: "'Suisse Works', Georgia, serif",
                  fontSize: "clamp(56px, 8vw, 96px)",
                  lineHeight: 1,
                  marginTop: 16,
                  fontStyle: "italic",
                  letterSpacing: "-0.01em",
                }}
              >
                {(profile?.credits_balance ?? 0).toLocaleString()}
              </div>
              <div
                className="lux-eyebrow"
                style={{ color: "rgba(244,239,230,0.62)", marginTop: 4 }}
              >
                AVAILABLE BALANCE
              </div>

              <div
                style={{
                  marginTop: 24,
                  paddingTop: 20,
                  borderTop: "1px solid rgba(244,239,230,0.16)",
                }}
              >
                <Row
                  dark
                  icon={<Calendar size={16} />}
                  label="EXPIRES"
                  value={
                    expiryInfo.formatted
                      ? `${expiryInfo.formatted} · ${expiryInfo.relative}`
                      : "—"
                  }
                  emphasize={expiryInfo.urgent}
                />
                <p
                  style={{
                    fontSize: 12,
                    color: "rgba(244,239,230,0.45)",
                    marginTop: 10,
                    lineHeight: 1.5,
                  }}
                >
                  Credits expire 12 months after your most recent purchase. Buying more
                  resets the clock for your whole balance.
                </p>
              </div>

              <Link
                to="/credits"
                className="lux-eyebrow"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--lux-bone)",
                  color: "var(--lux-ink)",
                  padding: "14px 22px",
                  marginTop: 28,
                }}
              >
                <CreditCard size={14} />
                ADD CREDITS &rarr;
              </Link>
            </section>

            {/* Session */}
            <section
              style={{
                background: "white",
                border: "1px solid var(--lux-hairline)",
                padding: 28,
                gridColumn: "1 / -1",
              }}
            >
              <div className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>
                SESSION
              </div>
              <p
                style={{
                  marginTop: 14,
                  color: "rgba(26,26,26,0.7)",
                  fontSize: 15,
                  lineHeight: 1.6,
                  maxWidth: 580,
                }}
              >
                Sign out to disconnect this device. Your account, credits, and gallery stay
                exactly where they are &mdash; sign back in whenever you&rsquo;re ready.
              </p>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="lux-eyebrow"
                style={{
                  marginTop: 22,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  background: "var(--lux-ink)",
                  color: "var(--lux-bone)",
                  padding: "14px 22px",
                  border: "1px solid var(--lux-ink)",
                  cursor: signingOut ? "wait" : "pointer",
                  opacity: signingOut ? 0.6 : 1,
                }}
              >
                <LogOut size={14} />
                {signingOut ? "SIGNING OUT…" : "SIGN OUT"}
              </button>
            </section>
          </div>
        )}
      </main>
      <LuxuryFooter />
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  dark,
  emphasize,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  dark?: boolean;
  emphasize?: boolean;
}) {
  const labelColor = dark ? "rgba(244,239,230,0.55)" : "rgba(26,26,26,0.55)";
  const valueColor = emphasize
    ? "var(--lux-brass)"
    : dark
    ? "var(--lux-bone)"
    : "var(--lux-ink)";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingBlock: 10,
        borderBottom: dark
          ? "1px solid rgba(244,239,230,0.08)"
          : "1px solid var(--lux-hairline)",
      }}
    >
      <span
        className="lux-eyebrow"
        style={{ color: labelColor, display: "inline-flex", alignItems: "center", gap: 8 }}
      >
        {icon}
        {label}
      </span>
      <span style={{ color: valueColor, fontSize: 15, fontWeight: emphasize ? 600 : 400 }}>
        {value}
      </span>
    </div>
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function computeExpiry(iso: string | null | undefined): {
  formatted: string | null;
  relative: string;
  urgent: boolean;
} {
  if (!iso) return { formatted: null, relative: "", urgent: false };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { formatted: null, relative: "", urgent: false };
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLeft = Math.round((date.getTime() - now.getTime()) / msPerDay);
  const formatted = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  let relative = "";
  let urgent = false;
  if (daysLeft < 0) {
    relative = "expired";
    urgent = true;
  } else if (daysLeft === 0) {
    relative = "today";
    urgent = true;
  } else if (daysLeft <= 30) {
    relative = `in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
    urgent = true;
  } else if (daysLeft <= 90) {
    relative = `in ${Math.round(daysLeft / 30)} months`;
    urgent = false;
  } else {
    const months = Math.round(daysLeft / 30);
    relative = `in ${months} month${months === 1 ? "" : "s"}`;
    urgent = false;
  }
  return { formatted, relative, urgent };
}
