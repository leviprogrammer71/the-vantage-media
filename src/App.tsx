import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import ScrollToTop from "@/components/ScrollToTop";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { InstallBanner } from "@/components/InstallBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SkipToContent } from "@/components/SkipToContent";
import { Loader2 } from "lucide-react";

// Eager-load homepage
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Lazy-load secondary pages
const Generate = lazy(() => import("./pages/Generate"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profile = lazy(() => import("./pages/Profile"));
const Pricing = lazy(() => import("./pages/Pricing"));
const Contact = lazy(() => import("./pages/Contact"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const AgentsLanding = lazy(() => import("./pages/AgentsLanding"));
const AirbnbLanding = lazy(() => import("./pages/AirbnbLanding"));
const AgenciesLanding = lazy(() => import("./pages/AgenciesLanding"));
const WebsiteConsultation = lazy(() => import("./pages/WebsiteConsultation"));
const Video = lazy(() => import("./pages/Video"));
const Submit = lazy(() => import("./pages/Submit"));
const Share = lazy(() => import("./pages/Share"));
const Referral = lazy(() => import("./pages/Referral"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Demo = lazy(() => import("./pages/Demo"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="min-h-screen bg-background flex items-center justify-center" role="status" aria-label="Loading page">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <SkipToContent />
              <ScrollToTop />
              <MobileBottomNav />
              <InstallBanner />
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Auth />} />
                  <Route path="/signup" element={<Auth />} />
                  <Route path="/generate" element={<Generate />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/credits" element={<Pricing />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/for-agents" element={<AgentsLanding />} />
                  <Route path="/for-airbnb" element={<AirbnbLanding />} />
                  <Route path="/for-agencies" element={<AgenciesLanding />} />
                  <Route path="/consultation" element={<WebsiteConsultation />} />
                  <Route path="/video" element={<Video />} />
                  <Route path="/submit" element={<Submit />} />
                  <Route path="/share/:id" element={<Share />} />
                  <Route path="/referral" element={<Referral />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/demo" element={<Demo />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
