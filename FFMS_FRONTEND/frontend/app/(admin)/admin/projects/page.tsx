"use client";

import { useState, useEffect } from "react";
import { projectsApi, usersApi, tasksApi, ApiProject } from "@/lib/api-client";
import { FolderPlus, Search, Edit2, X, Check, RefreshCw, Briefcase, CheckCircle2, PauseCircle, Clock4, Plus, Trash2 } from "lucide-react";

const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
  ACTIVE: { bg: "#dcfce7", text: "#16a34a", icon: <CheckCircle2 size={13} />, label: "Active" },
  COMPLETED: { bg: "#dbeafe", text: "#2563eb", icon: <CheckCircle2 size={13} />, label: "Completed" },
  PAUSED: { bg: "#fff7ed", text: "#ea580c", icon: <PauseCircle size={13} />, label: "On Hold" },
  CANCELLED: { bg: "#fee2e2", text: "#ef4444", icon: <X size={13} />, label: "Cancelled" },
};

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProject, setEditingProject] = useState<ApiProject | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [formData, setFormData] = useState({
    name: "", managerId: "", startDate: "", endDate: "", status: "ACTIVE", department: "", budget: "", progress: 0, description: ""
  });
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: "", description: "", assigneeId: "", priority: "MEDIUM", dueDate: "" });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = () => {
    Promise.all([
      projectsApi.list(),
      usersApi.list({ role: "MANAGER" }),
      usersApi.list()
    ]).then(([projRes, mgrRes, empRes]) => {
      if (projRes.success) {
        setProjects(projRes.data);
      }
      if (mgrRes.success) {
        setManagers(mgrRes.data);
        if (mgrRes.data.length > 0 && !formData.managerId) {
          setFormData(prev => ({ ...prev, managerId: mgrRes.data[0].id }));
        }
      }
      if (empRes.success) {
        const staff = empRes.data.filter((u: any) => u.role === "FIELD_STAFF" || u.role === "OFFICE_STAFF" || u.role === "MANAGER");
        setEmployees(staff);
        if (staff.length > 0 && !taskForm.assigneeId) {
          setTaskForm(prev => ({ ...prev, assigneeId: staff[0].id }));
        }
      }
    })
    .catch(err => console.error(err))
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = projects.filter((p) => {
    const managerName = p.manager?.name || "Unassigned";
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || managerName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.managerId && managers.length > 0) {
      formData.managerId = managers[0].id;
    }
    const res = await projectsApi.create({
      name: formData.name,
      managerId: formData.managerId,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      status: formData.status,
      description: formData.description
    });

    if (res.success) {
      loadData();
      setShowAddModal(false);
      showToast(`Project "${formData.name}" created successfully!`, "success");
    } else {
      showToast(res.error?.message || "Failed to create project", "error");
    }
  };

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    const res = await projectsApi.update(editingProject.id, {
      name: formData.name,
      managerId: formData.managerId,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      status: formData.status,
      description: formData.description
    });

    if (res.success) {
      loadData();
      setEditingProject(null);
      showToast("Project updated successfully!", "success");
    } else {
      showToast(res.error?.message || "Failed to update project", "error");
    }
  };

  const handleReassign = async (p: ApiProject) => {
    if (managers.length <= 1) {
      showToast("No other managers available to reassign to", "error");
      return;
    }
    const otherManagers = managers.filter(m => m.id !== p.managerId);
    const randomManager = otherManagers[Math.floor(Math.random() * otherManagers.length)];
    const res = await projectsApi.update(p.id, { managerId: randomManager.id });
    if (res.success) {
      loadData();
      showToast(`Project reassigned to ${randomManager.name}!`, "success");
    } else {
      showToast("Failed to reassign project", "error");
    }
  };

  const handleDeleteProject = async (p: ApiProject) => {
    if (!window.confirm(`Are you sure you want to delete the project "${p.name}"?`)) return;
    try {
      const res = await projectsApi.delete(p.id);
      if (res.success) {
        showToast("Project deleted successfully!", "success");
        loadData();
      } else {
        alert("Error from server: " + JSON.stringify(res.error));
        showToast(res.error?.message || "Failed to delete project", "error");
      }
    } catch (err: any) {
      alert("Exception: " + err.message + "\nDetails: " + JSON.stringify(err.details || err));
      showToast(err.message || "Failed to delete project", "error");
    }
  };

  const openEdit = (p: ApiProject) => {
    setFormData({
      name: p.name,
      managerId: p.managerId,
      startDate: p.startDate ? p.startDate.split("T")[0] : "",
      endDate: p.endDate ? p.endDate.split("T")[0] : "",
      status: p.status,
      department: "",
      budget: "",
      progress: p.progress,
      description: p.description || ""
    });
    setEditingProject(p);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.assigneeId && employees.length > 0) {
      taskForm.assigneeId = employees[0].id;
    }
    const res = await tasksApi.create({
      title: taskForm.title,
      description: taskForm.description,
      priority: taskForm.priority,
      assigneeIds: [taskForm.assigneeId],
      dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : undefined
    });

    if (res.success) {
      setShowTaskModal(false);
      setTaskForm({ title: "", description: "", assigneeId: employees[0]?.id || "", priority: "MEDIUM", dueDate: "" });
      showToast(`Task "${taskForm.title}" assigned successfully!`, "success");
    } else {
      showToast(res.error?.message || "Failed to create task", "error");
    }
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
              <div className="skeleton-box" style={{ width: 140, height: 38, borderRadius: 6 }} />
            </div>
          </div>
          
          {/* Table Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
            <div className="skeleton-box" style={{ width: "100%", height: "40px" }} />
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <div className="skeleton-line" style={{ width: "15%", height: "14px" }} />
                <div className="skeleton-circle" style={{ width: "28px", height: "28px", flexShrink: 0 }} />
                <div className="skeleton-line" style={{ width: "15%", height: "14px" }} />
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
    { label: "Total Projects", value: projects.length, color: "#3b82f6", bg: "#eff6ff", icon: <Briefcase size={18} /> },
    { label: "Active", value: projects.filter((p) => p.status === "ACTIVE").length, color: "#22c55e", bg: "#dcfce7", icon: <CheckCircle2 size={18} /> },
    { label: "On Hold", value: projects.filter((p) => p.status === "PAUSED").length, color: "#f97316", bg: "#fff7ed", icon: <PauseCircle size={18} /> },
    { label: "Completed", value: projects.filter((p) => p.status === "COMPLETED").length, color: "#3b82f6", bg: "#eff6ff", icon: <CheckCircle2 size={18} /> },
    { label: "Cancelled", value: projects.filter((p) => p.status === "CANCELLED").length, color: "#ef4444", bg: "#fee2e2", icon: <X size={18} /> },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "4px 4px 40px", maxWidth: 1600, margin: "0 auto", fontFamily: "Inter, system-ui, sans-serif" }}>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16 }}>
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
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", margin: 0 }}>All Projects</h2>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: "2px 0 0" }}>{filtered.length} projects found</p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input id="project-search" placeholder="Search projects..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9999, padding: "8px 16px 8px 36px", fontSize: 13, outline: "none", width: 220 }} />
            </div>
            <select id="project-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 9999, padding: "8px 16px", fontSize: 13, cursor: "pointer", outline: "none" }}>
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">On Hold</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button onClick={() => { setTaskForm({ title: "", description: "", assigneeId: employees[0]?.id || "", priority: "MEDIUM", dueDate: "" }); setShowTaskModal(true); }}
              className="btn-primary" style={{ background: "#10b981", border: "none" }}>
              <Plus size={16} /> Create Task
            </button>
            <button id="add-project-btn" onClick={() => { setFormData({ name: "", managerId: managers[0]?.id || "", startDate: "", endDate: "", status: "ACTIVE", department: "", budget: "", progress: 0, description: "" }); setShowAddModal(true); }}
              className="btn-primary">
              <FolderPlus size={16} /> Create Project
            </button>
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                {["Project Name", "Assigned Manager", "Start Date", "End Date", "Progress", "Tasks Status", "Status", "Actions"].map((h) => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const sc = statusColors[p.status] || statusColors.ACTIVE;
                const managerName = p.manager?.name || "Unassigned";
                const startDateStr = p.startDate ? new Date(p.startDate).toLocaleDateString() : "-";
                const endDateStr = p.endDate ? new Date(p.endDate).toLocaleDateString() : "-";
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#1e293b" }}>{p.name}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#3b82f6", fontWeight: 700, fontSize: 10, flexShrink: 0 }}>
                          {managerName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13, color: "#334155" }}>{managerName}</span>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: "#64748b" }}>{startDateStr}</td>
                    <td style={{ fontSize: 13, color: "#64748b" }}>{endDateStr}</td>
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
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => openEdit(p)} style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(59, 130, 246,0.1)", color: "#3b82f6", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          <Edit2 size={12} /> Edit
                        </button>
                        <button onClick={() => handleReassign(p)}
                          style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          <RefreshCw size={12} /> Reassign
                        </button>
                        <button onClick={() => handleDeleteProject(p)}
                          style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(239, 68, 68,0.1)", color: "#ef4444", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#94a3b8", fontSize: 14 }}>No projects found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {(showAddModal || editingProject) && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 560 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1e293b" }}>
                {editingProject ? `Edit — ${editingProject.name}` : "Create New Project"}
              </h2>
              <button onClick={() => { setShowAddModal(false); setEditingProject(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={18} /></button>
            </div>
            <form onSubmit={editingProject ? handleEditProject : handleAddProject} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Project Name *</label><input type="text" required className="input" value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Q3 Sales Drive" /></div>
              <div><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Description</label><textarea className="input" value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} placeholder="Brief details about the project..." style={{ minHeight: "80px", resize: "vertical" }} /></div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Assign Manager *</label>
                  <select className="input" required value={formData.managerId} onChange={(e) => setFormData((p) => ({ ...p, managerId: e.target.value }))}>
                    {managers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Status</label>
                  <select className="input" value={formData.status} onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}>
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Start Date *</label><input type="date" required className="input" value={formData.startDate} onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))} /></div>
                <div style={{ flex: 1 }}><label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>End Date *</label><input type="date" required className="input" value={formData.endDate} onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))} /></div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => { setShowAddModal(false); setEditingProject(null); }} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: "#3b82f6" }}>{editingProject ? "Save Changes" : "Create Project"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: 520 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1e293b" }}>Assign New Task</h2>
              <button onClick={() => setShowTaskModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateTask} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Task Title *</label>
                <input type="text" required className="input" value={taskForm.title} onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Client Visit" />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Description</label>
                <textarea className="input" value={taskForm.description} onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))} placeholder="Task details..." style={{ minHeight: "80px", resize: "vertical" }} />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Assign To *</label>
                  <select className="input" required value={taskForm.assigneeId} onChange={(e) => setTaskForm((p) => ({ ...p, assigneeId: e.target.value }))}>
                    {employees.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Priority</label>
                  <select className="input" value={taskForm.priority} onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value }))}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Deadline</label>
                <input type="date" className="input" value={taskForm.dueDate} onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))} />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setShowTaskModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: "#10b981", border: "none" }}>Create Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: toast.type === "success" ? "#10b981" : "#ef4444", color: "white", padding: "12px 20px", display: "flex", alignItems: "center", gap: "10px", zIndex: 9999, borderRadius: 8 }}>
          {toast.type === "success" ? <Check size={16} /> : <X size={16} />}
          <span style={{ fontSize: "13px", fontWeight: 600 }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
