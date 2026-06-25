"use client";
import { useState, useEffect } from "react";
import { salaryApi, advanceApi } from "@/lib/api-client";
import { Edit2, X, Users, Briefcase, CheckCircle, CreditCard, Clock, CheckCircle2, XCircle } from "lucide-react";

interface SalaryData {
  id: string;
  name: string;
  email: string;
  role: string;
  employeeId: string;
  baseSalary: number;
  bonus: number;
  workingDays: number;
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
  const [editForm, setEditForm] = useState({ baseSalary: "", bonus: "" });
  const [toast, setToast] = useState<string | null>(null);

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

  const currentData = activeTab === "managers" ? managers : employees;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "20px" }}>
        <div>
          <div className="page-title">Salary Management</div>
          <div className="page-subtitle">Track and manage employee salaries and bonuses</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Select Month</label>
          <input
            type="month"
            className="input"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{ width: "160px" }}
          />
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
                <th style={{ padding: "14px 20px", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading data...</td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No records found for this category.</td>
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
