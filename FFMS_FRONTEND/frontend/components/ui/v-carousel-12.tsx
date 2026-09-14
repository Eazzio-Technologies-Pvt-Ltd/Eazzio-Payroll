"use client";

import React, { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "./v-carousel-12-utils/badge";

export interface Plan {
  name: string;
  priceMonthly: string;
  priceAnnually: string;
  period: string;
  description: string;
  features: string[];
  isPopular: boolean;
  badgeText?: string | null;
}

interface PricingCarouselProps {
  isAnnual: boolean;
  plans: Plan[];
}

export function PricingCarousel({ isAnnual, plans }: PricingCarouselProps) {
  const router = useRouter();
  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex: 1,
    align: "center",
    containScroll: false,
    loop: false,
  });

  const [selectedIndex, setSelectedIndex] = useState(1);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  const onSelect = useCallback((api: any) => {
    setSelectedIndex(api.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect(emblaApi);
  }, [emblaApi, onSelect]);

  return (
    <div className="relative w-full max-w-[1200px] mx-auto px-4 sm:px-12 flex flex-col items-center">
      {/* Carousel Wrapper */}
      <div className="relative w-full flex items-center justify-center">
        {/* Left Arrow */}
        <button
          onClick={scrollPrev}
          disabled={!emblaApi?.canScrollPrev()}
          className={cn(
            "absolute left-0 lg:-left-4 z-40 w-12 h-12 rounded-full flex items-center justify-center border border-blue-500/40 bg-white hover:bg-blue-50 text-blue-600 transition-all hover:scale-105 shadow-[0_0_15px_rgba(59,130,246,0.15)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer",
            "hidden sm:flex"
          )}
          aria-label="Previous plan"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Viewport */}
        <div className="overflow-hidden w-full py-4" ref={emblaRef}>
          <div className="flex touch-pan-y -ml-4">
            {plans.map((plan, idx) => {
              const isActive = idx === selectedIndex;
              const isBasic = plan.name === "BASIC";
              
              const displayPrice = isAnnual ? plan.priceAnnually : plan.priceMonthly;
              const displayPeriod = plan.period;

              return (
                <div
                  key={plan.name}
                  onClick={() => {
                    if (!isActive) scrollTo(idx);
                  }}
                  className={cn(
                    "flex-[0_0_88%] sm:flex-[0_0_55%] md:flex-[0_0_360px] pl-4 transition-all duration-500 ease-out select-none",
                    isActive ? "scale-100 opacity-100 z-10" : "scale-95 opacity-60 hover:opacity-80"
                  )}
                >
                  <div
                    className={cn(
                      "bg-white rounded-3xl p-8 flex flex-col h-full min-h-[550px] border transition-all duration-500 relative",
                      isActive
                        ? isBasic
                          ? "border-blue-600 shadow-2xl shadow-blue-500/25 ring-4 ring-blue-500/10"
                          : "border-blue-500 shadow-xl shadow-blue-500/15"
                        : "border-slate-100 shadow-md"
                    )}
                  >
                    {/* Badge */}
                    {plan.badgeText && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge variant={isBasic ? "default" : "emerald"}>
                          {plan.badgeText}
                        </Badge>
                      </div>
                    )}

                    {/* Card Header */}
                    <div className="mb-6">
                      <h3 className="text-xl font-bold uppercase tracking-wider text-slate-900 mb-2">
                        {plan.name}
                      </h3>
                      <p className="text-sm text-slate-500 min-h-[40px]">
                        {plan.description}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="mb-6 flex items-baseline">
                      <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                        {displayPrice}
                      </span>
                      {displayPeriod && (
                        <span className="ml-2 text-sm font-semibold text-slate-500">
                          {displayPeriod}
                        </span>
                      )}
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isActive) {
                          router.push("/register");
                        } else {
                          scrollTo(idx);
                        }
                      }}
                      className={cn(
                        "w-full py-3.5 rounded-xl font-bold transition-all duration-300 mb-8 cursor-pointer text-center text-sm shadow-sm",
                        isActive
                          ? "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                      )}
                    >
                      Get Started
                    </button>

                    {/* Feature List */}
                    <div className="flex flex-col gap-4 mt-auto">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        What's included
                      </p>
                      <div className="space-y-3">
                        {plan.features.map((feature, fIdx) => (
                          <div key={fIdx} className="flex items-start gap-3 text-left">
                            <Check
                              className={cn(
                                "w-4 h-4 shrink-0 mt-0.5 transition-colors",
                                isActive ? "text-blue-500" : "text-slate-400"
                              )}
                            />
                            <span className="text-sm text-slate-600 font-medium">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Arrow */}
        <button
          onClick={scrollNext}
          disabled={!emblaApi?.canScrollNext()}
          className={cn(
            "absolute right-0 lg:-right-4 z-40 w-12 h-12 rounded-full flex items-center justify-center border border-blue-500/40 bg-white hover:bg-blue-50 text-blue-600 transition-all hover:scale-105 shadow-[0_0_15px_rgba(59,130,246,0.15)] disabled:opacity-30 disabled:pointer-events-none cursor-pointer",
            "hidden sm:flex"
          )}
          aria-label="Next plan"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Dots Pagination */}
      <div className="flex justify-center items-center gap-2.5 mt-8">
        {scrollSnaps.map((_, idx) => (
          <button
            key={idx}
            onClick={() => scrollTo(idx)}
            className={cn(
              "h-2.5 rounded-full transition-all duration-300 cursor-pointer",
              idx === selectedIndex
                ? "bg-blue-600 w-8"
                : "bg-slate-300 hover:bg-slate-400 w-2.5"
            )}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

export { PricingCarousel as Particle };
export default PricingCarousel;
