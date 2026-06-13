"use client";

import React from "react";

interface FilterBarProps {
  gridSize: number;
  setGridSize: (val: number) => void;
  territory: string;
  setTerritory: (val: string) => void;
  role: string;
  setRole: (val: string) => void;
  status: string;
  setStatus: (val: string) => void;
  availableTerritories?: string[];
}

export default function FilterBar({
  gridSize, setGridSize, territory, setTerritory, role, setRole, status, setStatus, availableTerritories = []
}: FilterBarProps) {
  
  const SelectStyles = {
    padding: "6px 10px",
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: "6px",
    color: "#334155",
    fontSize: "13px",
    fontWeight: 600,
    minWidth: "140px",
    outline: "none",
    cursor: "pointer"
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 16px",
      background: "#fff",
      borderBottom: "1px solid #e2e8f0",
      flexWrap: "wrap",
      gap: "12px"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
        {/* Territory Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Territory</label>
          <select style={SelectStyles} value={territory} onChange={(e) => setTerritory(e.target.value)}>
            <option value="All">All Territories</option>
            {availableTerritories.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Role Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Role</label>
          <select style={SelectStyles} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="All">All Roles</option>
            <option value="MANAGER">Manager</option>
            <option value="FIELD_STAFF">Field Staff</option>
            <option value="OFFICE_STAFF">Office Staff</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Status</label>
          <select style={SelectStyles} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="online">Active (Online)</option>
            <option value="offline">Inactive (Offline)</option>
          </select>
        </div>
      </div>

      {/* Grid Size Filter */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <label style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>Grid View</label>
        <select style={SelectStyles} value={gridSize} onChange={(e) => setGridSize(Number(e.target.value))}>
          <option value={4}>4 Grid (2x2)</option>
          <option value={8}>8 Grid (2x4)</option>
          <option value={12}>12 Grid (3x4)</option>
          <option value={16}>16 Grid (4x4)</option>
        </select>
      </div>
    </div>
  );
}
