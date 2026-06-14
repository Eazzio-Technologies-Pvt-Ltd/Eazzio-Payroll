"use client";

import Link from "next/link";
import { ChevronDown, Menu, X, UserPlus } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] w-full bg-[#07142A]/95 backdrop-blur-md border-b border-white/5 shadow-md">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <img src="/logo.png" alt="Eazzio Payroll" className="h-8 md:h-10 w-auto object-contain" />
        </div>

        {/* Right Side: Nav & Auth (Desktop) */}
        <div className="hidden md:flex items-center gap-12 ml-auto">
          {/* Desktop Nav Links */}
          <div className="flex items-center gap-8">
            {["Features", "Pricing", "Support"].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">
                {item}
              </a>
            ))}
          </div>

          {/* Desktop Auth Actions */}
          <div className="flex items-center gap-4 shrink-0">
            <Link
              href="/login"
              className="text-sm font-bold text-slate-300 hover:text-white transition-colors px-3 py-2"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold py-2.5 px-6 rounded-full flex items-center gap-2 shadow-lg hover:-translate-y-0.5 transition-all duration-200 shrink-0"
            >
              <UserPlus size={16} />
              Register
            </Link>
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-slate-300 hover:text-white p-2 -mr-2"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-[#07142a]/95 backdrop-blur-md z-50 border-b border-slate-800 p-6 flex flex-col gap-5 md:hidden shadow-2xl animate-in slide-in-from-top-2 duration-200">
          {["Features", "Pricing", "Support"].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} className="text-base font-semibold text-slate-200 hover:text-white transition-colors" onClick={() => setIsMobileMenuOpen(false)}>
              {item}
            </a>
          ))}
          <div className="h-px w-full bg-slate-800/80 my-1" />
          <div className="flex flex-col gap-4">
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-center text-base font-bold text-slate-200 hover:text-white transition-colors w-full py-2 bg-white/5 rounded-lg border border-slate-700/50 block"
            >
              Log In
            </Link>
            <Link
              href="/register"
              onClick={() => setIsMobileMenuOpen(false)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-center text-base font-bold py-3 rounded-lg w-full flex items-center justify-center gap-2 shadow-lg transition-colors block"
            >
              <UserPlus size={18} />
              Register
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
