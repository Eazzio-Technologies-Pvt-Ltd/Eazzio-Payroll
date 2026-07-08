"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import RazorpayCheckout from "@/components/payment/RazorpayCheckout";

const PLANS = [
  {
    id: "FREE" as const,
    name: "Free",
    price: "₹0",
    subtitle: "Try Eazzio at no cost",
    features: [
      "Up to 5 employees",
      "Basic attendance tracking",
      "Basic payroll",
    ],
    highlight: false,
  },
  {
    id: "BASIC" as const,
    name: "Basic",
    price: "₹499/mo",
    subtitle: "For growing teams",
    features: [
      "Up to 30 employees",
      "Live field tracking",
      "Attendance + Payroll",
      "Email support",
    ],
    highlight: false,
  },
  {
    id: "PRO" as const,
    name: "Pro",
    price: "₹999/mo",
    subtitle: "For large organizations",
    features: [
      "Unlimited employees",
      "Advanced reports",
      "Geofencing validation",
      "Priority support",
    ],
    highlight: true,
  },
];

export default function BillingPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push("/admin/dashboard");
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Header */}
      <div className="text-center mb-16 animate-[fadeIn_0.5s_ease]">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Choose Your Plan
        </h1>
        <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
          Unlock the full power of Eazzio Field Force Management
        </p>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`relative flex flex-col justify-between p-8 rounded-2xl border transition-all duration-300 ${
              plan.highlight
                ? "border-indigo-500 shadow-xl scale-[1.03] z-10 bg-indigo-50/10 dark:bg-indigo-950/10"
                : "border-slate-200 dark:border-slate-800 shadow-md hover:shadow-lg bg-white dark:bg-slate-900"
            }`}
          >
            {/* Recommended Badge */}
            {plan.highlight && (
              <span className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                Recommended
              </span>
            )}

            <div>
              {/* Plan Info */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{plan.subtitle}</p>
              </div>

              {/* Price */}
              <div className="mb-8">
                <span className={`text-4xl font-extrabold ${plan.id === "FREE" ? "text-slate-900 dark:text-white" : "text-indigo-600 dark:text-indigo-400"}`}>
                  {plan.price}
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-600 dark:text-slate-300">
                    <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Payment Button */}
            <div className="mt-auto">
              <RazorpayCheckout plan={plan.id} onSuccess={handleSuccess} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
