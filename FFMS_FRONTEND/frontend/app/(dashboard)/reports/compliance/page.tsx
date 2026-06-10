"use client";
import { useMemo, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { fetchEmployees } from "@/store/slices/employeeSlice";
import { fetchTasks } from "@/store/slices/taskSlice";
import { fetchExpenses } from "@/store/slices/expenseSlice";
import { fetchAttendance } from "@/store/slices/attendanceSlice";
import { fetchNotifications } from "@/store/slices/notificationSlice";
import {
  ShieldCheck,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  UserCheck,
  MapPin,
  Clock
} from "lucide-react";

type ComplianceLevel = "High" | "Medium" | "Low";

function getComplianceColor(level: ComplianceLevel) {
  return level === "High" ? "var(--accent-green)" : level === "Medium" ? "var(--accent-orange)" : "var(--accent-red)";
}

function getComplianceBadge(level: ComplianceLevel) {
  return level === "High" ? "badge-green" : level === "Medium" ? "badge-orange" : "badge-red";
}

export default function ComplianceMetricsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const employees = useSelector((s: RootState) => s.employees.list);
  const tasks = useSelector((s: RootState) => s.tasks.list);
  const expenses = useSelector((s: RootState) => s.expenses.list);
  const notifications = useSelector((s: RootState) => s.notifications.list);
  const attendance = useSelector((s: RootState) => s.attendance.list);

  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchTasks({}));
    dispatch(fetchExpenses());
    dispatch(fetchAttendance({}));
    dispatch(fetchNotifications());
  }, [dispatch]);

  const metrics = useMemo(() => {
    return employees.map(emp => {
      const empTasks = tasks.filter(t => t.assignedTo === emp.name || t.assignedTo === emp.id || t.assignedTo === emp.employeeId);
      const completedTasks = empTasks.filter(t => t.status === "Completed" || t.status === "COMPLETED").length;
      const taskCompRate = empTasks.length > 0 ? Math.round((completedTasks / empTasks.length) * 100) : 100;

      const empExpenses = expenses.filter(e => e.userName === emp.name || e.employeeId === emp.id);
      const rejectedCount = empExpenses.filter(e => e.status === "Rejected").length;
      const expenseCompRate = empExpenses.length > 0
        ? Math.round(((empExpenses.length - rejectedCount) / empExpenses.length) * 100)
        : 100;

      // Real database attendance compliance
      const empAtt = attendance.filter(a => a.employeeId === emp.id);
      const totalAttShifts = empAtt.length;
      const lateCount = empAtt.filter(a => a.status === "late" || a.status === "LATE").length;
      const attendanceCompRate = totalAttShifts > 0 
        ? Math.max(0, Math.round(((totalAttShifts - lateCount) / totalAttShifts) * 100))
        : 100;

      const overallScore = Math.round((taskCompRate + expenseCompRate + attendanceCompRate) / 3);
      const level: ComplianceLevel = overallScore >= 80 ? "High" : overallScore >= 60 ? "Medium" : "Low";

      return {
        emp,
        taskCompRate,
        expenseCompRate,
        attendanceCompRate,
        overallScore,
        level,
        lateCount,
        rejectedCount,
        totalTasks: empTasks.length,
        completedTasks
      };
    }).sort((a, b) => b.overallScore - a.overallScore);
  }, [employees, tasks, expenses, attendance]);

  const highCount = metrics.filter(m => m.level === "High").length;
  const medCount = metrics.filter(m => m.level === "Medium").length;
  const lowCount = metrics.filter(m => m.level === "Low").length;
  const avgScore = metrics.length > 0 ? Math.round(metrics.reduce((s, m) => s + m.overallScore, 0) / metrics.length) : 0;

  const alertCount = notifications.filter(n => n.priority === "high").length;

  const handleExport = () => {
    const headers = "Name,Role,Task Compliance %,Expense Compliance %,Attendance Compliance %,Overall Score,Level\n";
    const rows = metrics.map(m =>
      `"${m.emp.name}","${m.emp.role}",${m.taskCompRate},${m.expenseCompRate},${m.attendanceCompRate},${m.overallScore},"${m.level}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Compliance_Metrics_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ShieldCheck size={24} color="var(--accent-blue)" /> Compliance Metrics
          </div>
          <div className="page-subtitle">Task adherence, expense policy compliance, and attendance discipline scores by executive.</div>
        </div>
        <button onClick={handleExport} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px", fontSize: "12.5px", background: "var(--accent-green)", borderColor: "var(--accent-green)" }}>
          <FileSpreadsheet size={14} /> Export CSV
        </button>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))", gap: "14px" }}>
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "40px", height: "40px", background: "rgba(0,82,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={18} color="var(--accent-blue)" />
          </div>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}>{avgScore}%</div>
            <div style={{ fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Team Avg. Score</div>
          </div>
        </div>
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "40px", height: "40px", background: "rgba(16,185,129,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={18} color="var(--accent-green)" />
          </div>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}>{highCount}</div>
            <div style={{ fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>High Compliance</div>
          </div>
        </div>
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "40px", height: "40px", background: "rgba(249,115,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={18} color="var(--accent-orange)" />
          </div>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}>{medCount}</div>
            <div style={{ fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Medium — Watch</div>
          </div>
        </div>
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "40px", height: "40px", background: "rgba(244,63,94,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <XCircle size={18} color="var(--accent-red)" />
          </div>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}>{lowCount}</div>
            <div style={{ fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Low — Action Req.</div>
          </div>
        </div>
      </div>

      {/* Alert Banner if there are open critical alerts */}
      {alertCount > 0 && (
        <div style={{ padding: "12px 16px", background: "rgba(244,63,94,0.06)", border: "1px solid rgba(244,63,94,0.25)", display: "flex", gap: "10px", alignItems: "center" }}>
          <AlertTriangle size={16} color="var(--accent-red)" />
          <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: 0 }}>
            <strong style={{ color: "var(--accent-red)" }}>{alertCount} unresolved critical compliance alerts</strong> detected in the notification feed. Review the breach log in the Notification Centre immediately.
          </p>
        </div>
      )}

      {/* Scorecard Table */}
      <div className="card" style={{ padding: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "14px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
          Executive Compliance Scorecard
        </div>
        <div className="table-wrapper">
          <table style={{ minWidth: "980px" }}>
            <thead>
              <tr>
                <th>Executive</th>
                <th>Role</th>
                <th style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", justifyContent: "center" }}>
                    <UserCheck size={13} /> Task Compliance
                  </div>
                </th>
                <th style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", justifyContent: "center" }}>
                    <MapPin size={13} /> Expense Compliance
                  </div>
                </th>
                <th style={{ textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", justifyContent: "center" }}>
                    <Clock size={13} /> Attendance Discipline
                  </div>
                </th>
                <th>Overall Score</th>
                <th style={{ textAlign: "center" }}>Level</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m, i) => (
                <tr key={m.emp.id}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: "13px" }}>{m.emp.name}</div>
                    <div style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>#{i + 1} ranked</div>
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{m.emp.role}</td>

                  {/* Task rate bar */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                      <div style={{ height: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border)", width: "70px" }}>
                        <div style={{ height: "100%", width: `${m.taskCompRate}%`, background: getComplianceColor(m.taskCompRate >= 80 ? "High" : m.taskCompRate >= 60 ? "Medium" : "Low") }}></div>
                      </div>
                      <span style={{ fontFamily: "var(--font-jetbrains), monospace", fontWeight: 700, fontSize: "12px" }}>{m.taskCompRate}%</span>
                    </div>
                  </td>

                  {/* Expense rate bar */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                      <div style={{ height: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border)", width: "70px" }}>
                        <div style={{ height: "100%", width: `${m.expenseCompRate}%`, background: getComplianceColor(m.expenseCompRate >= 80 ? "High" : m.expenseCompRate >= 60 ? "Medium" : "Low") }}></div>
                      </div>
                      <span style={{ fontFamily: "var(--font-jetbrains), monospace", fontWeight: 700, fontSize: "12px" }}>{m.expenseCompRate}%</span>
                    </div>
                  </td>

                  {/* Attendance rate bar */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                      <div style={{ height: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border)", width: "70px" }}>
                        <div style={{ height: "100%", width: `${m.attendanceCompRate}%`, background: getComplianceColor(m.attendanceCompRate >= 80 ? "High" : m.attendanceCompRate >= 60 ? "Medium" : "Low") }}></div>
                      </div>
                      <span style={{ fontFamily: "var(--font-jetbrains), monospace", fontWeight: 700, fontSize: "12px" }}>{m.attendanceCompRate}%</span>
                    </div>
                  </td>

                  {/* Overall score bar */}
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ height: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border)", flex: 1 }}>
                        <div style={{ height: "100%", width: `${m.overallScore}%`, background: getComplianceColor(m.level) }}></div>
                      </div>
                      <span style={{ fontFamily: "var(--font-jetbrains), monospace", fontWeight: 800, fontSize: "13px", minWidth: "36px" }}>{m.overallScore}%</span>
                    </div>
                  </td>

                  <td style={{ textAlign: "center" }}>
                    <span className={`badge ${getComplianceBadge(m.level)}`} style={{ fontSize: "10.5px", fontWeight: 800 }}>
                      {m.level}
                    </span>
                  </td>
                </tr>
              ))}
              {metrics.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>No employee data available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
