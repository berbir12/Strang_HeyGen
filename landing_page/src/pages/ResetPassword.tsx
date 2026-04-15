import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, Eye, EyeOff, Video, Sparkles, Zap } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const features = [
  {
    icon: <Video className="h-4 w-4" />,
    title: "Back to creating faster",
    desc: "Regain access quickly and get back to generating explainers.",
  },
  {
    icon: <Sparkles className="h-4 w-4" />,
    title: "Secure recovery session",
    desc: "Reset links are one-time and tied to secure recovery sessions.",
  },
  {
    icon: <Zap className="h-4 w-4" />,
    title: "No support needed",
    desc: "Update your password in-app without waiting for manual help.",
  },
];

const ResetPassword = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initRecovery = async () => {
      if (!supabase) {
        if (isMounted) setError("Auth is not configured.");
        return;
      }

      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          if (isMounted) setError(sessionError.message);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (isMounted) {
          setError("Reset link is invalid or expired. Request a new one.");
        }
        return;
      }

      if (isMounted) setReady(true);
    };

    initRecovery();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const err = await updatePassword(password);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      navigate("/login");
    }, 1500);
  };

  return (
    <AuthShell
      badge="Password reset"
      heading={
        <>
          Set a new{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-pink-300">
            secure password
          </span>
        </>
      }
      description="Choose a strong password and we will update your account immediately."
      features={features}
      quote="Password recovery is now frictionless and secure. Exactly what we needed."
      quoteAuthor="Maya T."
      quoteRole="Customer Success"
      cardTitle="Reset your password"
      cardSubtitle="Create a new password to finish account recovery."
    >
      {!ready && !error && (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/70">
          Verifying your reset link...
        </div>
      )}

      {error && (
        <div className="space-y-4">
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3.5 py-3 text-sm text-red-200">
            {error}
          </div>
          <Link
            to="/forgot-password"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 text-sm font-semibold text-white transition hover:from-purple-400 hover:to-pink-400"
          >
            Request new reset link
          </Link>
        </div>
      )}

      {ready && !error && !success && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="block text-sm font-medium text-white/90">
              New password
            </label>
            <div className="relative">
              <input
                id="new-password"
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

          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="block text-sm font-medium text-white/90">
              Confirm new password
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-12 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 pr-10 text-sm text-white placeholder:text-white/40 transition focus:border-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-300/25"
                placeholder="Repeat password"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 transition-colors hover:text-white/85"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-semibold text-white shadow-[0_0_30px_rgba(168,85,247,0.35)] transition hover:from-purple-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
            </span>
          </button>
        </form>
      )}

      {success && (
        <div className="rounded-xl border border-green-400/30 bg-green-500/10 px-4 py-4 text-sm text-green-100">
          <p className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Password updated successfully. Redirecting to sign in...
          </p>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-white/60">
        Need to sign in instead?{" "}
        <Link to="/login" className="font-semibold text-purple-300 transition-colors hover:text-purple-200">
          Back to login
        </Link>
      </p>
    </AuthShell>
  );
};

export default ResetPassword;
