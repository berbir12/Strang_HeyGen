import { useEffect, useState } from "react";
import { Check, Copy, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { getWaitlistCount, joinWaitlist } from "@/lib/api";

const FALLBACK_COUNT = 2500;
const referralLink = "https://strang.ai/?ref=waitlist";

const WaitlistForm = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    getWaitlistCount().then(setCount);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    const result = await joinWaitlist(email.trim());
    setLoading(false);

    if (result.ok) {
      setSubmitted(true);
      toast.success(result.message || "You're on the list! Welcome to the future.");
      getWaitlistCount().then(setCount);
    } else {
      toast.error(result.message || "Something went wrong. Try again.");
    }
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const displayCount =
    count !== null && count >= 0 ? `${count.toLocaleString()}+` : `${FALLBACK_COUNT.toLocaleString()}+`;

  return (
    <section id="waitlist" className="relative py-24 px-4">
      <div className="max-w-xl mx-auto text-center">
        <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
          Get Early Access
        </h2>
        <p className="text-muted-foreground mb-8">
          Join <span className="text-foreground font-semibold">{displayCount}</span> early adopters. Launching Spring 2026.
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
          <div className="glass-card p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Check className="w-6 h-6" />
              <span className="font-semibold text-lg">You're in!</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Share your referral link to move up the waitlist:
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={referralLink}
                className="flex-1 px-4 py-3 rounded-lg bg-secondary border border-border text-sm text-foreground truncate"
              />
              <button
                onClick={copyReferralLink}
                className="p-3 rounded-lg bg-secondary border border-border hover:bg-primary/10 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default WaitlistForm;
