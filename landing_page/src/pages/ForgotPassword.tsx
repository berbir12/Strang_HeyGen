import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, MailCheck, Video, Sparkles, Zap } from "lucide-react";
import AuthShell from "@/components/auth/AuthShell";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  {
    icon: <Video className="h-4 w-4" />,
    title: "Text -> video in minutes",
    desc: "Paste complex content and turn it into polished explainers instantly.",
  },
  {
    icon: <Sparkles className="h-4 w-4" />,
    title: "AI script generation",
    desc: "Generate concise video-ready scripts from long-form material.",
  },
  {
    icon: <Zap className="h-4 w-4" />,
    title: "One-click workflow",
    desc: "Create videos directly from content you are already reading.",
  },
];

const ForgotPassword = () => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = await requestPasswordReset(email);
    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    setSent(true);
  };

  return (
    <AuthShell
      badge="Account recovery"
      heading={
        <>
          Recover access{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-300 to-pink-300">
            securely
          </span>
        </>
      }
      description="Enter your account email and we will send you a secure link to reset your password."
      features={features}
      quote="Resetting access for teammates is now clean and reliable. No support ticket loops."
      quoteAuthor="Ibrahim K."
      quoteRole="Operations Manager"
      cardTitle={sent ? "Check your email" : "Forgot your password?"}
      cardSubtitle={
        sent
          ? "We sent a password reset link. Open it on this device to continue."
          : "No worries. We will send you a reset link in seconds."
      }
    >
      {sent ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-purple-300/30 bg-purple-500/10 px-4 py-3 text-sm text-purple-100">
            <p className="flex items-start gap-2">
              <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Password reset link sent to <strong>{email}</strong>.
              </span>
            </p>
          </div>
          <p className="text-sm text-white/60">
            If you do not see it, check spam and promotions.
          </p>
          <Link
            to="/login"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 text-sm font-semibold text-white transition hover:from-purple-400 hover:to-pink-400"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="forgot-email" className="block text-sm font-medium text-white/90">
              Account email
            </label>
            <input
              id="forgot-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 text-sm text-white placeholder:text-white/40 transition focus:border-purple-300/60 focus:outline-none focus:ring-2 focus:ring-purple-300/25"
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-semibold text-white shadow-[0_0_30px_rgba(168,85,247,0.35)] transition hover:from-purple-400 hover:to-pink-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex items-center justify-center gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
            </span>
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-white/60">
        Remembered it?{" "}
        <Link to="/login" className="font-semibold text-purple-300 transition-colors hover:text-purple-200">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};

export default ForgotPassword;
