import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const AppleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.39.07 2.35.74 3.15.8 1.2-.24 2.35-.93 3.56-.84 1.5.12 2.63.72 3.37 1.84-3.29 1.97-2.52 6.27.56 7.5-.57 1.55-1.32 3.08-2.64 3.56zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const Login = () => {
  const { signIn, signInWithOAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExtension = searchParams.get("extension") === "true";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);

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
    // On success, Supabase redirects the browser — no local state change needed.
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = await signIn(email, password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    navigate(isExtension ? "/extension-auth" : "/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% -10%, hsl(265 90% 65% / 0.12), transparent)",
        }}
        aria-hidden
      />

      <div className="w-full max-w-[400px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center gap-3">
            <img
              src="/strang-logo.png"
              alt="Strang"
              className="w-14 h-14 rounded-2xl border border-border/60 shadow-lg"
            />
            <span className="font-display text-2xl font-bold tracking-tight">Strang</span>
          </Link>
          <h1 className="mt-4 font-display text-2xl font-bold">Welcome back</h1>
          <p className="mt-1.5 text-muted-foreground text-sm">
            Sign in to your account to continue
          </p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-xl p-8 space-y-5">
          {/* OAuth buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => handleOAuth("apple")}
              disabled={!!oauthLoading || loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-foreground text-background font-semibold text-sm border border-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {oauthLoading === "apple" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <AppleIcon />
              )}
              Continue with Apple
            </button>

            <button
              type="button"
              onClick={() => handleOAuth("google")}
              disabled={!!oauthLoading || loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-background text-foreground font-semibold text-sm border border-border hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              {oauthLoading === "google" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              or
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="block text-sm font-medium">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-secondary/60 border border-border text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-shadow text-sm"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="block text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-11 rounded-xl bg-secondary/60 border border-border text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-shadow text-sm"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !!oauthLoading}
              className="w-full glow-button flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign in"}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-muted-foreground mt-5">
          Don't have an account?{" "}
          <Link
            to={`/signup${isExtension ? "?extension=true" : ""}`}
            className="text-primary hover:text-primary/80 font-semibold transition-colors"
          >
            Create one free
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground/60 mt-4 flex items-center justify-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Secured with end-to-end encryption
        </p>
      </div>
    </div>
  );
};

export default Login;
