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
    if (!supabase) return "Auth is not configured.";
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${SITE_URL}/login`,
      },
    });
    return error?.message ?? null;
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) return "Auth is not configured.";
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error?.message ?? null;
  };

  const signInWithOAuth = async (provider: Provider, redirectTo?: string) => {
    if (!supabase) return "Auth is not configured.";
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo ?? `${SITE_URL}/dashboard`,
      },
    });
    return error?.message ?? null;
  };

  const requestPasswordReset = async (email: string) => {
    if (!supabase) return "Auth is not configured.";
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/reset-password`,
    });
    return error?.message ?? null;
  };

  const updatePassword = async (password: string) => {
    if (!supabase) return "Auth is not configured.";
    const { error } = await supabase.auth.updateUser({ password });
    return error?.message ?? null;
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
