import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Eye, EyeOff, Mail, Video, Sparkles, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthShell from "@/components/auth/AuthShell";

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const AppleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden>
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.39.07 2.35.74 3.15.8 1.2-.24 2.35-.93 3.56-.84 1.5.12 2.63.72 3.37 1.84-3.29 1.97-2.52 6.27.56 7.5-.57 1.55-1.32 3.08-2.64 3.56zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const features = [
  {
    icon: <Video className="w-4 h-4" />,
    title: "Text → video in minutes",
    desc: "Paste any dense content, get a polished explainer video back.",
  },
  {
    icon: <Sparkles className="w-4 h-4" />,
    title: "AI-written scripts",
    desc: "GPT-4 distills your content into a tight, engaging script automatically.",
  },
  {
    icon: <Zap className="w-4 h-4" />,
    title: "One-click from Chrome",
    desc: "Highlight text on any webpage and hit generate — no copy-paste needed.",
  },
];

const Signup = () => {
  const { signUp, signIn, signInWithOAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExtension = searchParams.get("extension") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  const oauthRedirect = isExtension
    ? "https://www.thestrang.com/extension-auth"
    : "https://www.thestrang.com/dashboard";

  const handleOAuth = async (provider: "google" | "apple") => {
    setError(null);
    setOauthLoading(provider);
    const err = await signInWithOAuth(provider, oauthRedirect);
    if (err) {
      setError(err);
      setOauthLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = await signUp(email, password);
    setLoading(false);
    if (err) { setError(err); return; }
    const signInErr = await signIn(email, password);
    if (!signInErr) {
      navigate(isExtension ? "/extension-auth" : "/dashboard");
      return;
    }
    setConfirmSent(true);
  };

  if (confirmSent) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07070c] px-4">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{ background: "radial-gradient(ellipse 70% 50% at 50% -10%, hsl(265 90% 65% / 0.2), transparent)" }}
          aria-hidden
        />
        <div className="relative z-10 w-full max-w-[430px] text-center">
          <div className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.04] p-10 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-purple-300/30 bg-purple-500/20">
              <Mail className="h-7 w-7 text-purple-200" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-white">Check your inbox</h1>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                We sent a confirmation link to{" "}
                <strong className="text-white">{email}</strong>.
                Click it to activate your account, then sign in.
              </p>
            </div>
            <Link
              to={`/login${isExtension ? "?extension=true" : ""}`}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 text-sm font-semibold text-white transition hover:from-purple-400 hover:to-pink-400"
            >
              Go to sign in
            </Link>
            <p className="text-xs text-white/50">
              No email? Check spam, or{" "}
              <button type="button" onClick={() => setConfirmSent(false)} className="font-medium text-purple-300 hover:underline">
                try again
              </button>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthShell
      badge="Free to get started"
      heading={
        <>
          Make complex ideas{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-pink-300">
            instantly clear
          </span>
        </>
      }
      description="Stop losing people to walls of text. Strang turns any dense content into videos your audience actually finishes."
      features={features}
      quote="I stopped writing long onboarding docs and now ship quick explainers people actually watch."
      quoteAuthor="Nadia R."
      quoteRole="Growth Lead"
      cardTitle="Create your account"
      cardSubtitle="Get started in under a minute. No credit card required."
    >
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleOAuth("apple")}
          disabled={!!oauthLoading || loading}
          className="h-12 w-full rounded-xl border border-white/15 bg-black px-4 text-sm font-semibold text-white transition hover:bg-black/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex items-center justify-center gap-2.5">
            {oauthLoading === "apple" ? <Loader2 className="h-4 w-4 animate-spin" /> : <AppleIcon />}
            Continue with Apple
          </span>
        </button>
        <button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={!!oauthLoading || loading}
          className="h-12 w-full rounded-xl border border-white/20 bg-white px-4 text-sm font-semibold text-[#1f1f1f] transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex items-center justify-center gap-2.5">
            {oauthLoading === "google" ? <Loader2 className="h-4 w-4 animate-spin text-gray-600" /> : <GoogleIcon />}
            Continue with Google
          </span>
        </button>
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-white/15" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">or</span>
        <div className="h-px flex-1 bg-white/15" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="signup-email" className="block text-sm font-medium text-white/90">
            Email address
          </label>
          <input
            id="signup-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 text-sm text-white placeholder:text-white/40 transition focus:border-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-300/25"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-password" className="block text-sm font-medium text-white/90">
            Password
          </label>
          <div className="relative">
            <input
              id="signup-password"
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 pr-10 text-sm text-white placeholder:text-white/40 transition focus:border-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-300/25"
              placeholder="At least 6 characters"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 transition-colors hover:text-white/85"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !!oauthLoading}
          className="h-12 w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-semibold text-white shadow-[0_0_30px_rgba(168,85,247,0.35)] transition hover:from-purple-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create free account"}
          </span>
        </button>

        <p className="text-center text-[11px] leading-relaxed text-white/50">
          By signing up you agree to our{" "}
          <Link to="/privacy" className="font-medium text-purple-300 underline underline-offset-2 transition-colors hover:text-purple-200">
            Privacy Policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-white/60">
        Already have an account?{" "}
        <Link
          to={`/login${isExtension ? "?extension=true" : ""}`}
          className="font-semibold text-purple-300 transition-colors hover:text-purple-200"
        >
          Sign in
        </Link>
      </p>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/40">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Encrypted and secured by Supabase
      </p>
    </AuthShell>
  );
};

export default Signup;
