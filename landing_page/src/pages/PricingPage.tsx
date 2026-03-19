import PricingSection from "@/components/PricingSection";
import SiteFooter from "@/components/SiteFooter";
import TopNav from "@/components/TopNav";

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="pt-20">
        <PricingSection />
      </main>
      <SiteFooter />
    </div>
  );
};

export default PricingPage;
