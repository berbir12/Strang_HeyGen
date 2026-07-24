import FAQ from "@/components/FAQ";
import FeaturesSection from "@/components/FeaturesSection";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import PricingSection from "@/components/PricingSection";
import SocialProofSection from "@/components/SocialProofSection";
import SiteFooter from "@/components/SiteFooter";
import TopNav from "@/components/TopNav";
// import WaitlistForm from "@/components/WaitlistForm";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      <main>
        <HeroSection />
        <SocialProofSection />
        <HowItWorks />
        <FeaturesSection />
        <PricingSection />
        <FAQ />
        {/* <WaitlistForm /> */}
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
