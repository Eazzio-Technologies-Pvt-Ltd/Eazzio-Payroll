// Leave management page — Admin/Manager approves or rejects leave requests
// Leave data from GET /api/v1/leaves — filtered by role
// ADMIN and MANAGER see all employees' leaves
// Status changes via PUT /api/v1/leave/:id/approve and /reject
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { leaveApi } from "@/lib/api-client";
import { Check, X, Calendar, User, Clock, Filter, RefreshCw } from "lucide-react";
import CloudinaryImage from "@/components/common/CloudinaryImage";

// Maps backend leave status to display color
function statusColor(s: string) {
  switch (s) {
    case "APPROVED": return "var(--accent-green)";
    case "REJECTED": return "var(--accent-red)";
    default: return "var(--accent-orange)";
  }
}

// Maps backend leave type to human-readable text
function leaveTypeLabel(t: string) {
  return t
    .charAt(0)
    .toUpperCase()
    .concat(t.slice(1).toLowerCase())
    .replace("_", " ");
}

export default function LeavesPage() {
  const user = useSelector((s: RootState) => s.auth.user);
  const isAdmin = user?.role === "ADMIN";
  const isManager = user?.role === "MANAGER";

  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; success: boolean } | null>(null);

  // Filter state
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Note modal state
  const [noteModal, setNoteModal] = useState<{ id: string; type: "approve" | "reject" } | null>(null);
  const [noteText, setNoteText] = useState("");

  // Load leaves from backend — admin sees all, manager sees their team
  const loadLeaves = async () => {
    setLoading(true);
    setError(null);
    try {
      // Admin uses /leave/all, manager uses /leave/team
      const res = isAdmin 
        ? await leaveApi.getAll({ limit: 200 })
        : await leaveApi.getTeam({ limit: 200 });
      const data = (res as any).data;
      // Backend returns { leaves: [], total, page, limit }
      const list = Array.isArray(data) ? data : (data?.leaves ?? []);
      setLeaves(list);
    } catch (err: any) {
      setError(err?.message || "Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, []);

  // Filter leave list by status and employee name
  const filtered = useMemo(() => {
    return leaves.filter((l) => {
      if (filterStatus !== "ALL" && l.status !== filterStatus) return false;
      if (filterEmployee.trim()) {
        const name = (l.user?.name || "").toLowerCase();
        if (!name.includes(filterEmployee.toLowerCase())) return false;
      }
      return true;
    });
  }, [leaves, filterStatus, filterEmployee]);

  const showToast = (msg: string, success: boolean) => {
    setToast({ msg, success });
    setTimeout(() => setToast(null), 3500);
  };

  // Open confirmation modal before approve/reject
  const openNoteModal = (id: string, type: "approve" | "reject") => {
    setNoteModal({ id, type });
    setNoteText("");
  };

  // Execute approve or reject via API
  const handleConfirmAction = async () => {
    if (!noteModal) return;
    const { id, type } = noteModal;
    setActionLoading(id);
    setNoteModal(null);
    try {
      // Call backend: PUT /api/v1/leave/:id/approve or /reject
      if (type === "approve") {
        await leaveApi.approve(id, noteText || "Approved by admin");
        showToast("Leave approved — employee notified in real-time", true);
      } else {
        await leaveApi.reject(id, noteText || "Rejected by admin");
        showToast("Leave rejected — employee notified in real-time", true);
      }
      // Reload to reflect new DB state
      await loadLeaves();
    } catch (err: any) {
      showToast(`❌ ${err?.message || "Action failed"}`, false);
    } finally {
      setActionLoading(null);
    }
  };

  // Summary counts
  const pendingCount = leaves.filter((l) => l.status === "PENDING").length;
  const approvedCount = leaves.filter((l) => l.status === "APPROVED").length;
  const rejectedCount = leaves.filter((l) => l.status === "REJECTED").length;

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="page-title">Leave Requests</div>
          <div className="page-subtitle">
            Review and approve leave applications from your team
          </div>
        </div>
        <button
          className="btn-secondary"
          style={{ display: "flex", alignItems: "center", gap: "8px" }}
          onClick={loadLeaves}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px", marginBottom: "24px" }}>
        {[
          { label: "Pending", count: pendingCount, color: "var(--accent-orange)", icon: Clock },
          { label: "Approved", count: approvedCount, color: "var(--accent-green)", icon: Check },
          { label: "Rejected", count: rejectedCount, color: "var(--accent-red)", icon: X },
        ].map(({ label, count, color, icon: Icon }) => (
          <div key={label} className="card" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ width: "44px", height: "44px", borderRadius: "0", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: "26px", fontWeight: 800, color }}>{count}</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card" style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)", fontSize: "12px", fontWeight: 600 }}>
          <Filter size={14} /> FILTER
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input"
          style={{ fontSize: "12.5px", height: "36px", flex: 1, minWidth: "160px" }}
        >
          <option value="ALL">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <input
          type="text"
          value={filterEmployee}
          onChange={(e) => setFilterEmployee(e.target.value)}
          placeholder="Search employee name..."
          className="input"
          style={{ fontSize: "12.5px", height: "36px", flex: 2, minWidth: "200px" }}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="card" style={{ background: "rgba(244,63,94,0.08)", border: "1px solid rgba(244,63,94,0.2)", color: "var(--accent-red)", fontSize: "13px", marginBottom: "16px" }}>
          ⚠ {error}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card skeleton-card" style={{ height: "96px" }} />
          ))}
        </div>
      )}

      {/* Leave List */}
      {!loading && filtered.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: "48px", color: "var(--text-muted)", fontSize: "14px" }}>
          No leave requests found for the selected filter.
        </div>
      )}

      {!loading && filtered.map((leave) => {
        const isLoading = actionLoading === leave.id;
        const isPending = leave.status === "PENDING";
        const startDate = leave.startDate ? new Date(leave.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
        const endDate = leave.endDate ? new Date(leave.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

        return (
          <div key={leave.id} className="card" style={{ marginBottom: "12px", borderLeft: `3px solid ${statusColor(leave.status)}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
              {/* Employee Info */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <CloudinaryImage
                  url={leave.user?.profileImage}
                  placeholder={(leave.user?.name || "?").substring(0, 2).toUpperCase()}
                  alt={leave.user?.name || "Employee Avatar"}
                  width="40px"
                  height="40px"
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--text-primary)" }}>
                    {leave.user?.name || "Unknown Employee"}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                    {leave.user?.employeeId || "—"} • Applied {leave.createdAt ? new Date(leave.createdAt).toLocaleDateString("en-IN") : ""}
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div style={{ padding: "4px 12px", borderRadius: "0", background: `${statusColor(leave.status)}20`, border: `1px solid ${statusColor(leave.status)}40`, color: statusColor(leave.status), fontWeight: 700, fontSize: "11px", textTransform: "uppercase" }}>
                {leave.status}
              </div>
            </div>

            {/* Leave Details Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginTop: "16px" }}>
              <div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>Type</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{leaveTypeLabel(leave.type || "")}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>Duration</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                  <Calendar size={11} style={{ marginRight: "4px", verticalAlign: "middle" }} />{startDate} — {endDate}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>Days</div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent-blue)" }}>{leave.totalDays ?? "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>Reason</div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{leave.reason || "—"}</div>
              </div>
              {leave.approvedBy && (
                <div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>Actioned By</div>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{leave.approvedBy.name}</div>
                </div>
              )}
              {leave.approvalNote && (
                <div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>Note</div>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{leave.approvalNote}</div>
                </div>
              )}
            </div>

            {/* Attachment */}
            {leave.attachmentUrl && (
              <div style={{ marginTop: "12px" }}>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", marginBottom: "6px" }}>Attachment</div>
                <CloudinaryImage
                  url={leave.attachmentUrl}
                  placeholder="No Attachment"
                  alt="Leave Attachment"
                  width="120px"
                  height="120px"
                />
              </div>
            )}

            {/* Approve / Reject Actions — only for PENDING leaves */}
            {isPending && (isAdmin || isManager) && (
              <div style={{ display: "flex", gap: "10px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                <button
                  className="btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--accent-green)", border: "none", padding: "8px 20px", fontSize: "12.5px", opacity: isLoading ? 0.5 : 1 }}
                  onClick={() => openNoteModal(leave.id, "approve")}
                  disabled={isLoading}
                >
                  <Check size={14} /> Approve
                </button>
                <button
                  style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)", color: "var(--accent-red)", padding: "8px 20px", borderRadius: "0", fontSize: "12.5px", cursor: isLoading ? "not-allowed" : "pointer", opacity: isLoading ? 0.5 : 1 }}
                  onClick={() => openNoteModal(leave.id, "reject")}
                  disabled={isLoading}
                >
                  <X size={14} /> Reject
                </button>
                {isLoading && <span style={{ fontSize: "12px", color: "var(--text-muted)", alignSelf: "center" }}>Processing…</span>}
              </div>
            )}
          </div>
        );
      })}

      {/* Note / Reason Modal */}
      {noteModal && (
        <div className="modal-overlay" onClick={() => setNoteModal(null)}>
          <div className="modal-box" style={{ maxWidth: "480px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: "18px", marginBottom: "16px", color: noteModal.type === "approve" ? "var(--accent-green)" : "var(--accent-red)" }}>
              {noteModal.type === "approve" ? "✅ Approve Leave" : "❌ Reject Leave"}
            </div>
            <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
              {noteModal.type === "approve"
                ? "Add an optional note for the employee (leave blank for default)."
                : "Provide a reason for rejection (leave blank for default)."}
            </div>
            <textarea
              className="input"
              rows={3}
              placeholder={noteModal.type === "approve" ? "e.g. Approved. Enjoy your leave." : "e.g. Insufficient leave balance."}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              style={{ width: "100%", resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button
                className="btn-primary"
                style={{ background: noteModal.type === "approve" ? "var(--accent-green)" : "var(--accent-red)", border: "none", flex: 1, justifyContent: "center" }}
                onClick={handleConfirmAction}
              >
                {noteModal.type === "approve" ? "Confirm Approval" : "Confirm Rejection"}
              </button>
              <button className="btn-secondary" onClick={() => setNoteModal(null)} style={{ flex: 1, justifyContent: "center" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px",
          background: toast.success ? "var(--accent-green)" : "var(--accent-red)",
          color: "white", padding: "12px 20px", display: "flex", alignItems: "center", gap: "10px",
          zIndex: 9999, animation: "fadeIn 0.2s ease", border: "1px solid rgba(0,0,0,0.1)"
        }}>
          {toast.success ? <Check size={16} /> : <X size={16} />}
          <span style={{ fontSize: "13px", fontWeight: 600 }}>{toast.msg}</span>
        </div>
      )}
    </div>
  );
}
