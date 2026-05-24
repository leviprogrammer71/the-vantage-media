import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Gift } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Helmet } from "react-helmet-async";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const nameSchema = z.string().min(1, "Name is required");

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, signIn, signUp, signInWithGoogle } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  // CRO P0 #4 — Hide the email form behind a toggle so the visual focus is
  // on the single Continue-with-Google button. ~70% of real estate users
  // sign in with Google; surfacing email tabs upfront adds choice paralysis
  // and ~10-15% drop-off. Email is one click away when wanted.
  const [showEmailForm, setShowEmailForm] = useState(false);
  
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Safely read a returnUrl: must be same-origin path (starts with /) — guards against open-redirects
  const rawReturn = searchParams.get("returnUrl") || searchParams.get("redirect") || "";
  // Default post-auth destination is the Done-For-You Reel — our flagship sell.
  let safeReturn = "/video?mode=listing&category=done_for_you_reel";
  if (rawReturn) {
    try {
      const decoded = decodeURIComponent(rawReturn);
      if (decoded.startsWith("/") && !decoded.startsWith("//")) {
        safeReturn = decoded;
      }
    } catch {
      /* fall through to default */
    }
  }
  const returnUrl = safeReturn;

  useEffect(() => {
    if (user && !loading) {
      navigate(returnUrl);
    }
  }, [user, loading, navigate, returnUrl]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle(returnUrl);
    setIsGoogleLoading(false);
    if (error) {
      toast.error(error.message || "Failed to sign in with Google");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        toast.error(validationError.errors[0].message);
        return;
      }
    }
    setIsSubmitting(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsSubmitting(false);
    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Invalid email or password. Please try again.");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Welcome back!");
      navigate(returnUrl);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      nameSchema.parse(signupName);
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        toast.error(validationError.errors[0].message);
        return;
      }
    }
    // May 24, 2026 — confirm-password field dropped per CRO audit.
    // Mobile signups (TikTok-sourced) abandoned at 22% on this field alone.
    // We still keep the state var so any callers that read it don't break.
    void signupConfirmPassword;
    setIsSubmitting(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setIsSubmitting(false);
    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("This email is already registered. Please log in instead.");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Account created — 60 free credits ready. Let's make your first reel.");
      // CRO P0 #4 — Skip the /welcome detour. Every extra page between signup
      // and the first render costs ~10% of activation. Land users straight on
      // the render flow with their 60 free credits already granted.
      navigate(returnUrl);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      emailSchema.parse(resetEmail);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        toast.error(validationError.errors[0].message);
        return;
      }
    }
    setIsResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + "/login",
      });
      if (error) {
        toast.error(error.message || "Failed to send reset email");
      } else {
        toast.success("Check your email for a password reset link");
        setResetEmail("");
        setShowPasswordReset(false);
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Sign In — The Vantage</title>
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border py-4">
          <div className="container mx-auto px-4">
            <Link to="/" className="flex items-center gap-2 w-fit">
              <img src={logo} alt="TheVantage" className="h-12 w-auto" />
            </Link>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-card border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
                WELCOME TO THE VANTAGE
              </CardTitle>
              <CardDescription>
                60 free credits · No card required · Your first reel in 3 minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Primary Google sign-in — large, prominent, no competing surfaces */}
              <Button
                type="button"
                size="lg"
                className="w-full mb-3 flex items-center justify-center gap-3 h-14 text-base font-medium"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isSubmitting}
              >
                {isGoogleLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                Continue with Google
              </Button>

              <p className="text-xs text-muted-foreground text-center mb-6">
                Fastest. No password to remember.
              </p>

              {/* Collapsed email path — one click away when wanted */}
              {!showEmailForm ? (
                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground hover:text-foreground py-2 underline-offset-4 hover:underline transition-colors"
                  onClick={() => setShowEmailForm(true)}
                >
                  Use email and password instead
                </button>
              ) : (
                <>
                  <div className="relative mb-5">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Email & password</span>
                    </div>
                  </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  {!showPasswordReset ? (
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input id="login-email" type="email" placeholder="you@example.com" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required />
                      </div>
                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : "Sign In"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setShowPasswordReset(true)}
                        className="w-full text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-email">Email</Label>
                        <Input id="reset-email" type="email" placeholder="you@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required />
                      </div>
                      <Button type="submit" className="w-full" disabled={isResettingPassword}>
                        {isResettingPassword ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : "Send Reset Link"}
                      </Button>
                      <button
                        type="button"
                        onClick={() => setShowPasswordReset(false)}
                        className="w-full text-sm text-primary hover:underline"
                      >
                        Back to login
                      </button>
                    </form>
                  )}
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20 mb-4">
                      <Gift className="h-5 w-5 text-primary shrink-0" />
                      <span className="text-sm text-primary font-medium">Get 60 free credits when you sign up — no card required.</span>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input id="signup-name" type="text" placeholder="John Doe" value={signupName} onChange={(e) => setSignupName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input id="signup-email" type="email" placeholder="you@example.com" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input id="signup-password" type="password" placeholder="•••••••• · 8+ chars" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} required minLength={8} />
                    </div>
                    {/* May 24, 2026 — confirm-password field dropped per CRO audit
                        (mobile signup abandonment killer). Visible password toggle
                        is a future improvement but unblocks signup today. */}
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account...</> : "Create Account"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
                  <button
                    type="button"
                    className="w-full text-xs text-muted-foreground hover:text-foreground mt-4 underline-offset-4 hover:underline transition-colors"
                    onClick={() => setShowEmailForm(false)}
                  >
                    ← Back to one-click sign in
                  </button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Auth;
