"use client";

import { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { addNotification } from "@/store/slices/notificationSlice";
import { leaveApi, feedbackApi } from "@/lib/api-client";
import {
  FileText,
  MessageSquarePlus,
  Star,
  Send,
  CheckCircle2,
  ClipboardList,
  X,
  AlertCircle,
  Pencil,
  Smartphone
} from "lucide-react";

interface LeaveForm {
  id: string;
  employeeName: string;
  leaveType: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: "Submitted" | "Approved" | "Rejected";
  submittedOn: string;
}

interface FeedbackRecord {
  id: string;
  submittedBy: string;
  category: string;
  rating: number;
  message: string;
  submittedOn: string;
  anonymous: boolean;
  source?: "web" | "mobile";
}

const LEAVE_TYPES = ["Casual Leave", "Sick Leave", "Emergency Leave", "Earned Leave", "Comp-Off"];
const FEEDBACK_CATEGORIES = ["Work Environment", "Management", "Tools & Processes", "Team Collaboration", "Training & Development", "Other"];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "2px",
            color: star <= (hover || value) ? "#F59E0B" : "var(--border)",
            fontSize: "22px",
            transition: "color 0.1s ease"
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function FormsPage() {
  const dispatch = useDispatch();
  const employees = useSelector((s: RootState) => s.employees.list);
  const currentUser = useSelector((s: RootState) => s.auth.user);
  const currentName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : "Admin";

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Leave Applications state
  const [leaveForms, setLeaveForms] = useState<any[]>([]);

  // Leave form modal state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employeeName: employees[0]?.name || currentName,
    leaveType: LEAVE_TYPES[0],
    fromDate: "",
    toDate: "",
    reason: ""
  });

  // Feedback state
  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>([]);

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    employeeName: employees[0]?.name || currentName,
    category: FEEDBACK_CATEGORIES[0],
    rating: 0,
    message: "",
    anonymous: false
  });

  // Active tab: "forms" | "feedback"
  const [activeTab, setActiveTab] = useState<"forms" | "feedback">("forms");

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const fetchLeaves = useCallback(async () => {
    try {
      const isAdmin = currentUser?.role === "ADMIN";
      const isManager = currentUser?.role === "MANAGER";
      
      let res;
      if (isAdmin) {
        res = await leaveApi.getAll();
      } else if (isManager) {
        res = await leaveApi.getTeam();
      } else {
        res = await leaveApi.getMy();
      }

      if (res && (res as any).data) {
        const data = (res as any).data;
        const backendLeaves = Array.isArray(data) ? data : (data?.leaves ?? []);
        const mappedLeaves = backendLeaves.map((lf: any) => ({
          id: lf.id,
          employeeName: lf.user?.name || "Field Staff",
          leaveType: lf.type === "SICK" ? "Sick Leave" : lf.type === "CASUAL" ? "Casual Leave" : lf.type === "EARNED" ? "Earned Leave" : lf.type === "UNPAID" ? "Unpaid Leave" : "Other Leave",
          fromDate: lf.startDate ? lf.startDate.split("T")[0] : "",
          toDate: lf.endDate ? lf.endDate.split("T")[0] : "",
          reason: lf.reason || "N/A",
          submittedOn: lf.createdAt ? lf.createdAt.split("T")[0] : "",
          status: lf.status === "PENDING" ? "Submitted" : lf.status === "APPROVED" ? "Approved" : "Rejected",
          attachmentUrl: lf.attachmentUrl || null
        }));
        setLeaveForms(mappedLeaves);
      }
    } catch (err) {
      console.error("Failed to fetch leaves:", err);
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === "forms") {
      fetchLeaves();
    } else if (activeTab === "feedback") {
      fetchFeedback();
    }
  }, [activeTab, fetchLeaves]);

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await feedbackApi.getAll();
      if (res && res.data && res.data.feedbacks) {
        const mappedFeedbacks = res.data.feedbacks.map((fb: any) => {
          let cat = fb.category.replace(/_/g, " ");
          cat = cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
          return {
            id: fb.id,
            submittedBy: "Anonymous",
            category: cat,
            rating: fb.rating || 0,
            message: fb.content,
            submittedOn: fb.createdAt ? fb.createdAt.split("T")[0] : "",
            anonymous: true,
            source: "web" as const,
          };
        });
        setFeedbackList(mappedFeedbacks);
      }
    } catch (err) {
      console.error("Failed to fetch feedback:", err);
    }
  }, []);

  // Submit leave application
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason.trim()) {
      alert("Please fill all required fields.");
      return;
    }

    try {
      const leaveTypeMap: Record<string, string> = {
        "Casual Leave": "CASUAL",
        "Sick Leave": "SICK",
        "Earned Leave": "EARNED",
        "Emergency Leave": "OTHER",
        "Comp-Off": "OTHER"
      };
      const dbType = leaveTypeMap[leaveForm.leaveType] || "OTHER";
      await leaveApi.create({
        type: dbType as any,
        startDate: leaveForm.fromDate,
        endDate: leaveForm.toDate,
        reason: leaveForm.reason
      });

      // Push to notification centre
      dispatch(addNotification({
        employeeId: "admin",
        employeeName: leaveForm.employeeName,
        avatar: leaveForm.employeeName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2),
        type: "alert",
        message: `Leave Application: ${leaveForm.employeeName} applied for ${leaveForm.leaveType} from ${leaveForm.fromDate} to ${leaveForm.toDate}. Reason: ${leaveForm.reason}`,
        priority: "normal"
      }));

      setShowLeaveModal(false);
      setLeaveForm({ employeeName: employees[0]?.name || currentName, leaveType: LEAVE_TYPES[0], fromDate: "", toDate: "", reason: "" });
      showToast("Leave application submitted successfully!");
      fetchLeaves();
    } catch (err: any) {
      alert(err.message || "Failed to submit leave application.");
    }
  };

  // Approve / Reject leave
  const handleLeaveAction = async (id: string, action: "Approved" | "Rejected") => {
    try {
      if (action === "Approved") {
        await leaveApi.approve(id, "Approved by Admin");
      } else {
        await leaveApi.reject(id, "Rejected by Admin");
      }
      showToast(`Leave application ${action.toLowerCase()}.`);
      fetchLeaves();
    } catch (err: any) {
      alert(err.message || "Failed to update leave status.");
    }
  };

  // Submit feedback
  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbackForm.rating === 0) {
      alert("Please provide a star rating.");
      return;
    }
    if (!feedbackForm.message.trim()) {
      alert("Please write your feedback message.");
      return;
    }

    try {
      const catMap: Record<string, string> = {
        "Work Environment": "WORK_ENVIRONMENT",
        "Management": "MANAGEMENT",
        "Tools & Processes": "TOOLS_AND_EQUIPMENT",
        "Team Collaboration": "OTHER",
        "Training & Development": "OTHER",
        "Other": "OTHER"
      };
      
      const dbCategory = catMap[feedbackForm.category] || "OTHER";

      await feedbackApi.submit({
        organizationId: (currentUser as any)?.organizationId || "",
        category: dbCategory,
        content: feedbackForm.message,
        rating: feedbackForm.rating
      });

      setShowFeedbackModal(false);
      setFeedbackForm({ employeeName: employees[0]?.name || currentName, category: FEEDBACK_CATEGORIES[0], rating: 0, message: "", anonymous: false });
      showToast("Thank you! Your feedback has been recorded.");
      
      if (activeTab === "feedback") {
        fetchFeedback();
      }
    } catch (err: any) {
      alert(err.message || "Failed to submit feedback.");
    }
  };

  const tabStyle = (tab: "forms" | "feedback") => ({
    padding: "10px 24px",
    background: activeTab === tab ? "var(--accent-blue)" : "transparent",
    color: activeTab === tab ? "white" : "var(--text-secondary)",
    border: "none",
    fontWeight: 800 as const,
    fontSize: "13.5px",
    fontFamily: "var(--font-jetbrains), monospace",
    cursor: "pointer" as const,
    transition: "all 0.15s ease"
  });

  const statusBadge = (status: LeaveForm["status"]) => {
    if (status === "Approved") return "badge-green";
    if (status === "Rejected") return "badge-red";
    return "badge-orange";
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Page Header */}
      <div>
        <div className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <FileText size={24} color="var(--accent-blue)" /> Forms & Feedback Centre
        </div>
        <div className="page-subtitle">Submit leave applications, field requests, and share anonymous or open feedback with management.</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
        <button onClick={() => setActiveTab("forms")} style={tabStyle("forms")}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ClipboardList size={14} /> Leave Applications
          </span>
        </button>
        <button onClick={() => setActiveTab("feedback")} style={tabStyle("feedback")}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <MessageSquarePlus size={14} /> Employee Feedback
          </span>
        </button>
      </div>

      {/* ─────────────── FORMS TAB ─────────────── */}
      {activeTab === "forms" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Action bar */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px", fontSize: "12.5px" }}
              onClick={() => setShowLeaveModal(true)}
            >
              <Pencil size={14} /> Apply for Leave
            </button>
          </div>

          {/* Leave List */}
          <div className="card" style={{ padding: "16px" }}>
            <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "14px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
              Leave Applications Log
            </div>
            <div className="table-wrapper">
              <table style={{ minWidth: "800px" }}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>From Date</th>
                    <th>To Date</th>
                    <th>Reason</th>
                    <th>Attachment</th>
                    <th>Submitted On</th>
                    <th>Status</th>
                    <th style={{ textAlign: "center" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaveForms.map(lf => (
                    <tr key={lf.id}>
                      <td style={{ fontWeight: 700, fontSize: "13px" }}>{lf.employeeName}</td>
                      <td>
                        <span className="badge" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", fontSize: "11px" }}>
                          {lf.leaveType}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: "12px" }}>{lf.fromDate}</td>
                      <td style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: "12px" }}>{lf.toDate}</td>
                      <td style={{ fontSize: "12px", color: "var(--text-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={lf.reason}>
                        {lf.reason}
                      </td>
                      <td>
                        {lf.attachmentUrl ? (
                          <a 
                            href={lf.attachmentUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ 
                              color: "var(--accent-blue)", 
                              textDecoration: "underline", 
                              fontWeight: 600,
                              fontSize: "12px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <FileText size={12} /> View File
                          </a>
                        ) : (
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>None</span>
                        )}
                      </td>
                      <td style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: "12px", color: "var(--text-muted)" }}>{lf.submittedOn}</td>
                      <td>
                        <span className={`badge ${statusBadge(lf.status)}`} style={{ fontSize: "10.5px" }}>
                          {lf.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {lf.status === "Submitted" ? (
                          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                            <button
                              onClick={() => handleLeaveAction(lf.id, "Approved")}
                              className="btn-primary"
                              style={{ padding: "3px 8px", height: "24px", fontSize: "11px", background: "var(--accent-green)", borderColor: "var(--accent-green)" }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleLeaveAction(lf.id, "Rejected")}
                              className="btn-primary"
                              style={{ padding: "3px 8px", height: "24px", fontSize: "11px", background: "var(--accent-red)", borderColor: "var(--accent-red)" }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {leaveForms.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>No applications filed yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────── FEEDBACK TAB ─────────────── */}
      {activeTab === "feedback" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Info panel */}
          <div style={{ padding: "14px", background: "rgba(0,82,255,0.02)", border: "1px solid rgba(0,82,255,0.1)", display: "flex", gap: "12px", alignItems: "center" }}>
            <AlertCircle size={18} color="var(--accent-blue)" />
            <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: 0 }}>
              Feedback is reviewed only by senior management. You may submit anonymously. All submissions are logged securely.
            </p>
          </div>

          {/* Action bar */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              className="btn-primary"
              style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px", fontSize: "12.5px" }}
              onClick={() => setShowFeedbackModal(true)}
            >
              <MessageSquarePlus size={14} /> Share Feedback
            </button>
          </div>

          {/* Feedback Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
            {feedbackList.map(fb => (
              <div key={fb.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "13.5px", display: "flex", alignItems: "center", gap: "6px" }}>
                      {fb.anonymous ? (
                        <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Anonymous</span>
                      ) : fb.submittedBy}
                      {fb.source === "mobile" && (
                        <span 
                          title="Submitted via Mobile App" 
                          style={{ 
                            display: "inline-flex", 
                            alignItems: "center", 
                            gap: "3.5px", 
                            background: "rgba(34, 197, 94, 0.08)", 
                            border: "1px solid rgba(34, 197, 94, 0.25)",
                            color: "#16a34a", 
                            fontSize: "10px", 
                            fontWeight: 700, 
                            padding: "2px 6px",
                            borderRadius: "0px",
                            fontFamily: "var(--font-jetbrains), monospace"
                          }}
                        >
                          <Smartphone size={10} /> Mobile
                        </span>
                      )}
                    </div>
                    <span className="badge" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", fontSize: "10.5px", marginTop: "4px", display: "inline-block" }}>
                      {fb.category}
                    </span>
                  </div>
                  <div style={{ color: "#F59E0B", fontSize: "16px", letterSpacing: "1px" }}>
                    {"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}
                  </div>
                </div>

                <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.6, background: "var(--bg-secondary)", padding: "10px", border: "1px solid var(--border)" }}>
                  "{fb.message}"
                </p>

                <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-jetbrains), monospace", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
                  Submitted: {fb.submittedOn}
                </div>
              </div>
            ))}
            {feedbackList.length === 0 && (
              <div className="card" style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                No feedback submitted yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Leave Application Modal ─── */}
      {showLeaveModal && (
        <div className="modal-overlay" onClick={() => setShowLeaveModal(false)}>
          <div className="modal-box" style={{ maxWidth: "480px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ fontWeight: 700, fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <ClipboardList size={18} color="var(--accent-blue)" /> Leave Application
              </h3>
              <button onClick={() => setShowLeaveModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Employee Name</label>
                <select className="input" value={leaveForm.employeeName} onChange={e => setLeaveForm(p => ({ ...p, employeeName: e.target.value }))}>
                  {mounted && employees.map((emp: any) => <option key={emp.id} value={emp.name}>{emp.name}</option>)}
                  {mounted && <option value={currentName}>{currentName} (You / Admin)</option>}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Leave Type</label>
                <select className="input" value={leaveForm.leaveType} onChange={e => setLeaveForm(p => ({ ...p, leaveType: e.target.value }))}>
                  {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>From Date *</label>
                  <input type="date" className="input" value={leaveForm.fromDate} onChange={e => setLeaveForm(p => ({ ...p, fromDate: e.target.value }))} required />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>To Date *</label>
                  <input type="date" className="input" value={leaveForm.toDate} onChange={e => setLeaveForm(p => ({ ...p, toDate: e.target.value }))} required />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Reason for Leave *</label>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Brief reason for leave..."
                  value={leaveForm.reason}
                  onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))}
                  required
                  style={{ resize: "vertical" }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Send size={14} /> Submit Application
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Feedback Modal ─── */}
      {showFeedbackModal && (
        <div className="modal-overlay" onClick={() => setShowFeedbackModal(false)}>
          <div className="modal-box" style={{ maxWidth: "480px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <h3 style={{ fontWeight: 700, fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Star size={18} color="#F59E0B" /> Share Your Feedback
              </h3>
              <button onClick={() => setShowFeedbackModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFeedbackSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Employee Name selector — hidden when anonymous */}
              {!feedbackForm.anonymous && (
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Employee Name</label>
                  <select
                    className="input"
                    value={feedbackForm.employeeName}
                    onChange={e => setFeedbackForm(p => ({ ...p, employeeName: e.target.value }))}
                  >
                    {mounted && <option value={currentName}>{currentName} (Admin)</option>}
                    {mounted && employees.map((emp: any) => (
                      <option key={emp.id} value={emp.name}>{emp.name} — {emp.role}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Feedback Category</label>
                <select className="input" value={feedbackForm.category} onChange={e => setFeedbackForm(p => ({ ...p, category: e.target.value }))}>
                  {FEEDBACK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>Your Rating *</label>
                <StarRating value={feedbackForm.rating} onChange={v => setFeedbackForm(p => ({ ...p, rating: v }))} />
              </div>

              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Your Message *</label>
                <textarea
                  className="input"
                  rows={4}
                  placeholder="Share your thoughts, suggestions, or concerns..."
                  value={feedbackForm.message}
                  onChange={e => setFeedbackForm(p => ({ ...p, message: e.target.value }))}
                  required
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* Anonymous toggle */}
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", padding: "10px", background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <input
                  type="checkbox"
                  checked={feedbackForm.anonymous}
                  onChange={e => setFeedbackForm(p => ({ ...p, anonymous: e.target.checked }))}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <div>
                  <div style={{ fontSize: "12.5px", fontWeight: 700 }}>Submit Anonymously</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Your name will not be shown in the feedback record.</div>
                </div>
              </label>

              <button type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Send size={14} /> Submit Feedback
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px",
          background: "var(--accent-green)", color: "white",
          padding: "12px 20px", display: "flex", alignItems: "center", gap: "10px",
          zIndex: 9999, animation: "fadeIn 0.2s ease", border: "1px solid rgba(0,0,0,0.1)"
        }}>
          <CheckCircle2 size={16} />
          <span style={{ fontSize: "13px", fontWeight: 600 }}>{toast}</span>
        </div>
      )}
    </div>
  );
}
