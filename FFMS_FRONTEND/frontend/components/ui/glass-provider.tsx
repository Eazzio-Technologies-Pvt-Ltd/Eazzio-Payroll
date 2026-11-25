"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useId,
  useRef,
} from "react";
import {
  Sliders,
  Sparkles,
  RotateCcw,
  X,
  Droplets,
  Layers,
  SunMedium,
  Check,
  Eye,
  Image as ImageIcon,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { GlassPanel } from "./glass-panel";

export { GlassPanel };

export type GlassPreset = "clear" | "frosted" | "solid" | "custom";
export type BackgroundStyle = "mesh" | "aurora" | "wallpaper" | "minimal";

export interface GlassSettings {
  blur: number; // 0 to 40 (px)
  opacity: number; // 0.15 to 0.95
  saturation: number; // 100 to 220 (%)
  edge: number; // 0.1 to 1.0 (edge highlight opacity)
  tint: string; // RGB values "255, 255, 255" or "241, 245, 249"
  preset: GlassPreset;
  bgStyle: BackgroundStyle;
}

export const PRESET_VALUES: Record<
  "clear" | "frosted" | "solid",
  Omit<GlassSettings, "preset" | "bgStyle">
> = {
  clear: {
    blur: 14,
    opacity: 0.65,
    saturation: 160,
    edge: 0.9,
    tint: "255, 255, 255",
  },
  frosted: {
    blur: 24,
    opacity: 0.78,
    saturation: 180,
    edge: 0.85,
    tint: "255, 255, 255",
  },
  solid: {
    blur: 32,
    opacity: 0.95,
    saturation: 120,
    edge: 0.5,
    tint: "255, 255, 255",
  },
};

export const DEFAULT_SETTINGS: GlassSettings = {
  blur: 24,
  opacity: 0.78,
  saturation: 180,
  edge: 0.85,
  tint: "255, 255, 255",
  preset: "frosted",
  bgStyle: "mesh",
};

export const STORAGE_KEY = "eazzio_admin_glass_settings_v3";
export const GLASS_SETTINGS_EVENT = "eazzio_glass_settings_changed";
export const GLASS_OPEN_MODAL_EVENT = "eazzio_glass_open_modal";

export function getBgColorForStyle(bgStyle: BackgroundStyle): string {
  switch (bgStyle) {
    case "mesh":
      return "#dfb8a3";
    case "aurora":
      return "#edd3c4";
    case "wallpaper":
      return "#d8a892";
    case "minimal":
    default:
      return "#edd2c2";
  }
}

export function getBgClassForStyle(bgStyle: BackgroundStyle): string {
  switch (bgStyle) {
    case "mesh":
      return "gw-bg-mesh";
    case "aurora":
      return "gw-bg-aurora";
    case "wallpaper":
      return "gw-bg-wallpaper";
    case "minimal":
    default:
      return "gw-bg-minimal";
  }
}

export function applyGlassCssVariables(settings: GlassSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.style.setProperty("--gw-blur", `${settings.blur}px`);
  root.style.setProperty("--gw-opacity", `${settings.opacity}`);
  root.style.setProperty("--gw-saturation", `${settings.saturation}%`);
  root.style.setProperty("--gw-edge", `rgba(255, 255, 255, ${settings.edge})`);
  root.style.setProperty("--gw-tint", settings.tint);
  root.style.setProperty("--gw-shadow", "0 10px 32px 0 rgba(15, 23, 42, 0.07)");
  root.style.setProperty("--gw-page-bg", getBgColorForStyle(settings.bgStyle));
  root.setAttribute("data-gw-bg", settings.bgStyle);
}

export function getSavedGlassSettings(fallbackPreset: GlassPreset = "frosted"): GlassSettings {
  const fallbackValues =
    PRESET_VALUES[fallbackPreset as keyof typeof PRESET_VALUES] ||
    PRESET_VALUES.frosted;
  const fallback: GlassSettings = {
    ...DEFAULT_SETTINGS,
    ...fallbackValues,
    preset: fallbackPreset,
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
        };
      }
    }
  } catch (e) {
    console.warn("Could not read glass settings from localStorage:", e);
  }
  return fallback;
}

interface GlassContextValue {
  settings: GlassSettings;
  updateSettings: (partial: Partial<GlassSettings>) => void;
  setPreset: (preset: "clear" | "frosted" | "solid") => void;
  resetSettings: () => void;
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  toggleSettings: () => void;
}

