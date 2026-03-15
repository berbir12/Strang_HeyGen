import SiteFooter from "@/components/SiteFooter";
import TestimonialsSection from "@/components/TestimonialsSection";
import TopNav from "@/components/TopNav";

const ReviewsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="pt-20">
        <TestimonialsSection />
      </main>
      <SiteFooter />
    </div>
  );
};

export default ReviewsPage;
