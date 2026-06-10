"use client";

import { useEffect, useRef, useState, useId } from "react";
import { loadMapplsSDK } from "@/lib/mappls-loader";

interface RoutePoint {
  lat: number;
  lng: number;
  time: string;
  speed: string;
  status: string;
}

interface Props {
  selectedEmployeeName: string;
  route: RoutePoint[];
  activePointIndex: number;
  isPlaying?: boolean;
}

export default function PlaybackMap({
  selectedEmployeeName,
  route,
  activePointIndex,
  isPlaying = false,
}: Props) {
  const generatedId = useId().replace(/:/g, "");
  const mapContainerId = "map-" + generatedId;
  
  const mapRef = useRef<any>(null);
  const layersRef = useRef<{
    polyline?: any;
    directionPlugin?: any;
    markers: any[];
    activeMarker?: any;
    staticLayersRendered?: boolean;
    lastSelectedEmployee?: string;
  }>({ markers: [] });
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

    // Initialize map if not yet done
    if (!mapRef.current) {
      try {
        const container = document.getElementById(mapContainerId);
        if (container) {
          container.innerHTML = ""; // Clear existing DOM to prevent Mappls destroy crash on HMR
        }

        const initialCenter = route && route.length > 0 && route[0].lat && route[0].lng
          ? { lat: route[0].lat, lng: route[0].lng }
          : { lat: 22.7915, lng: 86.2201 }; // Default to Jamshedpur center if route empty

        mapRef.current = new mappls.Map(mapContainerId, {
          center: initialCenter,
          zoom: 13,
          zoomControl: true,
          search: false,
        });

        mapRef.current.on("load", () => {
          renderLayers();
        });

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
      try {
        const map = mapRef.current;
        if (!map) return;

        const fitMapToBounds = (points: any[]) => {
          if (!points || points.length === 0) return;
          let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
          let validPoints = 0;
          points.forEach(pt => {
            const lat = Number(pt.lat);
            const lng = Number(pt.lng);
            if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
              if (lat < minLat) minLat = lat;
              if (lat > maxLat) maxLat = lat;
              if (lng < minLng) minLng = lng;
              if (lng > maxLng) maxLng = lng;
              validPoints++;
            }
          });

          if (validPoints > 0 && minLat <= 90 && maxLat >= -90 && minLng <= 180 && maxLng >= -180) {
            try {
              const L = (window as any).L;
              if (L && typeof L.latLngBounds === 'function' && typeof L.latLng === 'function') {
                const bounds = L.latLngBounds(
                  L.latLng(minLat, minLng),
                  L.latLng(maxLat, maxLng)
                );
                map.fitBounds(bounds, { padding: [60, 60] });
              } else if (map.fitBounds) {
                map.fitBounds([
                  [minLng, minLat],
                  [maxLng, maxLat]
                ], { padding: 60 });
              }
            } catch (e) {
              console.error("PlaybackMap fitBounds error:", e);
            }
          }
        };

      // We only clear old static layers if the route changed entirely.
      // But active marker is preserved so we can update its position.
      if (layersRef.current.lastSelectedEmployee !== selectedEmployeeName) {
        if (layersRef.current.polyline) {
          try { mappls.remove({ map, layer: layersRef.current.polyline }); } catch (_) {}
        }
        if (layersRef.current.directionPlugin) {
          try { mappls.remove({ map, layer: layersRef.current.directionPlugin }); } catch (_) {}
        }
        layersRef.current.markers.forEach((m) => {
          try { mappls.remove({ map, layer: m }); } catch (_) {}
        });
        if (layersRef.current.activeMarker) {
          try { mappls.remove({ map, layer: layersRef.current.activeMarker }); } catch (_) {}
          layersRef.current.activeMarker = null;
        }
        layersRef.current.markers = [];
        layersRef.current.staticLayersRendered = false;
        layersRef.current.lastSelectedEmployee = selectedEmployeeName;
      }

      // Clear layers if route is empty
      if (!route || route.length === 0) {
        if (layersRef.current.polyline) {
          try { mappls.remove({ map, layer: layersRef.current.polyline }); } catch (_) {}
          layersRef.current.polyline = null;
        }
        if (layersRef.current.directionPlugin) {
          try { mappls.remove({ map, layer: layersRef.current.directionPlugin }); } catch (_) {}
          layersRef.current.directionPlugin = null;
        }
        layersRef.current.markers.forEach((m) => {
          try { mappls.remove({ map, layer: m }); } catch (_) {}
        });
        layersRef.current.markers = [];
        if (layersRef.current.activeMarker) {
          try { mappls.remove({ map, layer: layersRef.current.activeMarker }); } catch (_) {}
          layersRef.current.activeMarker = null;
        }
        layersRef.current.staticLayersRendered = false;
        return;
      }

      // Filter out invalid coordinates to prevent NaN errors
      const validRoute = route.filter(pt => 
        typeof pt.lat === 'number' && typeof pt.lng === 'number' && 
        !isNaN(pt.lat) && !isNaN(pt.lng) && 
        (pt.lat !== 0 || pt.lng !== 0)
      );

      // To prevent "star" GPS drift patterns when idle, we exclude purely idle points from the polyline path
      // And we use the Haversine formula to filter out "saves near by location" jitter (points < 50m apart)
      const movingRoute = [];
      if (validRoute.length > 0) {
        movingRoute.push(validRoute[0]); // Always keep start point
        for (let i = 1; i < validRoute.length; i++) {
          const pt = validRoute[i];
          const speedVal = parseFloat(pt.speed) || 0;
          // Filter out slow/walking points (< 4.8 km/h) to strictly snap to driving roads
          if (pt.status === "Idle" || speedVal < 4.8) continue;
          
          const prev = movingRoute[movingRoute.length - 1];
          // Calculate distance in meters
          const R = 6371e3; // metres
          const lat1 = prev.lat * Math.PI/180, lat2 = pt.lat * Math.PI/180;
          const deltaLat = (pt.lat - prev.lat) * Math.PI/180;
          const deltaLng = (pt.lng - prev.lng) * Math.PI/180;
          const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                    Math.cos(lat1) * Math.cos(lat2) *
                    Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
          const dist = R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));

          // Only add point if they moved more than 50 meters
          if (dist > 50) {
            movingRoute.push(pt);
          }
        }
        // Always ensure last point is there
        if (movingRoute[movingRoute.length - 1] !== validRoute[validRoute.length - 1]) {
           movingRoute.push(validRoute[validRoute.length - 1]);
        }
      }

      // If the user barely moved all day, fallback to validRoute so we at least draw something
      const routeToDraw = movingRoute.length > 2 ? movingRoute : validRoute;

      const latLngs = routeToDraw.map((pt) => ({ lat: pt.lat, lng: pt.lng }));

      // Initialize static layers (Polyline, Direction, Start/End Markers) ONLY if they don't exist
      if (!layersRef.current.staticLayersRendered && latLngs.length > 0) {
        layersRef.current.staticLayersRendered = true;

        // Draw basic polyline initially
        const polyline = mappls.Polyline({
          map: map,
          path: latLngs,
          strokeColor: "#0052ff",
          strokeWeight: 4,
          strokeOpacity: 0.5,
          fitbounds: false
        });
        layersRef.current.polyline = polyline;

        // Hybrid Route Snapping: Tries Mappls first (High Accuracy), falls back to OSRM (Free)
        const fetchHybridSnappedRoute = async () => {
          let mapplsSuccess = false;

          // Attempt Mappls Direction API first for highest accuracy
          if (typeof mappls.direction === 'function') {
            try {
              const startPt = routeToDraw[0];
              const endPt = routeToDraw[routeToDraw.length - 1];
              
              let viaPoints = "";
              if (routeToDraw.length > 2) {
                // Mappls allows max ~20 vias
                const step = Math.ceil((routeToDraw.length - 2) / 20);
                const vias = [];
                for (let i = 1; i < routeToDraw.length - 1; i += step) {
                  vias.push(`${routeToDraw[i].lat},${routeToDraw[i].lng}`);
                }
                viaPoints = vias.join(";");
              }

              mapplsSuccess = await new Promise((resolve) => {
                let resolved = false;
                const finish = (success: boolean) => {
                  if (resolved) return;
                  resolved = true;
                  resolve(success);
                };

                const plugin = mappls.direction({
                  map: map,
                  start: `${startPt.lat},${startPt.lng}`,
                  end: `${endPt.lat},${endPt.lng}`,
                  via: viaPoints,
                  profile: "driving",
                  strokeWidth: 5,
                  strokeColor: "#0052ff",
                  fitBounds: true,
                  hideMarkers: true,
                  callback: (data: any) => {
                    if (!data || data.error || data.status === 403 || data.status === "error" || (data.routes && data.routes.length === 0)) {
                      try { mappls.remove({ map, layer: plugin }); } catch (e) {}
                      finish(false);
                    } else {
                      layersRef.current.directionPlugin = plugin;
                      // Remove basic polyline since Mappls succeeded
                      if (layersRef.current.polyline) {
                        try { mappls.remove({ map, layer: layersRef.current.polyline }); } catch (_) {}
                        layersRef.current.polyline = null;
                      }
                      finish(true);
                    }
                  }
                });

                // If Mappls fails silently (e.g. 403 CORS error), fallback after 2 seconds
                setTimeout(() => finish(false), 2000);
              });
            } catch (err) {
              console.warn("Mappls direction plugin failed gracefully", err);
              mapplsSuccess = false;
            }
          }

          // If Mappls API limits were hit or it failed, seamlessly fallback to Free OSRM
          if (!mapplsSuccess) {
            console.log("Mappls API limit reached/failed, falling back to OSRM...");
            try {
              // Downsample to max 90 waypoints for OSRM public API limit
              const maxPoints = 90;
              const step = Math.max(1, Math.ceil(routeToDraw.length / maxPoints));
              const sampled = [];
              for (let i = 0; i < routeToDraw.length; i += step) {
                sampled.push(routeToDraw[i]);
              }
              if (sampled[sampled.length - 1] !== routeToDraw[routeToDraw.length - 1]) {
                sampled.push(routeToDraw[routeToDraw.length - 1]);
              }

              const coordsStr = sampled.map(p => `${p.lng},${p.lat}`).join(";");
              // Use Route API (Match API requires dense timestamps which we lack)
              const baseUrl = process.env.NEXT_PUBLIC_OSRM_URL || "https://router.project-osrm.org/route/v1/driving";
              const routeUrl = baseUrl.replace('/match/', '/route/');
              
              // radiuses=50 tells OSRM the GPS points have a 50m inaccuracy radius, preventing unnecessary U-turns
              const radiusesStr = sampled.map(() => "50").join(";");
              const url = `${routeUrl}/${coordsStr}?overview=full&geometries=geojson&radiuses=${radiusesStr}`;
              
              const res = await fetch(url);
              const data = await res.json();
              
              if (data.code === 'Ok' && data.routes && data.routes[0]) {
                const snappedPath = data.routes[0].geometry.coordinates.map((c: any) => ({
                  lat: c[1],
                  lng: c[0]
                }));

                if (layersRef.current.polyline) {
                  try { mappls.remove({ map, layer: layersRef.current.polyline }); } catch (_) {}
                }
                layersRef.current.polyline = mappls.Polyline({
                  map: map,
                  path: snappedPath,
                  strokeColor: "#0052ff",
                  strokeWeight: 5,
                  strokeOpacity: 0.9,
                  fitbounds: true
                });
                fitMapToBounds(snappedPath);
              } else {
                console.warn("OSRM Route API returned non-Ok:", data);
              }
            } catch (err) {
              console.error("OSRM Snapping failed:", err);
            }
          }
        };

        fetchHybridSnappedRoute();

        // Draw Start Marker
        const startPt = routeToDraw[0];
        const startMarker = new mappls.Marker({
          map: map,
          position: { lat: startPt.lat, lng: startPt.lng },
          html: `<div style="
            width: 14px; height: 14px;
            border-radius: 50%;
            background: #4f8ef7;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            transform: translate(-50%, -50%);
          "></div>`,
          popupHtml: `<div style="padding: 5px;"><strong>Start Position</strong><br/>Time: ${startPt.time}</div>`
        });
        layersRef.current.markers.push(startMarker);

        // Draw End Marker
        const endPt = routeToDraw[routeToDraw.length - 1];
        const endMarker = new mappls.Marker({
          map: map,
          position: { lat: endPt.lat, lng: endPt.lng },
          html: `<div style="
            width: 14px; height: 14px;
            border-radius: 50%;
            background: #ef4444;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            transform: translate(-50%, -50%);
          "></div>`,
          popupHtml: `<div style="padding: 5px;"><strong>Destination</strong><br/>Time: ${endPt.time}</div>`
        });
        layersRef.current.markers.push(endMarker);

        fitMapToBounds(latLngs);
      }

      // Draw or Update Active playback pointer marker
      if (validRoute.length > 0 && activePointIndex < validRoute.length) {
        const activePt = validRoute[activePointIndex];
        const prevPt = activePointIndex > 0 ? validRoute[activePointIndex - 1] : validRoute[0];

        // Calculate Bearing (Rotation)
        const getBearing = (lat1: number, lng1: number, lat2: number, lng2: number) => {
          const toRad = (deg: number) => deg * Math.PI / 180;
          const toDeg = (rad: number) => rad * 180 / Math.PI;
          const dLng = toRad(lng2 - lng1);
          const y = Math.sin(dLng) * Math.cos(toRad(lat2));
          const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
          return (toDeg(Math.atan2(y, x)) + 360) % 360;
        };

        let bearing = 0;
        if (activePt.lat !== prevPt.lat || activePt.lng !== prevPt.lng) {
          bearing = getBearing(prevPt.lat, prevPt.lng, activePt.lat, activePt.lng);
        }

        if (!layersRef.current.activeMarker) {
          // Create animated bike/arrow marker
          layersRef.current.activeMarker = new mappls.Marker({
            map: map,
            position: { lat: activePt.lat, lng: activePt.lng },
            html: `
              <div id="playback-vehicle" style="
                width: 32px; height: 32px; 
                background: white; 
                border-radius: 50%;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                display: flex; align-items: center; justify-content: center;
                transform-origin: center center;
                transition: transform 0.5s ease-out;
              ">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style="transform: rotate(-45deg);">
                  <path d="M5 3L19 12L5 21L9 12L5 3Z" fill="#2563eb" />
                </svg>
              </div>
            `,
            popupHtml: `<div style="font-family:Inter,sans-serif;min-width:145px;padding:5px;">
                <strong style="font-size:13px;color:var(--text-primary);">${selectedEmployeeName}</strong>
                <div style="font-size:11px;color:#666;margin-top:4px;" id="playback-popup-time">⏱ Time: ${activePt.time}</div>
                <div style="font-size:11px;color:#666;" id="playback-popup-speed">⚡ Speed: ${activePt.speed}</div>
                <div style="font-size:11px;color:#666;" id="playback-popup-status">📍 Status: ${activePt.status}</div>
              </div>`
          });
        } else {
          // Smoothly animate existing marker
          const marker = layersRef.current.activeMarker;
          
          if (marker.setPosition) {
            // Mappls way of animating position
            marker.setPosition({ lat: activePt.lat, lng: activePt.lng });
          }

          // Update rotation
          const vehicleEl = document.getElementById('playback-vehicle');
          if (vehicleEl) {
            vehicleEl.style.transform = `rotate(${bearing}deg)`;
          }

          // Update popup contents directly to avoid flickering
          const timeEl = document.getElementById('playback-popup-time');
          const speedEl = document.getElementById('playback-popup-speed');
          const statusEl = document.getElementById('playback-popup-status');
          if (timeEl) timeEl.innerText = `⏱ Time: ${activePt.time}`;
          if (speedEl) speedEl.innerText = `⚡ Speed: ${activePt.speed}`;
          if (statusEl) statusEl.innerText = `📍 Status: ${activePt.status}`;
        }

        // Pan map to follow active point during playback
        if (activePt && activePt.lat !== null && activePt.lng !== null && !(activePt.lat === 0 && activePt.lng === 0) && !isNaN(activePt.lat) && !isNaN(activePt.lng)) {
          try {
            if (typeof map.panTo === 'function') {
              try {
                map.panTo({ lat: activePt.lat, lng: activePt.lng });
              } catch (_) {
                map.panTo([activePt.lng, activePt.lat]); // Mapbox GL format
              }
            } else if (typeof map.setCenter === 'function') {
              map.setCenter({ lat: activePt.lat, lng: activePt.lng });
            } else if (typeof map.setView === 'function') {
              map.setView([activePt.lat, activePt.lng]);
            }
          } catch (e) {
            console.warn("Failed to pan map:", e);
          }
        }
      }
    } catch (err) {
        console.error("renderLayers caught an error:", err);
      }
    }
  }, [route, activePointIndex, selectedEmployeeName, sdkReady, mapContainerId]);

  // Fit bounds when play starts
  const prevIsPlaying = useRef(false);
  useEffect(() => {
    if (isPlaying && !prevIsPlaying.current && mapRef.current && route && route.length > 0) {
      const map = mapRef.current;
      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
      let validPoints = 0;
      route.forEach(pt => {
        const lat = Number(pt.lat);
        const lng = Number(pt.lng);
        if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          validPoints++;
        }
      });

      if (validPoints > 0 && minLat <= 90 && maxLat >= -90 && minLng <= 180 && maxLng >= -180) {
        try {
          const L = (window as any).L;
          if (L && typeof L.latLngBounds === 'function' && typeof L.latLng === 'function') {
            const bounds = L.latLngBounds(
              L.latLng(minLat, minLng),
              L.latLng(maxLat, maxLng)
            );
            map.fitBounds(bounds, { padding: [60, 60] });
          } else if (map.fitBounds) {
            map.fitBounds([
              [minLng, minLat],
              [maxLng, maxLat]
            ], { padding: 60 });
          }
        } catch (e) {
          console.error("PlaybackMap fitBounds error:", e);
        }
      }
    }
    prevIsPlaying.current = !!isPlaying;
  }, [isPlaying, route]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        try {
          // Mapbox GL JS (which Mappls uses) crashes on unmount if the map style hasn't fully loaded
          // because map.remove() blindly calls map.style.destroy(). We patch it here:
          if (!mapRef.current.style) {
            mapRef.current.style = { destroy: () => {} };
          }
          mapRef.current.remove();
        } catch (_) {}
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", minHeight: "300px", position: "relative" }}>
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

      {!route || route.length === 0 ? (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-secondary)",
          zIndex: 20,
          padding: "20px",
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "16px",
            border: "1px solid rgba(37, 99, 235, 0.20)",
            padding: "28px 36px",
            maxWidth: "360px",
            textAlign: "center",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "14px"
          }}>
            <div style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "rgba(37, 99, 235, 0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.43 9.43a3 3 0 0 0 4.14 4.14" />
                <path d="M18.8 13.2a14 14 0 0 0-4.3-7.8l-1.3-1.2a1.8 1.8 0 0 0-2.4 0L9.5 5.4a14 14 0 0 0-3.3 5A10.9 10.9 0 0 0 6 12c0 5.25 6 10 6 10s3-2.25 4.5-4.5" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#1e293b", margin: 0, fontFamily: "var(--font-hanken), sans-serif" }}>No movement data</h3>
              <p style={{ fontSize: "13px", color: "#64748b", margin: "6px 0 0 0", lineHeight: "1.5", fontFamily: "var(--font-hanken), sans-serif" }}>
                This agent has no location logs for the selected date.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div
        id={mapContainerId}
        style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }}
      />
    </div>
  );
}
