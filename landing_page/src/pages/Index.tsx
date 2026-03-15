import FAQ from "@/components/FAQ";
import FeaturesSection from "@/components/FeaturesSection";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import PricingSection from "@/components/PricingSection";
import SocialProofSection from "@/components/SocialProofSection";
import SiteFooter from "@/components/SiteFooter";
import TestimonialsSection from "@/components/TestimonialsSection";
import TopNav from "@/components/TopNav";
import { Link } from "react-router-dom";

const installUrl =
  import.meta.env.VITE_EXTENSION_INSTALL_URL?.trim() || "https://chromewebstore.google.com/";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <main>
        <HeroSection />
        <SocialProofSection />
        <HowItWorks />
        <FeaturesSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQ />

        <section className="py-20 px-4">
          <div className="max-w-4xl mx-auto rounded-2xl border border-primary/30 bg-primary/5 px-6 py-10 text-center">
            <h2 className="font-display text-3xl font-bold mb-3">Ready to turn text into video?</h2>
            <p className="text-muted-foreground mb-7">
              Create your account, install the extension, and generate your first explainer in minutes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link to="/signup" className="glow-button">
                Sign up
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 rounded-xl border border-border bg-secondary hover:bg-secondary/80 transition-colors text-sm font-medium"
              >
                Sign in
              </Link>
              <a
                href={installUrl}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3 rounded-xl border border-border/80 hover:border-primary/40 transition-colors text-sm font-medium"
              >
                Install extension
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
