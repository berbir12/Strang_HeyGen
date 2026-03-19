import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Mail, Trophy, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import { getWaitlistCount, joinWaitlist, WaitlistResult } from "@/lib/api";

const FALLBACK_COUNT = 2500;

/** Read the `?ref=` query parameter from the current URL. */
function getRefFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("ref");
}

/** Human-friendly position label: "You're #42 in line." */
function positionLabel(pos: number): string {
  if (pos <= 0) return "";
  if (pos === 1) return "You're first in line!";
  if (pos <= 10) return `You're #${pos} in line — top 10!`;
  if (pos <= 50) return `You're #${pos} in line — top 50!`;
  if (pos <= 100) return `You're #${pos} in line — top 100!`;
  return `You're #${pos.toLocaleString()} in line`;
}

/** Nudge copy shown below the referral link. */
function referralNudge(referralCount: number): string {
  if (referralCount === 0) return "Invite friends to jump ahead in the queue.";
  if (referralCount === 1) return `${referralCount} friend joined via your link — keep going!`;
  return `${referralCount} friends joined via your link — you're climbing fast!`;
}

const WaitlistForm = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [entry, setEntry] = useState<WaitlistResult | null>(null);

  useEffect(() => {
    getWaitlistCount().then(setCount);
  }, []);

  const referralLink = entry?.referral_code
    ? `${window.location.origin}/?ref=${entry.referral_code}`
    : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const refCode = getRefFromUrl();
    const result = await joinWaitlist(email.trim(), refCode);
    setLoading(false);

    if (result.ok) {
      setEntry(result);
      setSubmitted(true);
      getWaitlistCount().then(setCount);

      if (result.is_new === false) {
        toast.info("You're already on the list — here's your referral link!");
      } else {
        toast.success(result.message || "You're on the list! Welcome to the future.");
      }
    } else {
      toast.error(result.message || "Something went wrong. Try again.");
    }
  };

  const copyReferralLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const displayCount =
    count !== null && count >= 0
      ? `${count.toLocaleString()}+`
      : `${FALLBACK_COUNT.toLocaleString()}+`;

  const position = entry?.position ?? 0;
  const referralCount = entry?.referral_count ?? 0;

  return (
    <section id="waitlist" className="relative py-24 px-4">
      <div className="max-w-xl mx-auto text-center">
        <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
          Get Early Access
        </h2>
        <p className="text-muted-foreground mb-8">
          Join{" "}
          <span className="text-foreground font-semibold">{displayCount}</span>{" "}
          early adopters. Launching Spring 2026.
        </p>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                required
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="glow-button flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Join the Waitlist"
              )}
            </button>
          </form>
        ) : (
          <div className="glass-card p-6 space-y-5">
            {/* Confirmation header */}
            <div className="flex items-center justify-center gap-2 text-primary">
              <Check className="w-6 h-6" />
              <span className="font-semibold text-lg">
                {entry?.is_new === false ? "Welcome back!" : "You're in!"}
              </span>
            </div>

            {/* Position badge */}
            {position > 0 && (
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">
                    {positionLabel(position)}
                  </span>
                </div>
              </div>
            )}

            {/* Referral stats */}
            {referralCount > 0 && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4 text-primary" />
                <span>
                  <span className="text-foreground font-semibold">{referralCount}</span>{" "}
                  {referralCount === 1 ? "person" : "people"} joined via your link
                </span>
              </div>
            )}

            {/* Referral link */}
            {referralLink && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 justify-center text-sm text-muted-foreground">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span>{referralNudge(referralCount)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={referralLink}
                    className="flex-1 px-4 py-3 rounded-lg bg-secondary border border-border text-sm text-foreground truncate"
                  />
                  <button
                    onClick={copyReferralLink}
                    className="p-3 rounded-lg bg-secondary border border-border hover:bg-primary/10 transition-colors"
                    aria-label="Copy referral link"
                  >
                    {copied ? (
                      <Check className="w-4 h-4 text-primary" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Every referral moves you up the queue.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default WaitlistForm;
