"use client";

import React from "react";
import MiniMap from "./MiniMap";
import { Employee } from "@/types/live-feed";
import { MapPin, Battery, CheckSquare, Activity, LogIn, LogOut, Clock } from "lucide-react";

interface EmployeeCardProps {
  employee: Employee;
  isPastFeed?: boolean;
}

export default function EmployeeCard({ employee, isPastFeed }: EmployeeCardProps) {
  const isOnline = employee.status === "online";

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
    const colors = [
      "#3b82f6", // blue
      "#10b981", // green
      "#f59e0b", // yellow/amber
      "#ef4444", // red
      "#8b5cf6", // purple
      "#ec4899", // pink
      "#06b6d4"  // cyan
    ];
    return colors[Math.abs(hash) % colors.length];
  };

  const nameInitials = getInitials(employee.name);
  const avatarColor = getColorHash(employee.name);

  // Use real punches from backend only. Fallback to single row using inTime/outTime
  // if the punches array hasn't been populated yet.
  const punches: { in: string; out: string }[] = employee.punches
    ? employee.punches
    : employee.inTime
      ? [{ in: employee.inTime, out: employee.outTime || "Not yet" }]
      : [{ in: "Not Punched", out: "Not yet" }];

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "16px",
      border: "1px solid #e2e8f0",
      overflow: "hidden",
      display: "flex",
      flexDirection: "row",
      boxShadow: "0 4px 20px rgba(48, 117, 228, 0.04)",
      height: "auto",
      minHeight: isPastFeed ? "480px" : "auto",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    }}
      className="employee-live-card"
    >
      {/* Left Panel */}
      <div style={{
        flex: "1 1 50%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "20px",
        borderRight: "1px solid #e2e8f0",
        background: "#ffffff",
        minWidth: "0"
      }}>
        {/* Header Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: "0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "0" }}>
            {employee.avatar ? (
              <img
                src={employee.avatar}
                alt={employee.name}
                style={{ width: "48px", height: "48px", borderRadius: "50%", objectFit: "cover", border: "2px solid #e2e8f0", flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd)`,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "16px",
                border: "2px solid #ffffff",
                boxShadow: "0 4px 10px rgba(0, 0, 0, 0.08)",
                flexShrink: 0
              }}>
                {nameInitials}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", minWidth: "0" }}>
              <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={employee.name}>
                {employee.name}
              </h4>
              <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
                {employee.role || "Field Staff"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#334155", minWidth: "0" }}>
              <MapPin size={14} color="#3b82f6" style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={employee.territory}>
                {employee.territory || "Unassigned"}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{
                background: isOnline ? "rgba(16, 185, 129, 0.1)" : "rgba(148, 163, 184, 0.1)",
                color: isOnline ? "#10b981" : "#64748b",
                padding: "3px 8px",
                borderRadius: "12px",
                fontSize: "11px",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: isOnline ? "#10b981" : "#64748b", display: "inline-block" }} />
                {isOnline ? "Active" : "Inactive"}
              </span>

              {isOnline && (
                <span style={{
                  background: employee.isMoving ? "rgba(59, 130, 246, 0.1)" : "rgba(100, 116, 139, 0.1)",
                  color: employee.isMoving ? "#3b82f6" : "#64748b",
                  padding: "3px 8px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  <Activity size={10} style={{ opacity: employee.isMoving ? 1 : 0.6 }} />
                  {employee.isMoving ? "Moving" : "Stationary"}
                </span>
              )}

              <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                {isOnline ? "Live" : `Last seen: ${employee.lastActive || "N/A"}`}
              </span>
            </div>
          </div>
        </div>

        {/* Multiple Punches Strip Feature */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "16px 0", flex: 1 }}>
          <div style={{ display: "flex", paddingLeft: "28px", marginBottom: "2px" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#64748b", fontWeight: 700 }}>
              <LogIn size={12} color="#10b981" /> Punch in
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "4px", fontSize: "11px", color: "#64748b", fontWeight: 700 }}>
              <LogOut size={12} color="#ef4444" /> Punch out
            </div>
          </div>

          {punches.map((p: any, idx: number) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "22px", height: "22px", background: "#f1f5f9", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#64748b", fontWeight: 700, border: "1px solid #e2e8f0" }}>
                {idx + 1}
              </div>
              <div style={{ flex: 1, background: "#ecfdf5", border: "1px solid #d1fae5", color: "#059669", borderRadius: "12px", padding: "4px 0", textAlign: "center", fontSize: "11px", fontWeight: 700 }}>
                {p.in}
              </div>
              <div style={{ flex: 1, background: p.out === "Not yet" ? "#f8fafc" : "#fef2f2", border: p.out === "Not yet" ? "1px solid #e2e8f0" : "1px solid #ffe4e6", color: p.out === "Not yet" ? "#94a3b8" : "#e11d48", borderRadius: "12px", padding: "4px 0", textAlign: "center", fontSize: "11px", fontWeight: 700 }}>
                {p.out}
              </div>
            </div>
          ))}
        </div>

        {/* Telemetry Footer */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "16px",
          borderTop: "1px solid #f1f5f9",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          {/* Battery */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Battery</span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: (employee.batteryLevel != null && employee.batteryLevel < 20) ? "#ef4444" : "#475569", fontWeight: 700 }}>
              <Battery size={14} color={(employee.batteryLevel != null && employee.batteryLevel < 20) ? "#ef4444" : "#10b981"} />
              {employee.batteryLevel != null ? `${employee.batteryLevel}%` : "N/A"}
            </div>
          </div>

          <div style={{ width: "1px", height: "24px", background: "#e2e8f0" }} />

          {/* Distance */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Distance</span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "#0f172a", fontWeight: 700 }}>
              <Activity size={12} color="#3b82f6" /> 
              {employee.distance !== undefined ? employee.distance : "0.0 km"}
            </div>
          </div>

          <div style={{ width: "1px", height: "24px", background: "#e2e8f0" }} />

          {/* Hours */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Hours</span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", color: "#0f172a", fontWeight: 700 }}>
              <Clock size={14} color="#64748b" /> 
              {employee.workingHours !== undefined ? employee.workingHours : "0h 0m"}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={{
        flex: "1 1 50%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: "#f8fafc"
      }}>
        {/* Map View */}
        <div style={{ flex: 1, position: "relative", minHeight: "150px" }}>
          <MiniMap employee={employee} isPastFeed={isPastFeed} />
        </div>

        {/* Tasks Strip */}
        <div style={{
          padding: "12px 14px",
          background: "#ffffff",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "12px",
          color: "#475569",
        }}>
          {/* Tasks count */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckSquare size={14} color="#3b82f6" />
            <span style={{ fontSize: "12px", fontWeight: 500 }}>Tasks Assigned: <strong style={{ color: "#0f172a" }}>{employee.tasksToday || 0}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