export const GlassContext = createContext<GlassContextValue | null>(null);

export function useGlass(): GlassContextValue {
  const ctx = useContext(GlassContext);
  if (!ctx) {
    return {
      settings: DEFAULT_SETTINGS,
      updateSettings: (partial) => {
        if (typeof window !== "undefined") {
          const current = getSavedGlassSettings();
          const updated = { ...current, ...partial };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          } catch {}
          applyGlassCssVariables(updated);
          window.dispatchEvent(
            new CustomEvent(GLASS_SETTINGS_EVENT, { detail: updated })
          );
        }
      },
      setPreset: (p) => {
        if (typeof window !== "undefined") {
          const val = PRESET_VALUES[p];
          const current = getSavedGlassSettings();
          const updated = { ...current, ...val, preset: p };
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          } catch {}
          applyGlassCssVariables(updated);
          window.dispatchEvent(
            new CustomEvent(GLASS_SETTINGS_EVENT, { detail: updated })
          );
        }
      },
      resetSettings: () => {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
          } catch {}
          applyGlassCssVariables(DEFAULT_SETTINGS);
          window.dispatchEvent(
            new CustomEvent(GLASS_SETTINGS_EVENT, { detail: DEFAULT_SETTINGS })
          );
        }
      },
      isSettingsOpen: false,
      openSettings: () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(GLASS_OPEN_MODAL_EVENT));
        }
      },
      closeSettings: () => {},
      toggleSettings: () => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(GLASS_OPEN_MODAL_EVENT));
        }
      },
    };
  }
  return ctx;
}

export interface GlassProviderProps {
  children: React.ReactNode;
  initialPreset?: "clear" | "frosted" | "solid";
  containerClassName?: string;
  enableContainerDiv?: boolean;
}

