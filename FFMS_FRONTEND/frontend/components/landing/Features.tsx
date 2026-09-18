"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { FeatureCarousel } from "@/components/ui/feature-carousel";

export default function Features() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 0.92", "start 0.65"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 24,
    restDelta: 0.001,
  });

  const opacity = useTransform(smoothProgress, [0, 1], [0, 1]);
  const y = useTransform(smoothProgress, [0, 1], [40, 0]);
  const scale = useTransform(smoothProgress, [0, 1], [0.96, 1]);

  return (
    <section id="features" ref={containerRef} className="pt-7 pb-20 md:pt-5 md:pb-32 bg-transparent w-full">
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20">
        <motion.div
          style={{ opacity, y, scale }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-6 leading-snug">
            Everything you need to{" "}
            <span className="text-blue-600">manage field teams</span>
          </h2>
          <p className="text-lg text-slate-600">
            A comprehensive suite of tools designed specifically for organizations that rely on distributed workforces.
          </p>
        </motion.div>

        <FeatureCarousel />
      </div>
    </section>
  );
}

