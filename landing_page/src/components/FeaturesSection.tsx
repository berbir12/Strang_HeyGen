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
    <section className="border-b border-border bg-secondary/30 px-5 py-24">
      <div className="max-w-6xl mx-auto">
        <div className="mb-14 max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">What it does</p>
          <h2 className="mb-4 font-display text-4xl font-semibold sm:text-5xl">Useful by design.</h2>
          <p className="text-muted-foreground">
            Strang stays out of your way until a passage needs more than another read.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {featureCards.map((feature, i) => (
            <div
              key={feature.title}
              className="relative border-t border-border py-7"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-background">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground">
                  {feature.tag}
                </span>
              </div>

              <div className="text-xs font-semibold text-primary/80 mb-2">0{i + 1}</div>
              <h3 className="mb-2 font-display text-2xl font-semibold">{feature.title}</h3>
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
