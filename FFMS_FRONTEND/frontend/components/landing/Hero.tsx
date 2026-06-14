"use client";

import Link from "next/link";
import { MapPin, CheckCircle, TrendingUp, ShieldCheck, UserPlus } from "lucide-react";

export default function Hero() {

  return (
    <section className="relative w-full pt-32 pb-16 md:pt-40 md:pb-24 lg:pt-48 lg:pb-32 flex flex-col gap-6 md:gap-8 overflow-hidden">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="/landing-hero.png"
          alt="Field Workers"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/40 to-white/95 md:hidden" />
      </div>

      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 flex flex-col gap-6 md:gap-8">
        {/* Tagline pill */}
        <div className="inline-flex items-center gap-2 self-start bg-blue-50 border border-blue-200 rounded-full py-2 px-4 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          <span className="text-[10px] md:text-xs font-bold text-blue-700 tracking-[1.5px] uppercase">
            ✦ Smart • Simple • Connected
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl font-extrabold leading-[1.15] tracking-tight text-slate-900 max-w-4xl">
          Smart Field Management,
          <span className="block text-blue-600 mt-2">Stronger Teams.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base md:text-lg lg:text-xl leading-relaxed text-slate-600 max-w-[700px]">
          Empower your field workforce, track real-time activities, manage attendance, tasks, routes and locations — all in one intelligent platform.
        </p>

        {/* Feature Icons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mt-2 max-w-[700px]">
          {[
            { icon: <MapPin className="w-5 h-5" />, label: "Real-time Tracking", color: "text-blue-500", bg: "bg-blue-500/10" },
            { icon: <CheckCircle className="w-5 h-5" />, label: "Task Management", color: "text-emerald-500", bg: "bg-emerald-500/10" },
            { icon: <TrendingUp className="w-5 h-5" />, label: "Live Analytics", color: "text-purple-500", bg: "bg-purple-500/10" },
            { icon: <ShieldCheck className="w-5 h-5" />, label: "Secure & Reliable", color: "text-amber-500", bg: "bg-amber-500/10" },
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center ${f.color} shrink-0`}>
                {f.icon}
              </div>
              <span className="text-sm md:text-base font-bold text-slate-800">{f.label}</span>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 mt-6">
          <Link
            href="/register"
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-white text-sm md:text-base font-extrabold py-3.5 px-8 rounded-xl flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all duration-200"
          >
            <UserPlus size={18} strokeWidth={2.5} />
            REGISTER NOW
          </Link>
        </div>
      </div>
    </section>
  );
}
