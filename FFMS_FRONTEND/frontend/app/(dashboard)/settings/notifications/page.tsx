"use client";

import { useState } from "react";
import { 
  Bell, 
  Smartphone, 
  Mail, 
  MapPin, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Briefcase
} from "lucide-react";

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState({
    pushEnabled: true,
    emailEnabled: true,
    taskAssignments: true,
    leaveApprovals: true,
    expenseUpdates: true,
    geofenceAlerts: true,
    periodicPhotos: true,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px", maxWidth: "900px" }}>
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)" }}>Notification Settings</h1>
        <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "4px" }}>
          Configure operational rules for automated alert dispatches and admin email subscriptions.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        
        {/* Delivery Channels */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px", padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-hover)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Bell size={18} color="var(--accent-blue)" />
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Delivery Channels</h2>
          </div>
          
          <div style={{ padding: "0 20px 20px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: "36px", height: "36px", background: "rgba(0,82,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px" }}>
                  <Smartphone size={16} color="var(--accent-blue)" />
                </div>
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Mobile Push Notifications</h3>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>Deliver alerts instantly to field devices.</p>
                </div>
              </div>
              <Toggle enabled={settings.pushEnabled} onChange={() => handleToggle('pushEnabled')} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: "36px", height: "36px", background: "rgba(5,150,105,0.08)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px" }}>
                  <Mail size={16} color="var(--accent-green)" />
                </div>
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Email Notifications</h3>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>Send daily summaries and critical alerts to emails.</p>
                </div>
              </div>
              <Toggle enabled={settings.emailEnabled} onChange={() => handleToggle('emailEnabled')} />
            </div>
          </div>
        </div>

        {/* Operational Alerts */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px", padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-hover)", display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertTriangle size={18} color="var(--accent-red)" />
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Operational Alerts</h2>
          </div>
          
          <div style={{ padding: "0 20px 20px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: "36px", height: "36px", background: "rgba(249,115,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px" }}>
                  <MapPin size={16} color="var(--accent-orange)" />
                </div>
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Geofence Violations</h3>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>Alert managers when field staff leave territories.</p>
                </div>
              </div>
              <Toggle enabled={settings.geofenceAlerts} onChange={() => handleToggle('geofenceAlerts')} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ width: "36px", height: "36px", background: "rgba(139,92,246,0.08)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "4px" }}>
                  <Clock size={16} color="var(--accent-purple)" />
                </div>
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Periodic Status Photos</h3>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>Enforce the 15-minute proof-of-work camera prompts.</p>
                </div>
              </div>
              <Toggle enabled={settings.periodicPhotos} onChange={() => handleToggle('periodicPhotos')} />
            </div>
          </div>
        </div>

        {/* HR & Workflow */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px", padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg-hover)", display: "flex", alignItems: "center", gap: "8px" }}>
            <Briefcase size={18} color="var(--accent-blue)" />
            <h2 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>HR & Workflow Updates</h2>
          </div>
          
          <div style={{ padding: "0 20px 20px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "16px" }}>
            <div style={{ padding: "16px", border: "1px solid var(--border)", background: "var(--bg-hover)", borderRadius: "4px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Task Assignments</h3>
                <Toggle enabled={settings.taskAssignments} onChange={() => handleToggle('taskAssignments')} />
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>Notify staff instantly when a new task is pushed to them.</p>
            </div>

            <div style={{ padding: "16px", border: "1px solid var(--border)", background: "var(--bg-hover)", borderRadius: "4px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Leave Approvals</h3>
                <Toggle enabled={settings.leaveApprovals} onChange={() => handleToggle('leaveApprovals')} />
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>Notify users when manager approves/rejects time off.</p>
            </div>

            <div style={{ padding: "16px", border: "1px solid var(--border)", background: "var(--bg-hover)", borderRadius: "4px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Expense Status</h3>
                <Toggle enabled={settings.expenseUpdates} onChange={() => handleToggle('expenseUpdates')} />
              </div>
              <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0 }}>Updates on reimbursement claim processing.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
        <button className="btn-primary" style={{ padding: "12px 24px" }} onClick={() => alert("Settings saved!")}>
          <CheckCircle size={16} />
          Save Preferences
        </button>
      </div>
    </div>
  );
}

// Simple internal Toggle Component using inline styles
function Toggle({ enabled, onChange }: { enabled: boolean, onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      style={{
        width: "44px",
        height: "24px",
        borderRadius: "12px",
        background: enabled ? "var(--accent-blue)" : "var(--border)",
        border: "none",
        position: "relative",
        cursor: "pointer",
        transition: "background 0.2s ease"
      }}
      role="switch"
      aria-checked={enabled}
    >
      <span
        style={{
          position: "absolute",
          top: "2px",
          left: enabled ? "22px" : "2px",
          width: "20px",
          height: "20px",
          background: "#fff",
          borderRadius: "50%",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transition: "left 0.2s ease"
        }}
      />
    </button>
  );
}
