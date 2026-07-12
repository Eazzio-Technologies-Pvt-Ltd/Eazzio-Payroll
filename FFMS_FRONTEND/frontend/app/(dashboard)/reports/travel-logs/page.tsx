"use client";

import { useMemo, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { travelApi, ApiTravelLog } from "@/lib/api-client";
import CloudinaryImage from "@/components/common/CloudinaryImage";
import {
  Car,
  FileSpreadsheet,
  Calendar,
  User,
  Image as ImageIcon,
  DollarSign,
  Route,
} from "lucide-react";

export default function TravelLogsReportPage() {
  const employees = useSelector((s: RootState) => s.employees.list);

  const [selectedUser, setSelectedUser] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [travelData, setTravelData] = useState<{
    totalDistanceKm: number;
    allowanceRate: number;
    totalAllowanceAmount: number;
    logs: ApiTravelLog[];
  } | null>(null);

  // Initialize selectedUser with the first field staff or employee if available
  useEffect(() => {
    if (employees && employees.length > 0 && !selectedUser) {
      const firstFieldStaff = employees.find((e) => e.role === "FIELD_STAFF") || employees[0];
      setSelectedUser(firstFieldStaff.id);
    }
  }, [employees, selectedUser]);

  // Set default month to current month
  useEffect(() => {
    if (!selectedMonth) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      setSelectedMonth(`${year}-${month}`);
    }
  }, [selectedMonth]);

  // Fetch travel logs when user or month changes
  useEffect(() => {
    if (!selectedUser || !selectedMonth) return;

    const [yearStr, monthStr] = selectedMonth.split("-");
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);

    setLoading(true);
    setError(null);

    travelApi
      .getLogs({ userId: selectedUser, year, month })
      .then((res) => {
        if (res.success && res.data) {
          setTravelData(res.data);
        } else {
          setError("Failed to load travel data");
        }
      })
      .catch((err) => {
        console.error("Error fetching travel logs:", err);
        setError(err.message || "Failed to load travel data");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedUser, selectedMonth]);

  // Months available for filtering (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      options.push({ value: `${year}-${month}`, label });
    }
    return options;
  }, []);

  const handleExport = () => {
    if (!travelData || !travelData.logs.length) return;
    const employee = employees.find((e) => e.id === selectedUser);
    const employeeName = employee ? employee.name : "Employee";

    const headers = "Date,Meter Start,Meter End,Distance (KM),Allowance Rate (INR/KM),Amount (INR),Notes\n";
    const rows = travelData.logs
      .map((log) => {
        const date = log.date ? new Date(log.date).toISOString().split("T")[0] : "";
        const allowance = log.allowanceAmount || (log.totalDistanceKm * travelData.allowanceRate);
        return `"${date}",${log.meterStart || 0},${log.meterEnd || 0},${log.totalDistanceKm || 0},${travelData.allowanceRate},${allowance},"${log.notes || ""}"`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Travel_Logs_${employeeName.replace(/\s+/g, "_")}_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Car size={24} color="var(--accent-blue)" /> Travel Odometer Logs
          </div>
          <div className="page-subtitle">Track meter logs, verified distance travels, and monthly conveyance allowance.</div>
        </div>
        <button
          onClick={handleExport}
          disabled={!travelData || !travelData.logs.length}
          className="btn-primary"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            height: "36px",
            fontSize: "12.5px",
            background: "var(--accent-green)",
            borderColor: "var(--accent-green)",
            opacity: !travelData || !travelData.logs.length ? 0.6 : 1,
            cursor: !travelData || !travelData.logs.length ? "not-allowed" : "pointer",
          }}
        >
          <FileSpreadsheet size={14} /> Export CSV
        </button>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap", padding: "16px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flex: "1 1 200px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Select Employee</label>
          <div style={{ position: "relative" }}>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
              }}
            >
              <option value="" disabled>Select Employee</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role === "FIELD_STAFF" ? "Field Staff" : emp.role})
                </option>
              ))}
            </select>
            <User size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "220px" }}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)" }}>Select Month</label>
          <div style={{ position: "relative" }}>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                background: "var(--bg-secondary)",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
              }}
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Calendar size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="card skeleton-card" style={{ height: "86px" }} />
            ))}
          </div>
          <div className="card skeleton-card" style={{ height: "300px" }} />
        </div>
      ) : error ? (
        <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--accent-red)" }}>
          {error}
        </div>
      ) : travelData ? (
        <>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "14px" }}>
            <div className="card" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "0", background: "var(--accent-blue)18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Route size={20} color="var(--accent-blue)" />
              </div>
              <div>
                <div style={{ fontSize: "24px", fontWeight: 800 }}>{travelData.totalDistanceKm.toFixed(1)} KM</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Total Distance</div>
              </div>
            </div>

            <div className="card" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "0", background: "var(--accent-green)18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <DollarSign size={20} color="var(--accent-green)" />
              </div>
              <div>
                <div style={{ fontSize: "24px", fontWeight: 800 }}>₹{travelData.allowanceRate.toFixed(2)} / KM</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Allowance Rate</div>
              </div>
            </div>

            <div className="card" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "0", background: "var(--accent-purple)18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <DollarSign size={20} color="var(--accent-purple)" />
              </div>
              <div>
                <div style={{ fontSize: "24px", fontWeight: 800 }}>₹{travelData.totalAllowanceAmount.toFixed(2)}</div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Total Reimbursement</div>
              </div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="card" style={{ padding: "0" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "15px" }}>Log Entries</span>
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 600 }}>{travelData.logs.length} days recorded</span>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Meter Start</th>
                    <th>Meter End</th>
                    <th>Distance (KM)</th>
                    <th>Amount (Reimbursement)</th>
                    <th>Meter Proof</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {travelData.logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                        No travel logs found for this period.
                      </td>
                    </tr>
                  ) : (
                    travelData.logs.map((log) => {
                      const amount = log.allowanceAmount ?? (log.totalDistanceKm * travelData.allowanceRate);
                      return (
                        <tr key={log.id}>
                          <td style={{ fontWeight: 600 }}>
                            {log.date ? new Date(log.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                          </td>
                          <td style={{ fontFamily: "monospace", fontSize: "13px" }}>
                            {log.meterStart != null ? `${log.meterStart} km` : "--"}
                          </td>
                          <td style={{ fontFamily: "monospace", fontSize: "13px" }}>
                            {log.meterEnd != null ? `${log.meterEnd} km` : "--"}
                          </td>
                          <td style={{ fontFamily: "monospace", fontSize: "13px", color: "var(--accent-blue)", fontWeight: 700 }}>
                            {log.totalDistanceKm ? `${log.totalDistanceKm.toFixed(1)} KM` : "0.0 KM"}
                          </td>
                          <td style={{ fontWeight: 700, color: "var(--accent-green)" }}>
                            ₹{amount.toFixed(2)}
                          </td>
                          <td>
                            <CloudinaryImage url={log.proofImageUrl} placeholder="No Proof" alt="Odometer Reading Proof" />
                          </td>
                          <td style={{ fontSize: "12.5px", color: "var(--text-secondary)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.notes || ""}>
                            {log.notes || "--"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          Please select an employee and a month to view travel logs.
        </div>
      )}
    </div>
  );
}
