import LiveActivityPopup from "@/components/LiveActivityPopup";
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

const installUrl =
  import.meta.env.VITE_EXTENSION_INSTALL_URL?.trim() || "https://chromewebstore.google.com/";

const SiteFooter = () => {
  return (
    <footer className="border-t border-border bg-background/95">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <img
                src="/strang-logo.png"
                alt="Strang logo"
                className="w-9 h-9 rounded-lg border border-border/60 shadow-sm"
              />
              <span className="font-display text-2xl font-bold">Strang</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Strang turns selected text into clear AI explainer videos directly in your browser workflow.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              SOC2-ready infrastructure
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Navigate</p>
            <div className="space-y-2 text-sm">
              <Link to="/how-it-works" className="block hover:text-primary transition-colors">
                How it works
              </Link>
              <Link to="/features" className="block hover:text-primary transition-colors">
                Features
              </Link>
              <Link to="/reviews" className="block hover:text-primary transition-colors">
                Reviews
              </Link>
              <Link to="/pricing" className="block hover:text-primary transition-colors">
                Pricing
              </Link>
              <a href={installUrl} target="_blank" rel="noreferrer" className="block hover:text-primary transition-colors">
                Install extension
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Resources</p>
            <div className="space-y-2 text-sm">
              <Link to="/privacy" className="block hover:text-primary transition-colors">
                Privacy policy
              </Link>
              <Link to="/signup" className="block hover:text-primary transition-colors">
                Sign up
              </Link>
              <Link to="/login" className="block hover:text-primary transition-colors">
                Sign in
              </Link>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Stay in touch</p>
            <div className="space-y-2 text-sm">
              <a href="mailto:hello@strang.ai" className="block hover:text-primary transition-colors">
                hello@strang.ai
              </a>
              <a href="#" className="block hover:text-primary transition-colors">
                X (Twitter)
              </a>
              <a href="#" className="block hover:text-primary transition-colors">
                LinkedIn
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
          <p>© 2026 Strang. All rights reserved.</p>
          <p>Built to make technical topics easier to understand.</p>
        </div>
      </div>

      <LiveActivityPopup />
    </footer>
  );
};

export default SiteFooter;
