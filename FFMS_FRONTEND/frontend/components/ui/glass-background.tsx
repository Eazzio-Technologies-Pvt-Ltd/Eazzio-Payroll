"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  GlassProvider,
  AdjustGlassButton,
  useGlass,
  getBgColorForStyle,
  getBgClassForStyle,
} from "./glass-provider";

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

function GlassBackgroundContent({
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
  const { settings } = useGlass();

  // Dynamic ambient background matching active user dashboard glass selection
  const bgClass = getBgClassForStyle(settings.bgStyle);
  const bgColor = getBgColorForStyle(settings.bgStyle);

  return (
    <VariantContext.Provider value={variant}>
      <div
        className={`gw-page-wrapper gw-variant-${variant}`}
        style={{
          margin: "-28px",
          minHeight: "calc(100vh - 70px)",
          background: bgColor,
          transition: "background 0.3s ease",
          ...style,
        }}
      >
        <div
          className={`gw-glass-container relative min-h-full w-full ${bgClass} ${className}`}
          style={{ padding: "24px 28px 48px" }}
        >
          {/* Luminous Ambient Orbs & Sweeps matching chosen style */}
          {settings.bgStyle !== "minimal" && (
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

          {/* Master Content Area with Porcelain Canvas */}
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
      </div>
    </VariantContext.Provider>
  );
}

/**
 * Reusable GlassBackground Primitive
 * Wraps page content with liquid glass material synchronized globally
 * with the Adjust Glass settings chosen on the Dashboard.
 */
export function GlassBackground(props: GlassBackgroundProps) {
  const [mounted, setMounted] = useState(false);
  const [isClassic, setIsClassic] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkUi = () => {
      if (typeof document !== "undefined") {
        setIsClassic(
          document.documentElement.getAttribute("data-ui") === "classic"
        );
      }
    };
    checkUi();

    const observer = new MutationObserver(checkUi);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-ui"],
    });
    return () => observer.disconnect();
  }, []);

  // When classic mode is active, render children without glass background wrapper
  if (mounted && isClassic) {
    return (
      <div
        className={`eazzio-classic-page ${props.className || ""}`}
        style={{
          maxWidth: props.maxWidth ?? 1600,
          margin: "0 auto",
          ...props.style,
        }}
      >
        {props.children}
      </div>
    );
  }

  return (
    <GlassProvider enableContainerDiv={false}>
      <GlassBackgroundContent {...props} />
    </GlassProvider>
  );
}

export default GlassBackground;
