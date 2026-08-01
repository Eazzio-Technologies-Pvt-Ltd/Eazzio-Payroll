"use client";

import Header from "@/components/landing/Header";
import { PayrollHero } from "@/components/PayrollHero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Testimonials from "@/components/landing/Testimonials";
import Pricing from "@/components/landing/Pricing";
import CTABanner from "@/components/landing/CTABanner";
import Footer from "@/components/landing/Footer";
import { BgradientAnim } from "@/components/ui/soft-gradient-background-animation";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen w-full font-sans text-slate-900 overflow-x-hidden selection:bg-blue-500/30 landing-page-container">
      <div className="fixed inset-0 w-full h-full -z-10">
        <BgradientAnim animationDuration={8} />
      </div>
      <Header />
      <main>
        <PayrollHero />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <CTABanner />
      </main>
      <Footer />
    </div>
  );
}

