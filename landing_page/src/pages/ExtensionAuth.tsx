import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Zap, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Bridge page for the Chrome extension auth flow.
 *
 * 1. Extension opens this page in a tab.
 * 2. If user is already logged in, we post the token via window.postMessage.
 * 3. The content script (injected on all URLs) picks it up and forwards it
 *    to the background script via chrome.runtime.sendMessage.
 * 4. The extension stores the token in chrome.storage.local.
 */
const ExtensionAuth = () => {
  const { session, user, loading } = useAuth();
  const navigate = useNavigate();
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login?extension=true");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!session?.access_token || sent) return;

    window.postMessage(
      {
        type: "STRANG_AUTH_TOKEN",
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        email: user?.email,
      },
      "*",
    );
    setSent(true);
  }, [session, user, sent]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <Zap className="w-12 h-12 text-primary mx-auto" />

        {sent ? (
          <>
            <div className="flex items-center justify-center gap-2 text-primary">
              <Check className="w-6 h-6" />
              <span className="font-display text-xl font-semibold">Connected!</span>
            </div>
            <p className="text-muted-foreground">
              Your Strang extension is now linked to your account.
              You can close this tab and return to the extension.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-xl font-bold">Connecting extension…</h1>
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
          </>
        )}

        <Link
          to="/dashboard"
          className="inline-block text-sm text-primary hover:underline font-medium"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
};

export default ExtensionAuth;
