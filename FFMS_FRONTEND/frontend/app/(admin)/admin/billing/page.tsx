"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import RazorpayCheckout from "@/components/payment/RazorpayCheckout";

const PLANS = [
  {
    id: "FREE" as const,
    name: "Free",
    priceMonthly: "₹0",
    priceAnnually: "₹0",
    priceSuffix: "",
    subtitle: "Try Eazzio at no cost",
    features: [
      "Up to 5 employees",
      "Basic attendance tracking",
      "Manual payroll calculation",
      "Daily activity logs",
      "Mobile App Access",
    ],
    highlight: false,
  },
  {
    id: "BASIC" as const,
    name: "Basic",
    priceMonthly: "₹99",
    priceAnnually: "₹79",
    priceSuffix: "/user/mo",
    subtitle: "For growing teams",
    features: [
      "Up to 30 employees",
      "Live GPS tracking & routes",
      "Automated Payroll & Payslips",
      "Expense & Claims Management",
      "Task & Visit Management",
      "Standard email support",
    ],
    highlight: false,
  },
  {
    id: "PRO" as const,
    name: "Pro",
    priceMonthly: "₹199",
    priceAnnually: "₹149",
    priceSuffix: "/user/mo",
    subtitle: "For large organizations",
    features: [
      "Unlimited employees",
      "Advanced Policy Violation Engine",
      "Real-time productivity analytics",
      "Dynamic Incentives & Deductions",
      "Custom Reports & Exports",
      "24/7 Priority Phone Support",
    ],
    highlight: true,
  },
];

export default function BillingPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>("PRO");
  const [isAnnual, setIsAnnual] = useState(false);

  const handleSuccess = () => {
    router.push("/admin/dashboard");
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <div className="text-center mb-6 animate-[fadeIn_0.5s_ease]">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
          Choose Your Plan
        </h1>
        <p className="mt-2 text-base md:text-lg text-slate-500 max-w-2xl mx-auto">
          Unlock the full power of Eazzio Field Force Management
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex justify-center items-center gap-4 mb-10 animate-[fadeIn_0.5s_ease]">
        <span className={`text-sm font-semibold ${!isAnnual ? "text-slate-900" : "text-slate-500"}`}>Monthly</span>
        <button 
          onClick={() => setIsAnnual(!isAnnual)}
          className="relative w-14 h-7 rounded-full bg-blue-600 transition-colors focus:outline-none"
        >
          <div className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all transform ${isAnnual ? "translate-x-8" : "translate-x-1"}`} />
        </button>
        <span className={`text-sm font-semibold flex items-center gap-2 ${isAnnual ? "text-slate-900" : "text-slate-500"}`}>
          Annually <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Save 20%</span>
        </span>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto w-full">
        {PLANS.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          
          return (
            <div
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`relative flex flex-col justify-between p-6 rounded-3xl border-2 transition-all duration-300 bg-white cursor-pointer hover:-translate-y-1 ${
                isSelected 
                  ? "border-blue-600 shadow-2xl shadow-blue-500/20" 
                  : "border-transparent shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:border-blue-300"
              } ${plan.highlight ? "md:scale-[1.02] z-10" : ""}`}
            >
              {/* Recommended Badge */}
              {plan.highlight && (
                <span className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg whitespace-nowrap">
                  Recommended
                </span>
              )}

              <div>
                {/* Plan Info */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{plan.subtitle}</p>
                </div>

                {/* Price */}
                <div className="mb-6 flex items-baseline">
                  <span className="text-4xl font-extrabold tracking-tight text-slate-900">
                    {isAnnual ? plan.priceAnnually : plan.priceMonthly}
                  </span>
                  <span className="ml-1 text-sm font-medium text-slate-500">
                    {plan.priceSuffix}
                  </span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle className={`h-5 w-5 flex-shrink-0 ${plan.highlight ? "text-blue-500" : "text-emerald-500"}`} />
                      <span className="text-sm font-medium text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Payment Button */}
              <div className="mt-auto pt-4 border-t border-slate-100">
                <RazorpayCheckout plan={plan.id} onSuccess={handleSuccess} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
