"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { projectsApi, ApiProject } from "@/lib/api-client";
import { Search, Briefcase, CheckCircle2, PauseCircle, X } from "lucide-react";

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  ACTIVE: { bg: "#dcfce7", text: "#16a34a", icon: <CheckCircle2 size={13} />, label: "Active" },
  COMPLETED: { bg: "#dbeafe", text: "#2563eb", icon: <CheckCircle2 size={13} />, label: "Completed" },
  PAUSED: { bg: "#fff7ed", text: "#ea580c", icon: <PauseCircle size={13} />, label: "On Hold" },
  CANCELLED: { bg: "#fee2e2", text: "#ef4444", icon: <X size={13} />, label: "Cancelled" },
};

export default function MyProjectsPage() {
  const user = useSelector((s: RootState) => s.auth.user);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const projRes = await projectsApi.list({ managerId: user.id });
      if (projRes.success) {
        setProjects(projRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div style={{ padding: "20px", display: "flex", justifyContent: "center" }}>
        Loading your projects...
      </div>
    );
  }

  const summaryStats = [
    { label: "Total Assigned", value: projects.length, color: "#3b82f6", bg: "#eff6ff", icon: <Briefcase size={18} /> },
    { label: "Active", value: projects.filter((p) => p.status === "ACTIVE").length, color: "#22c55e", bg: "#dcfce7", icon: <CheckCircle2 size={18} /> },
    { label: "On Hold", value: projects.filter((p) => p.status === "PAUSED").length, color: "#f97316", bg: "#fff7ed", icon: <PauseCircle size={18} /> },
    { label: "Completed", value: projects.filter((p) => p.status === "COMPLETED").length, color: "#3b82f6", bg: "#eff6ff", icon: <CheckCircle2 size={18} /> },
  ];

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 24, padding: "4px 4px 40px", maxWidth: 1600, margin: "0 auto", fontFamily: "Inter, system-ui, sans-serif" }}>

      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <h1 style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "24px", fontWeight: 700, margin: 0, color: "#1e293b" }}>
          <Briefcase size={24} color="var(--accent-blue)" /> My Projects
        </h1>
        <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
          View and monitor projects assigned to you by the administration.
        </p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {summaryStats.map((s) => (
          <div key={s.label} className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", color: s.color, flexShrink: 0 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: "#1e293b" }}>{s.value}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table Card ── */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", margin: 0 }}>Project List</h2>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "2px 0 0" }}>{filtered.length} projects found</p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9999, padding: "8px 16px 8px 36px", fontSize: 13, outline: "none", width: 220 }} />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9999, padding: "8px 16px", fontSize: 13, cursor: "pointer", outline: "none" }}>
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {["Project Name", "Description", "Timeline", "Progress", "Tasks", "Status"].map((h) => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const sc = statusColors[p.status] || statusColors.ACTIVE;
                const startDateStr = p.startDate ? new Date(p.startDate).toLocaleDateString() : "-";
                const endDateStr = p.endDate ? new Date(p.endDate).toLocaleDateString() : "-";
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{p.name}</div>
                    </td>
                    <td style={{ fontSize: 13, color: "#64748b", maxWidth: "250px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={p.description || ""}>
                      {p.description || "-"}
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontSize: 12, color: "#334155" }}>Start: {startDateStr}</span>
                        <span style={{ fontSize: 12, color: "#64748b" }}>End: {endDateStr}</span>
                      </div>
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 999 }}>
                          <div style={{ height: "100%", width: `${p.progress}%`, background: p.progress >= 80 ? "#22c55e" : p.progress >= 50 ? "#3b82f6" : "#f97316", borderRadius: 999, transition: "width 0.3s ease" }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", minWidth: 32 }}>{Math.round(p.progress)}%</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: "#475569" }}>
                      {p.completedTasks} / {p.totalTasks} tasks
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: sc.bg, color: sc.text, fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999 }}>
                        {sc.icon}
                        {sc.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px", color: "#94a3b8", fontSize: 14 }}>No projects assigned yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
