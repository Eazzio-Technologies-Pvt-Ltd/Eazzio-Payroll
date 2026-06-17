"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Play, Pause, RotateCcw, Navigation, Compass, Zap, Activity, MapPin, Clock, Gauge, ListOrdered, Loader2, AlertCircle
} from "lucide-react";
import { usersApi, locationApi } from "@/lib/api-client";

// Dynamically import map component to avoid SSR errors
const PlaybackMap = dynamic(() => import("@/components/map/PlaybackMap"), {
  ssr: false,
  loading: () => (
    <div className="skeleton-box" style={{ height: "100%", width: "100%", minHeight: "300px", borderRadius: "0" }} />
  ),
});

export default function PlaybackPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [route, setRoute] = useState<any[]>([]);
  const [activePointIndex, setActivePointIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // ms per step

  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await usersApi.list({ role: 'FIELD_STAFF' });
        const staffList = (res as any).data || [];
        setAgents(staffList);
        if (staffList.length > 0) {
          setSelectedId(staffList[0].id);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load agents.");
      } finally {
        setLoadingAgents(false);
      }
    };
    fetchAgents();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const fetchHistory = async () => {
      setLoadingRoute(true);
      try {
        const res = await locationApi.getHistory(selectedId, {
          startDate: selectedDate,
          endDate: selectedDate
        });
        const historyData = (res as any).data;
        const logs = historyData?.logs || [];
        
        const uniqueLogs = new Map();
        logs.forEach((log: any) => {
          const timeKey = new Date(log.recordedAt).toLocaleTimeString();
          if (!uniqueLogs.has(timeKey)) {
            uniqueLogs.set(timeKey, log);
          }
        });

        const mappedRoute = Array.from(uniqueLogs.values()).map((log: any) => ({
          lat: log.latitude,
          lng: log.longitude,
          time: new Date(log.recordedAt).toLocaleTimeString(),
          speed: log.speed ? `${Number(log.speed).toFixed(1)} km/h` : "0.0 km/h",
          status: log.isMoving ? "Moving" : "Idle"
        }));

        setRoute(mappedRoute);
        setActivePointIndex(0);
        setIsPlaying(false);
      } catch (err: any) {
        setRoute([]);
      } finally {
        setLoadingRoute(false);
      }
    };
    fetchHistory();
  }, [selectedId, selectedDate]);

  // Playback timer loop
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setActivePointIndex((prev) => {
          if (prev >= route.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, route.length, playbackSpeed]);

  if (loadingAgents) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "4px", height: "calc(100vh - 120px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="skeleton-box" style={{ width: 250, height: 32 }} />
            <div className="skeleton-box" style={{ width: 400, height: 20 }} />
          </div>
          <div className="skeleton-box" style={{ width: 120, height: 28, borderRadius: 16 }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "20px", flex: 1, minHeight: 0 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%" }}>
            <div className="skeleton-card" style={{ flex: "0 0 35%", padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className="skeleton-line" style={{ width: "40%", height: "20px" }} />
              <div className="skeleton-box" style={{ width: "100%", height: "40px", borderRadius: "8px" }} />
              <div className="skeleton-box" style={{ width: "100%", flex: 1, borderRadius: "8px" }} />
            </div>
            <div className="skeleton-card" style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
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
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%" }}>
            <div className="skeleton-card" style={{ flex: 1, position: "relative" }}>
              <div className="skeleton-box" style={{ position: "absolute", inset: 0 }} />
              <div className="skeleton-box" style={{ position: "absolute", top: "16px", left: "16px", width: "200px", height: "32px", borderRadius: "4px", zIndex: 10, background: "rgba(255,255,255,0.2)" }} />
            </div>
            <div className="skeleton-card" style={{ flex: "0 0 auto", height: 180, padding: "20px", display: "flex", flexDirection: "column", gap: "16px", justifyContent: "flex-end" }}>
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

  if (agents.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12, color: "#64748b" }}>
        <MapPin size={48} style={{ opacity: 0.5 }} />
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1e293b", margin: 0 }}>No Agents Found</h2>
        <p style={{ fontSize: 15, fontWeight: 500 }}>Add field staff to view route playback.</p>
      </div>
    );
  }

  const selectedAgent = agents.find(a => a.id === selectedId);
  const currentPoint = route[activePointIndex] || { lat: null, lng: null, time: "N/A", speed: "N/A", status: "No logs found" };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px", height: "calc(100vh - 120px)" }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexShrink: 0 }}>
        <div>
          <h1 className="page-title">Routes Playback</h1>
          <p className="page-subtitle">Replay historic travel paths, coordinates, speeds, and log indices.</p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setRoute([]);
              setActivePointIndex(0);
              setIsPlaying(false);
            }}
            style={{
              padding: "6px 12px",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              fontSize: "13px",
              fontFamily: "var(--font-hanken), sans-serif"
            }}
          />
          <div className="badge badge-green" style={{ fontFamily: "var(--font-jetbrains), monospace" }}>
            <Activity size={12} /> Playback Ready
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: "20px", flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%" }}>
          <div className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", flex: "0 0 40%", minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", flexShrink: 0 }}>
              <Navigation size={16} color="var(--accent-blue)" />
              <span style={{ fontWeight: 700, fontSize: "14px", fontFamily: "var(--font-hanken), sans-serif" }}>Select Field Agent</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", flex: 1, overflowY: "auto" }}>
              {agents.map((emp) => {
                const active = emp.id === selectedId;
                const avatar = emp.name ? emp.name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2) : "UN";
                return (
                  <div key={emp.id} onClick={() => setSelectedId(emp.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px", padding: "10px", cursor: "pointer",
                      border: active ? "1px solid var(--accent-blue)" : "1px solid var(--border)",
                      background: active ? "rgba(0, 82, 255, 0.04)" : "var(--bg-card)", transition: "all 0.2s ease"
                    }}
                  >
                    <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg, #4f8ef7, #0052ff)", color: "white", fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {avatar}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>{emp.name}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "capitalize" }}>{emp.role?.replace("_", " ")?.toLowerCase()}</div>
                    </div>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-blue)" }} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card" style={{ padding: "16px", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px", flexShrink: 0 }}>
              <ListOrdered size={16} color="var(--accent-blue)" />
              <span style={{ fontWeight: 700, fontSize: "14px", fontFamily: "var(--font-hanken), sans-serif" }}>Route Log History</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, overflowY: "auto", paddingRight: "4px" }}>
              {loadingRoute ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="skeleton-box" style={{ height: "46px", borderRadius: "4px" }} />
                  ))}
                </div>
              ) : route.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "#64748b", fontSize: 13 }}>No route data available for this agent on this date.</div>
              ) : (
                route.map((pt, index) => {
                  const active = index === activePointIndex;
                  return (
                    <div key={index} onClick={() => { setIsPlaying(false); setActivePointIndex(index); }}
                      style={{ padding: "8px 10px", cursor: "pointer", border: active ? "1px solid var(--accent-blue)" : "1px solid transparent", background: active ? "rgba(0, 82, 255, 0.03)" : "var(--bg-hover)", transition: "all 0.15s ease", display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-primary)" }}>{pt.time}</span>
                        <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-jetbrains), monospace" }}>{pt.speed}</span>
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pt.status}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", height: "100%", minWidth: 0 }}>
          <div className="card" style={{ padding: "0", overflow: "hidden", flex: 1, maxHeight: "40vh", minHeight: "250px", border: "1px solid var(--border)", position: "relative" }}>
            <PlaybackMap selectedEmployeeName={selectedAgent?.name || ""} route={route} activePointIndex={activePointIndex} isPlaying={isPlaying} />
          </div>

          <div className="card" style={{ padding: "20px", flex: "0 0 auto", display: "flex", flexDirection: "column", gap: "16px", minHeight: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button className="btn-primary" onClick={() => setIsPlaying(!isPlaying)} disabled={route.length <= 1}
                  style={{ padding: "8px 16px", fontSize: "13px", background: isPlaying ? "var(--accent-orange)" : "var(--accent-blue)", display: "flex", alignItems: "center", gap: "6px", opacity: route.length <= 1 ? 0.5 : 1, cursor: route.length <= 1 ? "not-allowed" : "pointer" }}
                >
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                  {isPlaying ? "Pause Log" : "Play History"}
                </button>
                <button className="btn-secondary" onClick={() => { setIsPlaying(false); setActivePointIndex(0); }} disabled={route.length <= 1}
                  style={{ padding: "8px 12px", opacity: route.length <= 1 ? 0.5 : 1, cursor: route.length <= 1 ? "not-allowed" : "pointer" }} title="Reset to Start"><RotateCcw size={14} /></button>
                <div style={{ display: "flex", background: "var(--bg-hover)", border: "1px solid var(--border)", marginLeft: "8px", opacity: route.length <= 1 ? 0.5 : 1, pointerEvents: route.length <= 1 ? "none" : "auto" }}>
                  {[{ label: "1x", delay: 1500 }, { label: "2x", delay: 750 }, { label: "4x", delay: 300 }].map((speed) => (
                    <button key={speed.label} onClick={() => setPlaybackSpeed(speed.delay)}
                      style={{ padding: "6px 12px", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer", background: playbackSpeed === speed.delay ? "var(--accent-blue)" : "transparent", color: playbackSpeed === speed.delay ? "white" : "var(--text-secondary)", transition: "all 0.15s ease" }}
                    >{speed.label}</button>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: "13px", fontFamily: "var(--font-jetbrains), monospace", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Clock size={14} color="var(--accent-blue)" />
                Log Point {route.length > 0 ? activePointIndex + 1 : 0} of {route.length > 0 ? route.length : 0}
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <input type="range" min="0" max={Math.max(0, route.length - 1)} value={activePointIndex}
                onChange={(e) => { setIsPlaying(false); setActivePointIndex(parseInt(e.target.value)); }} disabled={route.length <= 1}
                style={{ width: "100%", cursor: route.length <= 1 ? "not-allowed" : "pointer", accentColor: "var(--accent-blue)", height: "6px", borderRadius: "3px" }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", background: "var(--bg-secondary)", padding: "16px", border: "1px solid var(--border)" }}>
              <div>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, fontFamily: "var(--font-jetbrains), monospace" }}><Clock size={10} /> Timestamp</span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", display: "block", marginTop: "2px" }}>{currentPoint.time}</span>
              </div>
              <div>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, fontFamily: "var(--font-jetbrains), monospace" }}><Gauge size={10} /> Logged Speed</span>
                <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", display: "block", marginTop: "2px" }}>{currentPoint.speed}</span>
              </div>
              <div>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, fontFamily: "var(--font-jetbrains), monospace" }}><Zap size={10} /> Status Message</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--accent-blue)", display: "block", marginTop: "2px" }}>{currentPoint.status}</span>
              </div>
              <div>
                <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, fontFamily: "var(--font-jetbrains), monospace" }}><MapPin size={10} /> GPS Location</span>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", display: "block", marginTop: "2px" }}>
                  {currentPoint.lat !== null && currentPoint.lng !== null
                    ? `${currentPoint.lat.toFixed(5)}° N, ${currentPoint.lng.toFixed(5)}° E`
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
