"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { dashboardApi, projectsApi, attendanceApi, ApiProject } from "@/lib/api-client";
import {
  Users,
  UserCheck,
  UserX,
  CalendarCheck,
  Clock,
  MapPin,
  UserPlus,
  FolderPlus,
  BarChart3,
  FileText,
  ChevronDown,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import LiveFeedWidget from "@/components/live-feed/LiveFeedWidget";
import { GlassProvider, AdjustGlassButton } from "@/components/ui/glass-provider";
import { GlassPanel } from "@/components/ui/glass-panel";

interface TodayStats {
  totalCheckedIn: number;
}

interface WeeklyActivityItem {
  date: string;
  checkIns: number;
}

interface AdminDashboardStats {
  totalManagers: number;
  totalEmployees: number;
  todayStats: TodayStats;
  pendingApprovals: number;
  weeklyActivity: WeeklyActivityItem[];
}

interface StaffRecord {
  userId: string;
  name: string;
  employeeId?: string;
  checkedIn: boolean;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [, setProjects] = useState<ApiProject[]>([]);
  const [todayStaff, setTodayStaff] = useState<StaffRecord[]>([]);
  const [showPresent, setShowPresent] = useState(false);
  const [showAbsent, setShowAbsent] = useState(false);

  useEffect(() => {
    Promise.all([
      dashboardApi.getAdmin(),
      projectsApi.list(),
      attendanceApi.today(),
    ])
      .then(([statsRes, projectsRes, attendanceRes]) => {
        if (statsRes.success) {
          setStats(statsRes.data as unknown as AdminDashboardStats);
        }
        if (projectsRes.success) {
          setProjects(projectsRes.data);
        }
        if (attendanceRes.success) {
          setTodayStaff(attendanceRes.data as unknown as StaffRecord[]);
        }
      })
      .catch((err) => console.error("Admin dashboard fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ margin: "-28px", minHeight: "calc(100vh - 70px)", background: "var(--gw-page-bg, #dfb8a3)" }}>
        <GlassProvider initialPreset="frosted">
          <div style={{ padding: "24px 28px 48px", maxWidth: 1600, margin: "0 auto" }}>
            <div className="gw-dashboard-canvas" style={{ padding: "28px", display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Skeleton Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="skeleton-line" style={{ width: 180, height: 28, borderRadius: 8, background: "rgba(255, 255, 255, 0.6)" }} />
                <div className="skeleton-line" style={{ width: 120, height: 36, borderRadius: 20, background: "rgba(255, 255, 255, 0.6)" }} />
              </div>

              {/* Skeleton Row 1 — KPI Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="gw-glass"
                    style={{
                      height: 106,
                      padding: "16px 18px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      borderRadius: 20,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div className="skeleton-line" style={{ width: "45%" }} />
                      <div className="skeleton-circle" style={{ width: "36px", height: "36px" }} />
                    </div>
                    <div className="skeleton-line" style={{ width: "55%", height: "24px" }} />
                  </div>
                ))}
              </div>

              {/* Skeleton Row 2 — Live Feed */}
              <div
                className="gw-glass"
                style={{
                  height: 480,
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                  borderRadius: 22,
                }}
              >
                <div className="skeleton-line" style={{ width: "30%", height: "20px" }} />
                <div className="skeleton-box" style={{ width: "100%", flex: 1, borderRadius: 14 }} />
              </div>
            </div>
          </div>
        </GlassProvider>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ margin: "-28px", minHeight: "calc(100vh - 70px)", background: "var(--gw-page-bg, #dfb8a3)" }}>
        <GlassProvider initialPreset="frosted">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              height: "70vh",
              gap: 12,
            }}
          >
            <div className="gw-glass rounded-3xl p-8 text-center shadow-xl" style={{ background: "rgba(255, 255, 255, 0.88)" }}>
              <span style={{ color: "#dc2626", fontSize: 16, fontWeight: 700 }}>
                Failed to load dashboard data.
              </span>
              <p style={{ color: "#78716c", fontSize: 13, marginTop: 6 }}>
                Please check your backend connection or refresh the page.
              </p>
            </div>
          </div>
        </GlassProvider>
      </div>
    );
  }

  const attendancePct =
    stats.totalEmployees > 0
      ? Math.round((stats.todayStats.totalCheckedIn / stats.totalEmployees) * 100)
      : 0;

  return (
    <div style={{ margin: "-28px", minHeight: "calc(100vh - 70px)", background: "var(--gw-page-bg, #dfb8a3)" }}>
      <GlassProvider initialPreset="frosted">
        <div style={{ padding: "20px 24px 44px", maxWidth: 1600, margin: "0 auto" }}>
          {/* Master Glass Shell Canvas (Identical to the Reference Image) */}
          <div
            className="gw-dashboard-canvas"
            style={{
              padding: "24px 26px",
              display: "flex",
              flexDirection: "column",
              gap: 22,
            }}
          >
            {/* ════ TOP HEADER & TOOLBAR ════ */}
            <div
              className="gw-reveal"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#1c1917",
                    letterSpacing: "-0.03em",
                    margin: 0,
                    fontFamily: "var(--font-hanken), Inter, system-ui, sans-serif",
                  }}
                >
                  Dashboard
                </h1>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#78716c",
                    margin: "3px 0 0",
                  }}
                >
                  Organization-wide overview & real-time telemetry
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 12px",
                    background: "rgba(255, 255, 255, 0.8)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.95)",
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#ea580c",
                    boxShadow: "0 2px 8px rgba(120, 80, 60, 0.05)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  <Activity size={12} className="text-orange-600" />
                  Live Operations
                </span>

                {/* Adjust Glass Live Button */}
                <AdjustGlassButton />
              </div>
            </div>

            {/* ════ ROW 1 — Modern KPI Cards (Reference Design) ════ */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
              }}
            >
              {/* Card 1: Total Workforce (Porcelain Frosted Glass) */}
              <GlassPanel
                variant="glass"
                hoverEffect
                className="gw-reveal"
                style={{
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  borderRadius: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "#ffffff",
                      border: "1px solid rgba(255, 255, 255, 0.95)",
                      boxShadow: "0 4px 10px rgba(120, 80, 60, 0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#ea580c",
                      flexShrink: 0,
                    }}
                  >
                    <Users size={18} />
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#78716c",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Total Workforce
                    </span>
                    <div style={{ fontSize: 11, color: "#a8a29e", fontWeight: 500 }}>
                      Active Staff
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontSize: 26,
                        fontWeight: 800,
                        color: "#1c1917",
                        lineHeight: 1,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {stats.totalManagers}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#78716c", marginTop: 4 }}>
                      Managers
                    </span>
                  </div>
                  <div
                    style={{
                      height: 28,
                      width: 1,
                      background: "rgba(120, 80, 60, 0.12)",
                    }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <span
                      style={{
                        fontSize: 26,
                        fontWeight: 800,
                        color: "#1c1917",
                        lineHeight: 1,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {stats.totalEmployees}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#78716c", marginTop: 4 }}>
                      Employees
                    </span>
                  </div>
                </div>
              </GlassPanel>

              {/* Card 2: Today's Attendance (Porcelain Frosted Glass) */}
              <GlassPanel
                variant="glass"
                hoverEffect
                className="gw-reveal"
                style={{
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  borderRadius: 20,
                  position: "relative",
                  zIndex: showPresent || showAbsent ? 50 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: "50%",
                        background: "#ffffff",
                        border: "1px solid rgba(255, 255, 255, 0.95)",
                        boxShadow: "0 4px 10px rgba(120, 80, 60, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#10b981",
                        flexShrink: 0,
                      }}
                    >
                      <CalendarCheck size={18} />
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#78716c",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        Attendance
                      </span>
                      <div style={{ fontSize: 11, color: "#a8a29e", fontWeight: 500 }}>
                        Today&apos;s Ratio
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#059669",
                      background: "rgba(16, 185, 129, 0.12)",
                      border: "1px solid rgba(16, 185, 129, 0.2)",
                      padding: "3px 10px",
                      borderRadius: 20,
                    }}
                  >
                    {attendancePct}%
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {/* PRESENT TOGGLE */}
                  <div style={{ flex: 1, position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPresent(!showPresent);
                        setShowAbsent(false);
                      }}
                      className="gw-panel"
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        background: "rgba(240, 253, 244, 0.75)",
                        transition: "all 0.2s ease",
                        textAlign: "left",
                      }}
                    >
                      <UserCheck size={15} color="#059669" />
                      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#1c1917", lineHeight: 1 }}>
                          {stats.todayStats.totalCheckedIn}
                        </span>
                        <span style={{ fontSize: 10, color: "#059669", fontWeight: 700, marginTop: 2 }}>
                          Present <ChevronDown size={10} style={{ display: "inline", verticalAlign: "middle" }} />
                        </span>
                      </div>
                    </button>

                    {showPresent && (
                      <div
                        className="gw-glass"
                        style={{
                          position: "absolute",
                          top: "calc(100% + 6px)",
                          left: 0,
                          width: "210px",
                          borderRadius: 16,
                          zIndex: 100,
                          boxShadow: "0 16px 36px rgba(120, 80, 60, 0.18)",
                          maxHeight: 220,
                          overflowY: "auto",
                          border: "1px solid rgba(255, 255, 255, 0.95)",
                          background: "rgba(255, 255, 255, 0.96)",
                        }}
                      >
                        {todayStaff.filter((s) => s.checkedIn).map((s) => (
                          <div
                            key={s.userId}
                            style={{
                              padding: "9px 12px",
                              borderBottom: "1px solid rgba(120, 80, 60, 0.08)",
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: "50%",
                                background: "rgba(16, 185, 129, 0.15)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#059669",
                                flexShrink: 0,
                              }}
                            >
                              {s.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#1c1917",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {s.name}
                              </span>
                              <span style={{ fontSize: 9, color: "#78716c" }}>
                                {s.employeeId}
                              </span>
                            </div>
                          </div>
                        ))}
                        {todayStaff.filter((s) => s.checkedIn).length === 0 && (
                          <div style={{ padding: "12px", textAlign: "center", fontSize: 11, color: "#78716c" }}>
                            No one present
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ABSENT TOGGLE */}
                  <div style={{ flex: 1, position: "relative" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAbsent(!showAbsent);
                        setShowPresent(false);
                      }}
                      className="gw-panel"
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        background: "rgba(254, 242, 242, 0.75)",
                        transition: "all 0.2s ease",
                        textAlign: "left",
                      }}
                    >
                      <UserX size={15} color="#dc2626" />
                      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#1c1917", lineHeight: 1 }}>
                          {Math.max(0, stats.totalEmployees - stats.todayStats.totalCheckedIn)}
                        </span>
                        <span style={{ fontSize: 10, color: "#dc2626", fontWeight: 700, marginTop: 2 }}>
                          Absent <ChevronDown size={10} style={{ display: "inline", verticalAlign: "middle" }} />
                        </span>
                      </div>
                    </button>

                    {showAbsent && (
                      <div
                        className="gw-glass"
                        style={{
                          position: "absolute",
                          top: "calc(100% + 6px)",
                          right: 0,
                          width: "210px",
                          borderRadius: 16,
                          zIndex: 100,
                          boxShadow: "0 16px 36px rgba(120, 80, 60, 0.18)",
                          maxHeight: 220,
                          overflowY: "auto",
                          border: "1px solid rgba(255, 255, 255, 0.95)",
                          background: "rgba(255, 255, 255, 0.96)",
                        }}
                      >
                        {todayStaff.filter((s) => !s.checkedIn).map((s) => (
                          <div
                            key={s.userId}
                            style={{
                              padding: "9px 12px",
                              borderBottom: "1px solid rgba(120, 80, 60, 0.08)",
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: "50%",
                                background: "rgba(239, 68, 68, 0.15)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#dc2626",
                                flexShrink: 0,
                              }}
                            >
                              {s.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#1c1917",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {s.name}
                              </span>
                              <span style={{ fontSize: 9, color: "#78716c" }}>
                                {s.employeeId}
                              </span>
                            </div>
                          </div>
                        ))}
                        {todayStaff.filter((s) => !s.checkedIn).length === 0 && (
                          <div style={{ padding: "12px", textAlign: "center", fontSize: 11, color: "#78716c" }}>
                            Everyone present
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </GlassPanel>

              {/* Card 3: Pending Approvals (Porcelain Frosted Glass) */}
              <GlassPanel
                variant="glass"
                hoverEffect
                className="gw-reveal"
                style={{
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  borderRadius: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "#ffffff",
                      border: "1px solid rgba(255, 255, 255, 0.95)",
                      boxShadow: "0 4px 10px rgba(120, 80, 60, 0.08)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#f59e0b",
                      flexShrink: 0,
                    }}
                  >
                    <Clock size={18} />
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#78716c",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Pending Approvals
                    </span>
                    <div style={{ fontSize: 11, color: "#a8a29e", fontWeight: 500 }}>
                      Action Required
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flex: 1 }}>
                  {/* Leaves */}
                  <button
                    type="button"
                    onClick={() => router.push("/leaves")}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      cursor: "pointer",
                      padding: "6px 10px",
                      borderRadius: 12,
                      background: "rgba(255, 255, 255, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.85)",
                      transition: "all 0.2s ease",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#ffffff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.6)")}
                    title="View Leave Requests"
                  >
                    <span
                      style={{
                        fontSize: 26,
                        fontWeight: 800,
                        color: "#1c1917",
                        lineHeight: 1,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {Math.ceil(stats.pendingApprovals / 2)}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#ea580c", marginTop: 4, display: "flex", alignItems: "center", gap: 2 }}>
                      Leaves <ArrowUpRight size={12} />
                    </span>
                  </button>

                  <div
                    style={{
                      height: 28,
                      width: 1,
                      background: "rgba(120, 80, 60, 0.12)",
                    }}
                  />

                  {/* Expenses */}
                  <button
                    type="button"
                    onClick={() => router.push("/admin/expenses")}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      cursor: "pointer",
                      padding: "6px 10px",
                      borderRadius: 12,
                      background: "rgba(255, 255, 255, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.85)",
                      transition: "all 0.2s ease",
                      textAlign: "right",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#ffffff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255, 255, 255, 0.6)")}
                    title="View Expense Requests"
                  >
                    <span
                      style={{
                        fontSize: 26,
                        fontWeight: 800,
                        color: "#1c1917",
                        lineHeight: 1,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {Math.floor(stats.pendingApprovals / 2)}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#ea580c", marginTop: 4, display: "flex", alignItems: "center", gap: 2 }}>
                      Expenses <ArrowUpRight size={12} />
                    </span>
                  </button>
                </div>
              </GlassPanel>

              {/* Card 4: Active Field Employees (Dark Obsidian Glass Card matching Reference Design!) */}
              <div
                className="gw-dark-card gw-reveal gw-hover-lift"
                style={{
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  borderRadius: 20,
                  cursor: "pointer",
                }}
                onClick={() => router.push("/admin/map")}
                title="View Live Fleet Map"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 1 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "50%",
                      background: "rgba(255, 255, 255, 0.12)",
                      border: "1px solid rgba(255, 255, 255, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#4ade80",
                      flexShrink: 0,
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.25)",
                    }}
                  >
                    <MapPin size={18} />
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "rgba(255, 255, 255, 0.75)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Active Field Force
                    </span>
                    <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.45)", fontWeight: 500 }}>
                      Live Fleet Status
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1, position: "relative", zIndex: 1 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 32,
                        fontWeight: 800,
                        color: "#ffffff",
                        lineHeight: 1,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {stats.todayStats.totalCheckedIn}
                    </span>
                    <span style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.6)", fontWeight: 600 }}>
                      Online
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "rgba(34, 197, 94, 0.2)",
                      border: "1px solid rgba(74, 222, 128, 0.4)",
                      padding: "5px 12px",
                      borderRadius: 999,
                    }}
                  >
                    <div
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "#4ade80",
                        boxShadow: "0 0 10px #4ade80",
                      }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#86efac" }}>On field</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ════ ROW 2 — Live Feed Widget with Liquid Glass Wrap ════ */}
            <div className="gw-reveal" style={{ width: "100%" }}>
              <LiveFeedWidget isStandalone={true} />
            </div>

            {/* ════ ROW 3 — Quick Actions Glass Panel ════ */}
            <div className="gw-reveal" style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
              <GlassPanel
                variant="glass"
                hoverEffect
                style={{
                  padding: "22px 24px",
                  borderRadius: 22,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div>
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#1c1917",
                        margin: 0,
                      }}
                    >
                      Quick Operations
                    </h3>
                    <p style={{ fontSize: 11, color: "#78716c", margin: "2px 0 0", fontWeight: 500 }}>
                      Administrative shortcut actions
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 12,
                    flex: 1,
                  }}
                >
                  <AdminQuickBtn
                    icon={<UserPlus size={16} />}
                    bg="#ffffff"
                    color="#2563eb"
                    label="Add Manager"
                    onClick={() => router.push("/admin/managers")}
                  />
                  <AdminQuickBtn
                    icon={<FolderPlus size={16} />}
                    bg="#ffffff"
                    color="#059669"
                    label="New Project"
                    onClick={() => router.push("/admin/projects")}
                  />
                  <AdminQuickBtn
                    icon={<BarChart3 size={16} />}
                    bg="#ffffff"
                    color="#ea580c"
                    label="Analytics"
                    onClick={() => router.push("/admin/analytics")}
                  />
                  <AdminQuickBtn
                    icon={<FileText size={16} />}
                    bg="#ffffff"
                    color="#7c3aed"
                    label="Reports"
                    onClick={() => router.push("/admin/reports")}
                  />
                </div>
              </GlassPanel>
            </div>
          </div>
        </div>
      </GlassProvider>
    </div>
  );
}

/* ── Reusable Glass Action Button ── */

function AdminQuickBtn({
  icon,
  bg,
  color,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  bg: string;
  color: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="gw-panel gw-hover-lift"
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        cursor: "pointer",
        borderRadius: 14,
        background: "rgba(255, 255, 255, 0.65)",
        border: "1px solid rgba(255, 255, 255, 0.9)",
        boxShadow: "0 2px 8px rgba(120, 80, 60, 0.04)",
        transition: "all 0.2s ease",
        textAlign: "left",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
          flexShrink: 0,
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.06)",
        }}
      >
        {icon}
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#1c1917" }}>{label}</span>
    </button>
  );
}
