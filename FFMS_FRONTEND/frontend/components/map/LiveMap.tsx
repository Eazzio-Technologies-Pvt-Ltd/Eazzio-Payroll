"use client";

import { useEffect, useRef, useState } from "react";
import type { Employee } from "@/store/slices/employeeSlice";
import { loadMapplsSDK } from "@/lib/mappls-loader";

interface Props {
  employees: Employee[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const MAP_CONTAINER_ID = "mappls-live-map";

export default function LiveMap({
  employees,
  selectedId,
  onSelect,
}: Props) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [sdkReady, setSdkReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load Mappls SDK once
  useEffect(() => {
    loadMapplsSDK()
      .then(() => setSdkReady(true))
      .catch((err) => {
        console.error("Mappls SDK load error:", err);
        setLoadError(err.message || "Failed to load Mappls SDK");
      });
  }, []);

  useEffect(() => {
    if (!sdkReady) return;

    const mappls = (window as any).mappls;

    // Create map only once
    if (!mapRef.current) {
      try {
        const container = document.getElementById(MAP_CONTAINER_ID);
        if (container) {
          container.innerHTML = ""; // Clear existing DOM to prevent Mappls destroy crash on HMR
        }

        mapRef.current = new mappls.Map(MAP_CONTAINER_ID, {
          center: [19.076, 72.877],
          zoom: 10,
          zoomControl: true,
          search: false,
        });

        mapRef.current.on("load", () => {
          renderMarkers();
        });

        setTimeout(() => {
          if (mapRef.current) renderMarkers();
        }, 1000);
      } catch (e) {
        console.error("Map init error:", e);
      }
    } else {
      renderMarkers();
    }

    function renderMarkers() {
      const map = mapRef.current;
      if (!map) return;

      // Remove old markers
      markersRef.current.forEach((m) => {
        try { mappls.remove({ map, layer: m }); } catch (_) {}
      });
      markersRef.current = [];

      // Add new markers
      employees.forEach((emp) => {
        const isSelected = emp.id === selectedId;
        const size = isSelected ? 44 : 36;
        
        const html = `
          <div style="
            width:${size}px;
            height:${size}px;
            border-radius:50%;
            background:linear-gradient(135deg,#22d3a5,#4f8ef7);
            border:${isSelected ? "3px solid #fff" : "2px solid rgba(255,255,255,0.6)"};
            display:flex;
            align-items:center;
            justify-content:center;
            font-weight:700;
            font-size:12px;
            color:white;
            box-shadow:0 4px 12px rgba(34,211,165,0.4);
            font-family:Inter,sans-serif;
            transform: translate(-50%, -50%);
          ">
            ${emp.avatar}
          </div>
        `;

        const popupHtml = `
          <div style="font-family:Inter,sans-serif;min-width:160px;padding:5px;">
            <div style="font-weight:700;font-size:14px;margin-bottom:4px;">
              ${emp.name}
            </div>
            <div style="font-size:12px;color:#666;">
              ${emp.role}
            </div>
            <div style="font-size:11px;color:#999;margin-top:6px;">
              📍 ${emp.territory}
            </div>
          </div>
        `;

        const marker = new mappls.Marker({
          map: map,
          position: { lat: emp.lat, lng: emp.lng },
          html: html,
          popupHtml: popupHtml,
          offset: [0, size / 2] // Center it properly
        });

        marker.addListener('click', () => onSelect(emp.id));

        markersRef.current.push(marker);
      });

      // Focus selected employee
      if (selectedId) {
        const emp = employees.find((e) => e.id === selectedId);
        if (emp && !isNaN(Number(emp.lat)) && !isNaN(Number(emp.lng))) {
          try {
            if (typeof map.flyTo === 'function') {
              map.flyTo({ center: { lat: emp.lat, lng: emp.lng }, zoom: 13 });
            } else if (typeof map.panTo === 'function') {
              map.panTo([emp.lng, emp.lat]); // Mapbox GL JS format
            } else if (typeof map.setCenter === 'function') {
              map.setCenter({ lat: emp.lat, lng: emp.lng });
            } else if (typeof map.setView === 'function') {
              map.setView([emp.lat, emp.lng], 13); // Leaflet format
            }
          } catch (_) {}
        }
      }
    }
  }, [employees, selectedId, onSelect, sdkReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch (_) {}
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", minHeight: "450px", position: "relative" }}>
      {loadError ? (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "var(--bg-card)", zIndex: 10,
          padding: "20px", textAlign: "center", gap: "10px"
        }}>
          <span style={{ fontSize: "24px" }}>⚠️</span>
          <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>Map Load Failed</div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", maxWidth: "260px" }}>{loadError}</div>
        </div>
      ) : !sdkReady ? (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--bg-card)", zIndex: 10,
          fontSize: "14px", color: "var(--text-muted)",
          fontFamily: "monospace"
        }}>
          Loading Mappls Map...
        </div>
      ) : null}
      <div
        id={MAP_CONTAINER_ID}
        style={{ width: "100%", height: "100%", minHeight: "450px" }}
      />
    </div>
  );
}