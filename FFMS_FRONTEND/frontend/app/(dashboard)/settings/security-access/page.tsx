"use client";

import { useState } from "react";
import { ShieldAlert, Save, Key, Smartphone, Globe, Lock } from "lucide-react";

export default function SecurityAccessPage() {
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    }

    return (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                    <div className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <ShieldAlert size={24} color="var(--accent-blue)" /> Security & Access
                    </div>
                    <div className="page-subtitle">Configure authentication, device policies, and data access limits.</div>
                </div>
                <button onClick={handleSave} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px", fontSize: "13px", background: saved ? "var(--accent-green)" : "var(--accent-blue)", borderColor: saved ? "var(--accent-green)" : "var(--accent-blue)" }}>
                    <Save size={16} /> {saved ? "Saved" : "Save Settings"}
                </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                
                {/* Authentication Policy */}
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "15px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                        <Key size={18} color="var(--accent-blue)" /> Authentication
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                            <input type="checkbox" defaultChecked style={{ width: "16px", height: "16px" }} />
                            <span style={{ fontSize: "13px", fontWeight: 600 }}>Require Two-Factor Authentication (2FA) for Admins</span>
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                            <input type="checkbox" style={{ width: "16px", height: "16px" }} />
                            <span style={{ fontSize: "13px", fontWeight: 600 }}>Require 2FA for Field Executives</span>
                        </label>
                    </div>

                    <div style={{ marginTop: "8px" }}>
                        <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Password Expiration (Days)</label>
                        <select className="input" defaultValue="90" style={{ maxWidth: "200px" }}>
                            <option value="30">30 Days</option>
                            <option value="60">60 Days</option>
                            <option value="90">90 Days</option>
                            <option value="never">Never Expires</option>
                        </select>
                    </div>
                </div>

                {/* Device & Location Policy */}
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "15px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                        <Smartphone size={18} color="var(--accent-blue)" /> Device & Location Restrictions
                    </div>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                            <input type="checkbox" defaultChecked style={{ width: "16px", height: "16px" }} />
                            <span style={{ fontSize: "13px", fontWeight: 600 }}>Enforce Mock Location Prevention</span>
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                            <input type="checkbox" defaultChecked style={{ width: "16px", height: "16px" }} />
                            <span style={{ fontSize: "13px", fontWeight: 600 }}>Require Biometric App Unlock</span>
                        </label>
                         <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                            <input type="checkbox" defaultChecked style={{ width: "16px", height: "16px" }} />
                            <span style={{ fontSize: "13px", fontWeight: 600 }}>Restrict Login to Registered Devices Only</span>
                        </label>
                    </div>
                </div>

                {/* Network Access */}
                 <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "15px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                        <Globe size={18} color="var(--accent-blue)" /> Network Access
                    </div>
                    
                    <div>
                        <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Allowed IP Ranges (Admin Portal)</label>
                        <textarea className="input" rows={3} placeholder="e.g., 192.168.1.0/24 (Leave blank to allow all)" defaultValue="10.0.0.0/8\n172.16.0.0/12"></textarea>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>Restrict dashboard access to specific corporate networks.</p>
                    </div>
                </div>
                
                {/* Data Privacy */}
                 <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "15px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                        <Lock size={18} color="var(--accent-blue)" /> Data Privacy & Retention
                    </div>
                    
                    <div>
                        <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Historical Location Data Retention</label>
                        <select className="input" defaultValue="180">
                            <option value="30">30 Days</option>
                            <option value="90">90 Days</option>
                            <option value="180">180 Days (6 Months)</option>
                            <option value="365">1 Year</option>
                        </select>
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "4px 0 0 0" }}>Old location trails will be automatically purged.</p>
                    </div>
                </div>

            </div>
        </div>
    );
}
