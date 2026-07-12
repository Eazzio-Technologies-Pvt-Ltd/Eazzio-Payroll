"use client";

import { 
  Zap, 
  ArrowRight, 
  Download, 
  Bell, 
  Store, 
  MapPin, 
  CheckCircle, 
  Map, 
  Cpu, 
  TrendingUp, 
  CalendarCheck, 
  Rocket
} from "lucide-react";
import Link from "next/link";

export default function ForceAdminLanding() {
  const handleAlert = (message: string) => {
    alert(message);
  };

  return (
    <div className="font-sans bg-slate-50 text-slate-800 antialiased overflow-x-hidden selection:bg-blue-600 selection:text-white min-h-screen">
      {/* Custom Styles */}
      <style jsx global>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
        .floating-mockup {
          animation: float 6s ease-in-out infinite;
        }
        .gradient-text {
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <span className="text-2xl font-bold text-blue-900 tracking-tight">ForceAdmin</span>
        </div>
        <div className="hidden md:flex gap-8 items-center font-medium text-slate-600">
          <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
          <a href="#solutions" className="hover:text-blue-600 transition-colors">Solutions</a>
          <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
        </div>
        <div>
          <button 
            onClick={() => handleAlert('Registration demo – start your free trial')}
            className="hidden md:block bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 hover:scale-102 hover:shadow-lg hover:shadow-blue-500/40 transition-all duration-300 text-white px-6 py-2.5 rounded-[30px] font-semibold text-sm shadow-md cursor-pointer"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-32 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] rounded-full bg-blue-100/50 blur-3xl -z-10"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[400px] h-[400px] rounded-full bg-indigo-100/50 blur-3xl -z-10"></div>

        <div className="container mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 relative z-10">
          
          {/* Hero Content */}
          <div className="w-full lg:w-1/2 flex flex-col items-center text-center lg:items-start lg:text-left space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 text-blue-600 font-semibold text-sm border border-blue-200 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-600 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
              </span>
              FREE FOR UP TO 10 USERS
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-blue-900 leading-[1.15] tracking-tight">
              TRANSFORM YOUR <br className="hidden lg:block" />
              FIELD OPERATIONS <br className="hidden lg:block" />
              WITH <span className="gradient-text">FORCEADMIN</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl">
              Simplify field management with our intuitive automation app. Streamline operations, automate workflows, track real‑time activity, and boost workforce productivity.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-2">
              <button 
                onClick={() => handleAlert('Registration demo – start your free trial')}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 hover:scale-102 hover:shadow-lg hover:shadow-blue-500/40 transition-all duration-300 text-white px-8 py-4 rounded-[30px] font-semibold text-base flex items-center justify-center gap-2 cursor-pointer"
              >
                REGISTER <ArrowRight className="w-5 h-5" />
              </button>
              <button 
                onClick={() => handleAlert('Brochure download would start here.')}
                className="border-2 border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-600 hover:text-blue-600 hover:scale-102 transition-all duration-300 px-8 py-4 rounded-[30px] font-semibold text-base flex items-center justify-center gap-2 bg-white cursor-pointer"
              >
                <Download className="w-5 h-5" /> DOWNLOAD BROCHURE
              </button>
            </div>

            <div className="flex items-center gap-4 pt-4 text-sm font-medium text-slate-500">
              <div className="flex -space-x-2">
                <img className="w-8 h-8 rounded-full border-2 border-white" src="https://i.pravatar.cc/100?img=1" alt="User" />
                <img className="w-8 h-8 rounded-full border-2 border-white" src="https://i.pravatar.cc/100?img=2" alt="User" />
                <img className="w-8 h-8 rounded-full border-2 border-white" src="https://i.pravatar.cc/100?img=3" alt="User" />
                <img className="w-8 h-8 rounded-full border-2 border-white" src="https://i.pravatar.cc/100?img=4" alt="User" />
              </div>
              <p>Trusted by <span className="text-blue-900 font-bold">2,500+</span> businesses</p>
            </div>
          </div>

          {/* Hero Image/Mockup */}
          <div className="w-full lg:w-1/2 flex justify-center relative">
            {/* Abstract Mobile Mockup */}
            <div className="relative w-full max-w-[380px] floating-mockup">
              <div className="relative bg-white rounded-[40px] shadow-2xl border-[8px] border-slate-800 h-[750px] overflow-hidden flex flex-col z-20">
                {/* Top Notch */}
                <div className="absolute top-0 inset-x-0 h-6 bg-slate-800 rounded-b-3xl w-1/2 mx-auto z-30"></div>

                {/* Dashboard UI */}
                <div className="bg-blue-600 pt-12 pb-6 px-6 text-white">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <p className="text-blue-200 text-xs">Good Morning,</p>
                      <h3 className="font-bold text-lg">Alex Field</h3>
                    </div>
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <Bell className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-[12px] p-4 flex gap-4 backdrop-blur-sm">
                    <div className="flex-1">
                      <p className="text-blue-200 text-xs mb-1">Today's Visits</p>
                      <h2 className="text-2xl font-bold">12 <span className="text-sm font-normal opacity-80">/ 15</span></h2>
                    </div>
                    <div className="w-px bg-white/20"></div>
                    <div className="flex-1">
                      <p className="text-blue-200 text-xs mb-1">Distance</p>
                      <h2 className="text-2xl font-bold">45<span className="text-sm font-normal opacity-80">km</span></h2>
                    </div>
                  </div>
                </div>

                {/* Map Section */}
                <div className="relative h-64 bg-slate-100 overflow-hidden">
                  {/* Abstract Map Background */}
                  <svg className="absolute inset-0 w-full h-full text-slate-200" fill="none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path stroke="currentColor" strokeWidth="0.5" d="M0,20 Q20,30 40,20 T80,10 T100,30 M0,50 Q30,60 50,40 T90,50 T100,40 M0,80 Q20,70 50,80 T80,60 T100,90"></path>
                    <path stroke="currentColor" strokeWidth="2" strokeDasharray="2,2" className="text-blue-600" d="M30,40 L45,55 L70,35"></path>
                  </svg>
                  {/* Map Pins */}
                  <div className="absolute top-[35%] left-[25%] text-blue-600 animate-bounce">
                    <MapPin className="w-6 h-6 drop-shadow-md fill-blue-600 text-white" />
                  </div>
                  <div className="absolute top-[50%] left-[40%] text-slate-400">
                    <div className="w-2.5 h-2.5 bg-slate-400 rounded-full"></div>
                  </div>
                  <div className="absolute top-[30%] left-[65%] text-red-500">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center shadow-md">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    </div>
                  </div>

                  {/* Location card popup */}
                  <div className="absolute bottom-4 left-4 right-4 bg-white rounded-xl shadow-lg p-3 flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-blue-900">TechStore Inc.</h4>
                      <p className="text-xs text-slate-500">ETA: 5 mins (1.2km)</p>
                    </div>
                  </div>
                </div>

                {/* Tasks Section */}
                <div className="flex-1 bg-slate-50 p-6 overflow-y-auto">
                  <h3 className="font-bold text-blue-900 mb-4">Upcoming Tasks</h3>

                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded-[12px] shadow-sm border border-slate-100 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div className="flex-1">
                        <h5 className="text-sm font-semibold text-slate-800">Inventory Check</h5>
                        <p className="text-xs text-slate-500">Downtown Branch</p>
                      </div>
                      <span className="text-xs font-medium text-slate-400">10:30 AM</span>
                    </div>
                    <div className="bg-white p-3 rounded-[12px] shadow-sm border border-slate-100 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                      <div className="flex-1">
                        <h5 className="text-sm font-semibold text-slate-800">Client Meeting</h5>
                        <p className="text-xs text-slate-500">TechStore Inc.</p>
                      </div>
                      <span className="text-xs font-medium text-slate-400">11:15 AM</span>
                    </div>
                    <div className="bg-white p-3 rounded-[12px] shadow-sm border border-slate-100 flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <div className="flex-1">
                        <h5 className="text-sm font-semibold text-slate-800">Equipment Repair</h5>
                        <p className="text-xs text-slate-500">North Side</p>
                      </div>
                      <span className="text-xs font-medium text-slate-400">01:00 PM</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative abstract elements behind mockup */}
              <div className="absolute top-10 -right-10 w-24 h-24 bg-yellow-400 rounded-full blur-2xl opacity-50 z-10 animate-pulse"></div>
              <div className="absolute bottom-20 -left-10 w-32 h-32 bg-blue-600 rounded-full blur-2xl opacity-30 z-10"></div>
              <div className="absolute -right-6 top-1/3 bg-white p-3 rounded-[12px] shadow-xl z-30 border border-slate-100 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="text-green-500"><CheckCircle className="w-4 h-4" /></div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Task Completed</p>
                    <p className="text-[10px] text-slate-500">Just now</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white relative">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-blue-600 font-bold tracking-wider text-sm mb-2 uppercase">POWERFUL FEATURES</h2>
            <h3 className="text-3xl md:text-4xl font-extrabold text-blue-900 mb-4">Everything you need to manage your field team</h3>
            <p className="text-slate-500 text-lg">Our comprehensive suite of tools ensures your workforce is efficient, accountable, and empowered.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-50 rounded-[12px] p-8 hover:translate-y-[-5px] hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-100 group">
              <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                <Map className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-blue-900 mb-3">Real‑time Activity Tracking</h4>
              <p className="text-slate-500 text-sm leading-relaxed">
                Monitor your field team's live location, route history, and status updates instantly on an interactive map.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-50 rounded-[12px] p-8 hover:translate-y-[-5px] hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-100 group">
              <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300">
                <Cpu className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-blue-900 mb-3">Automated Workflows</h4>
              <p className="text-slate-500 text-sm leading-relaxed">
                Eliminate manual paperwork. Automate task assignments, forms, signatures, and approval processes seamlessly.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-50 rounded-[12px] p-8 hover:translate-y-[-5px] hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-100 group">
              <div className="w-14 h-14 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:bg-green-600 group-hover:text-white transition-colors duration-300">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-blue-900 mb-3">Productivity Analytics</h4>
              <p className="text-slate-500 text-sm leading-relaxed">
                Gain actionable insights with detailed reports on performance, time spent per task, and overall efficiency metrics.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-50 rounded-[12px] p-8 hover:translate-y-[-5px] hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 border border-slate-100 group">
              <div className="w-14 h-14 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-blue-900 mb-3">Smart Scheduling</h4>
              <p className="text-slate-500 text-sm leading-relaxed">
                Intelligently dispatch the right person to the right job based on location, availability, and skill set.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call To Action Bottom */}
      <section className="py-20 bg-blue-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#ffffff 1px, transparent 1px)", backgroundSize: "30px 30px" }}></div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to optimize your field operations?</h2>
          <p className="text-blue-200 mb-10 max-w-2xl mx-auto text-lg">Join thousands of companies that use ForceAdmin to streamline their workflow and increase revenue.</p>
          <button 
            onClick={() => handleAlert('Registration demo – start your free trial')}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 text-white px-10 py-4 rounded-[30px] font-bold text-lg inline-flex items-center gap-2 cursor-pointer"
          >
            Start Your Free Trial <Rocket className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              <Zap className="w-4 h-4 fill-white" />
            </div>
            <span className="text-xl font-bold text-blue-900">ForceAdmin</span>
          </div>

          <p className="text-slate-500 text-sm text-center md:text-left">
            &copy; 2026 ForceAdmin. All rights reserved.
          </p>

          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all hover:scale-110">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all hover:scale-110">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all hover:scale-110">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
