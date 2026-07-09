import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (returnUrl?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Bootstrap a profile row with 60 credits if one doesn't exist yet.
    // The handle_new_user trigger handles this server-side, but it can
    // miss in edge cases (Auth UI flow that bypasses the trigger, OAuth
    // race, RLS quirk during signup). Calling ensure_profile_exists()
    // on every login is the safety net — it's idempotent and only runs
    // when the trigger didn't.
    const bootstrapProfile = async (newUser: User | null) => {
      if (!newUser) return;
      try {
        await supabase.rpc("ensure_profile_exists");
      } catch (err) {
        console.warn("[AuthContext] ensure_profile_exists failed (non-fatal):", err);
      }
      // ── Invite-code redemption (June 6, 2026) ──
      // The signup form stashes a validated code in localStorage; we redeem
      // it here, after the profile exists, so it works uniformly across
      // email signup, Google OAuth, and email-confirmation-delayed flows.
      // redeem_invite_code is idempotent (one code per user) so re-running
      // on every login is safe.
      try {
        const pending = localStorage.getItem("pending_invite_code");
        if (pending) {
          const { data } = await supabase.rpc("redeem_invite_code", { p_code: pending });
          localStorage.removeItem("pending_invite_code");
          const bonus = (data as { bonus_credits?: number } | null)?.bonus_credits ?? 0;
          if (bonus > 0) {
            // Soft toast — non-blocking. Imported lazily to avoid a hard dep here.
            import("sonner").then(({ toast }) =>
              toast.success(`Invite code applied — +${bonus} bonus credits added.`)
            ).catch(() => {});
          }
        }
      } catch (err) {
        console.warn("[AuthContext] redeem_invite_code failed (non-fatal):", err);
        localStorage.removeItem("pending_invite_code");
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        // Defer the RPC call — onAuthStateChange runs synchronously and
        // can't await network calls without breaking the listener.
        if (event === "SIGNED_IN" && session?.user) {
          setTimeout(() => bootstrapProfile(session.user), 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      // Also bootstrap on existing-session restore.
      if (session?.user) bootstrapProfile(session.user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auth redirects must land on a stable, live URL. Per-deploy *.vercel.app URLs
  // are ephemeral — they 404 after the deploy rotates (DEPLOYMENT_NOT_FOUND) —
  // so never use them as the OAuth/email redirect base. Localhost and the real
  // custom domains are fine; anything else falls back to the canonical domain.
  const authRedirectOrigin = () => {
    if (typeof window === "undefined") return "https://thevantage.media";
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith("thevantage.media")) {
      return window.location.origin;
    }
    return "https://thevantage.media";
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${authRedirectOrigin()}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signInWithGoogle = async (returnUrl?: string) => {
    const baseOrigin = authRedirectOrigin();

    // Validate returnUrl is a same-origin path (starts with single "/").
    let safeReturn: string | null = null;
    if (returnUrl) {
      try {
        const decoded = decodeURIComponent(returnUrl);
        if (decoded.startsWith('/') && !decoded.startsWith('//')) {
          safeReturn = decoded;
        }
      } catch {
        safeReturn = null;
      }
    }

    const redirectTo = safeReturn
      ? `${baseOrigin}/?returnUrl=${encodeURIComponent(safeReturn)}`
      : baseOrigin;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
      },
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
