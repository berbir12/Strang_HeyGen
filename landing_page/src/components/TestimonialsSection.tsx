const testimonials = [
  {
    quote:
      "I use Strang while reading dense biology chapters. It helps me understand concepts much faster than re-reading paragraphs.",
    name: "Pre-med student",
    focus: "Retention",
  },
  {
    quote:
      "Instead of sending long docs, I turn key sections into short explainers for my team. It makes onboarding cleaner.",
    name: "Product manager",
    focus: "Team onboarding",
  },
  {
    quote:
      "The extension flow is the best part. Highlight text, click generate, and watch right there without context switching.",
    name: "Independent researcher",
    focus: "Workflow speed",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-3">User Proof</p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3">What users like most</h2>
          <p className="text-muted-foreground">Real workflows from people who learn and ship faster with Strang.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((item, i) => (
            <div
              key={item.name}
              className="relative rounded-2xl border border-border bg-card/70 backdrop-blur p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="absolute top-0 right-0 h-16 w-16 bg-primary/10 blur-2xl" />
              <div className="text-3xl leading-none text-primary/70 mb-4">"</div>
              <p className="text-sm leading-relaxed text-muted-foreground -mt-2">{item.quote}</p>
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.focus}</p>
                </div>
                <span className="text-xs font-semibold text-primary/80">0{i + 1}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
