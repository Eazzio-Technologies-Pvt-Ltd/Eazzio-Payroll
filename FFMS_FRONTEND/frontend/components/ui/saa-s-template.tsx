"use client";

import React from "react";
import Link from "next/link";
import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700", "800"] });

// Inline Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "gradient";
  size?: "default" | "sm" | "lg";
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", className = "", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      default: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
      secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200",
      ghost: "hover:bg-slate-100 text-slate-700 hover:text-slate-900",
      gradient: "bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:scale-105 active:scale-95"
    };
    
    const sizes = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-10 px-5 text-sm",
      lg: "h-12 px-8 text-base"
    };
    
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

// Icons
const Menu = ({ className = "", size = 24 }: { className?: string; size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
);

const X = ({ className = "", size = 24 }: { className?: string; size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

// Navigation Component (Light Theme)
const Navigation = React.memo(() => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="fixed top-0 w-full z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <nav className="max-w-7xl mx-auto px-6 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center shrink-0">
            <img src="/logo.png" alt="Eazzio Payroll" className="h-10 md:h-12 w-auto object-contain" />
          </div>
          
          <div className="hidden md:flex items-center justify-center gap-8 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#howitworks" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              How it works
            </a>
            <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Pricing
            </a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link href="/login">
              <Button type="button" variant="ghost" size="sm">
                Log In
              </Button>
            </Link>
            <Link href="/register">
              <Button type="button" variant="default" size="sm">
                Register
              </Button>
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden text-slate-900"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 animate-[slideDown_0.3s_ease-out]">
          <div className="px-6 py-4 flex flex-col gap-4">
            <a
              href="#features"
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Features
            </a>
            <a
              href="#howitworks"
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              How it works
            </a>
            <a
              href="#pricing"
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </a>
            <div className="flex flex-col gap-2 pt-4 border-t border-slate-200">
              <Link href="/login" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                <Button type="button" variant="ghost" size="sm" className="w-full">
                  Log In
                </Button>
              </Link>
              <Link href="/register" className="w-full" onClick={() => setMobileMenuOpen(false)}>
                <Button type="button" variant="default" size="sm" className="w-full">
                  Register
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
});

Navigation.displayName = "Navigation";

// Hero Component (Light Theme)
const Hero = React.memo(() => {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-start px-6 py-20 md:py-24 bg-transparent text-slate-900"
      style={{
        animation: "fadeIn 0.6s ease-out"
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* Badge */}
      <aside className="mb-6 inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 max-w-full">
        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
        <span className="text-xs font-semibold tracking-wide">
          Smart • Simple • Connected
        </span>
      </aside>

      {/* Headline */}
      <h1 className={`${dmSans.className} text-4xl md:text-5xl lg:text-6xl font-extrabold text-center max-w-4xl px-6 leading-tight mb-4 text-[#0a2a1a] tracking-tight`}>
        Smart Field Management for{" "}
        <span className="text-blue-600">Stronger Teams</span>
      </h1>

      {/* Subtitle */}
      <p className="text-sm md:text-base text-center max-w-2xl px-6 mb-8 text-slate-600 font-normal leading-relaxed">
        Automate salary calculations, attendance sync, and payslip generation — for every employee, every month, without errors.
      </p>

      {/* CTA Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 relative z-10 mb-4">
        <Link href="/register">
          <button className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-7 py-3 rounded-lg text-sm transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer">
            REGISTER NOW
          </button>
        </Link>
        <Link href="/register">
          <button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold px-7 py-3 rounded-lg text-sm transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer">
            Start free trial
          </button>
        </Link>
      </div>

      {/* Offer Sub-badge */}
      <p className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 px-4 py-1.5 rounded-full mb-12">
        FREE FOR UP TO 10 USERS — No credit card required
      </p>

      {/* Dashboard Preview Image */}
      <div className="w-full max-w-5xl relative pb-20">
        <div
          className="absolute left-1/2 w-[90%] pointer-events-none z-0"
          style={{
            top: "-23%",
            transform: "translateX(-50%)"
          }}
          aria-hidden="true"
        >
          <img
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80"
            alt="Background glow"
            className="w-full h-auto opacity-30 blur-3xl"
            loading="eager"
          />
        </div>
        
        <div className="relative z-10">
          <img
            src="/dashboard-preview.png"
            alt="Eazzio Admin Dashboard"
            className="w-full h-auto rounded-2xl shadow-2xl border border-slate-200"
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
});

Hero.displayName = "Hero";

// Main Component (Light Theme)
export default function Component() {
  return (
    <div className="min-h-screen bg-transparent text-slate-900">
      <Navigation />
      <Hero />
    </div>
  );
}
