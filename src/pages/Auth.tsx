import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import SeatsStrip from "@/components/lux/SeatsStrip";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const nameSchema = z.string().min(1, "Name is required");

// Shared input styling so every field matches the luxury system.
const luxInput: React.CSSProperties = {
  width: "100%",
  padding: "13px 16px",
  background: "var(--lux-bone)",
  border: "1px solid var(--lux-hairline-strong)",
  color: "var(--lux-ink)",
  fontFamily: "Inter, sans-serif",
  fontSize: "0.95rem",
  outline: "none",
};
const luxLabel = "lux-eyebrow block mb-2";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, signIn, signUp, signInWithGoogle } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  // June 6, 2026 — email auth is first-class (many users sign up with a
  // business email, not Google). Shown by default, not behind a toggle.
  const [showEmailForm, setShowEmailForm] = useState(true);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // ── Invite code — private access gate ──
  const [inviteCode, setInviteCode] = useState("");
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestEmail, setRequestEmail] = useState("");
  const [requestName, setRequestName] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);

  // ── June 6, 2026 — signup is OPEN (founding-seats phase) ──
  // The site is open to everyone right now; scarcity comes from the limited
  // founding-seat count (see SeatsStrip), not a code gate. The invite-code
  // infrastructure stays in the DB so we can flip back to invite-only the
  // moment seats run out, but the UI no longer gates on a code.
  const isOpen = true;

  const rawReturn =
    searchParams.get("returnUrl") ||
    searchParams.get("redirect") ||
    searchParams.get("next") ||
    "";
  let safeReturn = "/video?mode=listing";
  if (rawReturn) {
    try {
      const decoded = decodeURIComponent(rawReturn);
      if (decoded.startsWith("/") && !decoded.startsWith("//")) safeReturn = decoded;
    } catch { /* default */ }
  }
  const returnUrl = safeReturn;

  useEffect(() => {
    if (user && !loading) navigate(returnUrl);
  }, [user, loading, navigate, returnUrl]);

  const validateInviteCode = async (code: string): Promise<boolean> => {
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("An invite code is required to create an account.");
      setShowRequestForm(true);
      return false;
    }
    try {
      const { data, error } = await supabase.rpc("check_invite_code", { p_code: trimmed });
      const res = data as { valid?: boolean; reason?: string } | null;
      if (error || !res?.valid) {
        toast.error(
          res?.reason === "exhausted"
            ? "That code has reached its limit. Request a fresh one below."
            : "That invite code isn't valid. Double-check it or request one below."
        );
        setShowRequestForm(true);
        return false;
      }
      localStorage.setItem("pending_invite_code", trimmed.toUpperCase());
      return true;
    } catch {
      toast.error("Couldn't verify the code. Please try again.");
      return false;
    }
  };

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try { emailSchema.parse(requestEmail); }
    catch (v) { if (v instanceof z.ZodError) { toast.error(v.errors[0].message); return; } }
    setIsRequesting(true);
    try {
      await supabase.rpc("request_invite_code", {
        p_email: requestEmail, p_name: requestName || null, p_note: null, p_source: "auth_page",
      });
      toast.success("Got it — we'll send you a code shortly. Check your email.");
      setRequestEmail(""); setRequestName(""); setShowRequestForm(false);
    } catch {
      toast.error("Couldn't submit your request. Please try again.");
    } finally { setIsRequesting(false); }
  };

  const handleGoogleSignIn = async () => {
    if (isOpen) {
      // Open variant — no code needed. Tag the signup 'OPEN' for attribution.
      localStorage.setItem("pending_invite_code", "OPEN");
    } else if (inviteCode.trim()) {
      const ok = await validateInviteCode(inviteCode);
      if (!ok) return;
    }
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle(returnUrl);
    setIsGoogleLoading(false);
    if (error) toast.error(error.message || "Failed to sign in with Google");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try { emailSchema.parse(loginEmail); passwordSchema.parse(loginPassword); }
    catch (v) { if (v instanceof z.ZodError) { toast.error(v.errors[0].message); return; } }
    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);
    if (error) {
      toast.error(error.message.includes("Invalid login credentials")
        ? "Invalid email or password. Please try again."
        : error.message);
    } else {
      toast.success("Welcome back!");
      navigate(returnUrl);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try { nameSchema.parse(signupName); emailSchema.parse(signupEmail); passwordSchema.parse(signupPassword); }
    catch (v) { if (v instanceof z.ZodError) { toast.error(v.errors[0].message); return; } }
    void signupConfirmPassword;
    if (isOpen) {
      // Open variant — skip the code gate, tag 'OPEN' for attribution.
      localStorage.setItem("pending_invite_code", "OPEN");
    } else {
      const codeOk = await validateInviteCode(inviteCode);
      if (!codeOk) return;
    }
    setIsSubmitting(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setIsSubmitting(false);
    if (error) {
      toast.error(error.message.includes("already registered")
        ? "This email is already registered. Please log in instead."
        : error.message);
    } else {
      toast.success("Account created — your free credits are ready. Let's make your first reel.");
      navigate(returnUrl);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try { emailSchema.parse(resetEmail); }
    catch (v) { if (v instanceof z.ZodError) { toast.error(v.errors[0].message); return; } }
    setIsResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + "/login",
      });
      if (error) toast.error(error.message || "Failed to send reset email");
      else { toast.success("Check your email for a password reset link"); setResetEmail(""); setShowPasswordReset(false); }
    } catch { toast.error("An error occurred. Please try again."); }
    finally { setIsResettingPassword(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen lux-bg-bone flex items-center justify-center">
        <div className="lux-spin" style={{ width: 40, height: 40, borderRadius: "50%", border: "2px solid var(--lux-hairline-strong)", borderTopColor: "var(--lux-rust)" }} />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Enter the Studio — The Vantage</title>
      </Helmet>
      <div className="min-h-screen lux-bg-bone flex flex-col" style={{ color: "var(--lux-ink)" }}>
        {/* Header */}
        <header style={{ borderBottom: "1px solid var(--lux-hairline)" }} className="py-5">
          <div className="lux-container">
            <Link to="/" className="lux-display w-fit block" style={{ fontSize: "1.5rem", fontStyle: "italic" }}>
              The Vantage
            </Link>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div
            className="w-full max-w-md"
            style={{ background: "var(--lux-cream)", border: "1px solid var(--lux-hairline-strong)" }}
          >
            {/* Card header */}
            <div className="px-8 pt-10 pb-6 text-center" style={{ borderBottom: "1px solid var(--lux-hairline)" }}>
              <div className="flex justify-center mb-4">
                <SeatsStrip variant="inline" />
              </div>
              <h1 className="lux-display" style={{ fontSize: "clamp(2rem, 5vw, 2.6rem)", lineHeight: 1 }}>
                Enter the
                <br />
                <span className="lux-display-italic" style={{ color: "var(--lux-rust)" }}>studio.</span>
              </h1>
              <p className="lux-prose mt-4" style={{ fontSize: "0.9rem" }}>
                Your first reel in three minutes. No card required.
              </p>
            </div>

            <div className="px-8 py-8">
              {/* ── Invite code (hidden in open mode) ── */}
              {!isOpen && (
              <div className="mb-6 p-4" style={{ background: "var(--lux-bone)", border: "1px solid var(--lux-hairline-strong)", borderLeft: "2px solid var(--lux-rust)" }}>
                <label htmlFor="invite-code" className={luxLabel} style={{ color: "var(--lux-rust)" }}>
                  ✦ INVITE CODE
                </label>
                <input
                  id="invite-code"
                  type="text"
                  placeholder="ENTER YOUR ACCESS CODE"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                  style={{ ...luxInput, letterSpacing: "0.18em", fontWeight: 500 }}
                />
                <div className="flex items-center justify-between mt-2.5">
                  <span className="lux-prose" style={{ fontSize: "0.7rem" }}>Required for new accounts.</span>
                  <button
                    type="button"
                    className="lux-eyebrow"
                    style={{ color: "var(--lux-rust)" }}
                    onClick={() => setShowRequestForm((s) => !s)}
                  >
                    REQUEST A CODE →
                  </button>
                </div>

                {showRequestForm && (
                  <form onSubmit={handleRequestCode} className="mt-4 space-y-2.5" style={{ borderTop: "1px solid var(--lux-hairline)", paddingTop: "1rem" }}>
                    <input type="text" placeholder="Your name (optional)" value={requestName} onChange={(e) => setRequestName(e.target.value)} style={luxInput} />
                    <input type="email" placeholder="you@example.com" value={requestEmail} onChange={(e) => setRequestEmail(e.target.value)} required style={luxInput} />
                    <button type="submit" disabled={isRequesting} className="lux-btn-ghost w-full flex items-center justify-center" style={{ padding: "12px", border: "1px solid var(--lux-hairline-strong)", color: "var(--lux-ink)" }}>
                      {isRequesting ? <Loader2 className="h-4 w-4 animate-spin" /> : "REQUEST AN INVITE CODE"}
                    </button>
                  </form>
                )}
              </div>
              )}

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isSubmitting}
                className="lux-btn w-full flex items-center justify-center"
                style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", padding: "16px", gap: "12px" }}
              >
                {isGoogleLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    CONTINUE WITH GOOGLE
                  </>
                )}
              </button>
              <p className="lux-prose text-center mt-3" style={{ fontSize: "0.75rem" }}>
                Fastest — no password to remember.
              </p>

              {/* Email path */}
              {!showEmailForm ? (
                <button
                  type="button"
                  className="lux-eyebrow w-full mt-5 py-2"
                  style={{ color: "var(--lux-ash)" }}
                  onClick={() => setShowEmailForm(true)}
                >
                  — OR USE EMAIL & PASSWORD —
                </button>
              ) : (
                <div className="mt-6">
                  {/* Divider — email is a first-class path, not a fallback */}
                  <div className="flex items-center gap-3 mb-6">
                    <span style={{ flex: 1, height: 1, background: "var(--lux-hairline)" }} />
                    <span className="lux-eyebrow" style={{ color: "var(--lux-ash)" }}>OR WITH EMAIL</span>
                    <span style={{ flex: 1, height: 1, background: "var(--lux-hairline)" }} />
                  </div>
                  {/* Tab toggle */}
                  <div className="grid grid-cols-2 mb-6" style={{ border: "1px solid var(--lux-hairline-strong)" }}>
                    {(["login", "signup"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className="lux-eyebrow py-3 transition-colors"
                        style={{
                          background: activeTab === t ? "var(--lux-ink)" : "transparent",
                          color: activeTab === t ? "var(--lux-bone)" : "var(--lux-ink)",
                        }}
                      >
                        {t === "login" ? "LOG IN" : "SIGN UP"}
                      </button>
                    ))}
                  </div>

                  {activeTab === "login" && (
                    !showPasswordReset ? (
                      <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                          <label htmlFor="login-email" className={luxLabel}>EMAIL</label>
                          <input id="login-email" type="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required style={luxInput} />
                        </div>
                        <div>
                          <label htmlFor="login-password" className={luxLabel}>PASSWORD</label>
                          <input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required style={luxInput} />
                        </div>
                        <button type="submit" disabled={isSubmitting} className="lux-btn w-full flex items-center justify-center" style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", padding: "15px" }}>
                          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "SIGN IN"}
                        </button>
                        <button type="button" onClick={() => setShowPasswordReset(true)} className="lux-eyebrow w-full" style={{ color: "var(--lux-rust)" }}>
                          FORGOT PASSWORD?
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handlePasswordReset} className="space-y-4">
                        <div>
                          <label htmlFor="reset-email" className={luxLabel}>EMAIL</label>
                          <input id="reset-email" type="email" placeholder="you@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required style={luxInput} />
                        </div>
                        <button type="submit" disabled={isResettingPassword} className="lux-btn w-full flex items-center justify-center" style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", padding: "15px" }}>
                          {isResettingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "SEND RESET LINK"}
                        </button>
                        <button type="button" onClick={() => setShowPasswordReset(false)} className="lux-eyebrow w-full" style={{ color: "var(--lux-rust)" }}>
                          ← BACK TO LOGIN
                        </button>
                      </form>
                    )
                  )}

                  {activeTab === "signup" && (
                    <form onSubmit={handleSignup} className="space-y-4">
                      <div className="p-3 flex items-center gap-3" style={{ background: "var(--lux-bone)", border: "1px solid var(--lux-hairline)" }}>
                        <span className="lux-display-italic" style={{ color: "var(--lux-rust)", fontSize: 22, lineHeight: 1 }}>✦</span>
                        <span className="lux-prose" style={{ fontSize: "0.8rem", color: "var(--lux-ink)" }}>
                          {isOpen ? "Get 60 free credits when you sign up — no card required." : "A valid invite code above unlocks signup + your free credits."}
                        </span>
                      </div>
                      <div>
                        <label htmlFor="signup-name" className={luxLabel}>FULL NAME</label>
                        <input id="signup-name" type="text" placeholder="Jane Realtor" value={signupName} onChange={(e) => setSignupName(e.target.value)} required style={luxInput} />
                      </div>
                      <div>
                        <label htmlFor="signup-email" className={luxLabel}>EMAIL</label>
                        <input id="signup-email" type="email" placeholder="you@example.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required style={luxInput} />
                      </div>
                      <div>
                        <label htmlFor="signup-password" className={luxLabel}>PASSWORD · 8+ CHARS</label>
                        <input id="signup-password" type="password" placeholder="••••••••" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={8} style={luxInput} />
                      </div>
                      <button type="submit" disabled={isSubmitting} className="lux-btn w-full flex items-center justify-center" style={{ background: "var(--lux-ink)", color: "var(--lux-bone)", padding: "15px" }}>
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "CREATE ACCOUNT"}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Auth;