export function GlassProvider({
  children,
  initialPreset = "frosted",
  containerClassName = "",
  enableContainerDiv = true,
}: GlassProviderProps) {
  const [settings, setSettings] = useState<GlassSettings>(() => {
    return getSavedGlassSettings(initialPreset);
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Hydration-safe localStorage load & sync listener
  useEffect(() => {
    setMounted(true);
    const saved = getSavedGlassSettings(initialPreset);
    setSettings(saved);
    applyGlassCssVariables(saved);

    const handleSync = (e: Event) => {
      const custom = e as CustomEvent<GlassSettings>;
      if (custom.detail) {
        setSettings(custom.detail);
        applyGlassCssVariables(custom.detail);
      } else {
        const fresh = getSavedGlassSettings();
        setSettings(fresh);
        applyGlassCssVariables(fresh);
      }
    };

    const handleOpenModal = () => setIsSettingsOpen(true);

    window.addEventListener(GLASS_SETTINGS_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener(GLASS_OPEN_MODAL_EVENT, handleOpenModal);

    return () => {
      window.removeEventListener(GLASS_SETTINGS_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener(GLASS_OPEN_MODAL_EVENT, handleOpenModal);
    };
  }, [initialPreset]);

  // GSAP reveal animation for elements with .gw-reveal
  useGSAP(
    () => {
      if (typeof window === "undefined") return;
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (prefersReducedMotion) return;

      const elements = containerRef.current?.querySelectorAll(".gw-reveal");
      if (elements && elements.length > 0) {
        gsap.fromTo(
          elements,
          {
            opacity: 0,
            y: 16,
            scale: 0.99,
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.55,
            stagger: 0.06,
            ease: "power2.out",
            clearProps: "all",
          }
        );
      }
    },
    { scope: containerRef, dependencies: [mounted] }
  );

  const updateSettings = useCallback((partial: Partial<GlassSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      // Check if current matches a preset
      let matchedPreset: GlassPreset = "custom";
      for (const p of ["clear", "frosted", "solid"] as const) {
        const val = PRESET_VALUES[p];
        if (
          val.blur === updated.blur &&
          Math.abs(val.opacity - updated.opacity) < 0.01 &&
          val.saturation === updated.saturation &&
          Math.abs(val.edge - updated.edge) < 0.01 &&
          val.tint === updated.tint
        ) {
          matchedPreset = p;
          break;
        }
      }
      updated.preset = matchedPreset;

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn("Could not write glass settings to localStorage:", e);
      }

      applyGlassCssVariables(updated);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(GLASS_SETTINGS_EVENT, { detail: updated })
        );
      }

      return updated;
    });
  }, []);

  const setPreset = useCallback((preset: "clear" | "frosted" | "solid") => {
    const val = PRESET_VALUES[preset];
    setSettings((prev) => {
      const updated: GlassSettings = {
        ...prev,
        ...val,
        preset,
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn("Could not write glass settings to localStorage:", e);
      }

      applyGlassCssVariables(updated);

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(GLASS_SETTINGS_EVENT, { detail: updated })
        );
      }

      return updated;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    } catch (e) {}

    applyGlassCssVariables(DEFAULT_SETTINGS);

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(GLASS_SETTINGS_EVENT, { detail: DEFAULT_SETTINGS })
      );
    }
  }, []);

  const openSettings = useCallback(() => setIsSettingsOpen(true), []);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const toggleSettings = useCallback(
    () => setIsSettingsOpen((prev) => !prev),
    []
  );

  // Generate CSS variables style object
  const glassStyle: React.CSSProperties = {
    // Liquid glass core variables
    ["--gw-blur" as string]: `${settings.blur}px`,
    ["--gw-opacity" as string]: `${settings.opacity}`,
    ["--gw-saturation" as string]: `${settings.saturation}%`,
    ["--gw-edge" as string]: `rgba(255, 255, 255, ${settings.edge})`,
    ["--gw-tint" as string]: settings.tint,
    ["--gw-shadow" as string]: "0 10px 32px 0 rgba(15, 23, 42, 0.07)",
    ["--gw-page-bg" as string]: getBgColorForStyle(settings.bgStyle),
  };

  const bgClass = getBgClassForStyle(settings.bgStyle);

  const contextValue: GlassContextValue = {
    settings,
    updateSettings,
    setPreset,
    resetSettings,
    isSettingsOpen,
    openSettings,
    closeSettings,
    toggleSettings,
  };

  return (
    <GlassContext.Provider value={contextValue}>
      {enableContainerDiv ? (
        <div
          ref={containerRef}
          style={glassStyle}
          className={`gw-glass-container relative min-h-full w-full ${bgClass} ${containerClassName}`}
        >
          {/* Soft floating luminous ambient orbs for liquid refraction */}
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

          {/* Page Content */}
          <div className="relative z-10">{children}</div>

          {/* Glass Settings Panel (Accessible Modal) */}
          <GlassSettingsModal
            isOpen={isSettingsOpen}
            onClose={closeSettings}
            settings={settings}
            onUpdate={updateSettings}
            onSetPreset={setPreset}
            onReset={resetSettings}
          />
        </div>
      ) : (
        <div ref={containerRef} style={glassStyle} className={containerClassName}>
          {children}
          <GlassSettingsModal
            isOpen={isSettingsOpen}
            onClose={closeSettings}
            settings={settings}
            onUpdate={updateSettings}
            onSetPreset={setPreset}
            onReset={resetSettings}
          />
        </div>
      )}
    </GlassContext.Provider>
  );
}

/**
 * Glass Adjustment Control Button for Header / Toolbar
 */
export function AdjustGlassButton({
  className = "",
}: {
  className?: string;
}) {
  const { toggleSettings, isSettingsOpen } = useGlass();

  return (
    <button
      type="button"
      onClick={toggleSettings}
      aria-label="Adjust liquid glass appearance"
      aria-expanded={isSettingsOpen}
      className={`group inline-flex items-center gap-2 rounded-2xl px-3.5 py-1.5 text-xs font-semibold text-slate-800 transition-all hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-amber-500 focus-visible:outline-offset-2 ${className}`}
      style={{
        background: "rgba(255, 255, 255, 0.78)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: "1px solid rgba(255, 255, 255, 0.95)",
        boxShadow: "0 6px 16px -2px rgba(120, 75, 50, 0.08), inset 0 1px 1px #fff",
      }}
    >
      <Sparkles
        size={14}
        className="text-amber-600 transition-transform duration-300 group-hover:rotate-12"
      />
      <span className="text-slate-800 font-bold">Adjust Glass</span>
      <span className="hidden sm:inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 border border-amber-500/25">
        Live
      </span>
    </button>
  );
}

