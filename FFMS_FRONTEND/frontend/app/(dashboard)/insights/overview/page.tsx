"use client";

import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { 
  TrendingUp, 
  Users, 
  CheckSquare, 
  MapPin, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  Activity,
  Layers
} from "lucide-react";

export default function InsightsOverviewPage() {
  const employees = useSelector((s: RootState) => s.employees.list);
  const tasks = useSelector((s: RootState) => s.tasks.list);
  const expenses = useSelector((s: RootState) => s.expenses.list);
  const notifications = useSelector((s: RootState) => s.notifications.list);

  // Compute metrics
  const activeStaff = employees.length;
  const completedTasks = tasks.filter(t => t.status === "Completed").length;
  const totalTasks = tasks.length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalExpenseBurn = expenses.reduce((acc, exp) => exp.status === "Approved" ? acc + exp.amount : acc, 0);
  const pendingExpenseClaims = expenses.filter(exp => exp.status === "Pending Approval by Manager").length;

  const criticalAlerts = notifications.filter(n => n.priority === "high" && !n.read).length;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header */}
      <div>
        <div className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <TrendingUp size={24} color="var(--accent-blue)" /> Operations Overview & Insights
        </div>
        <div className="page-subtitle">Real-time enterprise metrics, staff allocation status, and budget burn diagnostics.</div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        
        {/* KPI 1: Active Staff */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "12px", position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Field Staff</div>
              <div style={{ fontSize: "28px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace", marginTop: "4px" }}>{activeStaff}</div>
            </div>
            <div style={{ width: "38px", height: "38px", background: "rgba(0,82,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={16} color="var(--accent-blue)" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px" }}>
            <span style={{ color: "var(--accent-green)", fontWeight: 700, display: "flex", alignItems: "center" }}>
              <ArrowUpRight size={14} /> +12%
            </span>
            <span style={{ color: "var(--text-muted)" }}>active coverage this week</span>
          </div>
        </div>

        {/* KPI 2: Task Completion Rate */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Task Dispatch Rate</div>
              <div style={{ fontSize: "28px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace", marginTop: "4px" }}>{taskCompletionRate}%</div>
            </div>
            <div style={{ width: "38px", height: "38px", background: "rgba(16,185,129,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckSquare size={16} color="var(--accent-green)" />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <div style={{ height: "4px", background: "var(--border)", width: "100%" }}>
              <div style={{ height: "100%", background: "var(--accent-green)", width: `${taskCompletionRate}%` }}></div>
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: "11.5px" }}>{completedTasks} of {totalTasks} tickets completed</span>
          </div>
        </div>

        {/* KPI 3: Monthly Expense Burn */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Vouched Budget Burn</div>
              <div style={{ fontSize: "24px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace", marginTop: "8px" }}>
                ₹{totalExpenseBurn.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            </div>
            <div style={{ width: "38px", height: "38px", background: "rgba(249,115,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Wallet size={16} color="var(--accent-orange)" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px" }}>
            <span style={{ color: "var(--accent-orange)", fontWeight: 700 }}>{pendingExpenseClaims} Pending</span>
            <span style={{ color: "var(--text-muted)" }}>claims under review</span>
          </div>
        </div>

        {/* KPI 4: Security Geofencing Status */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Critical Incidents</div>
              <div style={{ fontSize: "28px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace", marginTop: "4px", color: criticalAlerts > 0 ? "var(--accent-red)" : "var(--text-primary)" }}>{criticalAlerts}</div>
            </div>
            <div style={{ width: "38px", height: "38px", background: "rgba(244,63,94,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={16} color="var(--accent-red)" />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11.5px" }}>
            <span style={{ color: criticalAlerts > 0 ? "var(--accent-red)" : "var(--accent-green)", fontWeight: 700 }}>
              {criticalAlerts > 0 ? "⚠️ ACTION REQ." : "🟢 ALL SECURE"}
            </span>
            <span style={{ color: "var(--text-muted)" }}>active perimeter alarms</span>
          </div>
        </div>

      </div>

      {/* Main Grid: Allocation breakup + Real-time feeds */}
      <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr", gap: "20px" }}>
        
        {/* Left Card: Shift Productivity Breakdown */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
            <span style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Layers size={16} color="var(--accent-blue)" /> Field Force Activity Breakdown
            </span>
            <span className="badge badge-green" style={{ fontSize: "10px" }}>Live Feed</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Category 1 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "4px" }}>
                <span style={{ fontWeight: 600 }}>Active Customer Site Visits</span>
                <span style={{ fontFamily: "var(--font-jetbrains), monospace", fontWeight: 700 }}>72%</span>
              </div>
              <div style={{ height: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", width: "100%" }}>
                <div style={{ height: "100%", background: "var(--accent-blue)", width: "72%" }}></div>
              </div>
            </div>

            {/* Category 2 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "4px" }}>
                <span style={{ fontWeight: 600 }}>In-Transit / Conveyance</span>
                <span style={{ fontFamily: "var(--font-jetbrains), monospace", fontWeight: 700 }}>18%</span>
              </div>
              <div style={{ height: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", width: "100%" }}>
                <div style={{ height: "100%", background: "var(--accent-orange)", width: "18%" }}></div>
              </div>
            </div>

            {/* Category 3 */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "4px" }}>
                <span style={{ fontWeight: 600 }}>Idle / Check-in Delayed</span>
                <span style={{ fontFamily: "var(--font-jetbrains), monospace", fontWeight: 700 }}>10%</span>
              </div>
              <div style={{ height: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", width: "100%" }}>
                <div style={{ height: "100%", background: "var(--accent-red)", width: "100%" }}></div>
              </div>
            </div>
          </div>

          <div style={{ padding: "12px", background: "rgba(0,82,255,0.02)", border: "1px solid rgba(0,82,255,0.1)", display: "flex", gap: "10px", alignItems: "center", marginTop: "8px" }}>
            <Zap size={16} color="var(--accent-blue)" />
            <p style={{ fontSize: "11.5px", color: "var(--text-secondary)", margin: 0 }}>
              <strong>AI Productivity Recommendation:</strong> Shift attendance logs show peak delayed check-ins on Monday mornings. Consider adjusting geofence rings to pre-buffer site access constraints.
            </p>
          </div>
        </div>

        {/* Right Card: Live Geofence Monitor */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
            <span style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Activity size={16} color="var(--accent-orange)" /> Recent Perimeter Breaches
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "250px", overflowY: "auto" }}>
            {notifications.filter(n => n.type === "alert" || n.message.includes("BREACH")).slice(0, 4).map(item => (
              <div 
                key={item.id} 
                style={{
                  padding: "10px",
                  background: "var(--bg-secondary)",
                  borderLeft: "3px solid var(--accent-red)",
                  borderTop: "1px solid var(--border)",
                  borderRight: "1px solid var(--border)",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", fontWeight: 700 }}>
                  <span>{item.employeeName}</span>
                  <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-jetbrains), monospace" }}>{item.time}</span>
                </div>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0 }}>{item.message}</p>
              </div>
            ))}

            {notifications.filter(n => n.type === "alert" || n.message.includes("BREACH")).length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)", fontSize: "12px" }}>
                No geofence breaches detected today.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
