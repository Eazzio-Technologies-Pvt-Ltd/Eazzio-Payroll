import React from "react";
import Link from "next/link";
import Footer from "@/components/landing/Footer";
import { ArrowLeft } from "lucide-react";

interface SimplePageProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export default function SimplePage({ title, description, children }: SimplePageProps) {
  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-white text-slate-900 selection:bg-blue-500/20">
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 md:py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 mb-8 transition-colors group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Home
        </Link>
        <div className="space-y-2 mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          {description && (
            <p className="text-sm md:text-base text-slate-500 leading-relaxed">
              {description}
            </p>
          )}
        </div>
        <div className="h-px w-full bg-slate-100 mb-6" />
        <div className="text-sm md:text-base text-slate-600 leading-relaxed space-y-4">
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}
