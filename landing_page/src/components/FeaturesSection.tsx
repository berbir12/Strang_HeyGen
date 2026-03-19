import { Chrome, ShieldCheck, Sparkles, Video } from "lucide-react";

const featureCards = [
  {
    icon: Video,
    tag: "Capture",
    title: "Generate from any text",
    description: "Highlight text on articles, docs, or study materials and turn it into a short explainer video.",
    metric: "1-click start",
  },
  {
    icon: Sparkles,
    tag: "Direction",
    title: "AI-directed scene planning",
    description: "Strang chooses scene style by topic and creates a coherent script before rendering.",
    metric: "Format-aware",
  },
  {
    icon: Chrome,
    tag: "Workflow",
    title: "Built into your browser",
    description: "Open the side panel, generate, and watch without switching apps or copying links around.",
    metric: "No context switch",
  },
  {
    icon: ShieldCheck,
    tag: "Control",
    title: "Account and usage controls",
    description: "Sign in, track usage in your dashboard, and manage free vs Pro limits from one place.",
    metric: "Free + Pro",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-[0.18em] text-primary font-semibold mb-3">Core Advantages</p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Why Strang</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            A functional web app plus extension workflow designed to move from reading to understanding fast.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {featureCards.map((feature, i) => (
            <div
              key={feature.title}
              className="relative overflow-hidden rounded-2xl border border-border bg-card/70 backdrop-blur p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40"
            >
              <div className="absolute top-0 right-0 h-20 w-20 bg-primary/10 blur-2xl" />

              <div className="flex items-center justify-between mb-5">
                <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs font-medium rounded-full border border-border px-3 py-1 text-muted-foreground">
                  {feature.tag}
                </span>
              </div>

              <div className="text-xs font-semibold text-primary/80 mb-2">0{i + 1}</div>
              <h3 className="font-display text-2xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>

              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Outcome</span>
                <span className="text-xs font-semibold text-foreground">{feature.metric}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
