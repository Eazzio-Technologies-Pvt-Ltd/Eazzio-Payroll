"use client";

import { useState, useEffect } from "react";
import { Clock, Plus, Trash2, Pencil, X, Check, RotateCcw } from "lucide-react";
import { shiftApi } from "@/lib/api-client";

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriod: number;
  halfDayThreshold: number;
  breakDuration: number;
  color: string;
}

const DEFAULT_SHIFTS = [
  { name: "General 1", startTime: "09:00", endTime: "18:00", gracePeriod: 15, halfDayThreshold: 4.5, breakDuration: 60, color: "#3b82f6" },
  { name: "General 2", startTime: "10:00", endTime: "19:00", gracePeriod: 15, halfDayThreshold: 4.5, breakDuration: 60, color: "#10b981" },
  { name: "A", startTime: "06:00", endTime: "14:00", gracePeriod: 15, halfDayThreshold: 4.0, breakDuration: 30, color: "#f59e0b" },
  { name: "B", startTime: "14:00", endTime: "22:00", gracePeriod: 15, halfDayThreshold: 4.0, breakDuration: 30, color: "#8b5cf6" },
  { name: "C", startTime: "22:00", endTime: "06:00", gracePeriod: 15, halfDayThreshold: 4.0, breakDuration: 30, color: "#ec4899" },
];

