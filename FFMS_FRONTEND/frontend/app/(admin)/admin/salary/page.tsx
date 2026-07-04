"use client";
import { useState, useEffect } from "react";
import { salaryApi, advanceApi, attendanceApi } from "@/lib/api-client";
import { Edit2, X, Users, Briefcase, CheckCircle, CreditCard, Clock, CheckCircle2, XCircle, FileText, Calendar } from "lucide-react";

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
  user: { id: string; name: string; employeeId: string; };
  approvedBy?: { id: string; name: string; };
}

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
  const [previewModal, setPreviewModal] = useState<{ isOpen: boolean; url: string | null; user: SalaryData | null; downloading: boolean }>({ isOpen: false, url: null, user: null, downloading: false });
  const [attendanceModal, setAttendanceModal] = useState<{ isOpen: boolean; user: SalaryData | null; data: any[]; stats: any; loading: boolean }>({ isOpen: false, user: null, data: [], stats: null, loading: false });
  const [editForm, setEditForm] = useState({ baseSalary: "", bonus: "" });
  const [companyName, setCompanyName] = useState("Eazzio Technologies Pvt Ltd");
  const [toast, setToast] = useState<string | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);

  const fetchSalaryData = async () => {
    setLoading(true);
    try {
      const [res, advRes] = await Promise.all([
        salaryApi.getSalaryList({ month }),
        advanceApi.getAll()
      ]);
      
      if (res && res.success && res.data) {
        setManagers(res.data.managers || []);
        setEmployees(res.data.employees || []);
      } else {
        setToast("Failed to load data from server");
        setTimeout(() => setToast(null), 3000);
      }

      if (advRes && advRes.success && advRes.data) {
        setAdvances(advRes.data || []);
      }
    } catch (err) {
      console.warn("Failed to fetch salary data:", err);
      setToast("Network error or server is down");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaryData();
  }, [month]);

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
        setToast(`Salary structure updated for ${editModal.user.name}`);
        setTimeout(() => setToast(null), 3000);
        setEditModal({ isOpen: false, user: null });
        fetchSalaryData(); // Refresh list to get recomputed values
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdvanceAction = async (id: string, action: "approve" | "reject") => {
    try {
      const res = action === "approve" ? await advanceApi.approve(id) : await advanceApi.reject(id);
      if (res.success) {
        setToast(`Advance request ${action}d successfully`);
        setTimeout(() => setToast(null), 3000);
        fetchSalaryData();
      }
    } catch (err) {
      console.error(err);
      setToast(`Failed to ${action} advance request`);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleGenerateSlip = async (user: SalaryData) => {
    try {
      setGenerating(user.id);
      const res = await salaryApi.generateSlip(user.id, month, companyName);
      
      if (!res.ok) {
        throw new Error("Failed to generate slip");
      }
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setPreviewModal({ isOpen: true, url, user, downloading: false });
      
    } catch (err) {
      console.error(err);
      setToast("Failed to generate payslip preview");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setGenerating(null);
    }
  };

  const handleDownloadSlip = () => {
    if (!previewModal.url || !previewModal.user) return;
    const a = document.createElement("a");
    a.href = previewModal.url;
    a.download = `Salary_Slip_${previewModal.user.name.replace(/\s+/g, '_')}_${month}.pdf`;
    document.body.appendChild(a);
    a.click();
    setToast(`Payslip downloaded for ${previewModal.user.name}`);
    setTimeout(() => setToast(null), 3000);
  };

  const handleEmailSlip = async () => {
    if (!previewModal.user) return;
    try {
      setPreviewModal(prev => ({ ...prev, downloading: true }));
      const res = await salaryApi.emailSlip(previewModal.user.id, month, companyName);
      if (res.success) {
        setToast(`Payslip sent to ${previewModal.user.name} via email`);
        setTimeout(() => setToast(null), 3000);
      } else {
        throw new Error(res.error?.message || "Failed");
      }
    } catch (err) {
      console.error(err);
      setToast("Failed to email payslip");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setPreviewModal(prev => ({ ...prev, downloading: false }));
    }
  };

  const handleViewAttendance = async (user: SalaryData) => {
    setAttendanceModal({ isOpen: true, user, data: [], stats: null, loading: true });
    try {
      const [yearStr, monthStr] = month.split('-');
      const y = parseInt(yearStr);
      const m = parseInt(monthStr);
      
      const res = await attendanceApi.list({ userId: user.id, month: monthStr, year: yearStr });
      if (res.success) {
        const rawData = res.data || [];
        const daysInMonth = new Date(y, m, 0).getDate();
        const fullMonthData = [];
        const today = new Date();
        today.setHours(0,0,0,0);
        
        let workingDaysCount = 0;
        let presentCount = 0;
        let lateCount = 0;
        let halfDayCount = 0;
        let absentCount = 0;

        for (let i = 1; i <= daysInMonth; i++) {
          const currentDate = new Date(y, m - 1, i);
          const dow = currentDate.getDay();
          const isWeekend = dow === 0 || dow === 6;
          
          if (!isWeekend) workingDaysCount++;
          
          const record = rawData.find((r: any) => {
            const rd = new Date(r.date);
            return rd.getDate() === i && rd.getMonth() === (m - 1);
          });
          
          let finalStatus = "";
          let checkIn = null;
          let checkOut = null;
          
          if (record) {
            finalStatus = record.status;
            checkIn = record.checkInTime;
            checkOut = record.checkOutTime;
            
            if (finalStatus === "PRESENT") presentCount++;
            if (finalStatus === "LATE") lateCount++; 
            if (finalStatus === "HALF_DAY") halfDayCount++;
            if (finalStatus === "ABSENT") absentCount++;
          } else {
            if (isWeekend) {
              finalStatus = "WEEKEND";
            } else if (currentDate > today) {
              finalStatus = "--";
            } else {
              finalStatus = "ABSENT";
              absentCount++;
            }
          }
          
          fullMonthData.push({
            id: record ? record.id : `generated-${i}`,
            date: currentDate.toISOString(),
            status: finalStatus,
            checkInTime: checkIn,
            checkOutTime: checkOut
          });
        }
        
        // Sort descending (latest dates first)
        fullMonthData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setAttendanceModal(prev => ({ 
          ...prev, 
          data: fullMonthData, 
          stats: { workingDays: workingDaysCount, present: presentCount, late: lateCount, halfDay: halfDayCount, absent: absentCount },
          loading: false 
        }));
      } else {
        throw new Error("Failed to fetch attendance");
      }
    } catch (err) {
      console.error(err);
      setToast("Failed to load attendance data");
      setAttendanceModal(prev => ({ ...prev, loading: false }));
      setTimeout(() => setToast(null), 3000);
    }
  };

  const currentData = activeTab === "managers" ? managers : employees;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "20px" }}>
        <div>
          <div className="page-title">Salary Management</div>
          <div className="page-subtitle">Track and manage employee salaries and bonuses</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500, marginBottom: "4px" }}>Company Name on Payslip</span>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company Name"
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: "14px",
                fontWeight: 500,
                outline: "none",
                width: "220px",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500, marginBottom: "4px" }}>Select Month</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: "14px",
                fontWeight: 500,
                outline: "none",
                width: "160px"
              }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
        <button
          onClick={() => setActiveTab("employees")}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: 600,
            background: activeTab === "employees" ? "rgba(79, 142, 247, 0.1)" : "transparent",
            color: activeTab === "employees" ? "var(--accent-blue)" : "var(--text-secondary)",
            border: "none", transition: "all 0.2s"
          }}
        >
          <Users size={16} /> Employees ({employees.length})
        </button>
        <button
          onClick={() => setActiveTab("managers")}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: 600,
            background: activeTab === "managers" ? "rgba(79, 142, 247, 0.1)" : "transparent",
            color: activeTab === "managers" ? "var(--accent-blue)" : "var(--text-secondary)",
            border: "none", transition: "all 0.2s"
          }}
        >
          <Briefcase size={16} /> Managers ({managers.length})
        </button>
        <button
          onClick={() => setActiveTab("advances")}
          style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: 600,
            background: activeTab === "advances" ? "rgba(79, 142, 247, 0.1)" : "transparent",
            color: activeTab === "advances" ? "var(--accent-blue)" : "var(--text-secondary)",
            border: "none", transition: "all 0.2s"
          }}
        >
          <CreditCard size={16} /> Advance Requests ({advances.length})
        </button>
      </div>

      {/* Data Table */}
      <div className="card" style={{ padding: "0", overflow: "hidden" }}>
        {activeTab === "advances" ? (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
              <tr>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Employee</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Date Requested</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Amount</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Reason</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Status</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading advances...</td>
                </tr>
              ) : advances.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No advance requests found.</td>
                </tr>
              ) : (
                advances.map(adv => (
                  <tr key={adv.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>{adv.user.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>ID: {adv.user.employeeId}</div>
                    </td>
                    <td style={{ padding: "14px 20px", color: "var(--text-secondary)", fontSize: "14px" }}>
                      {new Date(adv.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "14px 20px", fontWeight: 600, color: "var(--text-primary)" }}>
                      ₹{adv.amount.toLocaleString()}
                    </td>
                    <td style={{ padding: "14px 20px", color: "var(--text-secondary)", fontSize: "14px", maxWidth: "200px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={adv.reason}>
                      {adv.reason || "N/A"}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      {adv.status === "PENDING" && <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 }}><Clock size={12}/> Pending</span>}
                      {adv.status === "APPROVED" && <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(34, 211, 165, 0.1)", color: "var(--accent-green)", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 }}><CheckCircle2 size={12}/> Approved</span>}
                      {adv.status === "REJECTED" && <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(244, 63, 94, 0.1)", color: "var(--accent-red)", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 }}><XCircle size={12}/> Rejected</span>}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      {adv.status === "PENDING" && (
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button onClick={() => handleAdvanceAction(adv.id, "approve")} style={{ background: "var(--accent-green)", border: "none", color: "white", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                            Approve
                          </button>
                          <button onClick={() => handleAdvanceAction(adv.id, "reject")} style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text-primary)", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead style={{ background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)" }}>
              <tr>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Employee</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Base Salary</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Bonus/Deduct</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", textAlign: "center" }}>Working Days</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", textAlign: "center" }}>Leaves</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase" }}>Computed Salary</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", textAlign: "center" }}>Payslip</th>
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading data...</td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No records found for this category.</td>
                </tr>
              ) : (
                currentData.map(user => (
                  <tr key={user.id} style={{ borderBottom: "1px solid var(--border)", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--bg-secondary)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>{user.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>ID: {user.employeeId} • {user.role}</div>
                    </td>
                    <td style={{ padding: "14px 20px", fontWeight: 500 }}>₹{(user.baseSalary || 0).toLocaleString()}</td>
                    <td style={{ padding: "14px 20px", color: user.bonus > 0 ? "var(--accent-green)" : user.bonus < 0 ? "var(--accent-red)" : "inherit" }}>
                      {user.bonus > 0 ? "+" : ""}{(user.bonus || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "center", fontWeight: 600 }}>{user.workingDays}</td>
                    <td style={{ padding: "14px 20px", textAlign: "center", fontWeight: 600, color: user.totalLeaves > 0 ? "var(--accent-red)" : "inherit" }}>{user.totalLeaves}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--accent-blue)" }}>₹{(user.computedSalary || 0).toLocaleString()}</div>
                    </td>
                    <td style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center", justifyContent: "center" }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: "6px 12px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px", height: "28px", border: "1px solid var(--border)", background: "transparent", cursor: generating === user.id ? "not-allowed" : "pointer", borderRadius: "6px", fontWeight: 600, color: "var(--text-primary)", opacity: generating === user.id ? 0.6 : 1 }}
                          onClick={() => handleGenerateSlip(user)}
                          disabled={generating === user.id}
                          title="Generate Payslip"
                        >
                          {generating === user.id ? <Clock size={13} className="spin" /> : <FileText size={13} />} 
                          {generating === user.id ? "Generating..." : "Generate"}
                        </button>
                        <button
                          style={{ background: "rgba(34, 211, 165, 0.1)", border: "none", color: "var(--accent-green)", padding: "6px 8px", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", height: "28px" }}
                          onClick={() => handleViewAttendance(user)}
                          title="View Attendance"
                        >
                          <Calendar size={14} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <button
                        onClick={() => handleEditClick(user)}
                        style={{ background: "rgba(79, 142, 247, 0.1)", border: "none", color: "var(--accent-blue)", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 600 }}
                      >
                        <Edit2 size={14} /> Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Modal */}
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

      {/* Preview Modal */}
      {previewModal.isOpen && previewModal.user && (
        <div className="modal-overlay" onClick={() => {
          setPreviewModal({ isOpen: false, url: null, user: null, downloading: false });
        }}>
          <div className="modal-box" style={{ maxWidth: "800px", width: "90%", height: "80vh", display: "flex", flexDirection: "column" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: "18px" }}>Payslip Preview: {previewModal.user.name}</h2>
                <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>Month: {month}</div>
              </div>
              <button onClick={() => setPreviewModal({ isOpen: false, url: null, user: null, downloading: false })} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={20} /></button>
            </div>
            
            <div style={{ flex: 1, background: "#f0f0f0", borderRadius: "8px", overflow: "hidden", marginBottom: "20px" }}>
              {previewModal.url ? (
                <iframe src={previewModal.url} width="100%" height="100%" style={{ border: "none" }} />
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)" }}>Loading preview...</div>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button 
                className="btn-secondary" 
                onClick={handleDownloadSlip}
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <FileText size={16} /> Download PDF
              </button>
              <button 
                className="btn-primary" 
                onClick={handleEmailSlip}
                disabled={previewModal.downloading}
                style={{ display: "flex", alignItems: "center", gap: "6px", opacity: previewModal.downloading ? 0.7 : 1 }}
              >
                {previewModal.downloading ? <Clock size={16} className="spin" /> : <CheckCircle size={16} />} 
                {previewModal.downloading ? "Sending Email..." : "Send via Email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {attendanceModal.isOpen && attendanceModal.user && (
        <div className="modal-overlay" onClick={() => setAttendanceModal({ isOpen: false, user: null, data: [], stats: null, loading: false })}>
          <div className="modal-box" style={{ maxWidth: "700px", width: "90%", maxHeight: "85vh", display: "flex", flexDirection: "column", padding: "0" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: "18px", color: "var(--text-primary)" }}>Attendance Records</h2>
                <div style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "4px", fontWeight: 500 }}>
                  <span style={{ color: "var(--accent-blue)" }}>{attendanceModal.user.name}</span> • {month}
                </div>
              </div>
              <button 
                onClick={() => setAttendanceModal({ isOpen: false, user: null, data: [], stats: null, loading: false })} 
                style={{ background: "var(--bg-secondary)", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--bg-secondary)"}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", background: "var(--bg-card)", padding: "20px 24px" }}>
              {attendanceModal.loading ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <Clock size={24} className="spin" color="var(--accent-blue)" />
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>Loading attendance records...</span>
                </div>
              ) : attendanceModal.data.length === 0 ? (
                <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <Calendar size={32} opacity={0.5} />
                  <span style={{ fontSize: "14px", fontWeight: 500 }}>No attendance records found for this month.</span>
                </div>
              ) : (
                <>
                  {attendanceModal.stats && (
                    <div style={{ display: "flex", gap: "24px", marginBottom: "16px", padding: "16px", background: "var(--bg-secondary)", borderRadius: "8px", border: "1px solid var(--border)", overflowX: "auto" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Working Days:</span>
                        <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)" }}>{attendanceModal.stats.workingDays}</span>
                      </div>
                      <div style={{ width: "1px", background: "var(--border)" }}></div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Present:</span>
                        <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--accent-green)" }}>{attendanceModal.stats.present}</span>
                      </div>
                      <div style={{ width: "1px", background: "var(--border)" }}></div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Late:</span>
                        <span style={{ fontSize: "15px", fontWeight: 700, color: "#f59e0b" }}>{attendanceModal.stats.late}</span>
                      </div>
                      <div style={{ width: "1px", background: "var(--border)" }}></div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Half Day:</span>
                        <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--accent-blue)" }}>{attendanceModal.stats.halfDay}</span>
                      </div>
                      <div style={{ width: "1px", background: "var(--border)" }}></div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Absent:</span>
                        <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--accent-red)" }}>{attendanceModal.stats.absent}</span>
                      </div>
                    </div>
                  )}
                  
                  <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead style={{ background: "var(--bg-secondary)" }}>
                        <tr>
                          <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", width: "25%", borderBottom: "1px solid var(--border)" }}>Date</th>
                          <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", width: "25%", borderBottom: "1px solid var(--border)" }}>Status</th>
                          <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", width: "25%", borderBottom: "1px solid var(--border)" }}>Punch In</th>
                          <th style={{ padding: "12px 16px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", width: "25%", borderBottom: "1px solid var(--border)" }}>Punch Out</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceModal.data.map((record: any, idx: number) => {
                          const dateObj = new Date(record.date);
                          const isWeekend = record.status === "WEEKEND";
                          const isEmpty = record.status === "--";
                          const isLast = idx === attendanceModal.data.length - 1;
                          
                          let statusElement = <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>-</span>;
                          if (record.status === "PRESENT") {
                            statusElement = <span style={{ background: "rgba(34, 211, 165, 0.1)", color: "var(--accent-green)", padding: "4px 8px", borderRadius: "4px", fontWeight: 600, fontSize: "11px", border: "1px solid rgba(34, 211, 165, 0.2)" }}>PRESENT</span>;
                          } else if (record.status === "LATE") {
                            statusElement = <span style={{ background: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", padding: "4px 8px", borderRadius: "4px", fontWeight: 600, fontSize: "11px", border: "1px solid rgba(245, 158, 11, 0.2)" }}>LATE</span>;
                          } else if (record.status === "HALF_DAY") {
                            statusElement = <span style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--accent-blue)", padding: "4px 8px", borderRadius: "4px", fontWeight: 600, fontSize: "11px", border: "1px solid rgba(59, 130, 246, 0.2)" }}>HALF DAY</span>;
                          } else if (record.status === "ABSENT") {
                            statusElement = <span style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--accent-red)", padding: "4px 8px", borderRadius: "4px", fontWeight: 600, fontSize: "11px", border: "1px solid rgba(239, 68, 68, 0.2)" }}>ABSENT</span>;
                          } else if (isWeekend) {
                            statusElement = <span style={{ color: "var(--text-muted)", fontSize: "12px", fontWeight: 500 }}>WEEKEND</span>;
                          }
                          
                          return (
                            <tr key={record.id} style={{ 
                              background: (isWeekend || isEmpty) ? "rgba(0,0,0,0.01)" : "var(--bg-card)",
                              borderBottom: isLast ? "none" : "1px solid var(--border)",
                            }}>
                              <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 500, color: (isWeekend || isEmpty) ? "var(--text-muted)" : "var(--text-primary)" }}>
                                {dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--text-muted)" }}>{dateObj.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                              </td>
                              <td style={{ padding: "12px 16px" }}>
                                {statusElement}
                              </td>
                              <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)" }}>
                                {record.checkInTime ? (
                                  new Date(record.checkInTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                ) : (
                                  <span style={{ color: "var(--border)" }}>--:--</span>
                                )}
                              </td>
                              <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 500, color: "var(--text-secondary)" }}>
                                {record.checkOutTime ? (
                                  new Date(record.checkOutTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                ) : (
                                  <span style={{ color: "var(--border)" }}>--:--</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", background: "var(--bg-card)", color: "var(--text-primary)",
          padding: "14px 20px", display: "flex", alignItems: "center", gap: "12px", zIndex: 9999, animation: "fadeIn 0.2s ease",
          border: "1px solid var(--accent-green)", borderLeft: "4px solid var(--accent-green)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
        }}>
          <div style={{ background: "rgba(34,211,165,0.1)", borderRadius: "50%", padding: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={16} color="var(--accent-green)" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            <span style={{ fontSize: "13px", fontWeight: 700 }}>Success</span>
            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
