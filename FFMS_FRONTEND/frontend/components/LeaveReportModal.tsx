import { useState, useEffect } from "react";
import { X, FileText, CheckCircle, AlertCircle } from "lucide-react";
// Use centralized api-client so Bearer token is included automatically
import request from "@/lib/api-client";

export function LeaveReportModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      try {
        // Correct backend route is /leave/report (not /leaves/report)
        const res = await request<any[]>("GET", "/leave/report");
        setData(res.data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load leave report");
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, []);


  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth: "800px", width: "90%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
            <FileText size={20} color="var(--accent-blue)" />
            Consolidated Leave Report
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>Loading report data...</div>
        ) : error ? (
          <div style={{ padding: "20px", background: "rgba(244,63,94,0.1)", color: "var(--accent-red)", borderRadius: "4px", display: "flex", gap: "8px", alignItems: "center" }}>
            <AlertCircle size={16} />
            {error}
          </div>
        ) : data.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No employee leave data found.</div>
        ) : (
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead style={{ position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 1 }}>
                <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Employee</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Role</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Total Leaves Used</th>
                  <th style={{ padding: "12px 16px", color: "var(--text-secondary)", fontWeight: 600 }}>Balance Details</th>
                </tr>
              </thead>
              <tbody>
                {data.map((user) => (
                  <tr key={user.userId} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600 }}>{user.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>{user.employeeId}</div>
                    </td>
                    <td style={{ padding: "12px 16px", textTransform: "capitalize" }}>
                      {user.role.toLowerCase().replace("_", " ")}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ 
                        fontWeight: 600, 
                        color: user.totalUsed > 10 ? "var(--accent-red)" : "var(--text-primary)" 
                      }}>
                        {user.totalUsed} Days
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {user.balances.filter((b: any) => b.used > 0 || b.type !== "UNPAID").map((b: any) => (
                          <div key={b.type} style={{ fontSize: "11px", padding: "4px 8px", background: "var(--bg-hover)", borderRadius: "4px", border: "1px solid var(--border)" }}>
                            <strong>{b.type}:</strong> {b.used} / {b.allocated > 100 ? "∞" : b.allocated}
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
