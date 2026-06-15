import { Globe, MapPin } from "lucide-react";

export default function Footer() {
  const footerLinks = {
    "About Eazzio": ["Our Story", "Careers", "Blog", "Legal"],
    "Support": ["Help Center", "Contact Us", "Developer API"],
    "Features": ["GPS Tracking", "Task Management", "Attendance", "Route Planning", "Analytics"],
    "Contact Info": ["eazziogroup@gmail.com", "+1 (800) 123-4567", "Jamshedpur, Jharkhand"]
  };

  return (
    <footer className="bg-[#07142A] text-slate-300 w-full pt-20 pb-8 border-t border-white/5">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20">
        
        {/* Main Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-white font-bold mb-6 tracking-wide">{category}</h4>
              <ul className="flex flex-col gap-3.5">
                {links.map((link, idx) => (
                  <li key={idx}>
                    <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 pb-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto">
            <img src="/logo.png" alt="Eazzio Payroll" className="h-8 w-auto opacity-90" />
            
            <div className="flex items-center gap-4 text-sm text-slate-400 bg-white/5 px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <Globe size={16} />
                <span>India - English</span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                <span className="font-semibold">INR ₹</span>
              </div>
            </div>
          </div>

        </div>

        {/* Copyright */}
        <div className="text-center md:text-left text-xs text-slate-500 mt-4">
          <p>&copy; {new Date().getFullYear()} Eazzio Technologies Pvt. Ltd. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
