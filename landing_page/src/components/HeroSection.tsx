const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 pt-20 pb-16">
      {/* Background glow */}
      <div className="hero-glow absolute inset-0 pointer-events-none" />
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-primary/5 blur-[100px] animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[120px] animate-float" style={{ animationDelay: "3s" }} />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-8">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
          <span className="text-sm text-muted-foreground font-medium">Chrome Extension · Coming Spring 2026</span>
        </div>

        {/* Headline */}
        <h1 className="font-display text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
          Turn Static Text into{" "}
          <span className="text-gradient">Cinematic Explanations</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed">
          Highlight any complex topic—from medical conditions like VSD to quantum physics—and watch Visionary AI generate a 3D animated video in seconds.
        </p>

        {/* Product preview (no photo) */}
        <div className="relative mx-auto max-w-3xl glass-card p-5 md:p-6 animate-float text-left">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border/80 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Step 1</p>
              <p className="text-sm font-medium">Highlight or paste any complex text</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Step 2</p>
              <p className="text-sm font-medium">AI writes a clean visual script in seconds</p>
            </div>
            <div className="rounded-xl border border-border/80 bg-background/60 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Step 3</p>
              <p className="text-sm font-medium">Watch a short cinematic explainer video</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">Processing topic</p>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Generating video
              </span>
            </div>
            <p className="mt-2 text-base md:text-lg font-semibold">
              "How a ventricular septal defect affects blood flow"
            </p>
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
