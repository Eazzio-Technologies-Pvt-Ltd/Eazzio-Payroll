"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { dashboardApi, projectsApi, ApiProject } from "@/lib/api-client";
import {
  Users, UserCheck, UserX, Briefcase, CalendarCheck, Clock, MapPin,
  TrendingUp, TrendingDown, UserPlus, FolderPlus, BarChart3, FileText,
} from "lucide-react";
import LiveFeedWidget from "@/components/live-feed/LiveFeedWidget";


export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [projects, setProjects] = useState<ApiProject[]>([]);

  useEffect(() => {
    Promise.all([
      dashboardApi.getAdmin(),
      projectsApi.list()
    ]).then(([statsRes, projectsRes]) => {
      if (statsRes.success) {
        setStats(statsRes.data);
      }
      if (projectsRes.success) {
        setProjects(projectsRes.data);
      }
    })
    .catch(err => console.error(err))
    .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "4px 4px 40px", maxWidth: 1600, margin: "0 auto" }}>
        {/* Skeleton Row 1 — KPI Cards (4 columns) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton-card" style={{ height: 86, padding: "12px 14px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="skeleton-line" style={{ width: "50%" }} />
                <div className="skeleton-circle" style={{ width: "28px", height: "28px" }} />
              </div>
              <div className="skeleton-line" style={{ width: "60%", height: "20px" }} />
            </div>
          ))}
        </div>

        {/* Skeleton Row 2 — Overview (1fr 2fr) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20 }}>
          <div className="skeleton-card" style={{ height: 320, padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="skeleton-line" style={{ width: "40%", height: "18px" }} />
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1 }}>
              <div className="skeleton-circle" style={{ width: "160px", height: "160px" }} />
            </div>
          </div>
          <div className="skeleton-card" style={{ height: 320, padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="skeleton-line" style={{ width: "30%", height: "18px" }} />
            <div className="skeleton-box" style={{ width: "100%", flex: 1 }} />
          </div>
        </div>

        {/* Skeleton Row 3 — Project Status | Performance | Quick Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: 20 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-card" style={{ height: 320, padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="skeleton-line" style={{ width: "40%", height: "18px" }} />
              <div className="skeleton-box" style={{ width: "100%", flex: 1 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80vh", color: "#ef4444", fontSize: 16, fontWeight: 600 }}>
        Failed to load dashboard data.
      </div>
    );
  }


  // Map Weekly Activity to Area Chart
  const attendanceTrendData = stats.weeklyActivity.map((d: any) => {
    const dayName = new Date(d.date).toLocaleDateString("en-US", { weekday: "short" });
    const pct = stats.totalEmployees > 0 ? Math.round((d.checkIns / stats.totalEmployees) * 100) : 0;
    return {
      week: dayName,
      attendance: pct
    };
  });



  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "4px 4px 40px", maxWidth: 1600, margin: "0 auto", fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ════ ROW 1 — Modern KPI Cards ════ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        
        {/* Card 1: Total Managers & Employees */}
        <div className="card" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6", flexShrink: 0 }}>
              <Users size={14} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Workforce Overview</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>{stats.totalManagers}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 4 }}>Managers</span>
            </div>
            <div style={{ height: 24, width: 1, background: "#e2e8f0" }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>{stats.totalEmployees}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", marginTop: 4 }}>Employees</span>
            </div>
          </div>
        </div>

        {/* Card 2: Today's Attendance */}
        <div className="card" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#10b981", flexShrink: 0 }}>
                <CalendarCheck size={14} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Today's Attendance</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: "#10b981" }}>
              {stats.totalEmployees > 0 ? Math.round((stats.todayStats.totalCheckedIn / stats.totalEmployees) * 100) : 0}%
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 1, background: "#f8fafc", padding: "6px 8px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <UserCheck size={14} color="#10b981" />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", lineHeight: 1 }}>{stats.todayStats.totalCheckedIn}</span>
                <span style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Present</span>
              </div>
            </div>
            <div style={{ flex: 1, background: "#fef2f2", padding: "6px 8px", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <UserX size={14} color="#ef4444" />
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", lineHeight: 1 }}>{Math.max(0, stats.totalEmployees - stats.todayStats.totalCheckedIn)}</span>
                <span style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Absent</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Leaves & Expenses */}
        <div className="card" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#fff7ed", display: "flex", alignItems: "center", justifyContent: "center", color: "#f97316", flexShrink: 0 }}>
              <Clock size={14} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Pending Approvals</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flex: 1 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
                {Math.ceil(stats.pendingApprovals / 2)}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#f97316", marginTop: 4 }}>Leaves</span>
            </div>
            <div style={{ height: 24, width: 1, background: "#e2e8f0" }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>
                {Math.floor(stats.pendingApprovals / 2)}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: "#f97316", marginTop: 4 }}>Expenses</span>
            </div>
          </div>
        </div>

        {/* Card 4: Active Field Employees */}
        <div className="card" style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, borderRadius: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", color: "#22c55e", flexShrink: 0 }}>
              <MapPin size={14} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Active Field Force</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: "#1e293b", lineHeight: 1 }}>{stats.todayStats.totalCheckedIn}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#dcfce7", padding: "4px 8px", borderRadius: 999 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a" }}>On field</span>
            </div>
          </div>
        </div>

      </div>

      {/* ════ ROW 2 — Live Feed Widget ════ */}
      <div style={{ width: "100%" }}>
        <LiveFeedWidget isStandalone={true} />
      </div>

      {/* ════ ROW 3 — Quick Actions ════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>

        {/* ── Quick Actions ── */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", margin: "0 0 16px" }}>Quick Actions</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, flex: 1 }}>
            <AdminQuickBtn icon={<UserPlus size={16} />} bg="#eff6ff" color="#3b82f6" label="Add Manager" onClick={() => router.push("/admin/managers")} />
            <AdminQuickBtn icon={<FolderPlus size={16} />} bg="#eff6ff" color="#3b82f6" label="New Project" onClick={() => router.push("/admin/projects")} />
            <AdminQuickBtn icon={<BarChart3 size={16} />} bg="#ecfdf5" color="#10b981" label="Analytics" onClick={() => router.push("/admin/analytics")} />
            <AdminQuickBtn icon={<FileText size={16} />} bg="#fff7ed" color="#f97316" label="Reports" onClick={() => router.push("/admin/reports")} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function AdminQuickBtn({ icon, bg, color, label, onClick }: { icon: React.ReactNode; bg: string; color: string; label: string; onClick: () => void }) {
  return (
    <button className="card" onClick={onClick} style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", border: "1px solid var(--border-color, #e2e8f0)", borderRadius: 10, background: "#fff", transition: "all 0.2s" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>{icon}</div>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{label}</span>
    </button>
  );
}
