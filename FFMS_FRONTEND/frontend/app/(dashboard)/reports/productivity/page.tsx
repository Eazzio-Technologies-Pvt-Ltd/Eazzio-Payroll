"use client";
import { useMemo, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { fetchEmployees } from "@/store/slices/employeeSlice";
import { fetchTasks } from "@/store/slices/taskSlice";
import { fetchAttendance } from "@/store/slices/attendanceSlice";
import {
  Activity,
  FileSpreadsheet,
  CheckSquare,
  Clock,
  Target,
  Award,
  ChevronUp,
  ChevronDown,
  Minus
} from "lucide-react";

export default function ProductivityReportsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const employees = useSelector((s: RootState) => s.employees.list);
  const tasks = useSelector((s: RootState) => s.tasks.list);
  const attendance = useSelector((s: RootState) => s.attendance.list);

  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchTasks({}));
    dispatch(fetchAttendance({}));
  }, [dispatch]);

  // Per-employee productivity metrics
  const metrics = useMemo(() => {
    return employees.map(emp => {
      const empTasks = tasks.filter(t => t.assignedTo === emp.name || t.assignedTo === emp.id || t.assignedTo === emp.employeeId);
      const completed = empTasks.filter(t => t.status === "Completed" || t.status === "COMPLETED").length;
      const inProgress = empTasks.filter(t => t.status === "In Progress" || t.status === "IN_PROGRESS").length;
      const pending = empTasks.filter(t => t.status === "Pending" || t.status === "PENDING").length;
      const total = empTasks.length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Real database attendance punctuality
      const empAtt = attendance.filter(a => a.employeeId === emp.id);
      const lateShifts = empAtt.filter(a => a.status === "late" || a.status === "LATE").length;
      const avgCheckInDelay = lateShifts > 0 ? `${lateShifts} late arrival(s)` : "On Time";

      // Trend indicator
      const trend = completionRate >= 80 ? "up" : completionRate >= 60 ? "flat" : "down";

      return { emp, total, completed, inProgress, pending, completionRate, lateShifts, avgCheckInDelay, trend };
    }).sort((a, b) => b.completionRate - a.completionRate);
  }, [employees, tasks, attendance]);

  const topPerformer = metrics[0];
  const avgCompletionRate = metrics.length > 0
    ? Math.round(metrics.reduce((s, m) => s + m.completionRate, 0) / metrics.length)
    : 0;
  const totalTasksCompleted = metrics.reduce((s, m) => s + m.completed, 0);
  const totalInProgress = metrics.reduce((s, m) => s + m.inProgress, 0);

  const handleExport = () => {
    const headers = "Name,Role,Total Tasks,Completed,In Progress,Pending,Completion Rate (%),Late Shifts,Avg Check-In Delay\n";
    const rows = metrics.map(m =>
      `"${m.emp.name}","${m.emp.role}",${m.total},${m.completed},${m.inProgress},${m.pending},${m.completionRate},${m.lateShifts},"${m.avgCheckInDelay}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Productivity_Report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Activity size={24} color="var(--accent-blue)" /> Productivity Reports
          </div>
          <div className="page-subtitle">Task throughput, completion velocity, and attendance punctuality by field executive.</div>
        </div>
        <button onClick={handleExport} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px", fontSize: "12.5px", background: "var(--accent-green)", borderColor: "var(--accent-green)" }}>
          <FileSpreadsheet size={14} /> Export CSV
        </button>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "40px", height: "40px", background: "rgba(0,82,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Target size={18} color="var(--accent-blue)" />
          </div>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}>{avgCompletionRate}%</div>
            <div style={{ fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Team Avg. Completion</div>
          </div>
        </div>
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "40px", height: "40px", background: "rgba(16,185,129,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckSquare size={18} color="var(--accent-green)" />
          </div>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}>{totalTasksCompleted}</div>
            <div style={{ fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tasks Completed Total</div>
          </div>
        </div>
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "40px", height: "40px", background: "rgba(249,115,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Clock size={18} color="var(--accent-orange)" />
          </div>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}>{totalInProgress}</div>
            <div style={{ fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>In-Progress Tasks</div>
          </div>
        </div>
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "40px", height: "40px", background: "rgba(16,185,129,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Award size={18} color="var(--accent-green)" />
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 800, letterSpacing: "-0.01em" }}>{topPerformer?.emp.name || "—"}</div>
            <div style={{ fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Top Performer</div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="card" style={{ padding: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "14px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
          Executive Productivity Scorecard
        </div>
        <div className="table-wrapper">
          <table style={{ minWidth: "860px" }}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Executive</th>
                <th>Role</th>
                <th style={{ textAlign: "center" }}>Total Tasks</th>
                <th style={{ textAlign: "center" }}>Completed</th>
                <th style={{ textAlign: "center" }}>In Progress</th>
                <th style={{ textAlign: "center" }}>Pending</th>
                <th>Completion Rate</th>
                <th style={{ textAlign: "center" }}>Late Shifts</th>
                <th style={{ textAlign: "center" }}>Trend</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => (
                <tr key={m.emp.id}>
                  <td style={{ fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace", color: "var(--text-muted)", fontSize: "12px" }}>#{i + 1}</td>
                  <td style={{ fontWeight: 700, fontSize: "13px" }}>{m.emp.name}</td>
                  <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{m.emp.role}</td>
                  <td style={{ textAlign: "center", fontFamily: "var(--font-jetbrains), monospace", fontWeight: 700 }}>{m.total}</td>
                  <td style={{ textAlign: "center", fontFamily: "var(--font-jetbrains), monospace", color: "var(--accent-green)", fontWeight: 700 }}>{m.completed}</td>
                  <td style={{ textAlign: "center", fontFamily: "var(--font-jetbrains), monospace", color: "var(--accent-orange)", fontWeight: 700 }}>{m.inProgress}</td>
                  <td style={{ textAlign: "center", fontFamily: "var(--font-jetbrains), monospace", color: "var(--text-muted)", fontWeight: 600 }}>{m.pending}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ height: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border)", flex: 1, minWidth: "80px" }}>
                        <div style={{
                          height: "100%",
                          width: `${m.completionRate}%`,
                          background: m.completionRate >= 80 ? "var(--accent-green)" : m.completionRate >= 60 ? "var(--accent-orange)" : "var(--accent-red)"
                        }}></div>
                      </div>
                      <span style={{ fontSize: "11.5px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace", minWidth: "36px" }}>{m.completionRate}%</span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <span style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontWeight: 700,
                      fontSize: "12px",
                      color: m.lateShifts > 1 ? "var(--accent-red)" : m.lateShifts === 1 ? "var(--accent-orange)" : "var(--accent-green)"
                    }}>
                      {m.lateShifts}
                    </span>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    {m.trend === "up" ? <ChevronUp size={16} color="var(--accent-green)" /> :
                     m.trend === "down" ? <ChevronDown size={16} color="var(--accent-red)" /> :
                     <Minus size={16} color="var(--text-muted)" />}
                  </td>
                </tr>
              ))}
              {metrics.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>No employees found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
