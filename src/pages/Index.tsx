import { Helmet } from "react-helmet-async";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import FreeCreditsCallout from "@/components/FreeCreditsCallout";
import PhoneShowcase from "@/components/PhoneShowcase";
import StatsBar from "@/components/StatsBar";
import HowItWorksSection from "@/components/HowItWorksSection";
import FeaturesSection from "@/components/FeaturesSection";
import PWAInstallSection from "@/components/PWAInstallSection";
import FAQSection from "@/components/FAQSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import StickyCTA from "@/components/StickyCTA";
import { WelcomeModal } from "@/components/WelcomeModal";
import { InProgressBanner } from "@/components/InProgressBanner";
import { CreditsEmptyBanner } from "@/components/CreditsEmptyBanner";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>The Vantage — Transformation Videos</title>
        <meta name="title" content="The Vantage — Transformation Videos for Contractors & Builders" />
        <meta
          name="description"
          content="Upload your after photo. We generate the cinematic before-and-after transformation video. 50 free credits, no card required."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://thevantage.co/" />
        <meta property="og:title" content="The Vantage — Transformation Videos" />
        <meta property="og:description" content="Upload your after photo. We generate cinematic transformation videos. 50 free credits to start." />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://thevantage.co/" />
        <meta property="twitter:title" content="The Vantage — Transformation Videos" />
        <meta property="twitter:description" content="Upload your after photo. We generate cinematic transformation videos. 50 free credits." />
        <link rel="canonical" href="https://thevantage.co/" />
      </Helmet>

      <div className="min-h-screen" style={{ background: "#0A0A0A" }}>
        <Header />
        <InProgressBanner />
        <main id="main-content">
          <HeroSection />
          <FreeCreditsCallout />
          <CreditsEmptyBanner />
          <PhoneShowcase />
          <StatsBar />
          <HowItWorksSection />
          <FeaturesSection />
          <PWAInstallSection />
          <FAQSection />
          <CTASection />
        </main>
        <Footer />
        <StickyCTA />
        <WelcomeModal />
      </div>
    </>
  );
};

export default Index;
