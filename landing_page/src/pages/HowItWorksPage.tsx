import HowItWorks from "@/components/HowItWorks";
import SiteFooter from "@/components/SiteFooter";
import TopNav from "@/components/TopNav";

const HowItWorksPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="pt-20">
        <HowItWorks />
      </main>
      <SiteFooter />
    </div>
  );
};

export default HowItWorksPage;
