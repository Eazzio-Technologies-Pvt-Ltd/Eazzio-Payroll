"use client";

import { useEffect, useRef, useState } from "react";
import { loadMapplsSDK } from "@/lib/mappls-loader";

interface Geofence {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  polygon?: any;
  isInside?: boolean;
}

interface CurrentLocation {
  lat: number;
  lng: number;
  time: string;
  speed: string;
  status: string;
}

interface Props {
  selectedEmployeeName: string;
  currentLocation: CurrentLocation;
  geofences: Geofence[];
}

const MAP_CONTAINER_ID = "mappls-geofence-map";

export default function GeofenceMap({
  selectedEmployeeName,
  currentLocation,
  geofences,
}: Props) {
  const mapRef = useRef<any>(null);
  const layersRef = useRef<{
    markers: any[];
    shapes: any[]; // Changed from circles to shapes (polygons or circles)
    activeMarker?: any;
  }>({ markers: [], shapes: [] });
  const [sdkReady, setSdkReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Step 1: Load Mappls SDK once
  useEffect(() => {
    loadMapplsSDK()
      .then(() => setSdkReady(true))
      .catch((err) => {
        console.error("Mappls SDK load error:", err);
        setLoadError(err.message || "Failed to load Mappls SDK");
      });
  }, []);

  // Step 2: Initialize map and render layers after SDK is ready
  useEffect(() => {
    if (!sdkReady) return;

    const mappls = (window as any).mappls;

    // Initialize map using container ID string (required by Mappls SDK)
    if (!mapRef.current) {
      try {
        const container = document.getElementById(MAP_CONTAINER_ID);
        if (container) {
          container.innerHTML = "";
        }
        
        mapRef.current = new mappls.Map(MAP_CONTAINER_ID, {
          center: { lat: currentLocation.lat, lng: currentLocation.lng },
          zoom: 13,
          zoomControl: true,
          search: false,
        });

        // Wait for map to be ready before adding layers
        mapRef.current.on("load", () => {
          renderLayers();
        });

        // Fallback: also try rendering after a short delay
        setTimeout(() => {
          if (mapRef.current) renderLayers();
        }, 1000);

      } catch (e) {
        console.error("Map init error:", e);
      }
    } else {
      renderLayers();
    }

    function renderLayers() {
      const map = mapRef.current;
      if (!map) return;

      // Clear old layers
      layersRef.current.markers.forEach((m: any) => {
        try { mappls.remove({ map, layer: m }); } catch (_) {}
      });
      layersRef.current.shapes.forEach((s: any) => {
        try { mappls.remove({ map, layer: s }); } catch (_) {}
      });
      if (layersRef.current.activeMarker) {
        try { mappls.remove({ map, layer: layersRef.current.activeMarker }); } catch (_) {}
      }
      layersRef.current.markers = [];
      layersRef.current.shapes = [];

      // Draw Geofences (Polygons if they exist, otherwise fallback circles)
      geofences.forEach((gf) => {
        const isInside = gf.isInside ?? false;
        const color = isInside ? "#22d3a5" : "#4f8ef7";
        const fillOpacity = isInside ? 0.25 : 0.1;

        if (gf.polygon && gf.polygon.coordinates && gf.polygon.coordinates[0]) {
          try {
            // Mappls expects paths as an array of objects {lat, lng} or array of [lat, lng]
            // GeoJSON provides [lng, lat], so we need to map it.
            const path = gf.polygon.coordinates[0].map((c: number[]) => ({ lat: c[1], lng: c[0] }));
            
            const poly = new mappls.Polygon({
              map: map,
              paths: path,
              fillColor: color,
              fillOpacity: fillOpacity,
              strokeColor: color,
              strokeWeight: 2,
              popupHtml: `<div style="font-family:sans-serif;padding:4px;">
                  <strong style="font-size:13px;">${gf.name}</strong><br/>
                  <span style="font-size:11px;color:#777;">Type: Polygon</span><br/>
                  <span style="font-size:12px;font-weight:600;color:${color};">
                    ${isInside ? "● SAFE" : "○ BREACH"}
                  </span>
                </div>`
            });
            layersRef.current.shapes.push(poly);
          } catch (e) {
            console.error("Polygon draw error:", e);
          }
        } else {
          // Fallback to circle
          try {
            const circle = new mappls.Circle({
              map: map,
              center: { lat: gf.lat, lng: gf.lng },
              radius: gf.radius,
              fillColor: color,
              fillOpacity: fillOpacity,
              strokeColor: color,
              strokeWeight: 2,
              popupHtml: `<div style="font-family:sans-serif;padding:4px;">
                  <strong style="font-size:13px;">${gf.name}</strong><br/>
                  <span style="font-size:11px;color:#777;">Radius: ${gf.radius}m</span><br/>
                  <span style="font-size:12px;font-weight:600;color:${color};">
                    ${isInside ? "● SAFE" : "○ BREACH"}
                  </span>
                </div>`
            });
            layersRef.current.shapes.push(circle);
          } catch (e) {
            console.error("Circle draw error:", e);
          }
        }
      });

      // Draw active employee marker
      try {
        const activeMarker = new mappls.Marker({
          map: map,
          position: { lat: currentLocation.lat, lng: currentLocation.lng },
          html: `
            <div style="position:relative;width:42px;height:42px;transform:translate(-50%,-50%);">
              <div style="
                position:absolute;width:42px;height:42px;
                border-radius:50%;background:rgba(79,142,247,0.25);
                animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;
              "></div>
              <div style="
                position:absolute;top:11px;left:11px;
                width:20px;height:20px;border-radius:50%;
                background:#4f8ef7;border:3px solid white;
                box-shadow:0 4px 10px rgba(0,0,0,0.3);
              "></div>
            </div>
            <style>@keyframes ping{75%,100%{transform:scale(2);opacity:0;}}</style>
          `,
          popupHtml: `<div style="font-family:sans-serif;min-width:140px;padding:5px;">
              <strong style="font-size:13px;">${selectedEmployeeName}</strong>
              <div style="font-size:11px;color:#777;margin-top:2px;">Status: ${currentLocation.status}</div>
              <div style="font-size:11px;color:#777;">Speed: ${currentLocation.speed}</div>
              <div style="font-size:11px;color:#777;">Last: ${currentLocation.time}</div>
            </div>`
        });

        layersRef.current.activeMarker = activeMarker;
      } catch (e) {
        console.error("Marker draw error:", e);
      }

      // Fit bounds — Mappls SDK uses Leaflet internally: [[lat, lng], [lat, lng]]
      try {
        let minLat = Number(currentLocation?.lat);
        let maxLat = Number(currentLocation?.lat);
        let minLng = Number(currentLocation?.lng);
        let maxLng = Number(currentLocation?.lng);
        
        if (!isNaN(minLat) && !isNaN(minLng)) {
          geofences.forEach((gf) => {
            const lat = Number(gf.lat);
            const lng = Number(gf.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
              if (lat < minLat) minLat = lat;
              if (lat > maxLat) maxLat = lat;
              if (lng < minLng) minLng = lng;
              if (lng > maxLng) maxLng = lng;
            }
          });

          if (!isNaN(minLat) && !isNaN(minLng) && !isNaN(maxLat) && !isNaN(maxLng)) {
            const L = (window as any).L;
            if (L && typeof L.latLngBounds === 'function' && typeof L.latLng === 'function') {
              const bounds = L.latLngBounds(
                L.latLng(minLat, minLng),
                L.latLng(maxLat, maxLng)
              );
              map.fitBounds(bounds, { padding: [60, 60] });
            } else if (map.fitBounds) {
              // Mappls SDK v3 fallback
              map.fitBounds([
                [minLng, minLat],
                [maxLng, maxLat]
              ], { padding: 60 });
            }
          }
        }
      } catch (e) {
        console.error("fitBounds error:", e);
      }
    }
  }, [sdkReady, currentLocation, geofences, selectedEmployeeName]);

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
      {/* Mappls requires a string ID — DO NOT use ref here */}
      <div
        id={MAP_CONTAINER_ID}
        style={{ width: "100%", height: "100%", minHeight: "450px" }}
      />
    </div>
  );
}
