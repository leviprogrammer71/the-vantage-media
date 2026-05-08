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
    // Bootstrap a profile row with 50 credits if one doesn't exist yet.
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

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;

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
    const allowedOrigins = [window.location.origin, 'https://thevantage.media'];
    const baseOrigin = allowedOrigins.includes(window.location.origin)
      ? window.location.origin
      : 'https://thevantage.media';

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
