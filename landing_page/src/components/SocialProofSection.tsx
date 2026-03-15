const logos = [
  "StudyFlow",
  "NovaLabs",
  "Imperial School",
  "Nexa Research",
  "Inception Program",
  "CreatorOps",
  "BrightLittle",
  "Atlas Learning",
  "Quantum Hub",
  "Veritas Team",
];

const SocialProofSection = () => {
  return (
    <section className="relative py-16 overflow-hidden bg-muted/50 dark:bg-[#050507]">
      <div
        className="absolute inset-0 opacity-20 dark:opacity-35 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,0,0,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.07) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
        }}
      />
      <div
        className="absolute inset-0 opacity-0 dark:opacity-35 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
        }}
      />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 text-foreground dark:text-white">
        <p className="text-center text-sm text-muted-foreground dark:text-white/70 mb-6">
          Trusted by teams, educators, and creators across industries
        </p>

        <div className="overflow-hidden">
          <div className="marquee-track">
            {[...logos, ...logos].map((name, i) => (
              <div key={`${name}-${i}`} className="marquee-card">
                {name}
              </div>
            ))}
          </div>
        </div>

        <div className="text-center pt-16">
          <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">
            Learning dense content should not feel impossible.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground dark:text-white/60">
            Slow reading • low retention • too much context switching
          </p>
        </div>

        <div className="relative mt-10 max-w-4xl mx-auto">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-fuchsia-400/80 to-transparent" />
          <div className="mt-1 h-px w-full bg-gradient-to-r from-transparent via-violet-500/70 to-transparent" />
          <div className="mt-6 mx-auto h-24 w-24 rounded-full bg-fuchsia-500/20 blur-2xl" />
        </div>

        <p className="pt-6 text-center text-xs text-muted-foreground dark:text-white/45">
          Powered by Strang's AI scene director and video generation pipeline
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
    </section>
  );
};

export default SocialProofSection;
