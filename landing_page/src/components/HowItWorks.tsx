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
    <section id="how-it-works" className="border-b border-border px-5 py-24">
      <div className="max-w-6xl mx-auto">
        <div className="mb-14 grid gap-5 md:grid-cols-2 md:items-end">
          <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            From highlight to explanation.
          </h2>
          <p className="max-w-md text-muted-foreground md:justify-self-end">
            Three steps, all in the browser. No uploads, prompt writing, or new workspace.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="group relative border-t border-border py-6 md:py-8"
            >
              <div className="mb-8 flex items-center justify-between">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
                  <step.icon className="h-5 w-5 text-foreground" />
                </div>
                <div className="font-display text-xl text-muted-foreground">
                  0{i + 1}
                </div>
              </div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
                {step.eyebrow}
              </div>
              <h3 className="mb-3 font-display text-2xl font-semibold">{step.title}</h3>
              <p className="text-foreground/90 text-sm leading-relaxed mb-4">{step.description}</p>
              <p className="text-xs text-muted-foreground border-t border-border pt-4">{step.detail}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;
