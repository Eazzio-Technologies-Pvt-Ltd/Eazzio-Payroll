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
import MapLoader from "@/components/common/MapLoader";

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
  const [currentPage, setCurrentPage] = useState(0);

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

      const usersRes = await usersApi.list({ limit: 5000 });
      const activeUsers = usersRes.data.filter(u => u.role === "FIELD_STAFF" || u.role === "OFFICE_STAFF" || u.role === "MANAGER");

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
        
        // Get all attendance records for the user today, sorted by checkInTime ascending
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userAttObj = attendance.find((att: any) => att.userId === user.id);
        const userAttendances = ((userAttObj as any)?.attendances || [])
          .sort((a: any, b: any) => new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime());
        
        const todayAtt = userAttendances[userAttendances.length - 1]; // Latest one for legacy inTime/outTime
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const userTasks = tasks.filter((task: any) => task.assignments?.some((a: any) => a.userId === user.id));

        // Map punches array from real backend data
        const mappedPunches = userAttendances.map((att: any) => ({
          in: att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not Punched",
          out: att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not yet"
        }));

        // Calculate Total Working Hours
        const totalMinutes = userAttendances.reduce((acc: number, att: any) => acc + (att.workingMinutes || 0), 0);
        const workingHoursStr = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
        
        let shiftMins = 480; // default 8 hours
        if (user.shift?.startTime && user.shift?.endTime) {
          const parseHHMM = (timeStr: string) => {
             const [h, m] = timeStr.split(':').map(Number);
             return (h || 0) * 60 + (m || 0);
          };
          const s = parseHHMM(user.shift.startTime);
          const e = parseHHMM(user.shift.endTime);
          let diff = e - s;
          if (diff < 0) diff += 24 * 60;
          shiftMins = diff;
        }
        
        // Distance
        const distanceStr = liveLoc?.totalDistanceToday !== undefined ? `${liveLoc.totalDistanceToday.toFixed(1)} km` : "0.0 km";

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
          batteryLevel: (liveLoc?.battery !== undefined && liveLoc?.battery !== null) ? liveLoc.battery : null,
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
          punches: mappedPunches.length > 0 ? mappedPunches : undefined,
          tasksToday: userTasks.length,
          speed: liveLoc?.speed !== undefined ? liveLoc.speed : 0,
          accuracy: liveLoc?.accuracy !== undefined ? liveLoc.accuracy : 15,
          distance: distanceStr,
          workingHours: workingHoursStr,
          shiftMins
        };
      });

      // Merge API data with any socket-tracked punches that weren't saved to DB yet.
      // Combines both lists and deduplicates by punch-in time so no punches are lost.
      setEmployeesList(prev => {
        const prevMap = new Map(prev.map(e => [e.id, e]));
        return mapped.map(emp => {
          const existing = prevMap.get(emp.id);
          const apiPunches = emp.punches || [];
          const socketPunches = existing?.punches || [];

          // Merge: start with socket punches, then add any API punches whose in-time isn't already tracked
          const merged = [...socketPunches];
          for (const ap of apiPunches) {
            if (!merged.some(sp => sp.in === ap.in)) {
              merged.push(ap);
            } else {
              // Update the out-time in merged if API has a checkout that socket doesn't yet
              const idx = merged.findIndex(sp => sp.in === ap.in);
              if (idx !== -1 && ap.out !== "Not yet" && merged[idx].out === "Not yet") {
                merged[idx] = { ...merged[idx], out: ap.out };
              }
            }
          }

          return {
            ...emp,
            punches: merged.length > 0 ? merged : emp.punches
          };
        });
      });
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
            
            const newPunch = {
              in: data.checkInTime ? new Date(data.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not Punched",
              out: "Not yet"
            };
            const currentPunches = emp.punches || [];
            
            return {
              ...emp,
              inTime: newPunch.in,
              punches: [...currentPunches, newPunch]
            };
          }));
        });

        socket.on("attendance:checkout", (data: SocketAttendanceUpdate) => {
          if (!data || !data.userId) return;
          setEmployeesList(prev => prev.map(emp => {
            if (emp.id !== data.userId) return emp;
            
            const outTimeStr = data.checkOutTime ? new Date(data.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : emp.outTime;
            const currentPunches = [...(emp.punches || [])];
            
            if (currentPunches.length > 0) {
              currentPunches[currentPunches.length - 1].out = outTimeStr || "Not yet";
            }
            
            return {
              ...emp,
              outTime: outTimeStr,
              punches: currentPunches
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

  const handlePastFeedSearch = async (empId: string, dateStr: string) => {
    if (!empId) return;
    try {
      setPastFeedLoading(true);
      const res = await locationApi.getHistory(empId, { startDate: dateStr, endDate: dateStr });
      if (res.success && res.data) {
        let logs = (res.data as any)?.logs || [];
        let dayAtts: any[] = [];
        
        try {
          // Fetch attendance to use as fallback/additional waypoints from frontend
          const attRes = await attendanceApi.list({ userId: empId });
          if (attRes.success && Array.isArray(attRes.data)) {
            // Filter attendance records to match the selected date
            dayAtts = attRes.data.filter((att: any) => att.date && att.date.startsWith(dateStr));
            
            dayAtts.forEach((att: any) => {
              if (att.checkInLatitude && att.checkInLongitude) {
                logs.push({
                  latitude: att.checkInLatitude,
                  longitude: att.checkInLongitude,
                  accuracy: 10,
                  speed: 0,
                  recordedAt: att.checkInTime || att.date,
                  isMoving: false,
                  type: "check-in"
                });
              }
              if (att.checkOutLatitude && att.checkOutLongitude && att.checkOutTime) {
                logs.push({
                  latitude: att.checkOutLatitude,
                  longitude: att.checkOutLongitude,
                  accuracy: 10,
                  speed: 0,
                  recordedAt: att.checkOutTime,
                  isMoving: false,
                  type: "check-out"
                });
              }
            });
            // Sort merged logs by time
            logs.sort((a: any, b: any) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
          }
        } catch (attErr) {
          console.error("Failed to fetch attendance for map fallback:", attErr);
        }

        const baseEmp = employeesList.find(e => e.id === empId);
        
        if (!baseEmp) {
          toast.error("Employee not found in list");
          return;
        }

        // Parse historical punches for the selected date
        const userAttendances = [...dayAtts].sort((a: any, b: any) => {
          const aTime = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
          const bTime = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
          return aTime - bTime;
        });
        
        const latestAtt = userAttendances[userAttendances.length - 1]; 
        
        const mappedPunches = userAttendances.map((att: any) => ({
          in: att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not Punched",
          out: att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Not yet"
        }));

        const totalMinutes = userAttendances.reduce((acc: number, att: any) => acc + (att.workingMinutes || 0), 0);
        const workingHoursStr = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

        const updatedEmp: Employee = {
          ...baseEmp,
          historyLogs: logs,
          punches: mappedPunches.length > 0 ? mappedPunches : undefined,
          inTime: latestAtt?.checkInTime ? new Date(latestAtt.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined,
          outTime: latestAtt?.checkOutTime ? new Date(latestAtt.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined,
          workingHours: workingHoursStr,
          status: "offline", // Past dates are inherently offline
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
  let filteredEmployees = [...employeesList];
  if (territory !== "All") {
    filteredEmployees = filteredEmployees.filter(e => e.territory === territory);
  }
  if (role !== "All") {
    filteredEmployees = filteredEmployees.filter(e => e.role === role);
  }
  if (status !== "All") {
    filteredEmployees = filteredEmployees.filter(e => e.status === status);
  }

  // Helper to parse time and get minutes for sorting
  const getLatestPunchMinutes = (emp: Employee) => {
    if (!emp.punches || emp.punches.length === 0) return -1;
    const last = emp.punches[emp.punches.length - 1];
    
    const parse = (str: string) => {
      if (!str || str === "Not yet" || str === "Not Punched") return -1;
      const match = str.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
      if (!match) return -1;
      let [, h, m, ampm] = match;
      let hours = parseInt(h, 10);
      const mins = parseInt(m, 10);
      if (ampm.toLowerCase() === "pm" && hours < 12) hours += 12;
      if (ampm.toLowerCase() === "am" && hours === 12) hours = 0;
      return hours * 60 + mins;
    };

    const inMins = parse(last.in);
    const outMins = parse(last.out);
    return Math.max(inMins, outMins);
  };

  // Sort: Active (online) members first, then inactive (offline)
  // Within same status group, sort by latest punch time (most recent first)
  filteredEmployees.sort((a, b) => {
    if (a.status === "online" && b.status !== "online") return -1;
    if (a.status !== "online" && b.status === "online") return 1;
    
    const aTime = getLatestPunchMinutes(a);
    const bTime = getLatestPunchMinutes(b);
    return bTime - aTime;
  });

  const activeCount = employeesList.filter(e => e.status === "online").length;

  const totalPages = Math.ceil(filteredEmployees.length / gridSize);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [territory, role, status, gridSize]);

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
          <MapLoader overlay={false} message="Loading live monitoring records..." />
        ) : showPastFeed ? (
          pastFeedLoading ? (
            <MapLoader overlay={false} message="Fetching GPS historical data..." />
          ) : pastFeedEmployee ? (
            <GridView 
              employees={[pastFeedEmployee]} 
              gridSize={gridSize} 
              isPastFeed={true} 
              isFullscreen={isFullscreen}
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
          <div style={{ display: 'flex', flexDirection: 'column', height: isFullscreen ? '100%' : 'auto', gap: isFullscreen ? 0 : '16px' }}>
            <div style={{ flex: 1, minHeight: 0 }}>
              <GridView 
                employees={filteredEmployees.slice(currentPage * gridSize, (currentPage + 1) * gridSize)} 
                gridSize={gridSize} 
                isPastFeed={false} 
                isFullscreen={isFullscreen}
              />
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                gap: '16px', 
                marginTop: isFullscreen ? '16px' : '0', 
                flexShrink: 0 
              }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                  disabled={currentPage === 0}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--border-color)', 
                    background: currentPage === 0 ? '#f1f5f9' : '#fff', 
                    color: currentPage === 0 ? '#94a3b8' : 'var(--text-primary)',
                    cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.2s'
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                  Screen {currentPage + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPage === totalPages - 1}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: '6px', 
                    border: '1px solid var(--border-color)', 
                    background: currentPage === totalPages - 1 ? '#f1f5f9' : '#fff', 
                    color: currentPage === totalPages - 1 ? '#94a3b8' : 'var(--text-primary)',
                    cursor: currentPage === totalPages - 1 ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: 500,
                    transition: 'all 0.2s'
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
