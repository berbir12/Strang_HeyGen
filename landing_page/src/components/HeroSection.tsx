import { Link } from "react-router-dom";

const installUrl =
  import.meta.env.VITE_EXTENSION_INSTALL_URL?.trim() || "https://chromewebstore.google.com/";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden px-4 pt-28 pb-16">
      {/* Background glow */}
      <div className="hero-glow absolute inset-0 pointer-events-none" />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-primary/5 blur-[100px] animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[120px] animate-float" style={{ animationDelay: "3s" }} />

      <div className="relative z-10 max-w-6xl mx-auto grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
            <span className="text-sm text-muted-foreground font-medium">Chrome extension + web dashboard</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.08] mb-5">
            Understand any topic faster with{" "}
            <span className="text-gradient">AI explainer videos</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mb-8 leading-relaxed">
            Strang turns highlighted text into concise videos in your browser side panel. Sign up, install, and learn
            without switching tabs.
          </p>

          <div className="flex flex-wrap items-center gap-3 mb-7">
            <a href={installUrl} target="_blank" rel="noreferrer" className="glow-button">
              Install extension
            </a>
            <Link
              to="/signup"
              className="px-6 py-3 rounded-xl border border-border bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium"
            >
              Create account
            </Link>
            <Link
              to="/login"
              className="px-6 py-3 rounded-xl border border-border/80 hover:border-primary/40 transition-colors text-sm font-medium"
            >
              Sign in
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <p>Free plan available</p>
            <p>2-4 min generation</p>
            <p>Works on any webpage</p>
          </div>
        </div>

        <div className="glass-card p-5 md:p-6 animate-float text-left">
          <div className="rounded-xl border border-border/80 bg-background/60 p-4 mb-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Selected text</p>
            <p className="text-sm">
              "Photosynthesis is the process plants use to convert light energy into chemical energy..."
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 mb-4">
            <div className="rounded-xl border border-border/80 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Scene style</p>
              <p className="text-sm font-medium">Diagram + motion graphics</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Estimated duration</p>
              <p className="text-sm font-medium">45-60 seconds</p>
            </div>
          </div>
          <div className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">Generation status</p>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Generating video
              </span>
            </div>
            <p className="mt-2 text-base md:text-lg font-semibold">"How plants convert sunlight into energy"</p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-primary to-[hsl(290,90%,72%)]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