export default function TimingSettingsPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    startTime: "09:00",
    endTime: "18:00",
    gracePeriod: 15,
    halfDayThreshold: 4.5,
    breakDuration: 45,
    color: "#3b82f6",
  });

  const fetchShifts = async () => {
    setIsLoading(true);
    try {
      const res = await shiftApi.list();
      if (res && res.success) {
        setShifts(res.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch shifts:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const handleInitializeDefaults = async () => {
    if (!confirm("This will initialize the 5 standard shifts (General 1, General 2, A, B, C). Proceed?")) return;
    setIsInitializing(true);
    try {
      for (const def of DEFAULT_SHIFTS) {
        await shiftApi.create(def);
      }
      await fetchShifts();
    } catch (err) {
      console.error("Failed to initialize shifts:", err);
      alert("Failed to initialize some shifts.");
    } finally {
      setIsInitializing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shift? Any employee assigned to this shift will default to global settings.")) return;
    try {
      const res = await shiftApi.delete(id);
      if (res && res.success) {
        setShifts(prev => prev.filter(s => s.id !== id));
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete shift.");
    }
  };

  const handleEditClick = (shift: Shift) => {
    setEditId(shift.id);
    setForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      gracePeriod: shift.gracePeriod,
      halfDayThreshold: shift.halfDayThreshold,
      breakDuration: shift.breakDuration,
      color: shift.color || "#3b82f6",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    try {
      // Shift configs saved to backend — used for attendance validation
      if (editId) {
        const res = await shiftApi.update(editId, form);
        if (res && res.success) {
          setShowModal(false);
          setEditId(null);
          fetchShifts();
        }
      } else {
        const res = await shiftApi.create(form);
        if (res && res.success) {
          setShowModal(false);
          fetchShifts();
        }
      }
    } catch (err: any) {
      alert(err.message || "Failed to save shift configuration.");
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const [hoursStr, minutesStr] = timeStr.split(":");
    let hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    return `${hours}:${minutesStr} ${ampm}`;
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "1000px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "10px" }}>
            <Clock size={24} color="var(--accent-blue)" /> Timing & Shift Settings
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "4px" }}>
            Configure working hours, late arrival grace periods, and break durations. Assigned shifts override global defaults.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          {shifts.length === 0 && (
            <button
              className="btn-secondary"
              onClick={handleInitializeDefaults}
              disabled={isInitializing}
              style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px", fontSize: "13px" }}
            >
              <RotateCcw size={16} />
              {isInitializing ? "Initializing..." : "Load Default Shifts"}
            </button>
          )}
          <button
            className="btn-primary"
            style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px", fontSize: "13px" }}
            onClick={() => {
              setEditId(null);
              setForm({
                name: "",
                startTime: "09:00",
                endTime: "18:00",
                gracePeriod: 15,
                halfDayThreshold: 4.5,
                breakDuration: 45,
                color: "#3b82f6",
              });
              setShowModal(true);
            }}
          >
            <Plus size={16} /> Add Custom Shift
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton-card" style={{ height: "180px" }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                borderTop: `4px solid ${shift.color || "var(--accent-blue)"}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--text-primary)" }}>{shift.name}</h3>
                  <span style={{ fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                    <Clock size={12} /> {formatTime(shift.startTime)} — {formatTime(shift.endTime)}
                  </span>
                </div>
                <span className="badge" style={{ backgroundColor: `${shift.color}15`, color: shift.color, border: `1px solid ${shift.color}30` }}>
                  Active Shift
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", background: "var(--bg-hover)", padding: "12px", borderRadius: "6px", border: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Grace Period</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{shift.gracePeriod} mins</div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Break Duration</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{shift.breakDuration} mins</div>
                </div>
                <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--border)", paddingTop: "8px", marginTop: "4px" }}>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Half-Day Min Work</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)" }}>{shift.halfDayThreshold} hours</div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                <button
                  onClick={() => handleEditClick(shift)}
                  style={{ background: "none", border: "none", color: "var(--accent-blue)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12.5px", fontWeight: 600 }}
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  onClick={() => handleDelete(shift.id)}
                  style={{ background: "none", border: "none", color: "var(--accent-red)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12.5px", fontWeight: 600 }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}

          {shifts.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px 24px", color: "var(--text-secondary)", background: "var(--bg-card)", border: "1px dashed var(--border)", borderRadius: "8px" }}>
              <p style={{ margin: "0 0 12px 0", fontSize: "14px" }}>No working shifts configured for this organization.</p>
              <button
                className="btn-secondary"
                onClick={handleInitializeDefaults}
                disabled={isInitializing}
                style={{ margin: "0 auto" }}
              >
                {isInitializing ? "Initializing..." : "Load Default Shifts"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ alignItems: "center", justifyContent: "center" }} onClick={() => setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: "500px", padding: "24px" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontWeight: 700, fontSize: "18px", display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)" }}>
                <Clock size={20} color="var(--accent-blue)" /> {editId ? "Edit Shift Configuration" : "Create New Custom Shift"}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Shift Name *</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. General 1, Morning Shift"
                  value={form.name}
                  onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Start Time *</label>
                  <input
                    type="time"
                    className="input"
                    value={form.startTime}
                    onChange={(e) => setForm(p => ({ ...p, startTime: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>End Time *</label>
                  <input
                    type="time"
                    className="input"
                    value={form.endTime}
                    onChange={(e) => setForm(p => ({ ...p, endTime: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Grace Period (minutes) *</label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    value={form.gracePeriod}
                    onChange={(e) => setForm(p => ({ ...p, gracePeriod: parseInt(e.target.value, 10) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Break Duration (minutes) *</label>
                  <input
                    type="number"
                    className="input"
                    min="0"
                    value={form.breakDuration}
                    onChange={(e) => setForm(p => ({ ...p, breakDuration: parseInt(e.target.value, 10) || 0 }))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "16px", alignItems: "center" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Half-Day Threshold (hours) *</label>
                  <input
                    type="number"
                    className="input"
                    step="0.5"
                    min="0"
                    value={form.halfDayThreshold}
                    onChange={(e) => setForm(p => ({ ...p, halfDayThreshold: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Accent Color</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm(p => ({ ...p, color: c }))}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          backgroundColor: c,
                          border: form.color === c ? "2px solid var(--text-primary)" : "none",
                          cursor: "pointer",
                          padding: 0,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Check size={16} />
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
