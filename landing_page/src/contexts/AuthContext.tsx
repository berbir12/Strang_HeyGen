import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Provider, Session, User } from "@supabase/supabase-js";
import { supabase, isAuthConfigured } from "@/lib/supabase";
import { STRANG_API_URL } from "@/lib/api";

const SITE_URL =
  import.meta.env.VITE_SITE_URL?.trim() ||
  (typeof window !== "undefined" ? window.location.origin : "https://www.thestrang.com");

function friendlyAuthError(raw: string | undefined | null, context: "signIn" | "signUp" | "oauth" | "reset" | "update"): string {
  const msg = (raw || "").toLowerCase();

  if (!msg) return "Something went wrong. Please try again.";

  if (msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch")) {
    return "Connection issue. Check your internet and try again.";
  }
  if (msg.includes("rate") || msg.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (msg.includes("invalid login") || msg.includes("invalid credentials")) {
    return "Incorrect email or password.";
  }
  if (msg.includes("email not confirmed")) {
    return "Please verify your email before signing in. Check your inbox for the confirmation link.";
  }
  if (msg.includes("user already registered") || msg.includes("already registered") || msg.includes("already exists")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (msg.includes("weak password") || msg.includes("password should be")) {
    return "Please use a stronger password (at least 6 characters).";
  }
  if (msg.includes("invalid email")) {
    return "That email address doesn't look valid.";
  }
  if (msg.includes("expired") || msg.includes("invalid token") || msg.includes("invalid jwt")) {
    return "This link is no longer valid. Please request a new one.";
  }
  if (msg.includes("same password") || msg.includes("different from the old")) {
    return "Please choose a new password that's different from your current one.";
  }

  switch (context) {
    case "signIn":
      return "We couldn't sign you in. Please try again.";
    case "signUp":
      return "We couldn't create your account. Please try again.";
    case "oauth":
      return "Sign-in didn't complete. Please try again.";
    case "reset":
      return "We couldn't send your reset link. Please try again.";
    case "update":
      return "We couldn't update your password. Please try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

interface UserProfile {
  plan: string;
  subscription_status: string;
  videos_generated: number;
  videos_limit: number;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  configured: boolean;
  signUp: (email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signInWithOAuth: (provider: Provider, redirectTo?: string) => Promise<string | null>;
  requestPasswordReset: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function fetchProfile(accessToken: string): Promise<UserProfile | null> {
  if (!STRANG_API_URL) return null;
  try {
    const res = await fetch(`${STRANG_API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.access_token) {
        fetchProfile(s.access_token).then(setProfile);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.access_token) {
        fetchProfile(s.access_token).then(setProfile);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    if (!supabase) return "Sign up is temporarily unavailable. Please try again soon.";
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${SITE_URL}/login`,
      },
    });
    return error ? friendlyAuthError(error.message, "signUp") : null;
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) return "Sign in is temporarily unavailable. Please try again soon.";
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error ? friendlyAuthError(error.message, "signIn") : null;
  };

  const signInWithOAuth = async (provider: Provider, redirectTo?: string) => {
    if (!supabase) return "Sign in is temporarily unavailable. Please try again soon.";
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo ?? `${SITE_URL}/dashboard`,
      },
    });
    return error ? friendlyAuthError(error.message, "oauth") : null;
  };

  const requestPasswordReset = async (email: string) => {
    if (!supabase) return "Password reset is temporarily unavailable. Please try again soon.";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/reset-password`,
    });
    return error ? friendlyAuthError(error.message, "reset") : null;
  };

  const updatePassword = async (password: string) => {
    if (!supabase) return "Password update is temporarily unavailable. Please try again soon.";
    const { error } = await supabase.auth.updateUser({ password });
    return error ? friendlyAuthError(error.message, "update") : null;
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (session?.access_token) {
      const p = await fetchProfile(session.access_token);
      setProfile(p);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        configured: isAuthConfigured,
        signUp,
        signIn,
        signInWithOAuth,
        requestPasswordReset,
        updatePassword,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
