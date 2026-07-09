"use client";
import { useState, useEffect } from "react";
import { salaryApi, advanceApi, attendanceApi } from "@/lib/api-client";
import {
  Edit2, X, Users, Briefcase, CheckCircle, CreditCard, Clock,
  CheckCircle2, XCircle, FileText, Calendar, Download, Mail, Send
} from "lucide-react";

interface SalaryData {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeId: string;
  baseSalary: number;
  bonus: number;
  workingDays: number;
  daysPresent: number;
  totalLeaves: number;
  computedSalary: number;
}

interface AdvanceData {
  id: string;
  amount: number;
  reason: string;
  status: string;
  createdAt: string;
  user: { id: string; name: string; employeeId: string };
  approvedBy?: { id: string; name: string };
}

type ActionState = {
  type: "slip-download" | "slip-email" | "att-download" | "att-email" | null;
  userId: string | null;
};

export default function SalaryPage() {
  const [managers, setManagers] = useState<SalaryData[]>([]);
  const [employees, setEmployees] = useState<SalaryData[]>([]);
  const [advances, setAdvances] = useState<AdvanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"managers" | "employees" | "advances">("employees");
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [editModal, setEditModal] = useState<{ isOpen: boolean; user: SalaryData | null }>({ isOpen: false, user: null });
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean; url: string | null; user: SalaryData | null; emailing: boolean }>({ isOpen: false, url: null, user: null, emailing: false });
  const [attendanceModal, setAttendanceModal] = useState<{ isOpen: boolean; user: SalaryData | null; data: any[]; stats: any; loading: boolean }>({ isOpen: false, user: null, data: [], stats: null, loading: false });

  const [editForm, setEditForm] = useState({ baseSalary: "", bonus: "" });
  const [companyName, setCompanyName] = useState("Eazzio Technologies Pvt Ltd");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Per-row action state: which user + which action is currently running
  const [action, setAction] = useState<ActionState>({ type: null, userId: null });

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const isRunning = (type: ActionState["type"], userId: string) =>
    action.type === type && action.userId === userId;

  const anyRunning = (userId: string) => action.userId === userId && action.type !== null;

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchSalaryData = async () => {
    setLoading(true);
    try {
      const [res, advRes] = await Promise.all([
        salaryApi.getSalaryList({ month }),
        advanceApi.getAll(),
      ]);

      if (res?.success && res.data) {
        setManagers(res.data.managers || []);
        setEmployees(res.data.employees || []);
      } else {
        showToast("Failed to load salary data from server", false);
      }

      if (advRes?.success && advRes.data) {
        setAdvances(advRes.data || []);
      }
    } catch {
      showToast("Network error — server may be down", false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSalaryData(); }, [month]);

  // ── Edit salary ────────────────────────────────────────────────────────────

  const handleEditClick = (user: SalaryData) => {
    setEditForm({
      baseSalary: user.baseSalary ? user.baseSalary.toString() : "0",
      bonus: user.bonus ? user.bonus.toString() : "0",
    });
    setEditModal({ isOpen: true, user });
  };

  const handleSaveEdit = async () => {
    if (!editModal.user) return;
    try {
      const payload = {
        baseSalary: parseFloat(editForm.baseSalary) || 0,
        bonus: parseFloat(editForm.bonus) || 0,
      };
      const res = await salaryApi.updateSalary(editModal.user.id, payload);
      if (res.success) {
        showToast(`Salary updated for ${editModal.user.name}`);
        setEditModal({ isOpen: false, user: null });
        fetchSalaryData();
      }
    } catch {
      showToast("Failed to update salary structure", false);
    }
  };

  // ── Advance actions ────────────────────────────────────────────────────────

  const handleAdvanceAction = async (id: string, act: "approve" | "reject") => {
    try {
      const res = act === "approve" ? await advanceApi.approve(id) : await advanceApi.reject(id);
      if (res.success) {
        showToast(`Advance request ${act}d`);
        fetchSalaryData();
      }
    } catch {
      showToast(`Failed to ${act} advance request`, false);
    }
  };

  // ── Payslip: Generate (opens preview modal) ────────────────────────────────

  const handleGenerateSlip = async (user: SalaryData) => {
    try {
      setAction({ type: "slip-download", userId: user.id });
      const res = await salaryApi.generateSlip(user.id, month, companyName);
      if (!res.ok) throw new Error("Failed to generate slip");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setPreviewModal({ isOpen: true, url, user, emailing: false });
    } catch {
      showToast("Failed to generate payslip", false);
    } finally {
      setAction({ type: null, userId: null });
    }
  };

  const handleDownloadSlip = () => {
    if (!previewModal.url || !previewModal.user) return;
    const a = document.createElement("a");
    a.href = previewModal.url;
    a.download = `Salary_Slip_${previewModal.user.name.replace(/\s+/g, "_")}_${month}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast(`Payslip downloaded for ${previewModal.user.name}`);
  };

  const handleEmailSlip = async (user?: SalaryData) => {
    const targetUser = user || previewModal.user;
    if (!targetUser) return;
    try {
      if (user) {
        setAction({ type: "slip-email", userId: user.id });
      } else {
        setPreviewModal(prev => ({ ...prev, emailing: true }));
      }
      const res = await salaryApi.emailSlip(targetUser.id, month, companyName);
      if (res.success) {
        showToast(`Payslip emailed to ${targetUser.name}`);
      } else {
        throw new Error((res as any).message || "Failed");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to email payslip", false);
    } finally {
      if (user) {
        setAction({ type: null, userId: null });
      } else {
        setPreviewModal(prev => ({ ...prev, emailing: false }));
      }
    }
  };

  // ── Attendance modal ───────────────────────────────────────────────────────

  const handleViewAttendance = async (user: SalaryData) => {
    setAttendanceModal({ isOpen: true, user, data: [], stats: null, loading: true });
    try {
      const [yearStr, monthStr] = month.split("-");
      const y = parseInt(yearStr);
      const m = parseInt(monthStr);

      const res = await attendanceApi.list({ userId: user.id, month: monthStr, year: yearStr, limit: 31 });
      if (!res.success) throw new Error("Failed to fetch attendance");

      const rawData = res.data || [];
      const daysInMonth = new Date(y, m, 0).getDate();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let workingDaysCount = 0, presentCount = 0, lateCount = 0, halfDayCount = 0, absentCount = 0;
      const fullMonthData: any[] = [];

      for (let i = 1; i <= daysInMonth; i++) {
        const currentDate = new Date(y, m - 1, i);
        const dow = currentDate.getDay();
        const isWeekend = dow === 0; // Mon-Sat are working days; only Sunday is off
        if (!isWeekend) workingDaysCount++;

        const record = rawData.find((r: any) => {
          const rd = new Date(r.date);
          return rd.getDate() === i && rd.getMonth() === m - 1;
        });

        let finalStatus = "";
        let checkIn = null, checkOut = null;

        if (record) {
          finalStatus = record.status;
          checkIn = record.checkInTime;
          checkOut = record.checkOutTime;
          if (finalStatus === "PRESENT") presentCount++;
          else if (finalStatus === "LATE") lateCount++;
          else if (finalStatus === "HALF_DAY") halfDayCount++;
          else if (finalStatus === "ABSENT") absentCount++;
        } else {
          if (isWeekend) finalStatus = "WEEKEND";
          else if (currentDate > today) finalStatus = "--";
          else { finalStatus = "ABSENT"; absentCount++; }
        }

        fullMonthData.push({
          id: record ? record.id : `gen-${i}`,
          date: currentDate.toISOString(),
          status: finalStatus,
          checkInTime: checkIn,
          checkOutTime: checkOut,
        });
      }

      fullMonthData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setAttendanceModal(prev => ({
        ...prev,
        data: fullMonthData,
        stats: { workingDays: workingDaysCount, present: presentCount, late: lateCount, halfDay: halfDayCount, absent: absentCount },
        loading: false,
      }));
    } catch {
      showToast("Failed to load attendance records", false);
      setAttendanceModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDownloadAttendancePdf = async () => {
    if (!attendanceModal.user) return;
    try {
      setAction({ type: "att-download", userId: attendanceModal.user.id });
      const res = await attendanceApi.generateReportPdf(attendanceModal.user.id, month, companyName);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Attendance_${attendanceModal.user.name.replace(/\s+/g, "_")}_${month}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`Attendance PDF downloaded for ${attendanceModal.user.name}`);
    } catch {
      showToast("Failed to download attendance PDF", false);
    } finally {
      setAction({ type: null, userId: null });
    }
  };

  const handleEmailAttendancePdf = async () => {
    if (!attendanceModal.user) return;
    try {
      setAction({ type: "att-email", userId: attendanceModal.user.id });
      const res = await attendanceApi.emailReportPdf(attendanceModal.user.id, month, companyName);
      if (res.success) {
        showToast(`Attendance report emailed to ${attendanceModal.user.name}`);
      } else {
        throw new Error((res as any).message || "Failed");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to email attendance report", false);
    } finally {
      setAction({ type: null, userId: null });
    }
  };

  const currentData = activeTab === "managers" ? managers : employees;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Page Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "20px" }}>
        <div>
          <div className="page-title">Salary Management</div>
          <div className="page-subtitle">Track and manage employee salaries, payslips and attendance reports</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500, marginBottom: "4px" }}>Company Name on Payslip</span>
            <input
              type="text"
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              placeholder="Company Name"
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", fontWeight: 500, outline: "none", width: "240px" }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500, marginBottom: "4px" }}>Select Month</span>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "14px", fontWeight: 500, outline: "none", width: "165px" }}
            />
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
        {(["employees", "managers", "advances"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: 600,
              background: activeTab === tab ? "rgba(79,142,247,0.1)" : "transparent",
              color: activeTab === tab ? "var(--accent-blue)" : "var(--text-secondary)",
              border: "none", transition: "all 0.2s",
            }}
          >
            {tab === "employees" && <><Users size={16} /> Employees ({employees.length})</>}
            {tab === "managers" && <><Briefcase size={16} /> Managers ({managers.length})</>}
            {tab === "advances" && <><CreditCard size={16} /> Advance Requests ({advances.length})</>}
          </button>
        ))}
      </div>

      {/* ── Data Table ── */}
      <div className="card" style={{ padding: "0", overflow: "hidden" }}>

        {/* Advances Table */}
        {activeTab === "advances" ? (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
              <tr>
                {["Employee", "Date Requested", "Amount", "Reason", "Status", "Action"].map((h, i) => (
                  <th key={h} style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", textAlign: i === 5 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading advances...</td></tr>
              ) : advances.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No advance requests found.</td></tr>
              ) : advances.map(adv => (
                <tr key={adv.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ fontWeight: 600, fontSize: "14px" }}>{adv.user.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>ID: {adv.user.employeeId}</div>
                  </td>
                  <td style={{ padding: "14px 20px", color: "var(--text-secondary)", fontSize: "14px" }}>{new Date(adv.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: "14px 20px", fontWeight: 600 }}>₹{adv.amount.toLocaleString()}</td>
                  <td style={{ padding: "14px 20px", color: "var(--text-secondary)", fontSize: "14px", maxWidth: "200px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={adv.reason}>{adv.reason || "N/A"}</td>
                  <td style={{ padding: "14px 20px" }}>
                    {adv.status === "PENDING" && <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(245,158,11,0.1)", color: "#f59e0b", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 }}><Clock size={12} /> Pending</span>}
                    {adv.status === "APPROVED" && <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(34,211,165,0.1)", color: "var(--accent-green)", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 }}><CheckCircle2 size={12} /> Approved</span>}
                    {adv.status === "REJECTED" && <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(244,63,94,0.1)", color: "var(--accent-red)", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 }}><XCircle size={12} /> Rejected</span>}
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    {adv.status === "PENDING" && (
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                        <button onClick={() => handleAdvanceAction(adv.id, "approve")} style={{ background: "var(--accent-green)", border: "none", color: "white", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>Approve</button>
                        <button onClick={() => handleAdvanceAction(adv.id, "reject")} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-primary)", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

        ) : (
          /* Salary Table */
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
              <tr>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Employee</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Base Salary</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Bonus/Deduct</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", textAlign: "center" }}>Working Days</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", textAlign: "center" }}>Present Days</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", textAlign: "center" }}>Leaves</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Net Salary</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", textAlign: "center" }}>Payslip</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", textAlign: "center" }}>Attendance</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", textAlign: "right" }}>Edit</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading data...</td></tr>
              ) : currentData.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No records found.</td></tr>
              ) : currentData.map(user => (
                <tr key={user.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>

                  {/* Employee Info */}
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>{user.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>ID: {user.employeeId} • {user.role}</div>
                  </td>

                  {/* Base Salary */}
                  <td style={{ padding: "14px 20px", fontWeight: 500 }}>₹{(user.baseSalary || 0).toLocaleString()}</td>

                  {/* Bonus/Deduct */}
                  <td style={{ padding: "14px 20px", color: user.bonus > 0 ? "var(--accent-green)" : user.bonus < 0 ? "var(--accent-red)" : "inherit" }}>
                    {user.bonus > 0 ? "+" : ""}{(user.bonus || 0).toLocaleString()}
                  </td>

                  {/* Working Days */}
                  <td style={{ padding: "14px 20px", textAlign: "center", fontWeight: 600 }}>{user.workingDays}</td>

                  {/* Present Days */}
                  <td style={{ padding: "14px 20px", textAlign: "center", fontWeight: 600, color: "var(--accent-green)" }}>{user.daysPresent ?? 0}</td>

                  {/* Leaves */}
                  <td style={{ padding: "14px 20px", textAlign: "center", fontWeight: 600, color: user.totalLeaves > 0 ? "var(--accent-red)" : "inherit" }}>{user.totalLeaves}</td>

                  {/* Net Salary */}
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--accent-blue)" }}>₹{(user.computedSalary || 0).toLocaleString()}</div>
                  </td>

                  {/* Payslip Actions */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "center" }}>
                      {/* Generate / Download PDF */}
                      <button
                        className="btn-secondary"
                        onClick={() => handleGenerateSlip(user)}
                        disabled={anyRunning(user.id)}
                        title="Preview & Download Payslip PDF"
                        style={{ padding: "5px 10px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "5px", height: "28px", border: "1px solid var(--border)", background: "transparent", cursor: anyRunning(user.id) ? "not-allowed" : "pointer", borderRadius: "6px", fontWeight: 600, color: "var(--text-primary)", opacity: anyRunning(user.id) ? 0.6 : 1, whiteSpace: "nowrap" }}
                      >
                        {isRunning("slip-download", user.id) ? <Clock size={12} className="spin" /> : <FileText size={12} />}
                        {isRunning("slip-download", user.id) ? "..." : "Preview"}
                      </button>
                      {/* Direct Email Payslip */}
                      <button
                        onClick={() => handleEmailSlip(user)}
                        disabled={anyRunning(user.id)}
                        title="Email Payslip directly"
                        style={{ height: "28px", width: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(79,142,247,0.1)", border: "none", color: "var(--accent-blue)", borderRadius: "6px", cursor: anyRunning(user.id) ? "not-allowed" : "pointer", opacity: anyRunning(user.id) ? 0.6 : 1 }}
                      >
                        {isRunning("slip-email", user.id) ? <Clock size={13} className="spin" /> : <Send size={13} />}
                      </button>
                    </div>
                  </td>

                  {/* Attendance Actions */}
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", justifyContent: "center" }}>
                      {/* View Attendance */}
                      <button
                        onClick={() => handleViewAttendance(user)}
                        disabled={anyRunning(user.id)}
                        title="View & download attendance record"
                        style={{ height: "28px", width: "28px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "rgba(34,211,165,0.1)", border: "none", color: "var(--accent-green)", borderRadius: "6px", cursor: anyRunning(user.id) ? "not-allowed" : "pointer", opacity: anyRunning(user.id) ? 0.6 : 1 }}
                      >
                        <Calendar size={14} />
                      </button>
                    </div>
                  </td>

                  {/* Edit */}
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <button
                      onClick={() => handleEditClick(user)}
                      style={{ background: "rgba(79,142,247,0.1)", border: "none", color: "var(--accent-blue)", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600 }}
                    >
                      <Edit2 size={14} /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Edit Salary Modal ── */}
      {editModal.isOpen && editModal.user && (
        <div className="modal-overlay" onClick={() => setEditModal({ isOpen: false, user: null })}>
          <div className="modal-box" style={{ maxWidth: "400px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontWeight: 700, fontSize: "18px" }}>Edit Salary Structure</h2>
              <button onClick={() => setEditModal({ isOpen: false, user: null })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: "20px", padding: "12px", background: "var(--bg-secondary)", borderRadius: "8px" }}>
              <div style={{ fontWeight: 600, fontSize: "14px" }}>{editModal.user.name}</div>
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{editModal.user.employeeId} • {editModal.user.role}</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Base Salary (Monthly)</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>₹</span>
                  <input type="number" className="input" value={editForm.baseSalary} onChange={e => setEditForm(f => ({ ...f, baseSalary: e.target.value }))} style={{ paddingLeft: "30px" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Bonus / Deduction</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}>₹</span>
                  <input type="number" className="input" value={editForm.bonus} onChange={e => setEditForm(f => ({ ...f, bonus: e.target.value }))} style={{ paddingLeft: "30px" }} placeholder="Use negative for deductions" />
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>Use negative values (e.g. -500) for deductions.</div>
              </div>
              <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button className="btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setEditModal({ isOpen: false, user: null })}>Cancel</button>
                <button className="btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={handleSaveEdit}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Payslip Preview Modal ── */}
      {previewModal.isOpen && previewModal.user && (
        <div className="modal-overlay" onClick={() => setPreviewModal({ isOpen: false, url: null, user: null, emailing: false })}>
          <div className="modal-box" style={{ maxWidth: "820px", width: "92%", height: "82vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: "18px" }}>Payslip Preview — {previewModal.user.name}</h2>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Month: {month} • {companyName}</div>
              </div>
              <button onClick={() => setPreviewModal({ isOpen: false, url: null, user: null, emailing: false })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={20} /></button>
            </div>

            <div style={{ flex: 1, background: "#f0f0f0", borderRadius: "8px", overflow: "hidden", marginBottom: "20px" }}>
              {previewModal.url
                ? <iframe src={previewModal.url} width="100%" height="100%" style={{ border: "none" }} />
                : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>Loading preview...</div>
              }
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button className="btn-secondary" onClick={handleDownloadSlip} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Download size={16} /> Download PDF
              </button>
              <button
                className="btn-primary"
                onClick={() => handleEmailSlip()}
                disabled={previewModal.emailing}
                style={{ display: "flex", alignItems: "center", gap: "6px", opacity: previewModal.emailing ? 0.7 : 1 }}
              >
                {previewModal.emailing ? <Clock size={16} className="spin" /> : <Mail size={16} />}
                {previewModal.emailing ? "Sending..." : "Send via Email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Attendance Modal ── */}
      {attendanceModal.isOpen && attendanceModal.user && (
        <div className="modal-overlay" onClick={() => setAttendanceModal({ isOpen: false, user: null, data: [], stats: null, loading: false })}>
          <div className="modal-box" style={{ maxWidth: "720px", width: "92%", maxHeight: "87vh", display: "flex", flexDirection: "column", padding: "0" }} onClick={e => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: "18px", color: "var(--text-primary)" }}>Attendance Records</h2>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px", fontWeight: 500 }}>
                  <span style={{ color: "var(--accent-blue)" }}>{attendanceModal.user.name}</span> • {month}
                </div>
              </div>
              <button
                onClick={() => setAttendanceModal({ isOpen: false, user: null, data: [], stats: null, loading: false })}
                style={{ background: "var(--bg-secondary)", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: "auto", background: "var(--bg-card)", padding: "20px 24px" }}>
              {attendanceModal.loading ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <Clock size={24} className="spin" color="var(--accent-blue)" />
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>Loading attendance records...</span>
                </div>
              ) : (
                <>
                  {/* Stats strip */}
                  {attendanceModal.stats && (
                    <div style={{ display: "flex", gap: "24px", marginBottom: "16px", padding: "16px", background: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border)", overflowX: "auto" }}>
                      {[
                        { label: "Working Days", val: attendanceModal.stats.workingDays, color: "var(--text-primary)" },
                        { label: "Present", val: attendanceModal.stats.present, color: "var(--accent-green)" },
                        { label: "Late", val: attendanceModal.stats.late, color: "#f59e0b" },
                        { label: "Half Day", val: attendanceModal.stats.halfDay, color: "var(--accent-blue)" },
                        { label: "Absent", val: attendanceModal.stats.absent, color: "var(--accent-red)" },
                      ].map((item, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          {i > 0 && <div style={{ width: "1px", background: "var(--border)", height: "24px" }} />}
                          <div>
                            <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>{item.label}</div>
                            <div style={{ fontSize: "18px", fontWeight: 700, color: item.color }}>{item.val}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* PDF Action buttons */}
                  {attendanceModal.stats && (
                    <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                      <button
                        onClick={handleDownloadAttendancePdf}
                        disabled={action.type !== null}
                        className="btn-secondary"
                        style={{ padding: "8px 16px", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: action.type !== null ? 0.7 : 1 }}
                      >
                        {isRunning("att-download", attendanceModal.user.id) ? <Clock size={15} className="spin" /> : <Download size={15} />}
                        {isRunning("att-download", attendanceModal.user.id) ? "Generating..." : "Download PDF"}
                      </button>
                      <button
                        onClick={handleEmailAttendancePdf}
                        disabled={action.type !== null}
                        className="btn-primary"
                        style={{ padding: "8px 16px", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", opacity: action.type !== null ? 0.7 : 1 }}
                      >
                        {isRunning("att-email", attendanceModal.user.id) ? <Clock size={15} className="spin" /> : <Mail size={15} />}
                        {isRunning("att-email", attendanceModal.user.id) ? "Sending..." : "Send via Email"}
                      </button>
                    </div>
                  )}

                  {/* Attendance Table */}
                  {attendanceModal.data.length === 0 ? (
                    <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
                      <Calendar size={32} opacity={0.4} style={{ margin: "0 auto 12px" }} />
                      <div>No attendance records found for this month.</div>
                    </div>
                  ) : (
                    <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead style={{ background: "var(--bg-secondary)" }}>
                          <tr>
                            {["Date", "Status", "Punch In", "Punch Out"].map(h => (
                              <th key={h} style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceModal.data.map((record: any, idx: number) => {
                            const dateObj = new Date(record.date);
                            const isWeekend = record.status === "WEEKEND";
                            const isEmpty = record.status === "--";
                            const isLast = idx === attendanceModal.data.length - 1;

                            let statusEl = <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>-</span>;
                            if (record.status === "PRESENT") statusEl = <span style={{ background: "rgba(34,211,165,0.1)", color: "var(--accent-green)", padding: "3px 8px", borderRadius: "4px", fontWeight: 600, fontSize: "11px", border: "1px solid rgba(34,211,165,0.2)" }}>PRESENT</span>;
                            else if (record.status === "LATE") statusEl = <span style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", padding: "3px 8px", borderRadius: "4px", fontWeight: 600, fontSize: "11px", border: "1px solid rgba(245,158,11,0.2)" }}>LATE</span>;
                            else if (record.status === "HALF_DAY") statusEl = <span style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent-blue)", padding: "3px 8px", borderRadius: "4px", fontWeight: 600, fontSize: "11px", border: "1px solid rgba(59,130,246,0.2)" }}>HALF DAY</span>;
                            else if (record.status === "ABSENT") statusEl = <span style={{ background: "rgba(239,68,68,0.1)", color: "var(--accent-red)", padding: "3px 8px", borderRadius: "4px", fontWeight: 600, fontSize: "11px", border: "1px solid rgba(239,68,68,0.2)" }}>ABSENT</span>;
                            else if (isWeekend) statusEl = <span style={{ color: "var(--text-muted)", fontSize: "12px", fontWeight: 500 }}>WEEKEND</span>;

                            return (
                              <tr key={record.id} style={{ background: (isWeekend || isEmpty) ? "rgba(0,0,0,0.01)" : "var(--bg-card)", borderBottom: isLast ? "none" : "1px solid var(--border)" }}>
                                <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 500, color: (isWeekend || isEmpty) ? "var(--text-muted)" : "var(--text-primary)" }}>
                                  {dateObj.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                  <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--text-muted)" }}>{dateObj.toLocaleDateString("en-GB", { weekday: "short" })}</span>
                                </td>
                                <td style={{ padding: "12px 16px" }}>{statusEl}</td>
                                <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--text-secondary)" }}>
                                  {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : <span style={{ color: "var(--border)" }}>--:--</span>}
                                </td>
                                <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--text-secondary)" }}>
                                  {record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : <span style={{ color: "var(--border)" }}>--:--</span>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toast && (() => {
        const color = toast.ok ? "var(--accent-green, #22c55e)" : "var(--accent-red, #ef4444)";
        const bg = toast.ok ? "rgba(34,211,165,0.08)" : "rgba(239,68,68,0.08)";
        return (
          <div style={{ position: "fixed", bottom: "24px", right: "24px", background: "var(--bg-card)", color: "var(--text-primary)", padding: "14px 20px", display: "flex", alignItems: "center", gap: "12px", zIndex: 9999, animation: "fadeIn 0.2s ease", border: `1px solid ${color}`, borderLeft: `4px solid ${color}`, boxShadow: "0 4px 12px rgba(0,0,0,0.12)", borderRadius: "4px", maxWidth: "360px" }}>
            <div style={{ background: bg, borderRadius: "50%", padding: "4px", display: "flex" }}>
              {toast.ok ? <CheckCircle size={16} color={color} /> : <XCircle size={16} color={color} />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              <span style={{ fontSize: "13px", fontWeight: 700 }}>{toast.ok ? "Success" : "Error"}</span>
              <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{toast.msg}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
