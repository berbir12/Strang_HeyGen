import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Great for trying Strang and short daily learning.",
    features: [
      "3 videos per month",
      "Generate from highlighted or pasted text",
      "Watch in extension side panel",
      "Standard generation queue",
    ],
    cta: "Create free account",
    to: "/signup",
    featured: false,
  },
  {
    name: "Pro",
    price: "$19",
    period: "/month",
    description: "For students, creators, and teams that need more video volume.",
    features: [
      "Unlimited video generations",
      "Priority generation",
      "Shareable video links",
      "Faster support",
    ],
    cta: "Start Pro",
    to: "/signup",
    featured: true,
  },
];

const PricingSection = () => {
  return (
    <section id="pricing" className="py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-4">Simple Pricing</h2>
          <p className="text-muted-foreground">Start free, upgrade when you need more generation capacity.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 ${
                plan.featured
                  ? "border-primary/40 bg-primary/5 shadow-[0_0_30px_hsl(265_90%_65%/0.12)]"
                  : "border-border bg-card/40"
              }`}
            >
              <p className="text-sm font-medium text-muted-foreground">{plan.name}</p>
              <div className="mt-2 flex items-end gap-1">
                <p className="font-display text-4xl font-bold">{plan.price}</p>
                <p className="text-sm text-muted-foreground mb-1">{plan.period}</p>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={plan.to}
                className={`mt-8 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  plan.featured
                    ? "bg-primary text-primary-foreground hover:opacity-90"
                    : "bg-secondary hover:bg-secondary/80"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
