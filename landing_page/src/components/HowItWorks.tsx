import { Highlighter, Play, Sparkles } from "lucide-react";

const steps = [
  {
    icon: Highlighter,
    title: "Highlight",
    eyebrow: "Input",
    description: "Select a paragraph from any webpage or paste text directly into Strang.",
    detail: "Works on docs, articles, wiki pages, and study material.",
  },
  {
    icon: Sparkles,
    title: "Generate",
    eyebrow: "Direction",
    description: "Strang plans scenes and chooses the right visual style for the concept.",
    detail: "Usually completes in 2-4 minutes depending on topic complexity.",
  },
  {
    icon: Play,
    title: "Understand",
    eyebrow: "Output",
    description: "Watch the explainer in your browser side panel and replay any time.",
    detail: "Open in a new tab or copy the link when you need to share.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-3">Workflow</p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">How Strang Works</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Three fast steps from reading to understanding, without leaving your browser.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="hidden md:block absolute top-10 left-[18%] right-[18%] h-px bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20" />
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-7 md:p-8 group transition-all duration-300 hover:border-primary/40 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-xs font-semibold text-primary/80 border border-primary/25 bg-primary/5 rounded-full px-3 py-1">
                  0{i + 1}
                </div>
              </div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                {step.eyebrow}
              </div>
              <h3 className="font-display text-2xl font-bold mb-3">{step.title}</h3>
              <p className="text-foreground/90 text-sm leading-relaxed mb-4">{step.description}</p>
              <p className="text-xs text-muted-foreground border-t border-border pt-4">{step.detail}</p>
              <div className="absolute inset-x-7 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-primary/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
          <span className="rounded-full border border-border px-3 py-1">No context switching</span>
          <span className="rounded-full border border-border px-3 py-1">Sidebar playback</span>
          <span className="rounded-full border border-border px-3 py-1">Shareable links</span>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
