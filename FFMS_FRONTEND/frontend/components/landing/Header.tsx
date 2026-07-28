"use client";

import Link from "next/link";
import { Menu, X, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Features");
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        setVisible(true);
      } else {
        setVisible(false);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  return (
    <nav
      className="fixed top-4 left-0 right-0 mx-auto z-50 w-[calc(100%-2rem)] md:w-max max-w-[700px] rounded-full"
      style={{
        backgroundColor: "rgba(8, 29, 57, 0.75)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(24px)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "rgba(255, 255, 255, 0.12)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
        transform: visible ? "translateY(0)" : "translateY(-120%)",
        transition: "transform 0.3s ease",
      }}
    >
      <div className="flex items-center justify-between md:justify-start gap-6 px-5 py-2">
        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <img src="/logo.png" alt="Eazzio Payroll" className="h-7 w-auto object-contain" />
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-6">
          {["Features", "Pricing", "Support"].map((item) => {
            const isActive = activeTab === item;
            return (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                onClick={() => setActiveTab(item)}
                className={`relative px-3 py-1.5 text-sm font-semibold rounded-full transition-colors duration-200 ${
                  isActive ? "text-[#081d39]" : "text-white/80 hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="pill"
                    className="absolute inset-0 bg-white rounded-full"
                    style={{ zIndex: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{item}</span>
              </a>
            );
          })}
        </div>

        {/* Desktop Auth Actions */}
        <div className="hidden md:flex items-center gap-4 shrink-0 ml-auto">
          <Link
            href="/login"
            className="text-sm font-medium text-white/70 hover:text-white transition-colors px-2 py-1"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold py-1.5 px-4 rounded-full flex items-center gap-2 shadow-lg hover:-translate-y-0.5 transition-all duration-200 shrink-0"
          >
            <UserPlus size={14} />
            Register
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center shrink-0 ml-auto">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-slate-300 hover:text-white p-2"
            aria-label="Toggle Menu"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 w-full bg-[#07142a]/95 backdrop-blur-md z-50 border border-slate-800/80 p-6 flex flex-col gap-5 md:hidden shadow-2xl rounded-2xl mt-2 animate-in slide-in-from-top-2 duration-200">
          {["Features", "Pricing", "Support"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-base font-semibold text-slate-200 hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
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
