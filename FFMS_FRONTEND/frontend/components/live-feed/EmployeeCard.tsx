"use client";

import React from "react";
import MiniMap from "./MiniMap";
import { Employee } from "@/types/live-feed";
import { MapPin, Battery, CheckSquare, Activity, LogIn, LogOut, Clock } from "lucide-react";

interface EmployeeCardProps {
  employee: Employee;
  isPastFeed?: boolean;
  gridSize?: number;
  isFullscreen?: boolean;
}

export default function EmployeeCard({ employee, isPastFeed, gridSize = 8, isFullscreen }: EmployeeCardProps) {
  const isOnline = employee.status === "online";

  /**
   * 3-tier layout system:
   *   "full"    → 4 / 8  grid (2 cols) — side-by-side row, all data visible
   *   "compact" → 12     grid (3 cols) — stacked column, moderate density
   *   "mini"    → 16     grid (4 cols) — stacked column, maximum density
   */
  const mode: "full" | "compact" | "mini" =
    gridSize >= 16 ? "mini" : gridSize >= 12 ? "compact" : "full";

  const isRowLayout = true;

  /* ─── Helpers ─── */
  const getInitials = (name: string) => {
    if (!name) return "EE";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getColorHash = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];
    return colors[Math.abs(hash) % colors.length];
  };

  const nameInitials = getInitials(employee.name);
  const avatarColor = getColorHash(employee.name);

  /* ─── Punch data ─── */
  const punches: { in: string; out: string }[] = employee.punches
    ? employee.punches
    : employee.inTime
      ? [{ in: employee.inTime, out: employee.outTime || "Not yet" }]
      : [{ in: "Not Punched", out: "Not yet" }];

  const displayPunches = punches;

  const parseTimeStr = (timeStr: string) => {
    if (!timeStr || timeStr === "Not yet" || timeStr === "Not Punched") return null;
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (!match) return null;
    let [ , h, m, ampm ] = match;
    let hours = parseInt(h, 10);
    const mins = parseInt(m, 10);
    if (ampm.toLowerCase() === "pm" && hours < 12) hours += 12;
    if (ampm.toLowerCase() === "am" && hours === 12) hours = 0;
    return hours * 60 + mins;
  };

  const calculateDuration = (startStr: string, endStr: string) => {
    const startMins = parseTimeStr(startStr);
    const endMins = parseTimeStr(endStr);
    if (startMins === null || endMins === null) return "Unknown";
    
    let diff = endMins - startMins;
    if (diff < 0) diff += 24 * 60;
    
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  /* ─── Per-mode sizing tokens ─── */
  const avatarSize = mode === "full" ? 44 : mode === "compact" ? 28 : 26;
  const avatarFont = mode === "full" ? "15px" : mode === "compact" ? "10px" : "9px";
  const nameFont = mode === "full" ? "14px" : mode === "compact" ? "12px" : "11px";
  const roleFont = mode === "full" ? "11px" : "10px";
  const infoGap = mode === "full" ? "12px" : mode === "compact" ? "4px" : "4px";
  const panelPad = mode === "full" ? "16px" : mode === "compact" ? "8px 10px" : "7px 9px";
  const mapHeight = mode === "full" ? 140 : mode === "compact" ? 110 : 95;
  const taskPad = mode === "full" ? "8px 14px" : mode === "compact" ? "4px 8px" : "4px 8px";
  const taskFont = mode === "full" ? 13 : mode === "compact" ? 11 : 10;

  /* ─── Telemetry row items ─── */
  const batteryColor = employee.batteryLevel != null && employee.batteryLevel < 20 ? "#ef4444" : "#475569";
  const batteryIcon = <Battery size={10} color={employee.batteryLevel != null && employee.batteryLevel < 20 ? "#ef4444" : "#10b981"} />;
  const telemetry = [
    { label: "Battery", value: employee.batteryLevel != null ? `${employee.batteryLevel}%` : "N/A", icon: batteryIcon, color: batteryColor },
    { label: "Distance", value: employee.distance ?? "0.0 km", icon: <Activity size={10} color="#3b82f6" />, color: "#0f172a" },
    { label: "Hours", value: employee.workingHours ?? "0h 0m", icon: <Clock size={10} color="#64748b" />, color: "#0f172a" },
  ];

  const hasPunchedIn = punches.some(p => p.in && p.in !== "Not Punched");
  const lastPunch = punches[punches.length - 1];
  const hasPunchedOut = lastPunch && lastPunch.out !== "Not yet";

  let workingMinutes = 0;
  punches.forEach(p => {
    const inMins = parseTimeStr(p.in);
    if (inMins !== null) {
      if (p.out && p.out !== "Not yet") {
        const outMins = parseTimeStr(p.out);
        if (outMins !== null) {
          let diff = outMins - inMins;
          if (diff < 0) diff += 24 * 60;
          workingMinutes += diff;
        }
      } else {
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        let diff = currentMins - inMins;
        if (diff < 0) diff += 24 * 60;
        workingMinutes += diff;
      }
    }
  });

  // Assume 9 hour shift (540 minutes) for 100% progress
  const progressPercent = Math.min((workingMinutes / 540) * 100, 100);
  const progressHue = 45 + (progressPercent / 100) * (145 - 45); // 45 is Yellow, 145 is Green

  let cardBorderColor = "#e2e8f0"; // default grey (Shift not started)
  let statusBg = "#f1f5f9";
  let statusText = "#64748b";
  let statusTooltip = "Not Started";
  let progressColor = `hsl(${progressHue}, 90%, 45%)`;
  let progressWidth = `${Math.max(progressPercent, 2)}%`;

  if (hasPunchedIn) {
    if (hasPunchedOut) {
      const shiftMins = employee.shiftMins || 480;
      if (workingMinutes < 240) { // Less than 4 hours -> Absent
        cardBorderColor = "#ef4444"; // Red
        statusBg = "#fee2e2";
        statusText = "#dc2626";
        statusTooltip = "Absent";
        progressColor = "#ef4444";
      } else if (workingMinutes < shiftMins) { // More than 4 hours but less than shift -> Half Day
        cardBorderColor = "#f97316"; // Orange
        statusBg = "#ffedd5";
        statusText = "#c2410c";
        statusTooltip = "Half Day";
        progressColor = "#f97316";
      } else { // Full shift -> Completed
        cardBorderColor = "#10b981"; // Green
        statusBg = "#d1fae5";
        statusText = "#059669";
        statusTooltip = "Completed";
        progressColor = "#10b981";
        progressWidth = "100%";
      }
    } else {
      cardBorderColor = "#eab308"; // Yellow (Shift ongoing)
      statusBg = "#fef08a";
      statusText = "#b45309";
      statusTooltip = "Ongoing";
    }
  } else {
    if (!isOnline) {
      cardBorderColor = "#ef4444"; // Red (Absent)
      statusBg = "#fee2e2";
      statusText = "#dc2626";
      statusTooltip = "Absent";
    } else {
      cardBorderColor = "#e2e8f0"; // White/Grey (Shift not started)
      statusBg = "#f1f5f9";
      statusText = "#64748b";
      statusTooltip = "Not Started";
    }
  }

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: mode === "full" ? "14px" : "9px",
        border: "1px solid #e2e8f0",
        overflow: "hidden",
        display: "flex",
        flexDirection: isRowLayout ? "row" : "column",
        boxShadow: "0 2px 12px rgba(48,117,228,0.05)",
        height: (isFullscreen && !isPastFeed) ? "100%" : "auto",
        minHeight: isPastFeed ? "480px" : (isFullscreen ? "0" : "auto"),
        transition: "box-shadow 0.2s",
      }}
      className="employee-live-card"
    >
      {/* ════════════════════ INFO PANEL ════════════════════ */}
      <div style={{
        flex: isRowLayout ? "1 1 55%" : "none",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: panelPad,
        borderRight: isRowLayout ? "1px solid #e2e8f0" : "none",
        borderBottom: !isRowLayout ? "1px solid #e2e8f0" : "none",
        background: "#ffffff",
        minWidth: 0,
        gap: infoGap,
      }}>

        {/* ── Avatar + Name + Role + Territory ── */}
        <div style={{ display: "flex", alignItems: "center", gap: mode === "full" ? "10px" : "7px", minWidth: 0 }}>
          {employee.avatar ? (
            <img
              src={employee.avatar}
              alt={employee.name}
              style={{ width: avatarSize, height: avatarSize, borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0", flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: avatarSize, height: avatarSize, borderRadius: "50%",
              background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}cc)`,
              color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: avatarFont,
              border: "2px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,0.08)", flexShrink: 0,
            }}>
              {nameInitials}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", minWidth: 0, gap: "4px", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <h4 style={{
                margin: 0,
                fontSize: mode === "full" ? "15px" : mode === "compact" ? "13px" : "12px",
                fontWeight: 700,
                color: "#0f172a",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.1,
                textTransform: "capitalize"
              }} title={`${employee.name} (${statusTooltip})`}>
                {employee.name}
              </h4>
              <span style={{
                padding: "2px 6px",
                borderRadius: "12px",
                background: statusBg,
                color: statusText,
                fontSize: "9px",
                fontWeight: 700,
                whiteSpace: "nowrap",
                border: `1px solid ${cardBorderColor}40`
              }}>
                {statusTooltip}
              </span>
            </div>
            <span style={{
              fontSize: mode === "full" ? "12px" : mode === "compact" ? "11px" : "10px",
              color: "#64748b",
              fontWeight: 600,
              lineHeight: 1
            }}>
              {employee.role ? employee.role.replace(/_/g, " ") : "Field Staff"}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "3px", fontSize: mode === "full" ? "11px" : mode === "compact" ? "10px" : "9px", color: "#3b82f6", minWidth: 0 }}>
              <MapPin size={10} color="#3b82f6" style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={employee.territory}>
                {employee.territory || "Unassigned"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Status badges ── */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
          {/* Moving / Stationary — hidden in mini to save space */}
          {isOnline && mode !== "mini" && (
            <span style={{
              background: employee.isMoving ? "rgba(59,130,246,0.1)" : "rgba(100,116,139,0.1)",
              color: employee.isMoving ? "#3b82f6" : "#64748b",
              padding: "2px 7px", borderRadius: "10px",
              fontSize: "10px", fontWeight: 600,
              display: "flex", alignItems: "center", gap: "3px",
            }}>
              <Activity size={9} style={{ opacity: employee.isMoving ? 1 : 0.6 }} />
              {employee.isMoving ? "Moving" : "Stationary"}
            </span>
          )}

          {/* Last seen — full mode only */}
          {mode === "full" && (
            <span style={{ fontSize: "10px", color: "#94a3b8" }}>
              {isOnline ? "Live" : `Last seen: ${employee.lastActive || "N/A"}`}
            </span>
          )}
        </div>

        {/* ── Punch In / Out rows ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          {/* Header row */}
          <div style={{ display: "flex", paddingLeft: mode === "full" ? "24px" : "16px" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "3px", fontSize: "9px", color: "#64748b", fontWeight: 700 }}>
              <LogIn size={9} color="#10b981" /> Punch in
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "3px", fontSize: "9px", color: "#64748b", fontWeight: 700 }}>
              <LogOut size={9} color="#ef4444" /> Punch out
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "3px", maxHeight: "100px", overflowY: "auto", paddingRight: "2px" }} className="custom-scrollbar">
            {displayPunches.map((p: any, idx: number) => (
              <React.Fragment key={idx}>
                <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                  {/* Index badge */}
                  <div style={{
                    width: mode === "full" ? "18px" : "13px",
                    height: mode === "full" ? "18px" : "13px",
                    background: "#f1f5f9", borderRadius: "3px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "8px", color: "#64748b", fontWeight: 700,
                    border: "1px solid #e2e8f0", flexShrink: 0,
                  }}>
                    {idx + 1}
                  </div>
                  {/* Punch-in pill */}
                  <div style={{
                    flex: 1, background: "#ecfdf5", border: "1px solid #d1fae5",
                    color: "#059669", borderRadius: "6px",
                    padding: "2px 0", textAlign: "center", fontSize: "9px", fontWeight: 700,
                  }}>
                    {p.in}
                  </div>
                  {/* Punch-out pill */}
                  <div style={{
                    flex: 1,
                    background: p.out === "Not yet" ? "#f8fafc" : "#fef2f2",
                    border: p.out === "Not yet" ? "1px solid #e2e8f0" : "1px solid #ffe4e6",
                    color: p.out === "Not yet" ? "#94a3b8" : "#e11d48",
                    borderRadius: "6px", padding: "2px 0",
                    textAlign: "center", fontSize: "9px", fontWeight: 700,
                  }}>
                    {p.out}
                  </div>
                </div>
                {idx < displayPunches.length - 1 && p.out !== "Not yet" && displayPunches[idx + 1].in !== "Not Punched" && (
                  <div style={{ display: "flex", justifyContent: "center", margin: "1px 0" }}>
                    <span style={{ 
                      fontSize: "8px", color: "#b45309", fontWeight: 700, 
                      background: "#fef3c7", border: "1px solid #fde68a",
                      padding: "1px 6px", borderRadius: "8px",
                      display: "flex", alignItems: "center", gap: "2px"
                    }}>
                      <Clock size={8} /> Break: {calculateDuration(p.out, displayPunches[idx + 1].in)}
                    </span>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Telemetry footer: Battery / Distance / Hours — hidden in mini mode ── */}
        {mode !== "mini" && (
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            paddingTop: mode === "full" ? "10px" : "6px",
            borderTop: "1px solid #f1f5f9", gap: "4px",
          }}>
            {telemetry.map((t, i, arr) => (
              <React.Fragment key={t.label}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1px", alignItems: "center", flex: 1 }}>
                  <span style={{ fontSize: "8px", color: "#64748b", fontWeight: 600 }}>{t.label}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "2px", fontSize: mode === "full" ? "11px" : "10px", color: t.color, fontWeight: 700 }}>
                    {t.icon} {t.value}
                  </div>
                </div>
                {i < arr.length - 1 && <div style={{ width: "1px", height: "16px", background: "#e2e8f0", flexShrink: 0 }} />}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* ════════════════════ MAP PANEL ════════════════════ */}
      <div style={{
        flex: isRowLayout ? "1 1 45%" : "1 1 auto",
        display: "flex", flexDirection: "column",
        background: "#f8fafc",
        minHeight: 0, // important for flex children to shrink vertically
        minWidth: 0,  // CRITICAL: important for flex children to shrink horizontally, otherwise Map canvas pushes it to 100%
      }}>
        {/* Map container — explicit px height REQUIRED by Mappls SDK to render unless parent has absolute height (like in fullscreen grid) */}
        <div style={{
          position: "relative",
          width: "100%",
          height: (isFullscreen || isPastFeed) ? "100%" : mapHeight,
          flexGrow: (isFullscreen || isPastFeed) ? 1 : 0,
          flexBasis: (isFullscreen || isPastFeed) ? "0%" : "auto",
          minHeight: 0,
          flexShrink: 0
        }}>
          <MiniMap employee={employee} isPastFeed={isPastFeed} />
        </div>

        {/* Tasks strip with progress bar */}
        <div style={{
          position: "relative",
          padding: taskPad, 
          background: "#ffffff",
          borderTop: "1px solid #e2e8f0",
          display: "flex", justifyContent: "center", alignItems: "center",
          flexShrink: 0,
          marginTop: "auto",
          overflow: "hidden"
        }}>
          {(!hasPunchedIn && !isOnline) ? (
            <div style={{
              position: "absolute",
              left: 0, top: 0, bottom: 0,
              width: "100%",
              background: "#ef4444",
              opacity: 0.45,
              transition: "background 1s ease"
            }} />
          ) : hasPunchedIn ? (
            <div style={{
              position: "absolute",
              left: 0, top: 0, bottom: 0,
              width: progressWidth,
              background: progressColor,
              opacity: 0.25,
              transition: "width 1s ease-in-out, background 1s ease"
            }} />
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", position: "relative", zIndex: 1 }}>
            <CheckSquare size={taskFont} color="#3b82f6" />
            <span style={{ fontSize: `${taskFont - 1}px`, fontWeight: 500, color: "#475569" }}>
              Tasks: <strong style={{ color: "#0f172a" }}>{employee.tasksToday || 0}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
