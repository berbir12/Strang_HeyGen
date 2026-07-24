const bars = [40, 65, 48, 82, 58, 72, 44, 62, 88, 54, 70, 45];

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden border-b border-border px-5 pb-24 pt-36">
      <div className="hero-grid absolute inset-0 pointer-events-none" />

      <div className="relative z-10 mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <div>
          <div className="mb-7 flex items-center gap-3 text-sm font-medium">
            <span className="h-px w-8 bg-primary" />
            <span className="text-muted-foreground">Chrome extension · Now available</span>
          </div>

          <h1 className="mb-6 font-display text-5xl font-semibold leading-[0.98] tracking-[-0.035em] sm:text-6xl md:text-7xl">
            Turn the paragraph you’re stuck on into{" "}
            <span className="text-primary italic">a short video.</span>
          </h1>

          <p className="mb-8 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Highlight text on any page. Strang explains it visually in the browser, so you can
            keep reading without opening another app.
          </p>

          <div className="mb-8 flex flex-wrap items-center gap-5">
            <a href="/signup" className="primary-button">Try Strang free</a>
            <a
              href="#how-it-works"
              className="border-b border-foreground/40 pb-0.5 text-sm font-semibold text-foreground hover:border-foreground"
            >
              See how it works
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground">
            <p>3 free videos</p>
            <p>No credit card</p>
            <p>Works on most webpages</p>
          </div>
        </div>

        <div className="product-window rotate-[0.7deg] p-3 text-left">
          <div className="mb-3 flex items-center justify-between border-b border-border px-2 py-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-sm font-semibold">Strang</span>
            </div>
            <span className="text-xs text-muted-foreground">Side panel</span>
          </div>

          <div className="mb-3 rounded-md border border-border bg-secondary/45 p-4">
            <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground">
              FROM THE PAGE
            </p>
            <p className="text-sm leading-relaxed">
              “Photosynthesis is the process plants use to convert light energy into chemical
              energy…”
            </p>
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                CREATING YOUR VIDEO
              </p>
              <span className="text-xs tabular-nums">01:42</span>
            </div>
            <div className="mt-4 flex aspect-video flex-col justify-between rounded-sm bg-[#20231f] p-5 text-white">
              <p className="max-w-[12ch] font-display text-2xl leading-tight">
                How plants turn sunlight into fuel
              </p>
              <div className="flex h-12 items-end gap-1.5">
                {bars.map((height, index) => (
                  <span
                    key={index}
                    className="flex-1 bg-[#df694c]"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="mt-4 h-1 w-full overflow-hidden bg-secondary">
              <div className="h-full w-2/3 bg-primary" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
