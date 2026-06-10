"use client";

import React from "react";
import MiniMap from "./MiniMap";
import { Employee } from "@/types/live-feed";
import { MapPin, Battery, Compass, ShieldAlert, Clock, CheckSquare, Activity } from "lucide-react";

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

  // GPS Accuracy color coding
  const getAccuracyColor = (accuracy?: number) => {
    if (accuracy === undefined) return "#64748b";
    if (accuracy < 20) return "#10b981"; // green
    if (accuracy <= 100) return "#f59e0b"; // yellow
    return "#ef4444"; // red
  };

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "16px",
      border: "1px solid #e2e8f0",
      overflow: "hidden",
      display: "flex",
      flexDirection: "row",
      boxShadow: "0 4px 20px rgba(48, 117, 228, 0.04)",
      height: isPastFeed ? "480px" : "320px",
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
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#475569" }} title="Battery Level">
            <Battery size={14} color={employee.batteryLevel !== undefined && employee.batteryLevel < 20 ? "#ef4444" : "#10b981"} />
            <span style={{ fontWeight: 600 }}>{employee.batteryLevel !== undefined ? `${employee.batteryLevel}%` : "N/A"}</span>
          </div>

          {/* Speed */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#475569" }} title="Speed">
            <Compass size={14} color="#3b82f6" />
            <span style={{ fontWeight: 600 }}>{typeof employee.speed === 'number' ? `${employee.speed.toFixed(1)} km/h` : "--"}</span>
          </div>

          {/* Accuracy */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", color: "#475569" }} title="GPS Accuracy">
            <ShieldAlert size={14} color={getAccuracyColor(employee.accuracy)} />
            <span style={{ fontWeight: 600 }}>{employee.accuracy !== undefined ? `${Math.round(employee.accuracy)}m` : "±15m"}</span>
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

        {/* Punch & Tasks Strip */}
        <div style={{
          padding: "10px 14px",
          background: "#ffffff",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "12px",
          color: "#475569",
          flexWrap: "wrap",
          gap: "8px"
        }}>
          {/* Check-In */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Clock size={12} color="#10b981" />
            <span style={{ fontSize: "11px" }}>In: <strong>{employee.inTime || "Not Punched"}</strong></span>
          </div>

          {/* Check-Out */}
          {employee.outTime && (
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Clock size={12} color="#f59e0b" />
              <span style={{ fontSize: "11px" }}>Out: <strong>{employee.outTime}</strong></span>
            </div>
          )}

          {/* Tasks count */}
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <CheckSquare size={12} color="#3b82f6" />
            <span style={{ fontSize: "11px" }}>Tasks: <strong>{employee.tasksToday || 0}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
