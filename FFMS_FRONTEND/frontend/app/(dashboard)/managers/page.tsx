"use client";

import React from "react";
import { Users } from "lucide-react";

export default function ManagersPlaceholderPage() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      textAlign: "center",
      padding: "40px",
      background: "#ffffff",
      borderRadius: "16px",
      border: "1px solid #e2e8f0",
      boxShadow: "0 4px 24px rgba(48, 117, 228, 0.04)"
    }}>
      <div style={{
        width: "64px",
        height: "64px",
        borderRadius: "50%",
        background: "rgba(59, 130, 246, 0.1)",
        color: "#3b82f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "20px"
      }}>
        <Users size={32} />
      </div>
      <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>
        Manager Directory Coming Soon
      </h2>
      <p style={{ fontSize: "14px", color: "#64748b", maxWidth: "400px", lineHeight: "1.6" }}>
        We are building a portal for view team manager metrics, reporting chains, and escalations. Stay tuned!
      </p>
    </div>
  );
}
