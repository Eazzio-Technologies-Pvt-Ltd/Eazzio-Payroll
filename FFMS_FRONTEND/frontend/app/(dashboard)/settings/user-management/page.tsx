"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Users, Shield, Edit2, Ban, CheckCircle, Search, Mail, Phone, Lock } from "lucide-react";

export default function UserManagementPage() {
  const employees = useSelector((s: RootState) => s.employees.list);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");

  const filteredUsers = employees.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "All" || emp.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <div className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Users size={24} color="var(--accent-blue)" /> User Management
        </div>
        <div className="page-subtitle">Manage system users, assign roles, and control account status.</div>
      </div>

      <div className="card" style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", flex: 1 }}>
            <div style={{ position: "relative", flex: "1 1 250px" }}>
              <Search size={14} style={{ position: "absolute", left: "12px", top: "11px", color: "var(--text-muted)" }} />
              <input
                className="input"
                style={{ paddingLeft: "36px", height: "36px", fontSize: "13px" }}
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select 
              className="input" 
              style={{ height: "36px", fontSize: "13px", flex: "0 0 180px" }}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Field Executive">Field Executive</option>
              <option value="Manager">Manager</option>
            </select>
        </div>
        <button className="btn-primary" style={{ height: "36px", fontSize: "13px" }}>
            + Invite User
        </button>
      </div>

      <div className="card" style={{ padding: "0" }}>
        <div className="table-wrapper">
          <table style={{ minWidth: "900px", margin: 0 }}>
            <thead style={{ background: "var(--bg-secondary)" }}>
              <tr>
                <th style={{ padding: "16px" }}>User</th>
                <th style={{ padding: "16px" }}>Role</th>
                <th style={{ padding: "16px" }}>Contact</th>
                <th style={{ padding: "16px" }}>Status</th>
                <th style={{ padding: "16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ 
                            width: "36px", height: "36px", borderRadius: "50%", 
                            background: "var(--accent-blue)", color: "white",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontWeight: "bold", fontSize: "14px"
                        }}>
                            {user.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: "14px" }}>{user.name}</div>
                            <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>ID: {user.id}</div>
                        </div>
                    </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                    <span className="badge" style={{ 
                        background: user.role === 'Admin' ? 'rgba(249, 115, 22, 0.1)' : 'var(--bg-secondary)',
                        color: user.role === 'Admin' ? 'var(--accent-orange)' : 'var(--text-primary)',
                        border: `1px solid ${user.role === 'Admin' ? 'rgba(249, 115, 22, 0.2)' : 'var(--border)'}` 
                    }}>
                        {user.role === 'Admin' && <Shield size={10} style={{ marginRight: "4px" }}/>}
                        {user.role}
                    </span>
                  </td>
                  <td style={{ padding: "16px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                              <Mail size={12}/> {user.email}
                          </span>
                          <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                              <Phone size={12}/> {user.phone}
                          </span>
                      </div>
                  </td>
                  <td style={{ padding: "16px" }}>
                      <span className="badge badge-green" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle size={10} /> Active
                      </span>
                  </td>
                  <td style={{ padding: "16px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "4px" }} title="Edit User">
                              <Edit2 size={16} />
                          </button>
                          <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: "4px" }} title="Reset Password">
                              <Lock size={16} />
                          </button>
                          <button style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent-red)", padding: "4px" }} title="Suspend User">
                              <Ban size={16} />
                          </button>
                      </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                  <tr>
                      <td colSpan={5} style={{ padding: "32px", textAlign: "center", color: "var(--text-muted)" }}>
                          No users found matching your criteria.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