/**
 * Accessible Glass Settings Modal / Drawer
 */
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: GlassSettings;
  onUpdate: (partial: Partial<GlassSettings>) => void;
  onSetPreset: (preset: "clear" | "frosted" | "solid") => void;
  onReset: () => void;
}

function GlassSettingsModal({
  isOpen,
  onClose,
  settings,
  onUpdate,
  onSetPreset,
  onReset,
}: SettingsModalProps) {
  const modalId = useId();
  const titleId = `${modalId}-title`;
  const descId = `${modalId}-desc`;
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div
        ref={modalRef}
        className="gw-glass relative w-full max-w-md overflow-hidden rounded-2xl border border-white/80 p-6 text-slate-800 shadow-2xl transition-all"
        style={{
          background: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
              <Sliders size={18} />
            </div>
            <div>
              <h2 id={titleId} className="text-base font-bold text-slate-900">
                Adjust Glass Material
              </h2>
              <p id={descId} className="text-xs text-slate-500">
                Live material tuner — applies globally across all pages
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close glass settings"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-5">
          {/* Presets */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Material Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["clear", "frosted", "solid"] as const).map((p) => {
                const isActive = settings.preset === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onSetPreset(p)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold capitalize transition-all ${
                      isActive
                        ? "border-blue-500 bg-blue-500 text-white shadow-md shadow-blue-500/25"
                        : "border-slate-200 bg-white/70 text-slate-700 hover:border-slate-300 hover:bg-white"
                    } focus-visible:outline-2 focus-visible:outline-blue-500`}
                  >
                    {isActive && <Check size={12} />}
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-4">
            {/* Blur */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Droplets size={13} className="text-blue-500" />
                  Backdrop Blur
                </span>
                <span className="font-mono text-slate-500">{settings.blur}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="1"
                value={settings.blur}
                onChange={(e) =>
                  onUpdate({ blur: parseInt(e.target.value, 10) })
                }
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600 focus-visible:outline-2 focus-visible:outline-blue-500"
              />
            </div>

            {/* Opacity */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Layers size={13} className="text-indigo-500" />
                  Glass Opacity
                </span>
                <span className="font-mono text-slate-500">
                  {Math.round(settings.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.15"
                max="0.95"
                step="0.02"
                value={settings.opacity}
                onChange={(e) =>
                  onUpdate({ opacity: parseFloat(e.target.value) })
                }
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600 focus-visible:outline-2 focus-visible:outline-blue-500"
              />
            </div>

            {/* Saturation */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <SunMedium size={13} className="text-amber-500" />
                  Color Saturation
                </span>
                <span className="font-mono text-slate-500">
                  {settings.saturation}%
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="220"
                step="5"
                value={settings.saturation}
                onChange={(e) =>
                  onUpdate({ saturation: parseInt(e.target.value, 10) })
                }
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600 focus-visible:outline-2 focus-visible:outline-blue-500"
              />
            </div>

            {/* Edge Light Highlight */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Eye size={13} className="text-emerald-500" />
                  Edge Bevel Highlight
                </span>
                <span className="font-mono text-slate-500">
                  {Math.round(settings.edge * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={settings.edge}
                onChange={(e) =>
                  onUpdate({ edge: parseFloat(e.target.value) })
                }
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-blue-600 focus-visible:outline-2 focus-visible:outline-blue-500"
              />
            </div>
          </div>

          {/* Background Ambient Style */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
              Ambient Refraction Surface
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "mesh", label: "Liquid Mesh", icon: Sparkles },
                { id: "aurora", label: "Aurora Glow", icon: Droplets },
                { id: "wallpaper", label: "Fluid Waves", icon: ImageIcon },
                { id: "minimal", label: "Subtle Studio", icon: Layers },
              ].map((bg) => {
                const Icon = bg.icon;
                const isSelected = settings.bgStyle === bg.id;
                return (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() =>
                      onUpdate({ bgStyle: bg.id as BackgroundStyle })
                    }
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/80 text-blue-700 shadow-sm"
                        : "border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white"
                    } focus-visible:outline-2 focus-visible:outline-blue-500`}
                  >
                    <Icon
                      size={14}
                      className={isSelected ? "text-blue-600" : "text-slate-400"}
                    />
                    <span>{bg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-200/80 pt-4">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            <RotateCcw size={13} />
            Reset to Default
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default GlassProvider;
