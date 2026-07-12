"use client";
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { fetchEmployees, Employee, updateEmployeeThunk } from "@/store/slices/employeeSlice";
import { UserX, RefreshCw } from "lucide-react";

export default function InactivePersonsPage() {
  const dispatch = useDispatch<AppDispatch>();
  const employees = useSelector((s: RootState) => s.employees.list);
  const loading = useSelector((s: RootState) => s.employees.loading);

  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);

  const inactiveEmployees = employees.filter((e: Employee) => e.status === "inactive");

  const handleRestore = async (emp: Employee) => {
    if (confirm(`Are you sure you want to restore ${emp.name} to active status?`)) {
      try {
        await dispatch(updateEmployeeThunk({ id: emp.id, data: { status: "ACTIVE" } })).unwrap();
        alert(`${emp.name} restored successfully.`);
      } catch (err) {
        alert("Failed to restore employee");
      }
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <UserX size={24} color="var(--accent-red)" />
            Inactive Persons
          </h1>
          <p className="page-subtitle">History and data of deleted or deactivated employees.</p>
        </div>
      </div>

      <div className="table-wrapper">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-hover)", borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "16px", textAlign: "left", fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)" }}>Name</th>
              <th style={{ padding: "16px", textAlign: "left", fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)" }}>Employee ID</th>
              <th style={{ padding: "16px", textAlign: "left", fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)" }}>Role</th>
              <th style={{ padding: "16px", textAlign: "left", fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)" }}>Location</th>
              <th style={{ padding: "16px", textAlign: "right", fontSize: "13px", fontWeight: 700, color: "var(--text-secondary)" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "var(--text-muted)" }}>Loading...</td>
              </tr>
            ) : inactiveEmployees.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                  No inactive persons found.
                </td>
              </tr>
            ) : (
              inactiveEmployees.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "16px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 700, color: "var(--text-secondary)" }}>
                      {emp.avatar || "U"}
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>{emp.name}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>{emp.email}</div>
                    </div>
                  </td>
                  <td style={{ padding: "16px", fontSize: "13px", color: "var(--text-secondary)" }}>{emp.employeeId}</td>
                  <td style={{ padding: "16px", fontSize: "13px", color: "var(--text-secondary)" }}>{emp.role}</td>
                  <td style={{ padding: "16px", fontSize: "13px", color: "var(--text-secondary)" }}>{emp.territory || "Unassigned"}</td>
                  <td style={{ padding: "16px", textAlign: "right" }}>
                    <button 
                      onClick={() => handleRestore(emp)}
                      style={{ background: "rgba(48, 117, 228, 0.1)", border: "1px solid rgba(48, 117, 228, 0.2)", color: "var(--accent-blue)", padding: "6px 12px", borderRadius: "0", fontSize: "12px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      <RefreshCw size={14} /> Restore
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
