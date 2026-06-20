"use client";

import React, { useState, useEffect, Fragment } from "react";
import { usersApi, dashboardApi } from "@/lib/api-client";
import {
  UserPlus, Search, Edit2, ToggleLeft, ToggleRight, X, Check,
  Users, Briefcase, TrendingUp,
} from "lucide-react";

export interface Manager {
  id: string;
  name: string;
  email: string;
  department: string;
  assignedProjects: number;
  teamSize: number;
  status: "active" | "inactive";
  avatar: string;
  phone: string;
  joinedDate: string;
  performanceScore: number;
  team?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: "active" | "inactive";
    avatar: string;
  }[];
}


const departments = ["All Departments", "Sales", "Operations", "Delivery", "Marketing", "Field Services", "Support"];

export default function AdminManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedManagers, setExpandedManagers] = useState<Set<string>>(new Set());
  const [editingManager, setEditingManager] = useState<Manager | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [formData, setFormData] = useState({
    name: "", email: "", password: "", department: "Operations", phone: "", role: "MANAGER", managerId: ""
  });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = () => {
    dashboardApi.getAdmin()
      .then(res => {
        if (res.success && res.data.managersList) {
          setManagers(res.data.managersList);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = managers.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === "All Departments" || m.department === deptFilter;
    const matchStatus = statusFilter === "all" || m.status === statusFilter;
    return matchSearch && matchDept && matchStatus;
  });

  const toggleExpand = (managerId: string) => {
    setExpandedManagers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(managerId)) newSet.delete(managerId);
      else newSet.add(managerId);
      return newSet;
    });
  };

  const toggleStatus = async (id: string) => {
    const mgr = managers.find((m) => m.id === id);
    if (!mgr) return;
    const newStatus = mgr.status === "active" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await usersApi.update(id, { status: newStatus });
      setManagers((prev) => prev.map((m) => m.id === id ? { ...m, status: newStatus === "ACTIVE" ? "active" : "inactive" } : m));
      showToast(`${mgr.name} ${newStatus === "ACTIVE" ? "activated" : "deactivated"} successfully.`, "success");
    } catch (err: any) {
      showToast(err.message || "Failed to update status", "error");
    }
  };

  const handleAddManager = async (e: React.FormEvent) => {
    e.preventDefault();
    const prefix = formData.role === "MANAGER" ? "MGR" : "EMP";
    const employeeId = `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      const res = await usersApi.create({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        department: formData.department,
        employeeId,
        role: formData.role,
        managerId: formData.role !== "MANAGER" && formData.managerId ? formData.managerId : undefined,
        status: "ACTIVE"
      });
      
      if (formData.role === "MANAGER") {
        const newMgr: Manager = {
          id: res.data?.id || `temp-${Date.now()}`,
          name: formData.name,
          email: formData.email,
          department: formData.department,
          assignedProjects: 0,
          teamSize: 0,
          status: "active",
          avatar: formData.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase(),
          phone: formData.phone || "",
          joinedDate: new Date().toISOString().split('T')[0],
          performanceScore: 0,
          team: []
        };
        // Optimistic UI Update for Managers
        setManagers(prev => [newMgr, ...prev]);
      }
      
      setShowAddModal(false);
      setFormData({ name: "", email: "", password: "", department: "Operations", phone: "", role: "MANAGER", managerId: "" });
      showToast(`${formData.name} added successfully!`, "success");
      
      // Sync in background to update teams
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to add manager", "error");
    }
  };

  const handleEditManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingManager) return;
    try {
      await usersApi.update(editingManager.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        department: formData.department,
        ...(formData.password ? { password: formData.password } : {})
      });
      // Optimistic UI Update - immediate feedback
      setManagers(prev => prev.map(m => m.id === editingManager.id ? {
        ...m,
        name: formData.name,
        email: formData.email,
        phone: formData.phone || "",
        department: formData.department,
        avatar: formData.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
      } : m));
      
      setEditingManager(null);
      showToast("Manager details updated successfully!", "success");

      // Sync in background
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to update manager", "error");
    }
  };

  const openEdit = (m: Manager) => {
    setFormData({ name: m.name, email: m.email, password: "", department: m.department, phone: m.phone, role: "MANAGER", managerId: "" });
    setEditingManager(m);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "4px 4px 40px", maxWidth: 1600, margin: "0 auto" }}>
        {/* Stats Row Skeleton (5 columns) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="skeleton-card" style={{ height: 78, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
              <div className="skeleton-circle" style={{ width: "42px", height: "42px", flexShrink: 0 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <div className="skeleton-line" style={{ width: "60%", height: "24px" }} />
                <div className="skeleton-line" style={{ width: "80%", height: "12px" }} />
              </div>
            </div>
          ))}
        </div>

        {/* Table Card Skeleton */}
        <div className="skeleton-card" style={{ height: 500, padding: "24px", display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "200px" }}>
              <div className="skeleton-line" style={{ width: "60%", height: "24px" }} />
              <div className="skeleton-line" style={{ width: "40%", height: "14px" }} />
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div className="skeleton-box" style={{ width: 220, height: 38, borderRadius: 9999 }} />
              <div className="skeleton-box" style={{ width: 140, height: 38, borderRadius: 9999 }} />
              <div className="skeleton-box" style={{ width: 140, height: 38, borderRadius: 9999 }} />
              <div className="skeleton-box" style={{ width: 140, height: 38, borderRadius: 6 }} />
            </div>
          </div>
          
          {/* Table Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            <div className="skeleton-box" style={{ width: "100%", height: "40px" }} />
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <div className="skeleton-circle" style={{ width: "36px", height: "36px" }} />
                <div className="skeleton-line" style={{ width: "15%", height: "14px" }} />
                <div className="skeleton-line" style={{ width: "20%", height: "14px" }} />
                <div className="skeleton-line" style={{ width: "10%", height: "14px" }} />
                <div className="skeleton-line" style={{ width: "10%", height: "14px" }} />
                <div className="skeleton-line" style={{ width: "15%", height: "14px" }} />
                <div className="skeleton-line" style={{ flex: 1, height: "14px" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const summaryStats = [
    { label: "Total Managers", value: managers.length, icon: <Users size={18} />, color: "#3b82f6", bg: "#eff6ff" },
    { label: "Active", value: managers.filter((m) => m.status === "active").length, icon: <Check size={18} />, color: "#22c55e", bg: "#dcfce7" },
    { label: "Inactive", value: managers.filter((m) => m.status === "inactive").length, icon: <X size={18} />, color: "#ef4444", bg: "#fee2e2" },
    { label: "Avg. Team Size", value: managers.length > 0 ? Math.round(managers.reduce((a, m) => a + m.teamSize, 0) / managers.length) : 0, icon: <TrendingUp size={18} />, color: "#3b82f6", bg: "#eff6ff" },
    { label: "Total Projects", value: managers.reduce((a, m) => a + m.assignedProjects, 0), icon: <Briefcase size={18} />, color: "#f97316", bg: "#fff7ed" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "4px 4px 40px", maxWidth: 1600, margin: "0 auto", fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── Stats Row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
        {summaryStats.map((s) => (
          <div key={s.label} className="card" style={{ padding: "16px 20px", flexDirection: "row", alignItems: "center", gap: 14 }}>
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
        {/* Header + Controls */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", margin: 0 }}>All Managers</h2>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "2px 0 0" }}>{filtered.length} managers found</p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {/* Search */}
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                id="manager-search"
                placeholder="Search managers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9999, padding: "8px 16px 8px 36px", fontSize: 13, outline: "none", width: 220 }}
              />
            </div>
            {/* Dept filter */}
            <select id="dept-filter" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9999, padding: "8px 16px", fontSize: 13, cursor: "pointer", outline: "none" }}>
              {departments.map((d) => <option key={d}>{d}</option>)}
            </select>
            {/* Status filter */}
            <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9999, padding: "8px 16px", fontSize: 13, cursor: "pointer", outline: "none" }}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {/* Add Manager */}
            <button id="add-manager-btn" onClick={() => { setFormData({ name: "", email: "", password: "", department: "Operations", phone: "", role: "MANAGER", managerId: "" }); setShowAddModal(true); }}
              className="btn-primary">
              <UserPlus size={16} /> Add User/Manager
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {["Manager Name", "Email", "Department", "Assigned Projects", "Team Size", "Performance", "Status", "Actions"].map((h) => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <Fragment key={m.id}>
                  <tr style={{ cursor: "pointer", transition: "background 0.2s" }} onClick={() => toggleExpand(m.id)}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{m.avatar}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>Joined {m.joinedDate}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13, color: "#64748b" }}>{m.email}</td>
                  <td><span style={{ background: "#eff6ff", color: "#3b82f6", fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999 }}>{m.department}</span></td>
                  <td style={{ fontSize: 13, fontWeight: 600, textAlign: "center" }}>{m.assignedProjects}</td>
                  <td style={{ fontSize: 13, fontWeight: 600, textAlign: "center" }}>{m.teamSize}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 999 }}>
                        <div style={{ height: "100%", width: `${m.performanceScore}%`, background: m.performanceScore >= 90 ? "#22c55e" : m.performanceScore >= 75 ? "#3b82f6" : "#f97316", borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", minWidth: 32 }}>{m.performanceScore}%</span>
                    </div>
                  </td>
                  <td>
                    <button onClick={(e) => { e.stopPropagation(); toggleStatus(m.id); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      {m.status === "active" ? <ToggleRight size={24} color="#22c55e" /> : <ToggleLeft size={24} color="#94a3b8" />}
                      <span style={{ fontSize: 12, fontWeight: 700, color: m.status === "active" ? "#22c55e" : "#94a3b8" }}>{m.status === "active" ? "Active" : "Inactive"}</span>
                    </button>
                  </td>
                  <td>
                    <button onClick={(e) => { e.stopPropagation(); openEdit(m); }} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(59, 130, 246,0.1)", color: "#3b82f6", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      <Edit2 size={13} /> Edit
                    </button>
                  </td>
                </tr>
                  
                  {/* Expanded Subordinates Row */}
                  {expandedManagers.has(m.id) && (
                    <tr>
                      <td colSpan={8} style={{ padding: 0, borderBottom: "1px solid #e2e8f0" }}>
                        <div style={{ padding: "16px 24px", background: "#f8fafc", boxShadow: "inset 0 3px 6px -3px rgba(0,0,0,0.05)" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <h4 style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0 }}>Team Members ({m.teamSize})</h4>
                          </div>
                          
                          {(!m.team || m.team.length === 0) ? (
                            <div style={{ padding: "16px", background: "white", borderRadius: 8, border: "1px dashed #cbd5e1", textAlign: "center", fontSize: 13, color: "#94a3b8", fontStyle: "italic" }}>
                              No team members assigned yet.
                            </div>
                          ) : (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                              {m.team.map(sub => (
                                <div key={sub.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "white", borderRadius: 8, border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontWeight: 600, fontSize: 12, flexShrink: 0 }}>{sub.avatar}</div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub.name}</div>
                                    <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub.email}</div>
                                  </div>
                                  <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", padding: "3px 8px", borderRadius: 12, background: sub.status === "active" ? "#ecfdf5" : "#f1f5f9", color: sub.status === "active" ? "#10b981" : "#64748b" }}>
                                    {sub.status}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#94a3b8", fontSize: 14 }}>No managers found matching your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Manager Modal ── */}
      {showAddModal && (
        <ManagerFormModal
          title="Add New User"
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleAddManager}
          onClose={() => setShowAddModal(false)}
          submitLabel="Add User"
          managers={managers}
        />
      )}

      {/* ── Edit Manager Modal ── */}
      {editingManager && (
        <ManagerFormModal
          title={`Edit — ${editingManager.name}`}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleEditManager}
          onClose={() => setEditingManager(null)}
          submitLabel="Save Changes"
          managers={managers}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: toast.type === "success" ? "#10b981" : "#ef4444", color: "white", padding: "12px 20px", display: "flex", alignItems: "center", gap: "10px", zIndex: 9999, borderRadius: 8 }}>
          {toast.type === "success" ? <Check size={16} /> : <X size={16} />}
          <span style={{ fontSize: "13px", fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

function ManagerFormModal({ title, formData, setFormData, onSubmit, onClose, submitLabel, managers }: {
  title: string;
  formData: { name: string; email: string; password: string; department: string; phone: string; role: string; managerId: string; };
  setFormData: React.Dispatch<React.SetStateAction<{ name: string; email: string; password: string; department: string; phone: string; role: string; managerId: string; }>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  submitLabel: string;
  managers: Manager[];
}) {
  const isAdd = title.includes("Add");
  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1e293b" }}>{title}</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={18} /></button>
        </div>
        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Full Name *</label><input type="text" required className="input" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Ravi Kumar" /></div>
            <div style={{ flex: 1 }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Email *</label><input type="email" required autoComplete="off" className="input" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))} placeholder="manager@company.com" /></div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Department *</label>
              <select className="input" value={formData.department} onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))} required>
                {departments.slice(1).map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Phone</label><input type="text" className="input" value={formData.phone} onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 00001" /></div>
          </div>
          {isAdd && (
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Role *</label>
                <select className="input" value={formData.role} onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))} required>
                  <option value="MANAGER">Manager</option>
                  <option value="FIELD_STAFF">Field Staff</option>
                  <option value="OFFICE_STAFF">Office Staff</option>
                </select>
              </div>
              {formData.role !== "MANAGER" && (
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Reports To *</label>
                  <select className="input" value={formData.managerId} onChange={(e) => setFormData((p) => ({ ...p, managerId: e.target.value }))} required>
                    <option value="">-- Select Manager --</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.department})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>{isAdd ? "Password *" : "New Password (Optional)"}</label>
            <input type="text" required={isAdd} autoComplete="new-password" className="input" value={formData.password || ""} onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))} placeholder={isAdd ? "Enter a secure password" : "Leave blank to keep current password"} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" style={{ background: "#3b82f6" }}>{submitLabel}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
