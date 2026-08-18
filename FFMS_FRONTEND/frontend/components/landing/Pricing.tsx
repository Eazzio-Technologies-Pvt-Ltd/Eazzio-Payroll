"use client";

import { useState, useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import PricingCarousel, { Plan } from "@/components/ui/v-carousel-12";

const pricingPlans: Plan[] = [
  {
    name: "FREE",
    priceMonthly: "₹0",
    priceAnnually: "₹0",
    period: "",
    description: "Try Eazzio at no cost.",
    features: [
      "Up to 5 employees",
      "Basic attendance tracking",
      "Manual payroll calculation",
      "Daily activity logs",
      "Mobile App Access"
    ],
    isPopular: false,
    badgeText: null,
  },
  {
    name: "BASIC",
    priceMonthly: "₹99",
    priceAnnually: "₹79",
    period: "/user/mo",
    description: "For growing teams.",
    features: [
      "Up to 30 employees",
      "Live GPS tracking & routes",
      "Automated Payroll & Payslips",
      "Expense & Claims Management",
      "Task & Visit Management",
      "Standard email support"
    ],
    isPopular: false,
    badgeText: "Recommended",
  },
  {
    name: "PRO",
    priceMonthly: "₹199",
    priceAnnually: "₹149",
    period: "/user/mo",
    description: "For large organizations.",
    features: [
      "Unlimited employees",
      "Advanced Policy Violation Engine",
      "Real-time productivity analytics",
      "Dynamic Incentives & Deductions",
      "Custom Reports & Exports",
      "24/7 Priority Phone Support"
    ],
    isPopular: true,
    badgeText: "Most Popular",
  },
];

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.92", "start 0.65"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 24,
    restDelta: 0.001,
  });

  const opacity = useTransform(smoothProgress, [0, 1], [0, 1]);
  const y = useTransform(smoothProgress, [0, 1], [40, 0]);
  const scale = useTransform(smoothProgress, [0, 1], [0.96, 1]);

  return (
    <section id="pricing" ref={containerRef} className="py-20 md:py-32 bg-transparent w-full overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 mb-12 text-center">
        <motion.div style={{ opacity, y, scale }}>
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">
            Pricing Plans
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-6">
            Choose the perfect plan for your team
          </p>

          {/* Billing Toggle */}
          <div className="flex justify-center items-center gap-4 mb-6">
            <span className={`text-sm font-semibold ${!isAnnual ? "text-blue-600" : "text-slate-500"}`}>Monthly</span>
            <button 
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-14 h-7 rounded-full bg-blue-600 transition-colors focus:outline-none cursor-pointer"
              aria-label="Billing frequency toggle"
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all transform ${isAnnual ? "translate-x-8" : "translate-x-1"}`} />
            </button>
            <span className={`text-sm font-semibold flex items-center gap-2 ${isAnnual ? "text-blue-600" : "text-slate-500"}`}>
              Annually <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Save 20%</span>
            </span>
          </div>
        </motion.div>
      </div>

      <motion.div style={{ opacity, y }} className="mt-8">
        <PricingCarousel isAnnual={isAnnual} plans={pricingPlans} />
      </motion.div>
    </section>
  );
}
