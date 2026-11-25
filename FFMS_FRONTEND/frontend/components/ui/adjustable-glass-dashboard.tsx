"use client";

import React from "react";
import { GlassProvider, GlassPanel, AdjustGlassButton, useGlass } from "@/components/ui/glass-provider";
import { Users, CalendarCheck, Clock, MapPin, Sparkles } from "lucide-react";

/**
 * Adjustable Glass Dashboard Reference Component
 * Provides complete liquid glassmorphism effect reference with:
 * - CSS variables (--gw-blur, --gw-opacity, --gw-saturation, --gw-edge, --gw-tint)
 * - .gw-glass and .gw-panel styles
 * - Live material adjustment panel
 * - GSAP reveal transitions
 */
export default function AdjustableGlassDashboard() {
  return (
    <GlassProvider initialPreset="frosted">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        {/* Header with Adjust Glass button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Glassmorphism Workspace
            </h1>
            <p className="text-sm text-slate-500">
              Interactive liquid glass material controls and tokens
            </p>
          </div>
          <AdjustGlassButton />
        </div>

        {/* Demo KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <GlassPanel
            variant="glass"
            hoverEffect
            className="gw-reveal rounded-2xl p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <Users size={20} />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Workforce
                </span>
                <div className="text-2xl font-extrabold text-slate-900">55</div>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel
            variant="glass"
            hoverEffect
            className="gw-reveal rounded-2xl p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                <CalendarCheck size={20} />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Attendance
                </span>
                <div className="text-2xl font-extrabold text-slate-900">92%</div>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel
            variant="glass"
            hoverEffect
            className="gw-reveal rounded-2xl p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Clock size={20} />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Pending Approvals
                </span>
                <div className="text-2xl font-extrabold text-slate-900">19</div>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel
            variant="glass"
            hoverEffect
            className="gw-reveal rounded-2xl p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                <MapPin size={20} />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active On Field
                </span>
                <div className="text-2xl font-extrabold text-slate-900">8</div>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </GlassProvider>
  );
}

