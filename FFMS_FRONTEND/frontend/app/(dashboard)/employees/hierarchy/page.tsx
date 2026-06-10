"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { ChevronRight, ChevronDown, Search, User, ArrowUpRight } from "lucide-react";
import { Employee } from "@/store/slices/employeeSlice";

export default function MyTeamHierarchyPage() {
  const profile = useSelector((s: RootState) => s.auth.user);
  const employees = useSelector((s: RootState) => s.employees?.list || []);
  const loading = useSelector((s: RootState) => s.employees?.loading || false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  // Very basic matching for search
  const filteredEmployees = employees.filter((emp: Employee) => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading && employees.length === 0) {
    return (
      <div style={{ padding: "30px", background: "#fff", minHeight: "100vh" }}>
        <div className="skeleton-box" style={{ width: "200px", height: "30px", marginBottom: "20px" }} />
        <div className="skeleton-box" style={{ width: "100%", height: "40px", marginBottom: "20px" }} />
        <div className="skeleton-box" style={{ width: "100%", height: "200px" }} />
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", minHeight: "100vh", fontFamily: "'Inter', sans-serif", padding: "0 24px" }}>
      
      {/* Top Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", padding: "20px 0 16px" }}>
        <div>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 500, marginBottom: "4px" }}>Team /</div>
          <h1 style={{ fontSize: "24px", color: "#0ea5e9", fontWeight: 400, margin: 0 }}>My Team</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "#64748b", fontSize: "14px" }}>
          <span>Hello, {profile?.firstName || "Admin"}</span>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "1px solid #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <User size={18} color="#94a3b8" />
          </div>
          <ChevronDown size={14} />
        </div>
      </header>

      {/* Search Bar Row */}
      <div style={{ padding: "24px 0 20px", display: "flex", gap: "12px", alignItems: "center" }}>
        <div style={{ position: "relative", width: "300px" }}>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name..."
            style={{ 
              width: "100%", padding: "8px 36px 8px 12px", borderRadius: "4px", 
              border: "1px solid #cbd5e1", fontSize: "14px", outline: "none", color: "#334155"
            }}
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm("")}
              style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer", display: "flex", padding: 0 }}
            >
              ×
            </button>
          )}
        </div>
        <button style={{ 
          background: "#0ea5e9", color: "#fff", border: "none", width: "36px", height: "36px", 
          borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
        }}>
          <Search size={16} />
        </button>
      </div>

      {/* Summary Metrics Bar */}
      <div style={{ 
        display: "flex", alignItems: "center", padding: "16px 0", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0",
        gap: "24px", flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", color: "#64748b" }}>Punched-In</span>
          <span style={{ fontSize: "24px", color: "#0ea5e9" }}>0 / {employees.length}</span>
        </div>
        <div style={{ width: "1px", height: "30px", background: "#e2e8f0" }} />
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", color: "#64748b" }}>In Office</span>
          <span style={{ fontSize: "24px", color: "#0ea5e9" }}>0</span>
        </div>
        <div style={{ width: "1px", height: "30px", background: "#e2e8f0" }} />
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", color: "#64748b" }}>On Field</span>
          <span style={{ fontSize: "24px", color: "#0ea5e9" }}>0</span>
        </div>
        <div style={{ width: "1px", height: "30px", background: "#e2e8f0" }} />
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", color: "#64748b" }}>In Transit</span>
          <span style={{ fontSize: "24px", color: "#0ea5e9" }}>0</span>
        </div>
        <div style={{ width: "1px", height: "30px", background: "#e2e8f0" }} />
        
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px", color: "#64748b" }}>In Meeting</span>
          <span style={{ fontSize: "24px", color: "#0ea5e9" }}>0</span>
        </div>
        <div style={{ width: "1px", height: "30px", background: "#e2e8f0" }} />
        
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "auto" }}>
          <span style={{ fontSize: "14px", color: "#64748b" }}>Top Performer</span>
          <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "1px solid #93c5fd", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <User size={14} color="#60a5fa" />
          </div>
          <span style={{ fontSize: "14px", color: "#64748b" }}>- Productivity <span style={{ fontSize: "24px", color: "#0ea5e9", marginLeft: "4px" }}>0%</span></span>
        </div>
      </div>

      {/* Data Table */}
      <div style={{ marginTop: "24px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ textAlign: "left", padding: "16px 12px", fontSize: "13px", fontWeight: 600, color: "#475569" }}>Name</th>
              <th style={{ textAlign: "left", padding: "16px 12px", fontSize: "13px", fontWeight: 600, color: "#475569" }}>Location</th>
              <th style={{ textAlign: "left", padding: "16px 12px", fontSize: "13px", fontWeight: 600, color: "#475569" }}>Status</th>
              <th style={{ textAlign: "left", padding: "16px 12px", fontSize: "13px", fontWeight: 600, color: "#475569" }}>Punched-in</th>
              <th style={{ textAlign: "center", padding: "16px 12px", fontSize: "13px", fontWeight: 600, color: "#475569" }}>Productivity</th>
              <th style={{ textAlign: "center", padding: "16px 12px", fontSize: "13px", fontWeight: 600, color: "#475569" }}>Activities</th>
              <th style={{ textAlign: "left", padding: "16px 12px", fontSize: "13px", fontWeight: 600, color: "#475569" }}>Work</th>
              <th style={{ textAlign: "left", padding: "16px 12px", fontSize: "13px", fontWeight: 600, color: "#475569" }}>Travel</th>
              <th style={{ width: "40px" }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length > 0 ? filteredEmployees.map((emp: Employee) => {
              const isExpanded = !!expandedRows[emp.id];
              return (
                <tr key={emp.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.2s" }} onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "16px 12px", display: "flex", alignItems: "center", gap: "12px" }}>
                    <button 
                      onClick={() => toggleRow(emp.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#0ea5e9", display: "flex", padding: 0 }}
                    >
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#e0f2fe", border: "1px solid #bae6fd", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <User size={16} color="#38bdf8" />
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", color: "#334155", fontWeight: 400 }}>{emp.name}</div>
                      <div style={{ fontSize: "11px", color: "#94a3b8", display: isExpanded ? "block" : "none", marginTop: "4px" }}>
                        {emp.role} • {emp.email}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px 12px", fontSize: "13px", color: "#64748b" }}>{emp.territory || "Head Office"}</td>
                  <td style={{ padding: "16px 12px", fontSize: "13px", color: "#64748b" }}>
                    {emp.status === "active" ? "Not Punched In" : "Inactive"}
                  </td>
                  <td style={{ padding: "16px 12px", fontSize: "13px", color: "#64748b" }}>-</td>
                  <td style={{ padding: "16px 12px", textAlign: "center" }}>
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "40px", height: "24px", borderRadius: "12px", border: "1px solid #cbd5e1", fontSize: "12px", color: "#64748b" }}>
                      0
                    </div>
                  </td>
                  <td style={{ padding: "16px 12px", textAlign: "center", fontSize: "13px", color: "#64748b" }}>0</td>
                  <td style={{ padding: "16px 12px", fontSize: "13px", color: "#64748b" }}>0:00 hrs</td>
                  <td style={{ padding: "16px 12px", fontSize: "13px", color: "#64748b" }}>0 km</td>
                  <td style={{ padding: "16px 12px", textAlign: "right" }}>
                    <ArrowUpRight size={16} color="#0ea5e9" style={{ cursor: "pointer" }} />
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#94a3b8", fontSize: "14px" }}>
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination / Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 12px", color: "#64748b", fontSize: "13px", borderTop: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <span>{filteredEmployees.length} item{filteredEmployees.length !== 1 ? 's' : ''} found</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <select style={{ border: "1px solid #cbd5e1", borderRadius: "4px", padding: "4px 8px", outline: "none", color: "#475569" }}>
              <option>20</option>
              <option>50</option>
              <option>100</option>
            </select>
          </div>
          <span>1 - {filteredEmployees.length} of {filteredEmployees.length} records</span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "not-allowed", display: "flex", padding: "4px" }}>
            <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} />
            <ChevronRight size={16} style={{ transform: "rotate(180deg)", marginLeft: "-8px" }} />
          </button>
          <button style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "not-allowed", display: "flex", padding: "4px" }}>
            <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} />
          </button>
          <div style={{ border: "1px solid #0ea5e9", color: "#0ea5e9", borderRadius: "4px", width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 500 }}>
            1
          </div>
          <button style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "not-allowed", display: "flex", padding: "4px" }}>
            <ChevronRight size={16} />
          </button>
          <button style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "not-allowed", display: "flex", padding: "4px" }}>
            <ChevronRight size={16} />
            <ChevronRight size={16} style={{ marginLeft: "-8px" }} />
          </button>
        </div>
      </div>

    </div>
  );
}
