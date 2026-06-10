/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import FilterBar from "@/components/live-feed/FilterBar";
import GridView from "@/components/live-feed/GridView";
import PastFeedFilter from "@/components/live-feed/PastFeedFilter";
import { Maximize, Minimize } from "lucide-react";
import { Employee } from "@/types/live-feed";
import { usersApi, locationApi, attendanceApi, tasksApi } from "@/lib/api-client";
import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";

interface SocketLocationUpdate {
  userId: string;
  lat: number;
  lng: number;
  batteryLevel?: number;
  speed?: number;
  accuracy?: number;
  isMoving?: boolean;
  recordedAt?: string;
  timestamp?: number;
}

interface SocketAttendanceUpdate {
  userId: string;
  userName: string;
  checkInTime?: string;
  checkOutTime?: string;
}

export default function LiveFeedWidget({ 
  liveEmployees = [],
  territories = [],
  isStandalone = false
}: { 
  liveEmployees?: Employee[],
  territories?: string[],
  isStandalone?: boolean
}) {
  // Persist grid size preference in localStorage
  const [gridSize, setGridSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("live_feed_grid_size");
      return saved ? Number(saved) : 8;
    }
    return 8;
  });

  const [territory, setTerritory] = useState<string>("All");
  const [role, setRole] = useState<string>("All");
  const [status, setStatus] = useState<string>("All");
  const [showPastFeed, setShowPastFeed] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pastFeedEmpId, setPastFeedEmpId] = useState<string>("");

  // Standalone list and states
  const [employeesList, setEmployeesList] = useState<Employee[]>([]);
  const [availableTerritories, setAvailableTerritories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedInit, setHasLoadedInit] = useState(false);
  const [isSocketOffline, setIsSocketOffline] = useState(false);
  const [pastFeedEmployee, setPastFeedEmployee] = useState<Employee | null>(null);
  const [pastFeedLoading, setPastFeedLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Handle setting grid size
  const handleSetGridSize = (val: number) => {
    setGridSize(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("live_feed_grid_size", String(val));
    }
  };

  // Fullscreen support
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error(`Error attempting to exit full-screen mode: ${err}`);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Fetch initial data (standalone)
  const fetchAllData = useCallback(async () => {
    if (!isStandalone) return;
    try {
      if (!hasLoadedInit) setLoading(true);

      const usersRes = await usersApi.list();
      const activeUsers = usersRes.data.filter(u => u.role === "FIELD_STAFF" || u.role === "MANAGER");

      const liveLocationsRes = await locationApi.getLive();
      const liveLocations = Array.isArray(liveLocationsRes.data) ? liveLocationsRes.data : [];

      const attendanceRes = await attendanceApi.today();
      const attendance = Array.isArray(attendanceRes.data) ? attendanceRes.data : [];

      const tasksRes = await tasksApi.list({ limit: 100 });
      const tasks = tasksRes.data || [];

      // Unique territories mapping
      const territoriesMap = Array.from(new Set(
        activeUsers
          .map(u => u.territory?.name)
          .filter((t): t is string => !!t)
      ));
      setAvailableTerritories(territoriesMap);

      const mapped = activeUsers.map((user): Employee => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const liveLoc = liveLocations.find((loc: any) => loc.userId === user.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const todayAtt = attendance.find((att: any) => att.userId === user.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userTasks = tasks.filter((task: any) => task.assignments?.some((a: any) => a.userId === user.id));

        const isOnline = liveLoc ? liveLoc.isOnline : false;

        return {
          id: user.id,
          name: user.name,
          role: user.role,
          territory: user.territory?.name || "Unassigned",
          status: isOnline ? "online" : "offline",
          lastActive: liveLoc?.recordedAt 
            ? new Date(liveLoc.recordedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) 
            : (user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "N/A"),
          batteryLevel: liveLoc?.battery !== undefined ? liveLoc.battery : 100,
          isMoving: liveLoc?.isMoving !== undefined ? liveLoc.isMoving : false,
          location: {
            lat: liveLoc?.latitude || todayAtt?.checkInLatitude || (undefined as unknown as number),
            lng: liveLoc?.longitude || todayAtt?.checkInLongitude || (undefined as unknown as number),
            address: typeof liveLoc?.latitude === 'number' && typeof liveLoc?.longitude === 'number'
              ? `${liveLoc.latitude.toFixed(4)}, ${liveLoc.longitude.toFixed(4)}`
              : "No GPS signal"
          },
          phone: user.phone || "",
          avatar: user.profileImage || "",
          email: user.email,
          inTime: todayAtt?.checkInTime ? new Date(todayAtt.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined,
          outTime: todayAtt?.checkOutTime ? new Date(todayAtt.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined,
          tasksToday: userTasks.length,
          speed: liveLoc?.speed !== undefined ? liveLoc.speed : 0,
          accuracy: liveLoc?.accuracy !== undefined ? liveLoc.accuracy : 15
        };
      });

      setEmployeesList(mapped);
      setHasLoadedInit(true);

      // Select default employee for past feed
      if (mapped.length > 0 && !pastFeedEmpId) {
        setPastFeedEmpId(mapped[0].id);
      }
    } catch (err) {
      console.error("Error loading standalone live-feed data:", err);
    } finally {
      setLoading(false);
    }
  }, [isStandalone, hasLoadedInit, pastFeedEmpId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Set up WebSockets & 30s Polling fallback
  useEffect(() => {
    // Polling fallback
    const interval = setInterval(() => {
      fetchAllData();
    }, 30000);

    // Socket Connection
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token && token !== "dev_fallback_token") {
        const socketUrl = process.env.NEXT_PUBLIC_API_URL 
          ? process.env.NEXT_PUBLIC_API_URL.replace("/api/v1", "")
          : "http://localhost:5000";

        // Reconnection limited to 5 attempts to prevent loop
        // User sees friendly message instead of infinite retry spam
        const socket = io(socketUrl, {
          auth: { token },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 3000,
          reconnectionDelayMax: 10000,
          withCredentials: true
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("LiveFeed socket connected:", socket.id);
          setIsSocketOffline(false);
        });

        socket.on("reconnect_failed", () => {
          setIsSocketOffline(true);
        });

        socket.on("location:update", (data: SocketLocationUpdate) => {
          if (!data || !data.userId) return;
          setEmployeesList(prev => prev.map(emp => {
            if (emp.id !== data.userId) return emp;
            return {
              ...emp,
              status: "online",
              lastActive: new Date(data.recordedAt || data.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
              batteryLevel: data.batteryLevel !== undefined ? data.batteryLevel : emp.batteryLevel,
              speed: data.speed !== undefined ? data.speed : emp.speed,
              accuracy: data.accuracy !== undefined ? data.accuracy : emp.accuracy,
              isMoving: data.isMoving !== undefined ? data.isMoving : emp.isMoving,
              location: {
                lat: data.lat,
                lng: data.lng,
                address: typeof data.lat === 'number' && typeof data.lng === 'number'
                  ? `${data.lat.toFixed(4)}, ${data.lng.toFixed(4)}`
                  : "Location unavailable"
              }
            };
          }));
        });

        socket.on("attendance:checkin", (data: SocketAttendanceUpdate) => {
          if (!data || !data.userId) return;
          setEmployeesList(prev => prev.map(emp => {
            if (emp.id !== data.userId) return emp;
            return {
              ...emp,
              inTime: data.checkInTime 
                ? new Date(data.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) 
                : emp.inTime
            };
          }));
        });

        socket.on("attendance:checkout", (data: SocketAttendanceUpdate) => {
          if (!data || !data.userId) return;
          setEmployeesList(prev => prev.map(emp => {
            if (emp.id !== data.userId) return emp;
            return {
              ...emp,
              outTime: data.checkOutTime 
                ? new Date(data.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) 
                : emp.outTime
            };
          }));
        });

        socket.on("connect_error", (err) => {
          console.warn("Socket connection failed:", err.message);
        });
      }
    }

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [fetchAllData]);

  useEffect(() => {
    if (!isStandalone && liveEmployees.length > 0) {
      setEmployeesList(liveEmployees);
      if (!pastFeedEmpId) {
        setPastFeedEmpId(liveEmployees[0].id);
      }
    }
  }, [liveEmployees, isStandalone, pastFeedEmpId]);

  // Handle Past Feed search (fetching location history)
  const handlePastFeedSearch = async (empId: string, dateStr: string) => {
    if (!empId) return;
    try {
      setPastFeedLoading(true);
      const res = await locationApi.getHistory(empId, { startDate: dateStr, endDate: dateStr });
      if (res.success && res.data) {
        const logs = (res.data as any)?.logs || [];
        const baseEmp = employeesList.find(e => e.id === empId);
        
        if (!baseEmp) {
          toast.error("Employee not found in list");
          return;
        }

        const updatedEmp: Employee = {
          ...baseEmp,
          historyLogs: logs,
        };

        // Rule 20 Safety: only set location center if historical logs exist
        if (logs.length > 0) {
          const firstLog = logs[0];
          if (firstLog.latitude && firstLog.longitude) {
            updatedEmp.location = {
              lat: firstLog.latitude,
              lng: firstLog.longitude,
              address: typeof firstLog.latitude === 'number' && typeof firstLog.longitude === 'number'
                ? `${firstLog.latitude.toFixed(4)}, ${firstLog.longitude.toFixed(4)}`
                : "Location unavailable"
            };
          }
        }

        setPastFeedEmployee(updatedEmp);
        if (logs.length === 0) {
          toast.error("No historical GPS logs found for this date");
        } else {
          toast.success(`Loaded ${logs.length} GPS tracking points`);
        }
      } else {
        setPastFeedEmployee(null);
        toast.error("Could not fetch location history");
      }
    } catch (err) {
      console.error("Error fetching location history:", err);
      setPastFeedEmployee(null);
      toast.error("Failed to load historical audit trail");
    } finally {
      setPastFeedLoading(false);
    }
  };

  // Filter list
  let filteredEmployees = employeesList;
  if (territory !== "All") {
    filteredEmployees = filteredEmployees.filter(e => e.territory === territory);
  }
  if (role !== "All") {
    filteredEmployees = filteredEmployees.filter(e => e.role === role);
  }
  if (status !== "All") {
    filteredEmployees = filteredEmployees.filter(e => e.status === status);
  }

  const activeCount = employeesList.filter(e => e.status === "online").length;

  return (
    <div 
      ref={containerRef} 
      className="card"
      style={{ 
        display: "flex", 
        flexDirection: "column", 
        background: "var(--bg-card)", 
        overflow: "hidden",
        position: "relative",
        height: isFullscreen ? "100vh" : "680px",
        borderRadius: isFullscreen ? 0 : 16,
        border: isFullscreen ? "none" : "1px solid #e2e8f0",
        boxShadow: "0 4px 24px rgba(48, 117, 228, 0.06)",
        zIndex: isFullscreen ? 9999 : 1
      }}
    >
      {/* Top Header */}
      <div style={{
        padding: "16px 20px",
        borderBottom: "1px solid #e2e8f0",
        background: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 10
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "#0f172a" }}>Live Monitoring Feed</h3>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "8px", 
            background: "rgba(16, 185, 129, 0.1)", 
            color: "#10b981", 
            padding: "4px 10px", 
            borderRadius: "20px", 
            fontSize: "12px", 
            fontWeight: 600 
          }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#10b981" }} />
            {activeCount} / {employeesList.length} ONLINE
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button 
            onClick={() => {
              setShowPastFeed(!showPastFeed);
              // Clear past feed employee when toggled off
              if (showPastFeed) {
                setPastFeedEmployee(null);
              }
            }}
            style={{
              padding: "8px 14px",
              background: showPastFeed ? "var(--accent-blue)" : "transparent",
              color: showPastFeed ? "white" : "var(--text-primary)",
              border: `1px solid ${showPastFeed ? "var(--accent-blue)" : "var(--border-color)"}`,
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 600,
              transition: "all 0.2s"
            }}
          >
            {showPastFeed ? "Return to Live" : "Past Feed Audit Trail"}
          </button>
          
          <button 
            onClick={toggleFullscreen}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 12px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              cursor: "pointer",
              color: "var(--text-primary)",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
            {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          </button>
        </div>
      </div>

      {/* Socket Offline Banner */}
      {isSocketOffline && (
        <div style={{
          padding: "10px 20px",
          background: "#fffbeb",
          borderBottom: "1px solid #fef3c7",
          color: "#b45309",
          fontSize: "13px",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#b45309" }} />
          Live updates unavailable — showing last known data
        </div>
      )}

      {/* Secondary Header / Filters */}
      {showPastFeed ? (
        <div style={{ padding: "16px 20px 0", borderBottom: "1px solid var(--border-color)", background: "#ffffff" }}>
          <PastFeedFilter 
            onClose={() => {
              setShowPastFeed(false);
              setPastFeedEmployee(null);
            }} 
            employees={employeesList}
            selectedEmpId={pastFeedEmpId}
            setSelectedEmpId={setPastFeedEmpId}
            onSearch={handlePastFeedSearch}
          />
        </div>
      ) : (
        <FilterBar 
          gridSize={gridSize}
          setGridSize={handleSetGridSize}
          territory={territory}
          setTerritory={setTerritory}
          role={role}
          setRole={setRole}
          status={status}
          setStatus={setStatus}
          availableTerritories={isStandalone ? availableTerritories : territories}
        />
      )}

      {/* Cards Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px", background: "#f8fafc" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#3b82f6", animation: "spin 1s linear infinite" }} />
            <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>Loading live monitoring records...</span>
          </div>
        ) : showPastFeed ? (
          pastFeedLoading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: "3px solid #e2e8f0", borderTopColor: "#3b82f6", animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: "14px", color: "#64748b", fontWeight: 500 }}>Fetching GPS historical data...</span>
            </div>
          ) : pastFeedEmployee ? (
            <GridView 
              employees={[pastFeedEmployee]} 
              gridSize={gridSize} 
              isPastFeed={true} 
            />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b", fontSize: "14px", fontWeight: 500 }}>
              Select an employee and date to view their historical GPS trail.
            </div>
          )
        ) : filteredEmployees.length === 0 ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#64748b", fontSize: "14px", fontWeight: 500 }}>
            No matching employees found for the selected filters.
          </div>
        ) : (
          <GridView 
            employees={filteredEmployees.slice(0, gridSize)} 
            gridSize={gridSize} 
            isPastFeed={false} 
          />
        )}
      </div>
    </div>
  );
}
