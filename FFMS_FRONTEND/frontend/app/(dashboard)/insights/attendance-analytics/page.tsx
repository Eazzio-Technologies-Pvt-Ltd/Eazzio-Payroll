"use client";
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { fetchEmployees } from "@/store/slices/employeeSlice";
import { fetchAttendance } from "@/store/slices/attendanceSlice";
import { 
  BarChart3, 
  Clock, 
  UserX, 
  Calendar,
  Award,
  TrendingUp,
  ChevronRight
} from "lucide-react";

export default function AttendanceAnalyticsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const employees = useSelector((s: RootState) => s.employees.list);
  const attendance = useSelector((s: RootState) => s.attendance.list);

  useEffect(() => {
    dispatch(fetchEmployees());
    dispatch(fetchAttendance({}));
  }, [dispatch]);

  // Compute analytics metrics
  const totalEmployees = employees.length;
  const lateCount = attendance.filter(a => a.status?.toLowerCase() === "late").length;
  const presentCount = attendance.filter(a => {
    const s = a.status?.toLowerCase();
    return s === "present" || s === "on time" || s === "on-time" || s === "late";
  }).length;
  
  // Calculate delay rates
  const onTimeRate = presentCount > 0 ? Math.round(((presentCount - lateCount) / presentCount) * 100) : 100;

  // Helper to parse time string like "09:15 AM" into minutes from midnight
  const parseCheckInMinutes = (timeStr: string) => {
    if (!timeStr || timeStr === "--" || timeStr === "Active") return 540; // 9:00 AM default
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 540;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const meridian = match[3].toUpperCase();
    if (meridian === "PM" && hours !== 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Calculate average transit delay (minutes late past 9:00 AM)
  const averageDelayMins = useMemo(() => {
    const lateRecords = attendance.filter(a => a.status?.toLowerCase() === "late" && a.checkIn);
    if (lateRecords.length === 0) return 0;
    const totalDelay = lateRecords.reduce((acc, curr) => {
      const mins = parseCheckInMinutes(curr.checkIn);
      const delay = Math.max(0, mins - 540); // delay past 9:00 AM
      return acc + delay;
    }, 0);
    return Math.round(totalDelay / lateRecords.length);
  }, [attendance]);

  // Compute actual rates for each weekday from the attendance records
  const weekdayRates = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = days.map(d => ({ day: d, present: 0, late: 0 }));
    
    attendance.forEach(a => {
      if (!a.date) return;
      const dateObj = new Date(a.date);
      const dayName = days[dateObj.getDay()];
      const match = counts.find(c => c.day === dayName);
      if (match) {
        if (a.status?.toLowerCase() === "late") {
          match.late++;
        } else if (a.status?.toLowerCase() === "present" || a.status?.toLowerCase() === "on time") {
          match.present++;
        }
      }
    });

    return counts.map(c => {
      const total = c.present + c.late;
      const rate = total > 0 ? Math.round((c.present / total) * 100) : 100;
      return { day: c.day, rate };
    }).filter(c => ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(c.day));
  }, [attendance]);

  // Map employee stats and sort by scoreboard ranking
  const employeeRankings = useMemo(() => {
    return employees.map(emp => {
      const empAtt = attendance.filter(a => a.employeeId === emp.id);
      const totalPresentOrLate = empAtt.filter(a => ["present", "late", "on time", "on-time", "half_day"].includes(a.status?.toLowerCase() || "")).length;
      const lateShifts = empAtt.filter(a => a.status?.toLowerCase() === "late").length;
      const score = totalPresentOrLate > 0 ? Math.round(((totalPresentOrLate - lateShifts) / totalPresentOrLate) * 100) : 100;
      return { emp, score };
    }).sort((a, b) => b.score - a.score);
  }, [employees, attendance]);

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header */}
      <div>
        <div className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <BarChart3 size={24} color="var(--accent-blue)" /> Attendance Analytics & Trends
        </div>
        <div className="page-subtitle">Historical check-in audits, average transit delays, and field compliance scores.</div>
      </div>

      {/* Analytics KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        
        {/* KPI 1: On-Time rate */}
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "42px", height: "42px", background: "rgba(16,185,129,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Award size={18} color="var(--accent-green)" />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}>{onTimeRate}%</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>On-Time Shift Rate</div>
          </div>
        </div>

        {/* KPI 2: Average Delay */}
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "42px", height: "42px", background: "rgba(249,115,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Clock size={18} color="var(--accent-orange)" />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}>{averageDelayMins} mins</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Average Transit Delay</div>
          </div>
        </div>

        {/* KPI 3: Late Check-ins */}
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "42px", height: "42px", background: "rgba(244,63,94,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <UserX size={18} color="var(--accent-red)" />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}>{lateCount} Shifts</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Late Check-ins Today</div>
          </div>
        </div>

        {/* KPI 4: Monthly Active Period */}
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "42px", height: "42px", background: "rgba(0,82,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Calendar size={18} color="var(--accent-blue)" />
          </div>
          <div>
            <div style={{ fontSize: "20px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}>{attendance.length > 0 ? Array.from(new Set(attendance.map(a => a.date))).length : 0} Days</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Active Days Recorded</div>
          </div>
        </div>

      </div>

      {/* Main Grid: Weekly heatmaps & Employee Scoreboard */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.6fr", gap: "20px" }}>
        
        {/* Left Column: Weekly Compliance Heatmap */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
            <span style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
              <TrendingUp size={16} color="var(--accent-blue)" /> Weekly Compliance Graph
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: "180px", paddingTop: "20px", paddingBottom: "10px", borderBottom: "1px solid var(--border)" }}>
            {weekdayRates.map(w => {
              const height = `${Math.round(w.rate * 1.3)}px`; // scale for rendering
              const isWarning = w.rate < 80;
              return (
                <div key={w.day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", flex: 1 }}>
                  <span style={{ fontSize: "10px", fontWeight: 700, fontFamily: "var(--font-jetbrains), monospace" }}>{w.rate}%</span>
                  <div style={{ width: "24px", height, background: isWarning ? "var(--accent-orange)" : "var(--accent-blue)" }}></div>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600 }}>{w.day}</span>
                </div>
              );
            })}
          </div>
          
          <div style={{ display: "flex", gap: "12px", fontSize: "11px", color: "var(--text-muted)", justifyContent: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "10px", height: "10px", background: "var(--accent-blue)" }}></span> On-Time Rate &gt; 80%
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ width: "10px", height: "10px", background: "var(--accent-orange)" }}></span> Warning Threshold (&lt; 80%)
            </span>
          </div>
        </div>

        {/* Right Column: Punctuality Scoreboard */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
            <span style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Award size={16} color="var(--accent-green)" /> Executive Punctuality Rank
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto" }}>
            {employeeRankings.map(({ emp, score }, index) => {
              const rank = index + 1;
              const isExcellent = score >= 90;

              return (
                <div 
                  key={emp.id} 
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--text-muted)", fontFamily: "var(--font-jetbrains), monospace", width: "16px" }}>
                      #{rank}
                    </span>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700 }}>{emp.name}</span>
                      <span style={{ fontSize: "10.5px", color: "var(--text-muted)" }}>{emp.role}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span 
                      className={`badge ${isExcellent ? "badge-green" : "badge-orange"}`} 
                      style={{ fontSize: "10px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}
                    >
                      {score}% On-Time
                    </span>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </div>
                </div>
              );
            })}
            {employeeRankings.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>No employee data available.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
