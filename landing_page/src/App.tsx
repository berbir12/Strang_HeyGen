import Analytics from "@/components/Analytics";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/Privacy";
import HowItWorksPage from "./pages/HowItWorksPage";
import FeaturesPage from "./pages/FeaturesPage";
import ReviewsPage from "./pages/ReviewsPage";
import PricingPage from "./pages/PricingPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import ExtensionAuth from "./pages/ExtensionAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <Analytics />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/privacy" element={<Privacy />} />
              {/* Auth routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/extension-auth" element={<ExtensionAuth />} />
              {/* Auth routes redirect to waitlist until launch */}
              {/* <Route path="/login" element={<Navigate to="/#waitlist" replace />} /> */}
              {/* <Route path="/signup" element={<Navigate to="/#waitlist" replace />} /> */}
              {/* <Route path="/dashboard" element={<Navigate to="/#waitlist" replace />} /> */}
              {/* <Route path="/extension-auth" element={<Navigate to="/#waitlist" replace />} /> */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
