import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import LuxuryHeader from "@/components/lux/LuxuryHeader";
import LuxuryFooter from "@/components/lux/LuxuryFooter";
import {
  LogOut,
  CreditCard,
  Calendar,
  Mail,
  User,
  Film,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProfileRow {
  email: string | null;
  full_name: string | null;
  credits_balance: number;
  credits_expire_at: string | null;
  created_at: string | null;
}

interface Transaction {
  id: string;
  credits_amount: number;
  transaction_type: string;
  description: string | null;
  created_at: string | null;
}

// ── shared CTA styles ────────────────────────────────────────────────────
// Two consistent sizes used across the entire app. Tap target ≥ 48px tall.
const CTA_PRIMARY: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  padding: "16px 28px",
  fontSize: 13,
  letterSpacing: "0.18em",
  minHeight: 48,
  cursor: "pointer",
  border: "1px solid currentColor",
};
const CTA_SECONDARY: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  padding: "12px 22px",
  fontSize: 12,
  letterSpacing: "0.18em",
  minHeight: 44,
  cursor: "pointer",
  background: "transparent",
  border: "1px solid currentColor",
};

export default function Profile() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [videoCount, setVideoCount] = useState<number>(0);
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
      const [profileRes, txRes, subsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("email, full_name, credits_balance, credits_expire_at, created_at")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("credit_transactions")
          .select("id, credits_amount, transaction_type, description, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("submissions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);
      if (cancelled) return;
      const p = profileRes.data as ProfileRow | null;
      setProfile(p);
      setFullName(p?.full_name ?? "");
      setTransactions((txRes.data as Transaction[] | null) ?? []);
      setVideoCount(subsRes.count ?? 0);
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
        title: "Couldn't save",
        description: (err as Error).message,
        variant: "destructive",
      });
    } finally {
      setSavingName(false);
    }
  };

  const expiry = computeExpiry(profile?.credits_expire_at);
  const firstName = (profile?.full_name || user?.email || "").split(/[ @]/)[0];
  const credits = profile?.credits_balance ?? 0;
  const totalSpent = transactions
    .filter((t) => t.credits_amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.credits_amount), 0);

  if (loading || authLoading) {
    return (
      <div style={{ background: "var(--lux-bone)", minHeight: "100vh" }}>
        <LuxuryHeader />
        <main className="lux-container" style={{ padding: "120px 0" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              color: "rgba(26,26,26,0.5)",
            }}
            className="lux-eyebrow"
          >
            <Loader2 size={18} className="animate-spin" />
            LOADING YOUR STUDIO&hellip;
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--lux-bone)", minHeight: "100vh" }}>
      <LuxuryHeader />

      <main className="lux-container" style={{ paddingTop: 56, paddingBottom: 96 }}>
        {/* HERO ----------------------------------------------------------- */}
        <header style={{ marginBottom: 48 }}>
          <div
            className="lux-eyebrow"
            style={{ color: "var(--lux-brass)", marginBottom: 14 }}
          >
            YOUR STUDIO
          </div>
          <h1
            className="lux-display"
            style={{
              color: "var(--lux-ink)",
              fontSize: "clamp(40px, 6vw, 72px)",
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
            }}
          >
            {firstName ? (
              <>
                Welcome back, <em style={{ color: "var(--lux-brass)" }}>{firstName}</em>.
              </>
            ) : (
              "Welcome back."
            )}
          </h1>
          <p
            style={{
              color: "rgba(26,26,26,0.62)",
              fontSize: 17,
              marginTop: 14,
              maxWidth: 580,
              lineHeight: 1.55,
            }}
          >
            Your credits, your work, your account &mdash; in one place. Buy more,
            sign out, or pick up where you left off.
          </p>

          {/* Quick action row */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              marginTop: 28,
            }}
          >
            <Link
              to="/video?mode=listing&category=done_for_you_reel"
              className="lux-eyebrow"
              style={{
                ...CTA_PRIMARY,
                background: "var(--lux-ink)",
                color: "var(--lux-bone)",
                borderColor: "var(--lux-ink)",
                textDecoration: "none",
              }}
            >
              <Film size={14} /> NEW REEL &rarr;
            </Link>
            <Link
              to="/credits"
              className="lux-eyebrow"
              style={{
                ...CTA_SECONDARY,
                color: "var(--lux-ink)",
                textDecoration: "none",
              }}
            >
              <CreditCard size={14} /> ADD CREDITS
            </Link>
            <Link
              to="/gallery"
              className="lux-eyebrow"
              style={{
                ...CTA_SECONDARY,
                color: "var(--lux-ink)",
                textDecoration: "none",
              }}
            >
              <Sparkles size={14} /> MY GALLERY
            </Link>
          </div>
        </header>

        {/* STATS GRID ----------------------------------------------------- */}
        <section
          className="grid gap-4 md:grid-cols-3"
          style={{ marginBottom: 40 }}
        >
          <StatTile
            label="AVAILABLE CREDITS"
            value={credits.toLocaleString()}
            sub={
              expiry.formatted
                ? `Expires ${expiry.relative}`
                : "No expiry set"
            }
            subEmphasize={expiry.urgent}
            dark
          />
          <StatTile
            label="REELS DELIVERED"
            value={videoCount.toLocaleString()}
            sub="Across all categories"
            icon={<Film size={16} />}
          />
          <StatTile
            label="CREDITS USED"
            value={totalSpent.toLocaleString()}
            sub="Recent activity below"
            icon={<TrendingUp size={16} />}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-2" style={{ marginBottom: 40 }}>
          {/* CREDITS DETAIL ------------------------------------------------ */}
          <section
            style={{
              background: "var(--lux-ink)",
              color: "var(--lux-bone)",
              padding: 32,
            }}
          >
            <div
              className="lux-eyebrow"
              style={{ color: "var(--lux-champagne)" }}
            >
              CREDIT EXPIRY
            </div>
            <div
              style={{
                fontFamily: "'Suisse Works', Georgia, serif",
                fontSize: "clamp(40px, 5vw, 56px)",
                lineHeight: 1.1,
                marginTop: 18,
                fontStyle: "italic",
                letterSpacing: "-0.01em",
              }}
            >
              {expiry.formatted || "—"}
            </div>
            <div
              className="lux-eyebrow"
              style={{
                color: expiry.urgent
                  ? "var(--lux-brass)"
                  : "rgba(244,239,230,0.62)",
                marginTop: 8,
              }}
            >
              {expiry.relative ? expiry.relative.toUpperCase() : "NO EXPIRY"}
            </div>

            {/* Progress bar */}
            {expiry.percentRemaining !== null && (
              <div style={{ marginTop: 28 }}>
                <div
                  style={{
                    height: 4,
                    background: "rgba(244,239,230,0.14)",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      height: "100%",
                      width: `${expiry.percentRemaining}%`,
                      background: expiry.urgent
                        ? "var(--lux-brass)"
                        : "var(--lux-champagne)",
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 10,
                    fontSize: 11,
                    letterSpacing: "0.16em",
                    color: "rgba(244,239,230,0.5)",
                  }}
                >
                  <span>STARTED</span>
                  <span>EXPIRES</span>
                </div>
              </div>
            )}

            <p
              style={{
                fontSize: 13,
                color: "rgba(244,239,230,0.55)",
                marginTop: 24,
                lineHeight: 1.55,
              }}
            >
              Credits stay valid for 12 months from your most recent purchase.
              Any new purchase resets the clock on your entire balance &mdash;
              so active customers effectively never see expiry.
            </p>

            <Link
              to="/credits"
              className="lux-eyebrow"
              style={{
                ...CTA_PRIMARY,
                background: "var(--lux-bone)",
                color: "var(--lux-ink)",
                borderColor: "var(--lux-bone)",
                marginTop: 28,
                textDecoration: "none",
              }}
            >
              <CreditCard size={14} /> ADD CREDITS &rarr;
            </Link>
          </section>

          {/* IDENTITY ------------------------------------------------------ */}
          <section
            style={{
              background: "white",
              border: "1px solid var(--lux-hairline)",
              padding: 32,
            }}
          >
            <div className="lux-eyebrow" style={{ color: "var(--lux-brass)" }}>
              IDENTITY
            </div>
            <Row
              icon={<Mail size={14} />}
              label="EMAIL"
              value={profile?.email || user?.email || "—"}
            />
            <Row
              icon={<Calendar size={14} />}
              label="MEMBER SINCE"
              value={formatDate(profile?.created_at)}
            />

            <div style={{ marginTop: 24 }}>
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
                  marginTop: 10,
                  padding: "14px 16px",
                  background: "var(--lux-bone)",
                  border: "1px solid var(--lux-hairline)",
                  color: "var(--lux-ink)",
                  fontSize: 15,
                  minHeight: 48,
                }}
              />
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="lux-eyebrow"
                style={{
                  ...CTA_SECONDARY,
                  marginTop: 14,
                  color: "var(--lux-ink)",
                  background: "transparent",
                  opacity: savingName ? 0.6 : 1,
                  cursor: savingName ? "wait" : "pointer",
                }}
              >
                {savingName ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> SAVING…
                  </>
                ) : (
                  "SAVE NAME"
                )}
              </button>
            </div>
          </section>
        </div>

        {/* RECENT ACTIVITY ---------------------------------------------- */}
        <section
          style={{
            background: "white",
            border: "1px solid var(--lux-hairline)",
            padding: 32,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>
              <div
                className="lux-eyebrow"
                style={{ color: "var(--lux-brass)" }}
              >
                RECENT ACTIVITY
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: "rgba(26,26,26,0.55)",
                  marginTop: 8,
                }}
              >
                Your last 8 credit movements.
              </p>
            </div>
            <Link
              to="/gallery"
              className="lux-eyebrow"
              style={{
                color: "var(--lux-ink)",
                opacity: 0.6,
                textDecoration: "none",
                fontSize: 11,
              }}
            >
              VIEW ALL →
            </Link>
          </div>

          {transactions.length === 0 ? (
            <div
              style={{
                padding: "32px 0",
                textAlign: "center",
                color: "rgba(26,26,26,0.45)",
                fontSize: 14,
              }}
            >
              No activity yet. Render your first reel to see credits move.
            </div>
          ) : (
            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                marginTop: 18,
              }}
            >
              {transactions.map((t) => {
                const positive = t.credits_amount > 0;
                return (
                  <li
                    key={t.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "16px 0",
                      borderTop: "1px solid var(--lux-hairline)",
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: positive
                          ? "rgba(139,111,61,0.12)"
                          : "rgba(26,26,26,0.06)",
                        color: positive
                          ? "var(--lux-brass)"
                          : "var(--lux-ink)",
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                      }}
                    >
                      {positive ? (
                        <ArrowUpRight size={16} />
                      ) : (
                        <ArrowDownRight size={16} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          color: "var(--lux-ink)",
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t.description ||
                          prettyType(t.transaction_type, positive)}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 11,
                          color: "rgba(26,26,26,0.5)",
                          letterSpacing: "0.12em",
                          marginTop: 4,
                          textTransform: "uppercase",
                        }}
                      >
                        <Clock size={11} /> {formatRelative(t.created_at)}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: positive
                          ? "var(--lux-brass)"
                          : "var(--lux-ink)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {positive ? "+" : ""}
                      {t.credits_amount.toLocaleString()}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* SIGN OUT ----------------------------------------------------- */}
        <section
          style={{
            background: "white",
            border: "1px solid var(--lux-hairline)",
            padding: 32,
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
              lineHeight: 1.55,
              maxWidth: 580,
            }}
          >
            Sign out to disconnect this device. Your account, credits, and
            gallery stay exactly where they are &mdash; sign back in whenever
            you&rsquo;re ready.
          </p>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="lux-eyebrow"
            style={{
              ...CTA_PRIMARY,
              marginTop: 24,
              background: "var(--lux-ink)",
              color: "var(--lux-bone)",
              borderColor: "var(--lux-ink)",
              opacity: signingOut ? 0.6 : 1,
              cursor: signingOut ? "wait" : "pointer",
            }}
          >
            {signingOut ? (
              <>
                <Loader2 size={14} className="animate-spin" /> SIGNING OUT…
              </>
            ) : (
              <>
                <LogOut size={14} /> SIGN OUT
              </>
            )}
          </button>
        </section>
      </main>
      <LuxuryFooter />
    </div>
  );
}

