"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";

export default function CTABanner() {

  return (
    <section className="py-12 md:py-16 bg-slate-50 w-full px-4 sm:px-6 md:px-12 lg:px-20 flex items-center justify-center">
      <div className="w-full max-w-[1100px] mx-auto bg-gradient-to-br from-blue-900 to-blue-600 rounded-[2rem] py-12 px-8 md:px-16 text-center relative overflow-hidden shadow-2xl shadow-blue-900/20 min-h-[300px] flex flex-col justify-center">

        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3 pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center justify-center">
          <h2 className="font-heading text-2xl md:text-4xl lg:text-[40px] font-extrabold text-white mb-3 tracking-tight whitespace-normal md:whitespace-nowrap">
            Ready to transform your field operations?
          </h2>
          <p className="text-base md:text-lg text-blue-100 mb-8 max-w-[600px] leading-relaxed mx-auto">
            Join thousands of teams already using Eazzio Payroll to save time, reduce costs, and boost productivity.
          </p>

          <Link
            href="/register"
            className="bg-emerald-500 hover:bg-emerald-400 text-white text-base md:text-lg font-extrabold py-3.5 px-8 md:px-10 rounded-xl flex items-center justify-center gap-2 shadow-[0_8px_30px_rgba(16,185,129,0.3)] hover:-translate-y-1 transition-all duration-300"
          >
            <UserPlus size={20} strokeWidth={2.5} />
            GET STARTED FOR FREE
          </Link>
          <p className="mt-4 text-xs md:text-sm text-blue-200 font-medium">
            No credit card required • Setup in 2 minutes
          </p>
        </div>
      </div>
    </section>
  );
}
