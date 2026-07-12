"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  MapPin, Navigation, Compass, Activity, Clock, ShieldAlert, Loader2, AlertCircle
} from "lucide-react";
import { locationApi, geofenceApi } from "@/lib/api-client";

// Dynamically import map component to avoid SSR errors
const GeofenceMap = dynamic(() => import("@/components/map/GeofenceMap"), {
  ssr: false,
  loading: () => (
    <div className="skeleton-box" style={{ height: "100%", width: "100%", minHeight: "500px", borderRadius: "0" }} />
  ),
});

interface AgentData {
  employeeId: string;
  employeeName: string;
  role: string;
  avatar: string;
  geofences: any[];
  route: any[];
  activeAlerts: any[];
}

export default function GeofencingPage() {
  const [agents, setAgents] = useState<Record<string, AgentData>>({});
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [liveRes, zonesRes, alertsRes] = await Promise.all([
          locationApi.getLive(),
          geofenceApi.getZones(),
          geofenceApi.getAlerts({ resolved: "false" })
        ]);

        const liveStaff = (liveRes as any).data || [];
        const zones = (zonesRes as any).data || [];
        const activeAlerts = (alertsRes as any).data?.alerts || [];

        const agentsMap: Record<string, AgentData> = {};

        liveStaff.forEach((staff: any) => {
          const avatar = staff.name ? staff.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) : "UN";
          const time = new Date(staff.recordedAt).toLocaleTimeString();
          agentsMap[staff.userId] = {
            employeeId: staff.userId,
            employeeName: staff.name,
            role: staff.role?.replace("_", " ")?.toLowerCase() || "field staff",
            avatar,
            geofences: staff.territory ? [staff.territory].map((z: any) => {
              let lat = 22.786999;
              let lng = 86.184998;
              let radius = 300;
              if (z.polygon && z.polygon.coordinates && z.polygon.coordinates[0]) {
                const coords = z.polygon.coordinates[0];
                if (coords.length > 0) {
                  let sumLat = 0, sumLng = 0;
                  coords.forEach((c: any) => {
                    sumLng += c[0];
                    sumLat += c[1];
                  });
                  lat = sumLat / coords.length;
                  lng = sumLng / coords.length;
                  
                  // Estimate radius from the first coordinate distance
                  const pt = coords[0];
                  const lat1 = lat;
                  const lon1 = lng;
                  const lat2 = pt[1];
                  const lon2 = pt[0];
                  const R = 6371e3; // metres
                  const φ1 = (lat1 * Math.PI) / 180;
                  const φ2 = (lat2 * Math.PI) / 180;
                  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
                  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
                  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                  radius = R * c;
                }
              }
              return {
                id: z.id,
                name: z.name,
                lat,
                lng,
                radius: Math.round(radius),
                polygon: z.polygon
              };
            }) : [],
            route: [{
              lat: staff.latitude,
              lng: staff.longitude,
              time,
              speed: staff.speed ? `${staff.speed} km/h` : "0 km/h",
              status: staff.isMoving ? "Moving" : "Idle",
              battery: staff.battery
            }],
            activeAlerts: activeAlerts.filter((a: any) => a.userId === staff.userId)
          };
        });

        setAgents(agentsMap);
        if (liveStaff.length > 0) {
          setSelectedId(liveStaff[0].userId);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load live tracking data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "4px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="skeleton-box" style={{ width: 250, height: 32 }} />
            <div className="skeleton-box" style={{ width: 400, height: 20 }} />
          </div>
          <div className="skeleton-box" style={{ width: 120, height: 28, borderRadius: 16 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="skeleton-card" style={{ height: 380, padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="skeleton-line" style={{ width: "40%", height: "20px" }} />
              <div className="skeleton-box" style={{ width: "100%", height: "40px", borderRadius: "8px" }} />
              <div className="skeleton-box" style={{ width: "100%", flex: 1, borderRadius: "8px" }} />
            </div>
            <div className="skeleton-card" style={{ height: 400, padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="skeleton-line" style={{ width: "50%", height: "20px" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} style={{ display: "flex", gap: "12px" }}>
                    <div className="skeleton-circle" style={{ width: "32px", height: "32px" }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div className="skeleton-line" style={{ width: "80%" }} />
                      <div className="skeleton-line" style={{ width: "40%" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="skeleton-card" style={{ height: 500, position: "relative" }}>
              <div className="skeleton-box" style={{ position: "absolute", inset: 0 }} />
              <div className="skeleton-box" style={{ position: "absolute", top: "16px", left: "16px", width: "200px", height: "32px", borderRadius: "4px", zIndex: 10, background: "rgba(255,255,255,0.2)" }} />
            </div>
            <div className="skeleton-card" style={{ height: 120, padding: "20px", display: "flex", flexDirection: "column", gap: "16px", justifyContent: "flex-end" }}>
              <div className="skeleton-line" style={{ width: "100%", height: "8px" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div className="skeleton-line" style={{ width: "60px", height: "16px" }} />
                <div className="skeleton-box" style={{ width: "40px", height: "40px", borderRadius: "50%" }} />
                <div className="skeleton-line" style={{ width: "60px", height: "16px" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12, color: "#ef4444" }}>
        <AlertCircle size={32} />
        <p style={{ fontSize: 15, fontWeight: 500 }}>{error}</p>
        <button onClick={() => window.location.reload()} className="btn-primary" style={{ padding: "8px 20px" }}>Retry</button>
      </div>
    );
  }

  const agentList = Object.values(agents);
  if (agentList.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12, color: "#64748b" }}>
        <MapPin size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", margin: 0 }}>No Active Agents</h2>
        <p style={{ fontSize: 15, fontWeight: 500 }}>There are currently no field staff reporting live locations.</p>
      </div>
    );
  }

  const currentData = agents[selectedId];
  if (!currentData) return null;

  const currentLocation = currentData.route[currentData.route.length - 1];

  // Use real backend alerts instead of client-side math
  const hasActiveAlert = currentData.activeAlerts.length > 0;
  const currentlyInsideAny = !hasActiveAlert;
  const activeGeofenceName = currentData.geofences[0]?.name || "Assigned Territory";

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 className="page-title">Geofencing Monitor</h1>
          <p className="page-subtitle">Track agent current coordinate proximity relative to authorized corporate bounds.</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <div className="badge badge-blue" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>
            <Activity size={12} /> Live Boundaries Checked
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="card" style={{ padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <Navigation size={16} color="var(--accent-blue)" />
              <span style={{ fontWeight: 700, fontSize: "14px", fontFamily: "var(--font-hanken), sans-serif" }}>
                Select Field Agent
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {agentList.map((emp) => {
                const active = emp.employeeId === selectedId;
                return (
                  <div
                    key={emp.employeeId}
                    onClick={() => setSelectedId(emp.employeeId)}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px", padding: "10px", cursor: "pointer",
                      border: active ? "1px solid var(--accent-blue)" : "1px solid var(--border)",
                      background: active ? "rgba(0, 82, 255, 0.04)" : "var(--bg-card)", transition: "all 0.2s ease"
                    }}
                  >
                    <div style={{
                      width: "36px", height: "36px", background: "linear-gradient(135deg, #4f8ef7, #0052ff)", color: "white",
                      fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      {emp.avatar}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>{emp.employeeName}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "capitalize" }}>{emp.role}</div>
                    </div>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-green)" }} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <Compass size={16} color="var(--accent-green)" />
              <span style={{ fontWeight: 700, fontSize: "14px", fontFamily: "var(--font-hanken), sans-serif" }}>Geofence Analysis</span>
            </div>

            <div style={{
              padding: "12px", background: currentlyInsideAny ? "rgba(5, 150, 105, 0.06)" : "rgba(249, 115, 22, 0.06)",
              borderLeft: currentlyInsideAny ? "3px solid var(--accent-green)" : "3px solid var(--accent-orange)", marginBottom: "16px"
            }}>
              <div style={{ fontWeight: 700, fontSize: "12px", color: currentlyInsideAny ? "var(--accent-green)" : "var(--accent-orange)" }}>
                {currentlyInsideAny ? "GEOCONTAINED" : "IN TRANSIT"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-primary)", marginTop: "4px", fontWeight: 500 }}>
                {currentlyInsideAny ? `Inside ${activeGeofenceName}` : "Outside all assigned boundaries"}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>Perimeter Alerts (Real-Time)</div>
              {currentData.geofences.length === 0 && <div style={{ fontSize: 12, color: "#94a3b8" }}>No zones assigned</div>}
              {currentData.geofences.map((gf) => {
                const alert = currentData.activeAlerts.find(a => a.territoryId === gf.id);
                const isInside = !alert;
                return (
                  <div key={gf.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)" }}>{gf.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        {isInside ? "Agent present in bounds" : `Alert created: ${new Date(alert.alertedAt).toLocaleTimeString()}`}
                      </div>
                    </div>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: isInside ? "var(--accent-green)" : "var(--accent-orange)" }}>
                      {isInside ? "● SAFE" : "○ BREACH"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="card" style={{ padding: "0", overflow: "hidden", height: "450px", border: "1px solid var(--border)" }}>
            <GeofenceMap
              selectedEmployeeName={currentData.employeeName}
              currentLocation={currentLocation}
              geofences={currentData.geofences.map(gf => ({
                ...gf,
                isInside: !currentData.activeAlerts.find(a => a.territoryId === gf.id)
              }))}
            />
          </div>

          <div className="card" style={{ padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <ShieldAlert size={16} color="var(--accent-blue)" />
              <span style={{ fontWeight: 700, fontSize: "14px", fontFamily: "var(--font-hanken), sans-serif" }}>Current Agent Log Details</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", background: "var(--bg-secondary)", padding: "16px", border: "1px solid var(--border)" }}>
              <div>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, fontFamily: "var(--font-jetbrains), monospace" }}>
                  <Clock size={10} /> Last Active Time
                </span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", display: "block", marginTop: "2px" }}>{currentLocation.time}</span>
              </div>
              
              <div>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, fontFamily: "var(--font-jetbrains), monospace" }}>Current Speed</span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", display: "block", marginTop: "2px" }}>{currentLocation.speed}</span>
              </div>

              <div>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, fontFamily: "var(--font-jetbrains), monospace" }}>Current Status</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent-blue)", display: "block", marginTop: "2px" }}>{currentLocation.status}</span>
              </div>

              <div>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, fontFamily: "var(--font-jetbrains), monospace" }}>Coordinates</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginTop: "2px" }}>
                  {(currentLocation.lat || 0).toFixed(5)}° N, {(currentLocation.lng || 0).toFixed(5)}° E
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
