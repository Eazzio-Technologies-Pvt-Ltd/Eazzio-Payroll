"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { GlassProvider, AdjustGlassButton } from "./glass-provider";

export type GlassVariant = "overview" | "data" | "settings" | "map";

interface GlassBackgroundProps {
  children: React.ReactNode;
  variant?: GlassVariant;
  className?: string;
  canvasClassName?: string;
  style?: React.CSSProperties;
  canvasStyle?: React.CSSProperties;
  maxWidth?: number | string;
  showAdjustButton?: boolean;
  enableCanvas?: boolean;
}

const VariantContext = createContext<GlassVariant>("overview");

export function useGlassVariant() {
  return useContext(VariantContext);
}

/**
 * Reusable GlassBackground Primitive
 * Wraps page content with the liquid glass ambient background according to variant:
 * - "overview": Full fluid peach mesh, luminous animated orbs, light sweep, porcelain canvas
 * - "data": Calmer warm porcelain background, static ambient lighting, high table contrast (88-92% opacity)
 * - "settings": Clean minimal porcelain gradient, nearly solid white glass (92-95%), sharp focus rings
 * - "map": Solid unblurred map viewport with floating frosted HUD cards and filter bars
 */
export function GlassBackground({
  children,
  variant = "overview",
  className = "",
  canvasClassName = "",
  style,
  canvasStyle,
  maxWidth = 1600,
  showAdjustButton = false,
  enableCanvas = true,
}: GlassBackgroundProps) {
  const [mounted, setMounted] = useState(false);
  const [isClassic, setIsClassic] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkUi = () => {
      if (typeof document !== "undefined") {
        setIsClassic(document.documentElement.getAttribute("data-ui") === "classic");
      }
    };
    checkUi();

    const observer = new MutationObserver(checkUi);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-ui"] });
    return () => observer.disconnect();
  }, []);

  // When classic mode is active, render children without glass background wrapper
  if (mounted && isClassic) {
    return (
      <div className={`eazzio-classic-page ${className}`} style={{ maxWidth, margin: "0 auto", ...style }}>
        {children}
      </div>
    );
  }

  // Variant-specific background classes and presets
  const bgClass =
    variant === "overview"
      ? "gw-bg-mesh"
      : variant === "data"
      ? "gw-bg-calm"
      : variant === "settings"
      ? "gw-bg-minimal"
      : "gw-bg-calm";

  const preset =
    variant === "overview"
      ? "frosted"
      : variant === "data"
      ? "solid"
      : variant === "settings"
      ? "solid"
      : "frosted";

  return (
    <VariantContext.Provider value={variant}>
      <div
        className={`gw-page-wrapper gw-variant-${variant}`}
        style={{
          margin: "-28px",
          minHeight: "calc(100vh - 70px)",
          background: variant === "overview" ? "#dfb8a3" : "#f7ede6",
          transition: "background 0.3s ease",
          ...style,
        }}
      >
        <GlassProvider initialPreset={preset}>
          <div
            className={`gw-glass-container relative min-h-full w-full ${bgClass} ${className}`}
            style={{ padding: "24px 28px 48px" }}
          >
            {/* Luminous Ambient Orbs (Overview variant only; hidden on data/settings for zero motion/distraction) */}
            {variant === "overview" && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0"
              >
                <div className="gw-light-sweep gw-sweep-1" />
                <div className="gw-light-sweep gw-sweep-2" />
                <div className="gw-orb gw-orb-1" />
                <div className="gw-orb gw-orb-2" />
                <div className="gw-orb gw-orb-3" />
              </div>
            )}

            {/* Static Subtle Sweep for Data and Settings */}
            {(variant === "data" || variant === "settings" || variant === "map") && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0 opacity-40"
              >
                <div className="gw-light-sweep gw-sweep-1" />
              </div>
            )}

            {/* Main Content Area with Optional Master Porcelain Shell */}
            <div
              className="relative z-10"
              style={{ maxWidth, margin: "0 auto" }}
            >
              {enableCanvas ? (
                <div
                  className={`gw-dashboard-canvas ${canvasClassName}`}
                  style={{
                    padding: "24px 28px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                    ...canvasStyle,
                  }}
                >
                  {showAdjustButton && (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <AdjustGlassButton />
                    </div>
                  )}
                  {children}
                </div>
              ) : (
                <div
                  className={canvasClassName}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                    ...canvasStyle,
                  }}
                >
                  {showAdjustButton && (
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <AdjustGlassButton />
                    </div>
                  )}
                  {children}
                </div>
              )}
            </div>
          </div>
        </GlassProvider>
      </div>
    </VariantContext.Provider>
  );
}

export default GlassBackground;
