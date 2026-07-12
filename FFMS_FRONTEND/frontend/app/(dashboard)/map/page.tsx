"use client";

import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store";
import { useState, useEffect } from "react";
import { getStatusColor } from "@/lib/utils";
import { MapPin, Users, Navigation } from "lucide-react";
import dynamic from "next/dynamic";
import { locationApi } from "@/lib/api-client";
import { fetchEmployees } from "@/store/slices/employeeSlice";
import MapLoader from "@/components/common/MapLoader";

// Dynamically import map to avoid SSR issues with Leaflet
const LiveMapInner = dynamic(() => import("@/components/map/LiveMap"), { ssr: false, loading: () => (
  <MapLoader overlay={false} />
)});

export default function MapPage() {
  const dispatch = useDispatch<AppDispatch>();
  const employeesFromRedux = useSelector((s: RootState) => s.employees.list);
  const [selected, setSelected] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    dispatch(fetchEmployees());
  }, [dispatch]);

  useEffect(() => {
    const fetchLiveLocations = async () => {
      try {
        const res = await locationApi.getLive();
        const liveLocs = (res as any).data || [];
        const liveLocMap = new Map(liveLocs.map((l: any) => [l.userId, l]));

        const merged = employeesFromRedux.map((emp) => {
          const live = liveLocMap.get(emp.id) as any;
          if (live && live.latitude && live.longitude && live.latitude !== 0 && live.longitude !== 0) {
            return {
              ...emp,
              lat: live.latitude,
              lng: live.longitude,
              status: live.isOnline ? "active" : "inactive",
            };
          }
          return {
            ...emp,
            status: "inactive",
          };
        });
        setEmployees(merged);
      } catch (e) {
        console.error("Failed to fetch live locations", e);
        setEmployees(employeesFromRedux.map(emp => ({ ...emp, status: "inactive" })));
      }
    };

    if (employeesFromRedux.length > 0) {
      fetchLiveLocations();
      const interval = setInterval(fetchLiveLocations, 10000);
      return () => clearInterval(interval);
    } else {
      setEmployees(employeesFromRedux);
    }
  }, [employeesFromRedux]);

  const active = employees.filter(e => e.status === "active" && e.lat !== 0 && e.lng !== 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "16px", height: "calc(100vh - 130px)" }}>
      {/* Map */}
      <div className="card" style={{ padding: "0", overflow: "hidden", height: "100%" }}>
        <LiveMapInner employees={active} selectedId={selected} onSelect={setSelected} />
      </div>

      {/* Employee list panel */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto" }}>
        <div className="card" style={{ padding: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <Navigation size={16} color="var(--accent-green)" />
            <span style={{ fontWeight: 700, fontSize: "14px" }}>Live Tracking</span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>{active.length} employees active now</div>
        </div>

        {employees.map(emp => (
          <div
            key={emp.id}
            className="card"
            onClick={() => setSelected(selected === emp.id ? null : emp.id)}
            style={{
              padding: "14px", cursor: "pointer",
              borderColor: selected === emp.id ? "var(--accent-blue)" : "var(--border)",
              background: selected === emp.id ? "rgba(79,142,247,0.05)" : "var(--bg-card)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
                background: emp.avatar && typeof emp.avatar === 'string' && emp.avatar.startsWith('http') 
                  ? `url('${emp.avatar}') center/cover` 
                  : (emp.status === "active" ? "linear-gradient(135deg,#22d3a5,#4f8ef7)" : "var(--bg-hover)"),
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "13px", color: emp.status === "active" ? "white" : "var(--text-muted)"
              }}>
                {(!emp.avatar || !emp.avatar.startsWith('http')) && emp.name 
                  ? emp.name.trim().split(/\s+/).map((n:string) => n[0]).join("").slice(0, 2).toUpperCase() 
                  : ""}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{emp.name}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{emp.role}</div>
              </div>
              <span className={`badge ${getStatusColor(emp.status)}`} style={{ fontSize: "10px" }}>
                {emp.status === "active" ? "● Live" : "○ Off"}
              </span>
            </div>
            {emp.status === "active" && (
              <div style={{ marginTop: "10px", padding: "8px", background: "var(--bg-secondary)", borderRadius: "0", fontSize: "11px", color: "var(--text-muted)", display: "flex", gap: "6px", alignItems: "center" }}>
                <MapPin size={10} /> {emp.territory} • {emp.lat.toFixed(3)}, {emp.lng.toFixed(3)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
