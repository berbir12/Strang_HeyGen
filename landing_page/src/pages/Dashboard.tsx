import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, CreditCard, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { STRANG_API_URL } from "@/lib/api";

type LibraryItem = {
  id: string;
  status: string;
  video_url: string | null;
  project_title: string | null;
  key_takeaway: string | null;
  mode: string;
  goal: string;
  depth: string;
  input_text: string;
  created_at: number;
};

const Dashboard = () => {
  const { user, session, profile, loading, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [library, setLibrary] = useState<LibraryItem[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    refreshProfile();
  }, [session?.access_token]);

  useEffect(() => {
    if (!STRANG_API_URL || !session?.access_token) return;
    fetch(`${STRANG_API_URL}/library`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((response) => (response.ok ? response.json() : { items: [] }))
      .then((data) => setLibrary(data.items || []))
      .catch(() => setLibrary([]));
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
  const videosLimit = profile?.videos_limit ?? 1;
  const videosRemaining = Math.max(0, videosLimit - videosUsed);
  const usagePercent = videosLimit > 0 ? Math.min(100, (videosUsed / videosLimit) * 100) : 0;
  const periodEnd = profile?.current_period_end
    ? new Date(profile.current_period_end * 1000)
    : null;
  const periodLabel = periodEnd
    ? `Resets ${periodEnd.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`
    : "One-time trial allowance";

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
            <img
              src="/strang-logo.png"
              alt="Strang logo"
              className="w-9 h-9 rounded-lg border border-border/60 shadow-sm"
            />
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

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-border bg-secondary/35 p-4">
                <p className="text-xs font-medium text-muted-foreground">Used</p>
                <p className="mt-1 font-display text-3xl font-semibold">{videosUsed}</p>
              </div>
              <div className="rounded-md border border-border bg-secondary/35 p-4">
                <p className="text-xs font-medium text-muted-foreground">Remaining</p>
                <p className="mt-1 font-display text-3xl font-semibold">{videosRemaining}</p>
              </div>
              <div className="rounded-md border border-border bg-secondary/35 p-4">
                <p className="text-xs font-medium text-muted-foreground">Allowance</p>
                <p className="mt-1 font-display text-3xl font-semibold">{videosLimit}</p>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span>{videosUsed} of {videosLimit} videos used</span>
                <span className="text-muted-foreground">{periodLabel}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>

            {isPro ? (
              <button
                onClick={handlePortal}
                className="flex items-center gap-2 text-sm text-primary hover:underline font-medium"
              >
                <CreditCard className="w-4 h-4" />
                Manage subscription
                <ExternalLink className="w-3 h-3" />
              </button>
            ) : (
              <button onClick={handleCheckout} className="glow-button text-sm px-6 py-2.5">
                Upgrade to Pro
              </button>
            )}
          </div>
        </div>

        {/* Extension link */}
        <div className="glass-card p-6 space-y-3">
          <h2 className="font-display text-xl font-semibold">Chrome Extension</h2>
          <p className="text-muted-foreground text-sm">
            Install the Strang extension to generate videos from any webpage.
            After installing, click "Login" in the extension to connect your account.
          </p>
        </div>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Your library</p>
              <h2 className="mt-1 font-display text-3xl font-semibold">Recent explanations</h2>
            </div>
            <span className="text-xs text-muted-foreground">{library.length} saved</span>
          </div>

          {library.length === 0 ? (
            <div className="border-t border-border py-8 text-sm text-muted-foreground">
              Your completed Study and Research explanations will appear here.
            </div>
          ) : (
            <div className="divide-y divide-border border-y border-border">
              {library.map((item) => (
                <article key={item.id} className="grid gap-3 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {item.mode}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.depth} · {item.goal}</span>
                    </div>
                    <h3 className="font-display text-xl font-semibold">
                      {item.project_title || "Explanation in progress"}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {item.key_takeaway || item.input_text}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(item.created_at * 1000).toLocaleDateString()}
                    </p>
                  </div>
                  {item.video_url && (
                    <a
                      href={item.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      Watch video
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
