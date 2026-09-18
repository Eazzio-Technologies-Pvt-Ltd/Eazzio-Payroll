"use client";
import React from "react";
import { clsx } from "clsx";
import { motion } from "framer-motion";
import { DM_Sans } from "next/font/google";

const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700", "800"] });

export function BentoCard({
  dark = false,
  className = "",
  eyebrow,
  title,
  description,
  graphic,
  fade = [],
}: {
  dark?: boolean;
  className?: string;
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  graphic?: React.ReactNode;
  fade?: ("top" | "bottom")[];
}) {
  return (
    <motion.div
      initial="idle"
      whileHover="active"
      variants={{ idle: {}, active: {} }}
      data-dark={dark ? "true" : undefined}
      className={clsx(
        className,
        "group relative flex flex-col overflow-hidden rounded-2xl",
        "bg-slate-900 text-white transform-gpu shadow-xl border border-slate-800",
        "data-[dark]:bg-gray-800 data-[dark]:ring-white/15"
      )}
    >
      <div className="relative h-[13rem] sm:h-[15rem] shrink-0 overflow-hidden">
        {graphic}
        {fade.includes("top") && (
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-50% opacity-40 pointer-events-none" />
        )}
        {fade.includes("bottom") && (
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent pointer-events-none" />
        )}
      </div>
      <div className="relative p-5 sm:p-6 z-20 isolate mt-[-60px] min-h-[7.5rem] bg-slate-900/90 backdrop-blur-xl text-white border-t border-slate-800/60 flex flex-col justify-end">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400">{eyebrow}</span>
        <h3 className={`${dmSans.className} mt-0.5 text-lg sm:text-xl font-extrabold tracking-tight text-white`}>
          {title}
        </h3>
        <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-300">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

export default function FUIBentoGridDark() {
  return (
    <div className="container mx-auto flex flex-col px-4 md:px-8">
      <div className="grid grid-cols-1 gap-6 sm:mt-8 lg:grid-cols-6 lg:grid-rows-2">
        <BentoCard
          eyebrow="Step 01"
          title="Create Account"
          description="Sign up in seconds and set up your organization profile with customized roles and territories."
          graphic={
            <div className="absolute inset-0 bg-[url(https://framerusercontent.com/images/ghyfFEStl6BNusZl0ZQd5r7JpM.png)] bg-cover bg-center" />
          }
          fade={["bottom"]}
          className="lg:col-span-3 rounded-2xl"
        />
        <BentoCard
          eyebrow="Step 02"
          title="Add Your Team"
          description="Invite your field agents via email or SMS. They download the app and log in instantly."
          graphic={
            <div className="absolute inset-0 bg-[url(https://framerusercontent.com/images/7CJtT0Pu3w1vNADktNltoMFC9J4.png)] bg-cover bg-center" />
          }
          fade={["bottom"]}
          className="lg:col-span-3 rounded-2xl"
        />
        <BentoCard
          eyebrow="Step 03"
          title="Assign Tasks & Routes"
          description="Create and assign tasks, schedules, and optimized routes directly from the admin dashboard."
          graphic={
            <div className="absolute inset-0 bg-[url(https://framerusercontent.com/images/gR21e8Wh6l3pU6CciDrqt8wjHM.png)] bg-cover bg-center" />
          }
          fade={["bottom"]}
          className="lg:col-span-3 rounded-2xl"
        />
        <BentoCard
          eyebrow="Step 04"
          title="Track & Improve"
          description="Monitor real-time progress, review completion reports, and optimize future deployments."
          graphic={
            <div className="absolute inset-0 bg-[url(https://framerusercontent.com/images/PTO3RQ3S65zfZRFEGZGpiOom6aQ.png)] bg-cover bg-center" />
          }
          fade={["bottom"]}
          className="lg:col-span-3 rounded-2xl"
        />
      </div>
    </div>
  );
}
