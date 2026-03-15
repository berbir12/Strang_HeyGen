import FeaturesSection from "@/components/FeaturesSection";
import SiteFooter from "@/components/SiteFooter";
import TopNav from "@/components/TopNav";

const FeaturesPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="pt-20">
        <FeaturesSection />
      </main>
      <SiteFooter />
    </div>
  );
};

export default FeaturesPage;
