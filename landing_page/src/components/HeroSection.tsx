import heroVisual from "@/assets/hero-visual.jpg";

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

        {/* Hero image */}
        <div className="relative mx-auto max-w-3xl glass-card p-2 animate-float">
          <img
            src={heroVisual}
            alt="3D cinematic visualization of text transforming into video"
            className="w-full rounded-xl"
          />
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