/* ── building blocks ──────────────────────────────────────────────────── */

function StatTile({
  label,
  value,
  sub,
  subEmphasize,
  dark,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  subEmphasize?: boolean;
  dark?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: dark ? "var(--lux-ink)" : "white",
        color: dark ? "var(--lux-bone)" : "var(--lux-ink)",
        border: dark ? "none" : "1px solid var(--lux-hairline)",
        padding: 28,
      }}
    >
      <div
        className="lux-eyebrow"
        style={{
          color: dark ? "var(--lux-champagne)" : "var(--lux-brass)",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {icon}
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Suisse Works', Georgia, serif",
          fontSize: "clamp(40px, 5vw, 56px)",
          lineHeight: 1.05,
          marginTop: 12,
          fontStyle: "italic",
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 13,
            color: subEmphasize
              ? dark
                ? "var(--lux-brass)"
                : "var(--lux-brass)"
              : dark
              ? "rgba(244,239,230,0.55)"
              : "rgba(26,26,26,0.55)",
            marginTop: 10,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        paddingBlock: 14,
        borderBottom: "1px solid var(--lux-hairline)",
      }}
    >
      <span
        className="lux-eyebrow"
        style={{
          color: "rgba(26,26,26,0.55)",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {icon}
        {label}
      </span>
      <span style={{ color: "var(--lux-ink)", fontSize: 15 }}>{value}</span>
    </div>
  );
}

/* ── helpers ──────────────────────────────────────────────────────────── */

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

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function prettyType(type: string, positive: boolean): string {
  if (type === "purchase") return "Credit purchase";
  if (type === "video_generation") return "Video generation";
  if (type === "signup_grant" || type === "signup_bonus") return "Signup credit";
  if (type === "refund") return "Refund";
  return positive ? "Credit added" : "Credit used";
}

function computeExpiry(iso: string | null | undefined): {
  formatted: string | null;
  relative: string;
  urgent: boolean;
  percentRemaining: number | null;
} {
  if (!iso)
    return { formatted: null, relative: "", urgent: false, percentRemaining: null };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime()))
    return { formatted: null, relative: "", urgent: false, percentRemaining: null };
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysLeft = Math.round((date.getTime() - now.getTime()) / msPerDay);
  const formatted = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  // 12-month total window; percent remaining of that window.
  const totalDays = 365;
  const percentRemaining = Math.max(
    0,
    Math.min(100, Math.round((daysLeft / totalDays) * 100)),
  );

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
  return { formatted, relative, urgent, percentRemaining };
}
