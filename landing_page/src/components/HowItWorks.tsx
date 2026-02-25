import { Highlighter, Play, Sparkles } from "lucide-react";

const steps = [
  {
    icon: Highlighter,
    title: "Highlight",
    description: "Select any text on any webpage—articles, research papers, textbooks.",
  },
  {
    icon: Sparkles,
    title: "Generate",
    description: "Strang's AI instantly creates a cinematic 3D explainer video.",
  },
  {
    icon: Play,
    title: "Understand",
    description: "Watch a professional-grade explainer video right in your browser sidebar.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">
            How It Works
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Three steps from confusion to clarity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="glass-card p-8 text-center group hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_30px_hsl(265_90%_65%/0.1)]"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6 group-hover:bg-primary/20 transition-colors">
                <step.icon className="w-7 h-7 text-primary" />
              </div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Step {i + 1}
              </div>
              <h3 className="font-display text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
