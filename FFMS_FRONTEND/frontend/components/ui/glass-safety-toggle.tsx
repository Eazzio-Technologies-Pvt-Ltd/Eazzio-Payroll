"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, Layout, Check } from "lucide-react";

export const UI_MODE_STORAGE_KEY = "eazzio_ui_mode";

export function GlassSafetyToggle() {
  const [mode, setMode] = useState<"glass" | "classic">("glass");
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(UI_MODE_STORAGE_KEY);
      if (saved === "classic" || saved === "glass") {
        setMode(saved);
        document.documentElement.setAttribute("data-ui", saved);
      } else {
        // Default to glass in development
        setMode("glass");
        document.documentElement.setAttribute("data-ui", "glass");
      }
    } catch {
      document.documentElement.setAttribute("data-ui", "glass");
    }
  }, []);

  const toggleMode = (newMode: "glass" | "classic") => {
    setMode(newMode);
    try {
      localStorage.setItem(UI_MODE_STORAGE_KEY, newMode);
    } catch {}
    document.documentElement.setAttribute("data-ui", newMode);
  };

  if (!mounted) return null;

  return (
    <aside
      aria-label="UI Theme Switcher"
      style={{
        position: "fixed",
        bottom: "18px",
        right: "18px",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        gap: "6px",
        background: "rgba(19, 27, 46, 0.92)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        borderRadius: "30px",
        padding: collapsed ? "6px" : "4px 6px",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "12px",
        color: "#ffffff",
        transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          title="Open UI Switcher"
          style={{
            background: mode === "glass" ? "#ea580c" : "#3b82f6",
            border: "none",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            cursor: "pointer",
          }}
        >
          {mode === "glass" ? <Sparkles size={14} /> : <Layout size={14} />}
        </button>
      ) : (
        <>
          <div
            style={{
              padding: "0 8px",
              fontWeight: 700,
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "rgba(255, 255, 255, 0.6)",
              userSelect: "none",
            }}
          >
            UI Mode:
          </div>

          <button
            onClick={() => toggleMode("glass")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 10px",
              borderRadius: "20px",
              border: "none",
              cursor: "pointer",
              background: mode === "glass" ? "linear-gradient(135deg, #ea580c, #f97316)" : "transparent",
              color: mode === "glass" ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
              fontWeight: mode === "glass" ? 700 : 500,
              fontSize: "11px",
              transition: "all 0.2s ease",
            }}
          >
            <Sparkles size={12} />
            Glass
            {mode === "glass" && <Check size={11} />}
          </button>

          <button
            onClick={() => toggleMode("classic")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 10px",
              borderRadius: "20px",
              border: "none",
              cursor: "pointer",
              background: mode === "classic" ? "#3b82f6" : "transparent",
              color: mode === "classic" ? "#ffffff" : "rgba(255, 255, 255, 0.7)",
              fontWeight: mode === "classic" ? 700 : 500,
              fontSize: "11px",
              transition: "all 0.2s ease",
            }}
          >
            <Layout size={12} />
            Classic
            {mode === "classic" && <Check size={11} />}
          </button>

          <button
            onClick={() => setCollapsed(true)}
            title="Minimize"
            style={{
              background: "none",
              border: "none",
              color: "rgba(255, 255, 255, 0.4)",
              cursor: "pointer",
              fontSize: "11px",
              padding: "2px 6px",
              marginLeft: "2px",
            }}
          >
            ✕
          </button>
        </>
      )}
    </aside>
  );
}

export default GlassSafetyToggle;
