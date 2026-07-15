"use client";

import React, { useState, useEffect } from "react";
import { fetchClient } from "@/lib/fetch-client";

interface RazorpayCheckoutProps {
  plan: 'FREE' | 'BASIC' | 'PRO';
  isAnnual?: boolean;
  employeeCount?: number;
  onSuccess: () => void;
}

const BASE_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
    : "http://localhost:5000/api/v1";

export default function RazorpayCheckout({ plan, isAnnual, employeeCount, onSuccess }: RazorpayCheckoutProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePay = async () => {
    setLoading(true);
    try {
      const response = await fetchClient(`${BASE_URL}/payment/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan, isAnnual: isAnnual ?? false, employeeCount: employeeCount ?? 1 }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to create subscription order. Please try again.");
      }

      const data = await response.json();

      if (plan === "FREE") {
        if (data.success) {
          onSuccess();
        } else {
          alert("Failed to activate free plan.");
        }
        return;
      }

      const { orderId, amount, currency } = data;

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount,
        currency,
        name: "Eazzio",
        description: `${plan === "BASIC" ? "Basic" : "Pro"} Plan — ${isAnnual ? "Annual" : "Monthly"}`,
        order_id: orderId,
        theme: { color: "#4F46E5" },
        handler: async (responsePayload: any) => {
          try {
            const verifyRes = await fetchClient(`${BASE_URL}/payment/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(responsePayload),
              credentials: "include",
            });

            if (!verifyRes.ok) {
              throw new Error("Payment verification request failed.");
            }

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              onSuccess();
            } else {
              alert("Payment verification failed. Please contact support.");
            }
          } catch (verifyErr) {
            console.error("Verification error:", verifyErr);
            alert("Payment verification failed. Please contact support.");
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);

      rzp.on("payment.failed", function (resp: any) {
        console.error("Payment failed detail:", resp.error);
        alert("Payment failed. Please try again.");
        setLoading(false);
      });

      rzp.open();
    } catch (err: any) {
      console.error("RazorpayCheckout error:", err);
      alert(err.message || "An unexpected error occurred during payment checkout.");
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (loading) return "Processing...";
    if (plan === "FREE") return "Get Started — Free";
    return "Subscribe Now";
  };

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all duration-200 shadow-md ${
        loading
          ? "bg-indigo-400 cursor-not-allowed"
          : "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] hover:shadow-indigo-200 hover:shadow-lg"
      }`}
    >
      {getButtonText()}
    </button>
  );
}
