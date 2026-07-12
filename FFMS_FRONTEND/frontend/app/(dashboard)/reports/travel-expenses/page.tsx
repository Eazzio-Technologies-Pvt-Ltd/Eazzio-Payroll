"use client";

import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { getStatusColor } from "@/lib/utils";
import {
  Plane,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Wallet,
  User,
  Car,
  Utensils,
  Building2,
  Star
} from "lucide-react";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Food / Meal": <Utensils size={14} />,
  "Travel / Conveyance": <Car size={14} />,
  "Lodging / Hotel": <Building2 size={14} />,
  "Client Entertainment": <Star size={14} />,
  "Other": <Wallet size={14} />,
};

export default function TravelExpensesReportPage() {
  const expenses = useSelector((s: RootState) => s.expenses.list);
  const employees = useSelector((s: RootState) => s.employees.list);

  const [filterEmployee, setFilterEmployee] = useState("All");
  const [filterMonth, setFilterMonth] = useState("All");

  // Months available in data
  const months = useMemo(() => {
    const set = new Set(expenses.map(e => e.expenseDate.slice(0, 7)));
    return ["All", ...Array.from(set).sort()];
  }, [expenses]);

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (filterEmployee !== "All" && e.userName !== filterEmployee) return false;
      if (filterMonth !== "All" && !e.expenseDate.startsWith(filterMonth)) return false;
      return true;
    });
  }, [expenses, filterEmployee, filterMonth]);

  // Per-employee totals
  const perEmployee = useMemo(() => {
    const map: Record<string, { approved: number; pending: number; rejected: number }> = {};
    filtered.forEach(e => {
      if (!map[e.userName]) map[e.userName] = { approved: 0, pending: 0, rejected: 0 };
      if (e.status === "Approved") map[e.userName].approved += e.amount;
      else if (e.status === "Pending Approval by Manager") map[e.userName].pending += e.amount;
      else map[e.userName].rejected += e.amount;
    });
    return Object.entries(map).sort((a, b) => (b[1].approved + b[1].pending) - (a[1].approved + a[1].pending));
  }, [filtered]);

  // Per-category totals
  const perCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(e => {
      map[e.expenseCategory] = (map[e.expenseCategory] || 0) + e.amount;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const grandTotal = filtered.reduce((s, e) => s + e.amount, 0);
  const approvedTotal = filtered.filter(e => e.status === "Approved").reduce((s, e) => s + e.amount, 0);
  const pendingTotal = filtered.filter(e => e.status === "Pending Approval by Manager").reduce((s, e) => s + e.amount, 0);
  const maxCategory = perCategory[0]?.[1] || 1;

  const handleExport = () => {
    const headers = "User Name,Expense Head,Category,Amount,Date,Status\n";
    const rows = filtered.map(e =>
      `"${e.userName}","${e.expenseHead}","${e.expenseCategory}",${e.amount},"${e.expenseDate}","${e.status}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Travel_Expenses_Report_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Plane size={24} color="var(--accent-blue)" /> Travel Expenses Report
          </div>
          <div className="page-subtitle">Consolidated travel, lodging, and dining expense summary across field executives.</div>
        </div>
        <button onClick={handleExport} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px", fontSize: "12.5px", background: "var(--accent-green)", borderColor: "var(--accent-green)" }}>
          <FileSpreadsheet size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="card" style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 180px" }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>EMPLOYEE</label>
          <select className="input" style={{ height: "36px", fontSize: "12.5px" }} value={filterEmployee} onChange={e => setFilterEmployee(e.target.value)}>
            <option value="All">All Employees</option>
            {Array.from(new Set(expenses.map(e => e.userName))).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 180px" }}>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>MONTH</label>
          <select className="input" style={{ height: "36px", fontSize: "12.5px" }} value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
            {months.map(m => <option key={m} value={m}>{m === "All" ? "All Months" : m}</option>)}
          </select>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "40px", height: "40px", background: "rgba(0,82,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wallet size={18} color="var(--accent-blue)" />
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}>₹{grandTotal.toLocaleString("en-IN")}</div>
            <div style={{ fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Grand Total Claims</div>
          </div>
        </div>
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "40px", height: "40px", background: "rgba(16,185,129,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={18} color="var(--accent-green)" />
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}>₹{approvedTotal.toLocaleString("en-IN")}</div>
            <div style={{ fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Approved & Disbursed</div>
          </div>
        </div>
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "40px", height: "40px", background: "rgba(249,115,22,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingDown size={18} color="var(--accent-orange)" />
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}>₹{pendingTotal.toLocaleString("en-IN")}</div>
            <div style={{ fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Pending Disbursement</div>
          </div>
        </div>
        <div className="card" style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <div style={{ width: "40px", height: "40px", background: "rgba(0,82,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <User size={18} color="var(--accent-blue)" />
          </div>
          <div>
            <div style={{ fontSize: "18px", fontWeight: 800, fontFamily: "var(--font-jetbrains), monospace" }}>{filtered.length}</div>
            <div style={{ fontSize: "10.5px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Total Vouchers Filed</div>
          </div>
        </div>
      </div>

      {/* Main 2-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "18px" }}>
        {/* Per-Employee Breakdown */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
            Per-Executive Expense Summary
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {perEmployee.length > 0 ? perEmployee.map(([name, totals]) => {
              const total = totals.approved + totals.pending + totals.rejected;
              const approvedPct = total > 0 ? Math.round((totals.approved / total) * 100) : 0;
              return (
                <div key={name}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "4px" }}>
                    <span style={{ fontWeight: 700 }}>{name}</span>
                    <span style={{ fontFamily: "var(--font-jetbrains), monospace", fontWeight: 700 }}>₹{total.toLocaleString("en-IN")}</span>
                  </div>
                  <div style={{ height: "6px", background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                    <div style={{ height: "100%", display: "flex" }}>
                      <div style={{ width: `${approvedPct}%`, background: "var(--accent-green)" }}></div>
                      <div style={{ width: `${total > 0 ? Math.round((totals.pending / total) * 100) : 0}%`, background: "var(--accent-orange)" }}></div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "12px", fontSize: "10.5px", color: "var(--text-muted)", marginTop: "3px" }}>
                    <span>✅ ₹{totals.approved.toLocaleString("en-IN")} Approved</span>
                    <span>🕐 ₹{totals.pending.toLocaleString("en-IN")} Pending</span>
                  </div>
                </div>
              );
            }) : (
              <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No records match current filters.</p>
            )}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ fontWeight: 700, fontSize: "14px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
            Spending by Category
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {perCategory.map(([cat, amt]) => (
              <div key={cat}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "5px", alignItems: "center" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 600 }}>
                    {CATEGORY_ICONS[cat] || <Wallet size={14} />} {cat}
                  </span>
                  <span style={{ fontFamily: "var(--font-jetbrains), monospace", fontWeight: 700, fontSize: "12.5px" }}>
                    ₹{amt.toLocaleString("en-IN")}
                  </span>
                </div>
                <div style={{ height: "8px", background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                  <div style={{ height: "100%", background: "var(--accent-blue)", width: `${(amt / maxCategory) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Ledger Table */}
      <div className="card" style={{ padding: "16px" }}>
        <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "14px", borderBottom: "1px solid var(--border)", paddingBottom: "10px" }}>
          Full Expense Ledger
        </div>
        <div className="table-wrapper">
          <table style={{ minWidth: "900px" }}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Expense Head</th>
                <th>Category</th>
                <th>Customer</th>
                <th>Date</th>
                <th style={{ textAlign: "right" }}>Amount (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 700, fontSize: "13px" }}>{e.userName}</td>
                  <td style={{ fontSize: "13px" }}>{e.expenseHead}</td>
                  <td><span className="badge" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", fontSize: "11px" }}>{e.expenseCategory}</span></td>
                  <td style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>{e.customer}</td>
                  <td style={{ fontSize: "12px", fontFamily: "var(--font-jetbrains), monospace", color: "var(--text-muted)" }}>{e.expenseDate}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-jetbrains), monospace", fontWeight: 700 }}>₹{e.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                  <td>
                    <span className={`badge ${getStatusColor(e.status === "Approved" ? "present" : e.status === "Rejected" ? "absent" : "pending")}`} style={{ fontSize: "10.5px" }}>
                      {e.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>No records match filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
