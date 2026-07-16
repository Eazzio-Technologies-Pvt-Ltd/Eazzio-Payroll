"use client";
import { useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Pricing() {
  const [activeIndex, setActiveIndex] = useState(1);
  const [isAnnual, setIsAnnual] = useState(false);
  const router = useRouter();

  const plans = [
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
      buttonStyle: "bg-white/5 hover:bg-white/10 text-white border border-white/10",
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
      buttonStyle: "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25",
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
      buttonStyle: "bg-white/5 hover:bg-white/10 text-white border border-white/10",
    },
  ];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + plans.length) % plans.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % plans.length);
  };

  const getCardStyle = (idx: number) => {
    // Calculate position relative to activeIndex (0 = Center, 1 = Right, 2 = Left)
    const diff = (idx - activeIndex + plans.length) % plans.length;

    // ACTIVE CARD (CENTER)
    if (diff === 0) {
      return {
        transform: "translateX(-50%) scale(1)",
        opacity: 1,
        zIndex: 30,
        filter: "brightness(1)",
      };
    }
    // RIGHT CARD
    else if (diff === 1) {
      return {
        transform: "translateX(35%) scale(0.85)",
        opacity: 0.5,
        zIndex: 20,
        filter: "brightness(0.6)",
        cursor: "pointer",
      };
    }
    // LEFT CARD
    else if (diff === 2) {
      return {
        transform: "translateX(-135%) scale(0.85)",
        opacity: 0.5,
        zIndex: 20,
        filter: "brightness(0.6)",
        cursor: "pointer",
      };
    }
    return {};
  };

  return (
    <section id="pricing" className="py-20 md:py-32 bg-slate-50 w-full overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 mb-12 text-center">
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
            className="relative w-14 h-7 rounded-full bg-blue-600 transition-colors focus:outline-none"
          >
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all transform ${isAnnual ? "translate-x-8" : "translate-x-1"}`} />
          </button>
          <span className={`text-sm font-semibold flex items-center gap-2 ${isAnnual ? "text-blue-600" : "text-slate-500"}`}>
            Annually <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Save 20%</span>
          </span>
        </div>

        {/* Dynamic State Text (Optional enhancement matching visual reference) */}
        <p className="text-blue-600 font-medium tracking-wide">
          {activeIndex + 1}. Showing {plans[activeIndex].name} Plan
        </p>
      </div>

      <div className="relative w-full max-w-[1200px] mx-auto h-[550px] md:h-[600px] flex items-center justify-center mt-8">

        {/* Left Arrow */}
        <button
          onClick={handlePrev}
          className="absolute left-4 md:left-10 top-1/2 -translate-y-1/2 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 cursor-pointer hover:scale-105 shadow-[0_0_15px_rgba(59,130,246,0.25)] backdrop-blur-md transition-all"
        >
          <ChevronLeft size={28} />
        </button>

        {/* Carousel Viewport */}
        <div className="relative w-full h-full overflow-hidden">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              onClick={() => {
                if (idx !== activeIndex) setActiveIndex(idx);
              }}
              className={`absolute top-0 left-1/2 w-[85%] md:w-[400px] h-full rounded-3xl p-8 flex flex-col transition-all duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] ${idx === activeIndex
                ? "bg-white border-2 border-blue-500 shadow-2xl shadow-blue-500/10"
                : "bg-white border-2 border-transparent shadow-xl"
                }`}
              style={{
                ...getCardStyle(idx),
                // Force a consistent minimum height so all cards align perfectly
                minHeight: "100%",
              }}
            >
              {(plan.isPopular && idx === activeIndex) && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                  Most Popular
                </div>
              )}

              <h3 className="text-2xl font-bold mb-2 uppercase tracking-wide text-slate-900">{plan.name}</h3>
              <p className="text-sm mb-6 min-h-[40px] text-slate-600">{plan.description}</p>

              <div className="mb-8">
                <span className="text-5xl font-black text-slate-900">
                  {isAnnual ? plan.priceAnnually : plan.priceMonthly}
                </span>
                {plan.period !== "" && <span className="ml-2 text-slate-500">{plan.period}</span>}
              </div>

              <button
                onClick={() => {
                  if (idx === activeIndex) {
                    router.push("/register");
                  }
                }}
                className={`w-full py-3.5 rounded-xl font-bold transition-all duration-200 mb-8 ${idx === activeIndex
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 cursor-pointer'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 pointer-events-none'
                  }`}
              >
                Get Started
              </button>

              <div className="flex flex-col gap-4 mt-auto">
                <p className="text-sm font-semibold uppercase tracking-wider mb-2 text-slate-500">What's included</p>
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 shrink-0 ${idx === activeIndex ? 'text-blue-500' : 'text-slate-400'}`} />
                    <span className="text-slate-600">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Right Arrow */}
        <button
          onClick={handleNext}
          className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 cursor-pointer hover:scale-105 shadow-[0_0_15px_rgba(59,130,246,0.25)] backdrop-blur-md transition-all"
        >
          <ChevronRight size={28} />
        </button>
      </div>

      {/* Dots */}
      <div className="flex justify-center items-center gap-3 mt-10">
        {plans.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIndex(idx)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${idx === activeIndex ? "bg-blue-500 scale-125" : "bg-slate-600 hover:bg-slate-500"
              }`}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>

    </section>
  );
}
