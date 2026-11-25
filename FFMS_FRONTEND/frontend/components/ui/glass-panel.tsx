"use client";

import React, { forwardRef } from "react";

export interface GlassPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "glass" | "panel" | "subtle" | "ghost";
  hoverEffect?: boolean;
  glow?: boolean;
  as?: React.ElementType;
}

/**
 * Reusable Glassmorphism Panel
 * Uses CSS variables (--gw-blur, --gw-opacity, --gw-saturation, --gw-edge, --gw-tint)
 * Supports variants:
 * - "glass": Full backdrop blur, border edge highlight, soft outer shadow
 * - "panel": Inner translucent sub-card for nested elements
 * - "subtle": Low opacity glass for controls or secondary blocks
 * - "ghost": Ultra-thin glass for buttons and badges
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  (
    {
      children,
      variant = "glass",
      hoverEffect = false,
      glow = false,
      as: Component = "div",
      className = "",
      style,
      ...props
    },
    ref
  ) => {
    const variantClass =
      variant === "glass"
        ? "gw-glass"
        : variant === "panel"
        ? "gw-panel"
        : variant === "subtle"
        ? "gw-panel-subtle"
        : "gw-ghost";

    const hoverClass = hoverEffect ? "gw-hover-lift" : "";
    const glowClass = glow ? "gw-ambient-glow" : "";

    return (
      <Component
        ref={ref}
        className={`${variantClass} ${hoverClass} ${glowClass} ${className}`.trim()}
        style={style}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

GlassPanel.displayName = "GlassPanel";

export default GlassPanel;

