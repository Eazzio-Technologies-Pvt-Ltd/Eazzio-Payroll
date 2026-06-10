"use client";

import React from "react";
import EmployeeCard from "./EmployeeCard";
import { Employee } from "@/types/live-feed";

// Error boundary prevents one bad card from crashing entire feed
class CardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("EmployeeCard crash caught by error boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #ef4444",
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#ef4444",
          height: "320px",
          textAlign: "center",
          boxShadow: "0 4px 20px rgba(239, 68, 68, 0.05)"
        }}>
          <span style={{ fontWeight: 700, marginBottom: "8px", fontSize: "14px" }}>Card Error</span>
          <span style={{ fontSize: "12px", color: "#64748b" }}>An error occurred rendering this card.</span>
        </div>
      );
    }

    return this.props.children;
  }
}

interface GridViewProps {
  employees: Employee[];
  gridSize: number;
  isPastFeed: boolean;
}

export default function GridView({ employees, gridSize, isPastFeed }: GridViewProps) {
  // Compute grid template columns based on gridSize
  let columns = 4;
  if (gridSize === 4) columns = 2;
  else if (gridSize === 8) columns = 2;
  else if (gridSize === 12) columns = 3;
  else if (gridSize === 16) columns = 4;

  if (isPastFeed) {
    return (
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: "24px",
        height: "100%",
        minHeight: "400px"
      }}>
        {employees.slice(0, 1).map((emp) => (
          // Error boundary prevents one bad card from crashing entire feed
          <CardErrorBoundary key={`past-${emp.id}`}>
            <EmployeeCard employee={emp} isPastFeed={true} />
          </CardErrorBoundary>
        ))}
        {employees.length === 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
            No employee selected for audit
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: "20px",
    }}>
      {employees.map((emp) => (
        // Error boundary prevents one bad card from crashing entire feed
        <CardErrorBoundary key={emp.id}>
          <EmployeeCard employee={emp} isPastFeed={false} />
        </CardErrorBoundary>
      ))}
      {employees.length === 0 && (
        <div style={{ gridColumn: `1 / -1`, textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
          No employees found for the selected filters.
        </div>
      )}
    </div>
  );
}
