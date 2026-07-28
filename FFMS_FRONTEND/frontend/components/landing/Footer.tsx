"use client";
import React from "react";
import { Mail, Phone, MapPin, Globe } from "lucide-react";
import { FooterBackgroundGradient, TextHoverEffect } from "@/components/ui/hover-footer";

export default function Footer() {
  // Footer link data with Eazzio content
  const footerLinks = [
    {
      title: "About Eazzio",
      links: [
        { label: "Our Story", href: "#" },
        { label: "Careers", href: "#" },
        { label: "Blog", href: "#" },
        { label: "Legal", href: "#" },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "Help Center", href: "#" },
        { label: "Contact Us", href: "#" },
        { label: "Developer API", href: "#" },
      ],
    },
    {
      title: "Features",
      links: [
        { label: "GPS Tracking", href: "#" },
        { label: "Task Management", href: "#" },
        { label: "Attendance", href: "#" },
        { label: "Route Planning", href: "#" },
        { label: "Analytics", href: "#" },
      ],
    },
  ];

  // Contact info data
  const contactInfo = [
    {
      icon: <Mail size={18} className="text-[#3ca2fa]" />,
      text: "eazzioground@gmail.com",
      href: "mailto:eazzioground@gmail.com",
    },
    {
      icon: <Phone size={18} className="text-[#3ca2fa]" />,
      text: "+1 (800) 123-4567",
      href: "tel:+18001234567",
    },
    {
      icon: <MapPin size={18} className="text-[#3ca2fa]" />,
      text: "Jamshedpur, Jharkhand",
    },
  ];

  return (
    <footer className="bg-[#07142A] text-slate-300 relative h-fit overflow-hidden border-t border-white/5">
      <div className="max-w-7xl mx-auto p-14 z-10 relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-8 lg:gap-16 pb-12">
          {/* Brand section */}
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-[#3ca2fa] text-3xl font-extrabold">
              
              </span>
              <span className="text-white text-3xl font-bold">Eazzio</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              A state-of-the-art enterprise solution for tracking, managing, and optimizing on-field employee operations.
            </p>
          </div>

          {/* Footer link sections */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <h4 className="text-white text-lg font-semibold mb-6">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.label} className="relative">
                    <a
                      href={link.href}
                      className="hover:text-[#3ca2fa] text-slate-400 hover:text-white transition-colors duration-200"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Contact section */}
          <div>
            <h4 className="text-white text-lg font-semibold mb-6">
              Contact Info
            </h4>
            <ul className="space-y-4">
              {contactInfo.map((item, i) => (
                <li key={i} className="flex items-center space-x-3 text-slate-400">
                  {item.icon}
                  {item.href ? (
                    <a
                      href={item.href}
                      className="hover:text-[#3ca2fa] hover:text-white transition-colors duration-200"
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span>
                      {item.text}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <hr className="border-t border-white/10 my-8" />

        {/* Footer bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center text-sm space-y-4 md:space-y-0 text-slate-400">
          {/* Language / currency selector row */}
          <div className="flex items-center gap-4 text-sm text-slate-400 bg-white/5 px-4 py-2 rounded-full border border-white/5">
            <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors duration-200">
              <Globe size={16} />
              <span>India - English</span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors duration-200">
              <span className="font-semibold text-slate-300">INR ₹</span>
            </div>
          </div>

          {/* Copyright */}
          <p className="text-center md:text-left text-slate-500">
            &copy; 2026 Eazzio Technologies Pvt. Ltd. All rights reserved.
          </p>
        </div>
      </div>

      {/* Text hover effect */}
      <div className="lg:flex hidden h-[30rem] -mt-52 -mb-36">
        <TextHoverEffect text="Eazzio" className="z-50" />
      </div>

      <FooterBackgroundGradient />
    </footer>
  );
}
