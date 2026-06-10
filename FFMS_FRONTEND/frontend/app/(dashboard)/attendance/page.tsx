"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { getStatusColor } from "@/lib/utils";
import { Clock, CheckCircle, XCircle, AlertCircle, FileText } from "lucide-react";
import { addNotification } from "@/store/slices/notificationSlice";
import { fetchAttendance } from "@/store/slices/attendanceSlice";
import { LeaveReportModal } from "@/components/LeaveReportModal";

export default function AttendancePage() {
  const dispatch = useDispatch<AppDispatch>();
  const attendance = useSelector((s: RootState) => s.attendance.list);
  const loading = useSelector((s: RootState) => s.attendance.loading);

  const [mounted, setMounted] = useState(false);
  const [filters, setFilters] = useState({ startDate: "", endDate: "", status: "", search: "" });
  const [showLeaveReport, setShowLeaveReport] = useState(false);

  useEffect(() => {
    setMounted(true);
    const { search, ...apiFilters } = filters;
    dispatch(fetchAttendance(apiFilters));
  }, [dispatch, filters.startDate, filters.endDate, filters.status]);

  const filteredAttendance = useMemo(() => {
    if (!filters.search) return attendance;
    const s = filters.search.toLowerCase();
    return attendance.filter((a: any) => 
      a.name?.toLowerCase().includes(s) || a.employeeId?.toLowerCase().includes(s)
    );
  }, [attendance, filters.search]);

  const [notified, setNotified] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const present = attendance.filter((a: any) => ["present", "late", "half_day"].includes(a.status)).length;
  const absent  = attendance.filter((a: any) => ["absent", "leave", "holiday"].includes(a.status)).length;
  const late    = attendance.filter((a: any) => a.status === "late").length;

  const handleNotifyAllLate = () => {
    const lateEmployees = attendance.filter((a: any) => a.status === "late");
    lateEmployees.forEach((emp: any) => {
      dispatch(addNotification({
        employeeId: emp.employeeId,
        employeeName: emp.name,
        avatar: emp.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2),
        type: "alert",
        message: `LATE WARNING: ${emp.name} checked in late today (Time: ${emp.checkIn}, Location: ${emp.location})`,
        priority: "high"
      }));
    });
    setNotified(true);
    setToast("Late arrival alerts successfully dispatched to admin deck!");
    setTimeout(() => setToast(null), 3000);
  };

  if (!mounted || loading) return (
    <div style={{ padding: "20px" }}>
      <div className="skeleton-line" style={{ width: "200px", height: "32px", marginBottom: "8px" }} />
      <div className="skeleton-line" style={{ width: "150px", height: "16px", marginBottom: "32px" }} />
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "24px" }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="card skeleton-card" style={{ height: "86px", padding: "20px", display: "flex", alignItems: "center", gap: "14px" }}>
            <div className="skeleton-circle" style={{ width: "44px", height: "44px", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton-line" style={{ width: "40px", height: "24px", marginBottom: "8px" }} />
              <div className="skeleton-line" style={{ width: "80px", height: "12px" }} />
            </div>
          </div>
        ))}
      </div>
      <div className="card skeleton-card" style={{ height: "400px" }} />
    </div>
  );

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="page-title">Attendance & Leaves</div>
          <div className="page-subtitle">Today — {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
        </div>
        <button 
          className="btn-secondary" 
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
          onClick={() => setShowLeaveReport(true)}
        >
          <FileText size={16} />
          View Leave Report
        </button>
      </div>

      {showLeaveReport && (
        <LeaveReportModal onClose={() => setShowLeaveReport(false)} />
      )}

      {/* Stats */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"14px",marginBottom:"24px" }}>
        {[
          { label:"Total Employees",value:attendance.length,icon:Clock,color:"#4f8ef7" },
          { label:"Present",value:present,icon:CheckCircle,color:"#22d3a5" },
          { label:"Absent",value:absent,icon:XCircle,color:"#f43f5e" },
          { label:"Late Check-In",value:late,icon:AlertCircle,color:"#f97316" },
        ].map(s => (
          <div key={s.label} className="card" style={{ display:"flex",alignItems:"center",gap:"14px" }}>
            <div style={{ width:"44px",height:"44px",borderRadius: "0",background:`${s.color}18`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <s.icon size={20} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize:"24px",fontWeight:800 }}>{s.value}</div>
              <div style={{ fontSize:"12px",color:"var(--text-secondary)" }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Late Check-in Alert Banner */}
      {late > 0 && !notified && (
        <div style={{
          background: "rgba(249,115,22,0.06)",
          border: "1px solid rgba(249,115,22,0.25)",
          padding: "14px 20px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <AlertCircle color="var(--accent-orange)" size={18} />
            <span style={{ fontSize: "13px", color: "var(--text-primary)", fontWeight: 600 }}>
              {late} late arrivals recorded today. Click the button to dispatch alert logs to the Admin operations console.
            </span>
          </div>
          <button 
            className="btn-primary" 
            style={{ 
              fontSize: "12.5px", 
              padding: "6px 14px", 
              background: "var(--accent-orange)",
              borderColor: "var(--accent-orange)",
              color: "white",
              borderRadius: "0",
              cursor: "pointer",
            }}
            onClick={handleNotifyAllLate}
          >
            Notify Admin
          </button>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontSize: "14px", fontWeight: 600 }}>Filter by:</div>
        <input 
          type="text" 
          placeholder="Search Name or Emp ID..."
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg-card)", color: "var(--text-primary)", flex: 1, minWidth: "200px" }}
          onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))} 
        />
        <input 
          type="date" 
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg-card)", color: "var(--text-primary)" }}
          onChange={e => setFilters(prev => ({ ...prev, startDate: e.target.value }))} 
        />
        <input 
          type="date" 
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg-card)", color: "var(--text-primary)" }}
          onChange={e => setFilters(prev => ({ ...prev, endDate: e.target.value }))} 
        />
        <select 
          style={{ padding: "8px 12px", border: "1px solid var(--border)", borderRadius: "4px", background: "var(--bg-card)", color: "var(--text-primary)" }}
          onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
        >
          <option value="">All Statuses</option>
          <option value="PRESENT">Present</option>
          <option value="ABSENT">Absent</option>
          <option value="HALF_DAY">Half Day</option>
          <option value="LATE">Late</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Hours Worked</th>
              <th>Location</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendance.map((row: any) => (
              <tr key={row.id}>
                <td>
                  <div style={{ fontWeight:600,fontSize:"14px" }}>{row.name}</div>
                </td>
                <td>
                  <span style={{ fontFamily:"monospace",fontSize:"13px",color: row.checkIn==="--" ? "var(--text-muted)" : "var(--accent-green)" }}>
                    {row.checkIn}
                  </span>
                </td>
                <td>
                  <span style={{ fontFamily:"monospace",fontSize:"13px",color: row.checkOut==="--" ? "var(--text-muted)" : "var(--text-primary)" }}>
                    {row.checkOut}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize:"13px",fontWeight:row.hours==="Active" ? 700 : 400, color:row.hours==="Active" ? "var(--accent-green)" : "var(--text-secondary)" }}>
                    {row.hours === "Active" ? "🟢 Active" : row.hours}
                  </span>
                </td>
                <td style={{ fontSize:"13px",color:"var(--text-secondary)" }}>{row.location}</td>
                <td>
                  <span className={`badge ${getStatusColor(row.status)}`}>
                    {row.status.charAt(0).toUpperCase()+row.status.slice(1)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Floating toast notification */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: "var(--accent-green)",
          color: "white",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          zIndex: 9999,
          animation: "fadeIn 0.2s ease",
          border: "1px solid rgba(0,0,0,0.1)",
        }}>
          <CheckCircle size={16} />
          <span style={{ fontSize: "13px", fontWeight: 600, fontFamily: "Inter, sans-serif" }}>{toast}</span>
        </div>
      )}
    </div>
  );
}
