"use client";

import { useEffect, useState } from "react";
import { fetchClient } from "@/lib/fetch-client";
import { 
  TrendingUp, 
  Wallet, 
  AlertTriangle, 
  CheckCircle2, 
  Award,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  HelpCircle
} from "lucide-react";

export default function ExpenseAuditsPage() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    async function loadSummary() {
      try {
        const res = await fetchClient(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"}/expenses/summary`
        );
        const json = await res.json();
        setSummary(json.data);
      } catch (err) {
        console.error("Failed to load expense summary", err);
      }
    }
    loadSummary();
  }, []);

  if (!summary) return (
    <div style={{ padding: "24px" }}>
      <div className="skeleton-line" style={{ width: "250px", height: "32px", marginBottom: "8px" }} />
      <div className="skeleton-line" style={{ width: "200px", height: "16px", marginBottom: "32px" }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "30px" }}>
        {[1,2,3].map(i => <div key={i} className="card skeleton-card" style={{ height: "120px" }} />)}
      </div>
      <div className="card skeleton-card" style={{ height: "400px" }} />
    </div>
  );

  const {
    totalClaims,
    approvedClaims,
    pendingClaims,
    totalExpenseBurn,
    pendingSum,
    categorySums
  } = summary;

  const topCategory = categorySums && categorySums.length > 0 
    ? [...categorySums].sort((a: any, b: any) => b.amount - a.amount)[0] 
    : { name: "None", amount: 0 };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Page Header */}
      <div>
        <div className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Wallet size={24} color="var(--accent-blue)" /> Executive Expense Audits
        </div>
        <div className="page-subtitle">Historical billing compliance, categorical budget spending ratios, and audit logs.</div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
        
        {/* KPI 1: Total approved burn */}
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "42px", height: "42px", background: "rgba(16,185,129,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle2 size={18} color="var(--accent-green)" />
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}>
              ₹{totalExpenseBurn.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Approved Spends</div>
          </div>
        </div>

        {/* KPI 2: Total pending burn */}
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "42px", height: "42px", background: "rgba(249,115,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={18} color="var(--accent-orange)" />
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}>
              ₹{pendingSum.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pending Claim Review</div>
          </div>
        </div>

        {/* KPI 3: Claims ratio */}
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "42px", height: "42px", background: "rgba(0,82,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Layers size={18} color="var(--accent-blue)" />
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}>
              {approvedClaims} / {totalClaims}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Approved Claims Ratio</div>
          </div>
        </div>

        {/* KPI 4: Top Spending Cat */}
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "42px", height: "42px", background: "rgba(244,63,94,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={18} color="var(--accent-red)" />
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 800, letterSpacing: "-0.02em" }}>{topCategory?.name || "None"}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Primary Spends Account</div>
          </div>
        </div>

      </div>

      {/* Main Breakdown Area */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.6fr", gap: "20px" }}>
        
        {/* Left Card: Spending Breakdown Meter */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
            <span style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
              <Layers size={16} color="var(--accent-blue)" /> Budget Spends Breakdown
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {categorySums.map((cat: { name: string; amount: number }) => {
              const percentage = totalExpenseBurn + pendingSum > 0 
                ? Math.round((cat.amount / (totalExpenseBurn + pendingSum)) * 100) 
                : 0;

              return (
                <div key={cat.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 600 }}>{cat.name}</span>
                    <span style={{ fontFamily: "var(--font-jetbrains), monospace", fontWeight: 700 }}>
                      ₹{cat.amount.toLocaleString("en-IN")} ({percentage}%)
                    </span>
                  </div>
                  <div style={{ height: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border)", width: "100%" }}>
                    <div style={{ height: "100%", background: "var(--accent-blue)", width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Card: Audit & Compliance Alerts */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
            <span style={{ fontWeight: 700, fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
              <ShieldAlert size={16} color="var(--accent-red)" /> Billing Compliance Flagged
            </span>
            <span className="badge badge-red" style={{ fontSize: "9px" }}>Anomaly Warnings</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            
            {/* Anomaly 1 */}
            <div style={{ padding: "12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700, color: "var(--accent-red)" }}>
                <span>🚨 Weekend Hotel Checkout</span>
                <span>₹8,500.00</span>
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0 }}>
                <strong>Voucher exp-3 (Ananya Roy)</strong> contains a weekend checkout charge. Flagged for review to ensure it aligns with schedule policies.
              </p>
            </div>

            {/* Anomaly 2 */}
            <div style={{ padding: "12px", background: "var(--bg-secondary)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 700, color: "var(--accent-orange)" }}>
                <span>⚠️ High Client Dining Fuel ratio</span>
                <span>₹4,500.00</span>
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-secondary)", margin: 0 }}>
                <strong>Voucher exp-1 (Rahul Sharma)</strong> Taj dining claim exceeds usual per-day hospitality caps. Flagged for manager comments.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
