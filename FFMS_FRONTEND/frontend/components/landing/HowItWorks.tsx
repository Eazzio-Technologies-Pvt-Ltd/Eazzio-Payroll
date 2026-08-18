"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import FUIBentoGridDark from "@/components/ui/bento";

export default function HowItWorks() {
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
    <section id="howitworks" ref={containerRef} className="py-20 md:py-32 bg-transparent w-full overflow-hidden">
      <motion.div
        style={{ opacity, y, scale }}
        className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-20 mb-12"
      >
        <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-4">
          How it <span className="text-emerald-600">Works</span>
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl">
          Get your entire field force up and running in four simple steps. No complex training required.
        </p>
      </motion.div>

      <motion.div style={{ opacity, y }}>
        <FUIBentoGridDark />
      </motion.div>
    </section>
  );
}
