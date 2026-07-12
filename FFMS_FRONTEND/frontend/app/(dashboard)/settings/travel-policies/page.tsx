"use client";

import { useState } from "react";
import { Plane, Save, Briefcase, Car, Coffee, Info } from "lucide-react";

export default function TravelPoliciesPage() {
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
                        <Plane size={24} color="var(--accent-blue)" /> Travel Policies
                    </div>
                    <div className="page-subtitle">Configure per diem allowances, mileage rates, and expense limits.</div>
                </div>
                <button onClick={handleSave} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px", fontSize: "13px", background: saved ? "var(--accent-green)" : "var(--accent-blue)", borderColor: saved ? "var(--accent-green)" : "var(--accent-blue)" }}>
                    <Save size={16} /> {saved ? "Saved" : "Save Changes"}
                </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "20px" }}>
                
                {/* Mileage Rate */}
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "15px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                        <Car size={18} color="var(--accent-blue)" /> Mileage Reimbursement
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Two-Wheeler Rate (₹/km)</label>
                            <input type="number" className="input" defaultValue={4.5} step={0.5} />
                        </div>
                        <div>
                            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Four-Wheeler Rate (₹/km)</label>
                            <input type="number" className="input" defaultValue={9.0} step={0.5} />
                        </div>
                    </div>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                        <Info size={12} /> These rates are applied automatically to route optimizations.
                    </p>
                </div>

                {/* Per Diem */}
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "15px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                        <Coffee size={18} color="var(--accent-blue)" /> Daily Allowances (Per Diem)
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Metro Cities (₹)</label>
                            <input type="number" className="input" defaultValue={800} step={50} />
                        </div>
                        <div>
                            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Non-Metro Cities (₹)</label>
                            <input type="number" className="input" defaultValue={500} step={50} />
                        </div>
                    </div>
                     <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                        <Info size={12} /> Daily allowances cover meals and incidental expenses.
                    </p>
                </div>

                {/* Lodging Limits */}
                <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "15px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                        <Briefcase size={18} color="var(--accent-blue)" /> Lodging Limits (Per Night)
                    </div>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                        <div>
                            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Field Executive (₹)</label>
                            <input type="number" className="input" defaultValue={1500} step={100} />
                        </div>
                        <div>
                            <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>Manager (₹)</label>
                            <input type="number" className="input" defaultValue={3000} step={100} />
                        </div>
                    </div>
                     <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
                        <Info size={12} /> Expenses exceeding limits will be flagged in Expense Audits.
                    </p>
                </div>

            </div>
        </div>
    );
}
