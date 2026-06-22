"use client";

import { useEffect, useRef, useState } from "react";
import { Employee, HistoryLog } from "@/types/live-feed";
import { loadMapplsSDK } from "@/lib/mappls-loader";

interface MiniMapProps {
  employee: Employee;
  isPastFeed?: boolean;
}

export default function MiniMap({ employee, isPastFeed }: MiniMapProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circleRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const auditMarkersRef = useRef<any[]>([]);
  const [sdkReady, setSdkReady] = useState(false);
  const containerId = `mappls-mini-map-${employee.id}`;

  const lat = employee.location?.lat;
  const lng = employee.location?.lng;

  // Geofence circle only shown for employees with geofence enabled
  const geofenceSettings = typeof window !== "undefined" ? localStorage.getItem(`geofence_settings_${employee.id}`) : null;
  let geofenceEnabled = false;
  let geofenceCenterLat = 0;
  let geofenceCenterLng = 0;
  let geofenceRadius = 100;

  if (geofenceSettings) {
    try {
      const parsed = JSON.parse(geofenceSettings);
      if (parsed.geofenceEnabled) {
        geofenceEnabled = true;
        geofenceCenterLat = Number(parsed.geofenceCenterLat);
        geofenceCenterLng = Number(parsed.geofenceCenterLng);
        geofenceRadius = Number(parsed.geofenceRadius) || 100;
      }
    } catch (e) {}
  }

  // Haversine distance in meters to verify if inside/outside geofence
  const getDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3; // metres
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  let insideGeofence = true;
  if (geofenceEnabled && lat && lng) {
    const distance = getDistanceMeters(lat, lng, geofenceCenterLat, geofenceCenterLng);
    insideGeofence = distance <= geofenceRadius;
  }
  // Circle color: green if inside, red if outside
  const circleColor = insideGeofence ? "#10b981" : "#ef4444";

  // Load SDK
  useEffect(() => {
    loadMapplsSDK()
      .then(() => setSdkReady(true))
      .catch((err) => {
        console.error("Mappls SDK load error in MiniMap:", err);
      });
  }, []);

  useEffect(() => {
    if (!sdkReady) return;
    if (!lat || !lng) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mappls = (window as any).mappls;

    if (!mapRef.current) {
      try {
        const container = document.getElementById(containerId);
        if (container) {
          container.innerHTML = ""; // Clear existing DOM
        }

        // Create map
        mapRef.current = new mappls.Map(containerId, {
          center: [lat, lng],
          zoom: isPastFeed ? 12 : 14,
          zoomControl: !!isPastFeed,
          fullscreenControl: true,
          search: false,
          interactive: !!isPastFeed, // Disable interaction in grid view
        });

        mapRef.current.on("load", () => {
          renderMarker();
          renderGeofenceCircle();
          if (isPastFeed) {
            renderAuditTrail();
          }
        });

        // Add Resize Observer to fix map centering when flex container resizes
        const containerElem = document.getElementById(containerId);
        if (containerElem) {
          const resizeObserver = new ResizeObserver(() => {
            if (mapRef.current && typeof mapRef.current.resize === 'function') {
              mapRef.current.resize();
              // Re-center after resize
              if (typeof mapRef.current.setCenter === 'function') {
                mapRef.current.setCenter({ lat, lng });
              }
            }
          });
          resizeObserver.observe(containerElem);
          // Store observer on mapRef so we can disconnect it on unmount
          mapRef.current.__resizeObserver = resizeObserver;
        }
      } catch (e) {
        console.error("Map init error:", e);
      }
    } else {
      // Map already exists, just update it
      renderMarker();
      renderGeofenceCircle();
      if (isPastFeed) {
        renderAuditTrail();
      }
      
      // If lat/lng changed, re-center
      try {
        if (typeof mapRef.current.setCenter === 'function') {
          mapRef.current.setCenter({ lat, lng });
        }
      } catch(e) {}
    }

    function renderMarker() {
      const map = mapRef.current;
      if (!map) return;

      if (markerRef.current) {
        try { mappls.remove({ map, layer: markerRef.current }); } catch { }
      }

      const isOnline = employee.status === "online";
      const initials = employee.name
        ? employee.name.trim().split(/\s+/).map(n => n[0]).join("").slice(0, 2).toUpperCase()
        : "EE";
      
      const avatarHtml = employee.avatar 
        ? `<div style="width:100%;height:100%;border-radius:50%;background-image:url('${employee.avatar}');background-size:cover;background-position:center;"></div>` 
        : initials;

      const html = `
        <div style="
          width:32px;
          height:32px;
          border-radius:50%;
          background:linear-gradient(135deg, ${isOnline ? '#10b981, #3b82f6' : '#94a3b8, #64748b'});
          border:2px solid white;
          display:flex;
          align-items:center;
          justify-content:center;
          font-weight:700;
          font-size:12px;
          color:white;
          box-shadow:0 2px 8px rgba(0,0,0,0.15);
          font-family:Inter,sans-serif;
          overflow:hidden;
        ">
          ${avatarHtml}
        </div>
      `;

      markerRef.current = new mappls.Marker({
        map: map,
        position: { lat, lng },
        html: html,
        offset: [0, 16]
      });

      // Recenter map
      if (!isPastFeed) {
        try {
          if (typeof map.setCenter === 'function') {
            map.setCenter({ lat, lng });
          } else if (typeof map.setView === 'function') {
            map.setView([lat, lng], 14);
          }
        } catch { }
      }
    }

    // Geofence circle only shown for employees with geofence enabled
    function renderGeofenceCircle() {
      const map = mapRef.current;
      if (!map) return;

      if (circleRef.current) {
        try { mappls.remove({ map, layer: circleRef.current }); } catch { }
      }

      if (geofenceEnabled && geofenceCenterLat && geofenceCenterLng) {
        try {
          circleRef.current = new mappls.Circle({
            map: map,
            center: { lat: geofenceCenterLat, lng: geofenceCenterLng },
            radius: geofenceRadius,
            fillColor: circleColor,
            fillOpacity: 0.15,
            strokeColor: circleColor,
            strokeOpacity: 0.8,
            strokeWeight: 2
          });
        } catch (e) {
          console.error("Circle render error:", e);
        }
      }
    }

    function renderAuditTrail() {
      const map = mapRef.current;
      if (!map) return;

      if (polylineRef.current) {
        try { mappls.remove({ map, layer: polylineRef.current }); } catch { }
      }
      
      // Clear any existing audit markers
      if (auditMarkersRef.current.length > 0) {
        auditMarkersRef.current.forEach(marker => {
          try { mappls.remove({ map, layer: marker }); } catch { }
        });
        auditMarkersRef.current = [];
      }
      
      const logs = employee.historyLogs;
      if (!logs || logs.length === 0) return;

      const pts = logs
        .filter((log: HistoryLog) => log.latitude && log.longitude)
        .map((log: HistoryLog) => ({
          lat: log.latitude,
          lng: log.longitude
        }));

      if (pts.length === 0) return;

      try {
        polylineRef.current = new mappls.Polyline({
          map: map,
          path: pts,
          strokeColor: "#3b82f6",
          strokeOpacity: 0.8,
          strokeWeight: 4,
          fitbounds: true
        });
      } catch(e) {
        console.error("Polyline error", e);
      }

      // Draw custom markers for Check-In and Check-Out
      logs.forEach((log: any) => {
        if (!log.latitude || !log.longitude || !log.type) return;

        const isCheckIn = log.type === "check-in";
        const iconHtml = `<div style="background-color: ${isCheckIn ? '#10b981' : '#ef4444'}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); white-space: nowrap;">${isCheckIn ? '📍 IN' : '📍 OUT'}</div>`;

        try {
          const m = new mappls.Marker({
            map: map,
            position: { lat: log.latitude, lng: log.longitude },
            html: iconHtml,
            width: 60,
            height: 30,
            offset: [0, -15]
          });
          auditMarkersRef.current.push(m);
        } catch(e) {
          console.error("Marker render error:", e);
        }
      });
    }
  }, [employee, sdkReady, isPastFeed, containerId, lat, lng, geofenceEnabled, geofenceCenterLat, geofenceCenterLng, geofenceRadius, circleColor]);

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        if (mapRef.current.__resizeObserver) {
          mapRef.current.__resizeObserver.disconnect();
        }
        if (circleRef.current) {
          try { mappls.remove({ map: mapRef.current, layer: circleRef.current }); } catch { }
        }
        if (auditMarkersRef.current.length > 0) {
          auditMarkersRef.current.forEach(marker => {
            try { mappls.remove({ map: mapRef.current, layer: marker }); } catch { }
          });
          auditMarkersRef.current = [];
        }
        try { mapRef.current.remove(); } catch { }
        mapRef.current = null;
      }
    };
  }, []);

  if (!lat || !lng) {
    return (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f1f5f9",
        color: "#64748b",
        fontSize: "13px",
        fontWeight: 500,
        fontFamily: "Inter, sans-serif"
      }}>
        Location unavailable
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <style>{`
        #${containerId} .mapmyindia-ctrl-bottom-left,
        #${containerId} .mappls-ctrl-bottom-left,
        #${containerId} .mapboxgl-ctrl-bottom-left {
          transform: scale(0.4);
          transform-origin: bottom left;
          z-index: 2;
        }
        #${containerId} .mapmyindia-ctrl-bottom-right,
        #${containerId} .mappls-ctrl-bottom-right,
        #${containerId} .mapboxgl-ctrl-bottom-right {
          transform: scale(0.4);
          transform-origin: bottom right;
          z-index: 2;
        }
        #${containerId} .mapmyindia-ctrl-top-right,
        #${containerId} .mappls-ctrl-top-right,
        #${containerId} .mapboxgl-ctrl-top-right {
          transform: scale(0.5);
          transform-origin: top right;
          z-index: 2;
        }
      `}</style>
      {!sdkReady && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--bg-elevated)", zIndex: 1,
          fontSize: "12px", color: "var(--text-muted)",
        }}>
          Loading Map...
        </div>
      )}
      <div
        id={containerId}
        style={{ width: "100%", height: "100%", zIndex: 0 }}
      />
    </div>
  );
}
