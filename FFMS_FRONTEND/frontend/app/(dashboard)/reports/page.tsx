"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  FileSpreadsheet,
  Download,
  Clock,
  CheckCircle,
  TrendingUp,
  ClipboardList,
  Users,
  Search,
  Calendar,
  AlertCircle
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line
} from "recharts";

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"attendance" | "tasks" | "analytics">("attendance");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  // Redux lists
  const employees = useSelector((s: RootState) => s.employees.list);
  const tasks = useSelector((s: RootState) => s.tasks.list);

  const attendance = useSelector((s: RootState) => s.attendance.list);

  // Filter Attendance Logs
  const filteredAttendance = attendance.filter((att: any) => {
    const matchesSearch = att.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          att.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || att.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Filter Task Logs
  const filteredTasks = tasks.filter((task: any) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          task.assignedTo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || task.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  // Export trigger using real backend data stream
  const handleExport = async (type: "csv" | "excel" | "pdf") => {
    if (activeTab === "analytics") {
      alert("Analytics cannot be exported directly. Please select Attendance or Tasks.");
      return;
    }
    
    setIsExporting(true);
    try {
      const today = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      const startDate = lastMonth.toISOString().split("T")[0];
      const endDate = today.toISOString().split("T")[0];
      
      // We map "tasks" tab to the backend "visits" export for compliance logging
      const endpoint = activeTab === "attendance" ? "attendance" : "visits";
      
      const token = localStorage.getItem("auth_token");
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
      
      const res = await fetch(`${API_BASE}/export/${endpoint}?format=${type}&startDate=${startDate}&endDate=${endDate}`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      
      if (!res.ok) throw new Error(`Failed to export ${activeTab}`);
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${activeTab}_report_${startDate}_to_${endDate}.${type === "excel" ? "xlsx" : type}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || "Failed to download export.");
    } finally {
      setIsExporting(false);
    }
  };

  // KPI Calculations
  const presentCount = attendance.filter((a: any) => a.status === "present" || a.status === "late").length;
  const attendanceRate = attendance.length > 0 ? ((presentCount / attendance.length) * 100).toFixed(0) : "0";
  const completedTasks = tasks.filter((t: any) => t.status === "completed").length;
  const taskSuccessRate = tasks.length > 0 ? ((completedTasks / tasks.length) * 100).toFixed(0) : "0";
  const lateCount = attendance.filter((a: any) => a.status === "late").length;

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 className="page-title">Executive Reports</h1>
          <p className="page-subtitle">Detailed compliance, productivity logs, and performance metrics.</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button 
            className="btn-secondary" 
            onClick={() => handleExport("csv")}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", fontSize: "13px" }}
          >
            <FileSpreadsheet size={16} /> Export CSV
          </button>
          <button 
            className="btn-primary" 
            onClick={() => handleExport("pdf")}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 14px", fontSize: "13px" }}
          >
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "42px", height: "42px", background: "rgba(0,82,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users size={18} color="var(--accent-blue)" />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 800 }}>{attendanceRate}%</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Attendance Rate</div>
          </div>
        </div>

        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "42px", height: "42px", background: "rgba(34,211,165,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={18} color="var(--accent-green)" />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 800 }}>{taskSuccessRate}%</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Task Success Rate</div>
          </div>
        </div>

        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "42px", height: "42px", background: "rgba(249,115,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Clock size={18} color="var(--accent-orange)" />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 800 }}>{lateCount} Arrivals</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Late Check-ins Today</div>
          </div>
        </div>

        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "42px", height: "42px", background: "rgba(139,92,246,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ClipboardList size={18} color="var(--accent-purple)" />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 800 }}>{tasks.length} Assigned</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Tasks Evaluated</div>
          </div>
        </div>
      </div>

      {/* Tabs Selector & Search Control Deck */}
      <div className="card" style={{ padding: "16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
          {/* Tab buttons */}
          <div style={{ display: "flex", border: "1px solid var(--border)", background: "var(--bg-hover)", padding: "2px" }}>
            {[
              { id: "attendance", label: "Attendance Log", icon: Clock },
              { id: "tasks", label: "Task Compliance", icon: ClipboardList },
              { id: "analytics", label: "Productivity Analytics", icon: TrendingUp },
            ].map((tab) => {
              const TabIcon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setSelectedStatus("all");
                    setSearchTerm("");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 14px",
                    fontSize: "13px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    background: active ? "var(--bg-card)" : "transparent",
                    color: active ? "var(--accent-blue)" : "var(--text-secondary)",
                    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.05)" : "none",
                    transition: "all 0.15s ease"
                  }}
                >
                  <TabIcon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Table Filters (Only show when not in analytics tab) */}
          {activeTab !== "analytics" && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center", flex: "1", justifyContent: "flex-end", minWidth: "260px" }}>
              <div style={{ position: "relative", flex: "1", maxWidth: "240px" }}>
                <Search size={14} style={{ position: "absolute", left: "10px", top: "12px", color: "var(--text-muted)" }} />
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input"
                  style={{ paddingLeft: "32px", fontSize: "12px", height: "36px" }}
                />
              </div>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="input"
                style={{ width: "120px", fontSize: "12px", height: "36px" }}
              >
                <option value="all">All Statuses</option>
                {activeTab === "attendance" ? (
                  <>
                    <option value="present">Present</option>
                    <option value="late">Late</option>
                    <option value="absent">Absent</option>
                  </>
                ) : (
                  <>
                    <option value="completed">Completed</option>
                    <option value="in-progress">In Progress</option>
                    <option value="pending">Pending</option>
                  </>
                )}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Reports Log Grid Display */}
      {activeTab === "attendance" && (
        <div className="table-wrapper fade-in">
          <table>
            <thead>
              <tr>
                <th>Agent Name</th>
                <th>Check In</th>
                <th>Check Out</th>
                <th>Working Hours</th>
                <th>Expected Hours</th>
                <th>Performance Target</th>
                <th>Leave Entitlement</th>
                <th>Assigned Territory</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.length > 0 ? (
                filteredAttendance.map((log: any) => {
                  const emp = employees.find(e => e.id === log.employeeId || e.name === log.name);
                  const empType = emp?.employmentType || "Full Time";
                  
                  let expectedHoursVal = 9.0;
                  let leaveEntitlement = "Full (28 days)";
                  if (empType === "Part Time") {
                    expectedHoursVal = 4.5;
                    leaveEntitlement = "50% (14 days)";
                  } else if (empType === "Intern") {
                    expectedHoursVal = 6.0;
                    leaveEntitlement = "None (0 days)";
                  }

                  const parseHours = (hoursStr: string): number => {
                    if (!hoursStr || hoursStr === "Active" || hoursStr === "--") return 0;
                    const match = hoursStr.match(/(\d+)h\s*(\d*)m?/);
                    if (match) {
                      const hrs = parseInt(match[1]) || 0;
                      const mins = parseInt(match[2]) || 0;
                      return hrs + (mins / 60);
                    }
                    return 0;
                  };
                  const actualHoursVal = parseHours(log.hours);

                  // Duration tracking used for leave allotment calculation
                  let targetStatusText = "Met Target";
                  let targetBadgeColor = "badge-green";
                  if (actualHoursVal === 0) {
                    targetStatusText = "No Hours";
                    targetBadgeColor = "badge-red";
                  } else if (actualHoursVal < expectedHoursVal) {
                    if (actualHoursVal >= expectedHoursVal * 0.8) {
                      targetStatusText = "Slightly Under";
                      targetBadgeColor = "badge-orange";
                    } else {
                      targetStatusText = "Significantly Under";
                      targetBadgeColor = "badge-red";
                    }
                  }

                  return (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600 }}>
                        <div>{log.name}</div>
                        <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 500 }}>{empType}</div>
                      </td>
                      <td>{log.checkIn}</td>
                      <td>{log.checkOut}</td>
                      <td style={{ fontFamily: "var(--font-jetbrains), monospace" }}>{log.hours}</td>
                      <td>{expectedHoursVal} hrs</td>
                      <td>
                        <span className={`badge ${targetBadgeColor}`}>
                          {targetStatusText}
                        </span>
                      </td>
                      <td>{leaveEntitlement}</td>
                      <td>{log.location}</td>
                      <td>
                        <span className={`badge ${
                          log.status === "present" 
                            ? "badge-green" 
                            : log.status === "late" 
                            ? "badge-orange" 
                            : "badge-red"
                        }`}>
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    <AlertCircle size={20} style={{ margin: "0 auto 8px" }} />
                    No attendance records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "tasks" && (
        <div className="table-wrapper fade-in">
          <table>
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Assigned Executive</th>
                <th>Priority</th>
                <th>Territory Scope</th>
                <th>Target Deadline</th>
                <th>Compliance Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task: any) => (
                  <tr key={task.id}>
                    <td style={{ fontWeight: 600 }}>{task.title}</td>
                    <td>{task.assignedTo}</td>
                    <td>
                      <span className={`badge ${
                        task.priority === "high" 
                          ? "badge-red" 
                          : task.priority === "medium" 
                          ? "badge-orange" 
                          : "badge-blue"
                      }`}>
                        {task.priority.toUpperCase()}
                      </span>
                    </td>
                    <td>{task.territory}</td>
                    <td>{task.deadline}</td>
                    <td>
                      <span className={`badge ${
                        task.status === "completed" 
                          ? "badge-green" 
                          : task.status === "in-progress" 
                          ? "badge-blue" 
                          : "badge-purple"
                      }`}>
                        {task.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                    <AlertCircle size={20} style={{ margin: "0 auto 8px" }} />
                    No task compliance records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "analytics" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" }}>
          {/* Chart 1: Daily Task & Attendance correlation */}
          <div className="card fade-in">
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
              <TrendingUp size={16} color="var(--accent-blue)" />
              <span style={{ fontWeight: 700, fontSize: "14px", fontFamily: "var(--font-hanken), sans-serif" }}>
                Daily Task Completion Trends
              </span>
            </div>
            <div style={{ height: "260px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tasks.map((t: any, i: number) => ({ day: `T${i+1}`, tasks: 1, present: t.status === 'completed' ? 1 : 0 }))} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "0" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="tasks" name="Tasks Processed" fill="#4f8ef7" />
                  <Bar dataKey="present" name="Staff Active" fill="#22d3a5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Late / Absent Correlation lines */}
          <div className="card fade-in">
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
              <Calendar size={16} color="var(--accent-red)" />
              <span style={{ fontWeight: 700, fontSize: "14px", fontFamily: "var(--font-hanken), sans-serif" }}>
                Staff Absenteeism Log
              </span>
            </div>
            <div style={{ height: "260px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendance.reduce((acc: {day: string, absent: number}[], a: any) => { const existing = acc.find(x => x.day === a.date); if (existing) { if (a.status === 'absent') existing.absent++; } else { acc.push({ day: a.date, absent: a.status === 'absent' ? 1 : 0 }); } return acc; }, [])}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "0" }} />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line type="monotone" dataKey="absent" name="Absent Personnel" stroke="#f43f5e" strokeWidth={3} dot={{ strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
