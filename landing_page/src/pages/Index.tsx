import FAQ from "@/components/FAQ";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import WaitlistForm from "@/components/WaitlistForm";
import { Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            <span className="font-display text-xl font-bold">Strang</span>
          </div>
          <a
            href="#waitlist"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Join Waitlist
          </a>
        </div>
      </nav>

      <main>
        <HeroSection />
        <HowItWorks />
        <FAQ />
        <WaitlistForm />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4 text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          © 2026 Strang. All rights reserved.
        </p>
        <Link
          to="/privacy"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Privacy policy
        </Link>
      </footer>
    </div>
  );
};

export default Index;
