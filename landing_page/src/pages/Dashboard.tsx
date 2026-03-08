import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Zap, CreditCard, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { STRANG_API_URL } from "@/lib/api";

const Dashboard = () => {
  const { user, session, profile, loading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    refreshProfile();
  }, [session?.access_token]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPro = profile?.subscription_status === "active" || profile?.subscription_status === "trialing";
  const videosUsed = profile?.videos_generated ?? 0;
  const videosLimit = profile?.videos_limit ?? 3;

  const handleCheckout = async () => {
    if (!STRANG_API_URL || !session?.access_token) return;
    try {
      const res = await fetch(`${STRANG_API_URL}/stripe/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
    }
  };

  const handlePortal = async () => {
    if (!STRANG_API_URL || !session?.access_token) return;
    try {
      const res = await fetch(`${STRANG_API_URL}/stripe/portal`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Portal error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            <span className="font-display text-xl font-bold">Strang</span>
          </Link>
          <button
            onClick={signOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">{user.email}</p>
        </div>

        {/* Subscription card */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Your Plan</h2>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isPro
                  ? "bg-primary/20 text-primary"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {isPro ? "Pro" : "Free"}
            </span>
          </div>

          {isPro ? (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Unlimited video generation. Thanks for subscribing!
              </p>
              <button
                onClick={handlePortal}
                className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
              >
                <CreditCard className="w-4 h-4" />
                Manage subscription
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                <strong className="text-foreground">{videosUsed}</strong> /{" "}
                {videosLimit} free videos used
              </p>
              <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (videosUsed / videosLimit) * 100)}%` }}
                />
              </div>
              <button onClick={handleCheckout} className="glow-button text-sm px-6 py-2.5">
                Upgrade to Pro
              </button>
            </div>
          )}
        </div>

        {/* Extension link */}
        <div className="glass-card p-6 space-y-3">
          <h2 className="font-display text-xl font-semibold">Chrome Extension</h2>
          <p className="text-muted-foreground text-sm">
            Install the Strang extension to generate videos from any webpage.
            After installing, click "Login" in the extension to connect your account.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
