"use client";
 
import { useState, useEffect, useRef } from "react";
import { Map, Plus, Trash2, MapPin, X, Send, Eye, Pencil } from "lucide-react";
import { geofenceApi, mapApi } from "@/lib/api-client";
import { loadMapplsSDK, fetchMapToken } from "@/lib/mappls-loader";
import { parseCoordinate } from "@/lib/parseCoordinate";
 
interface Territory {
  id: string;
  name: string;
  description: string;
  polygon: any;
  _count?: {
    users: number;
  };
}
 
export default function TerritorySetupPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
 
  // Picker Map Refs & Autocomplete State
  const pickerMapRef = useRef<any>(null);
  const pickerMarkerRef = useRef<any>(null);
  const pickerCircleRef = useRef<any>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
 
  // New Territory Form State
  const [form, setForm] = useState({
    name: "",
    description: "",
    lat: "22.786999", // default Jamshedpur center
    lng: "86.184998",
    centerLat: "22.786999",
    centerLng: "86.184998",
    radius: "300"
  });
 
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
 
  const fetchTerritories = async () => {
    setIsLoading(true);
    try {
      const res = await geofenceApi.getZones();
      if (res && (res as any).data) {
        setTerritories((res as any).data || []);
      }
    } catch (err) {
      console.error("Failed to fetch territories:", err);
    } finally {
      setIsLoading(false);
    }
  };
 
  useEffect(() => {
    fetchTerritories();
  }, []);
 
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this territory?")) return;
    try {
      await geofenceApi.deleteZone(id);
      fetchTerritories();
    } catch (err: any) {
      alert(err.message || "Failed to delete territory.");
    }
  };
 
  const handleEditClick = (t: Territory) => {
    setEditId(t.id);
    let latVal = 22.786999;
    let lngVal = 86.184998;
    
    // Estimate center from polygon for the map picker
    if (t.polygon && t.polygon.coordinates && t.polygon.coordinates[0].length > 0) {
      const coords = t.polygon.coordinates[0];
      let avgLng = 0, avgLat = 0;
      coords.forEach((pt: any) => { avgLng += pt[0]; avgLat += pt[1]; });
      lngVal = avgLng / coords.length;
      latVal = avgLat / coords.length;
    }
 
    setForm({
      name: t.name,
      description: t.description || "",
      lat: latVal.toString(),
      lng: lngVal.toString(),
      centerLat: latVal.toString(),
      centerLng: lngVal.toString(),
      radius: "300" // We don't store radius natively in backend, using default for picker
    });
    setSearchQuery("");
    setSuggestions([]);
    setShowModal(true);
  };

  const handleMarkerDragEnd = async (e: any) => {
    const newLat = e.lngLat?.lat ?? e.latlng?.lat ?? e.lat;
    const newLng = e.lngLat?.lng ?? e.latlng?.lng ?? e.lng;
    if (newLat && newLng) {
      setForm(p => ({
        ...p,
        lat: newLat.toFixed(6),
        lng: newLng.toFixed(6),
        centerLat: newLat.toFixed(6),
        centerLng: newLng.toFixed(6)
      }));
      try {
        const res = await mapApi.reverseGeocode(newLat, newLng);
        const formattedAddress = res.data?.results?.[0]?.formatted_address || `${newLat.toFixed(6)}, ${newLng.toFixed(6)}`;
        setSearchQuery(formattedAddress);
      } catch (err) {
        console.error("Reverse geocoding failed on dragend:", err);
      }
    }
  };

  const handleCoordinateChange = (field: 'lat' | 'lng', value: string) => {
    const isMultiFormat = /[°'"度,]/g.test(value) || (value.trim().split(/\s+/).length >= 2 && !/^-?[\d.]+$/.test(value.trim()));
    
    if (isMultiFormat) {
      const parsed = parseCoordinate(value);
      if (parsed) {
        setForm(p => ({
          ...p,
          lat: parsed.lat.toFixed(6),
          lng: parsed.lng.toFixed(6),
          centerLat: parsed.lat.toFixed(6),
          centerLng: parsed.lng.toFixed(6)
        }));
        return;
      }
    }

    setForm(p => ({
      ...p,
      [field]: value,
      [field === 'lat' ? 'centerLat' : 'centerLng']: value
    }));
  };

  // Map initialization inside Modal
  useEffect(() => {
    if (!showModal) {
      pickerMapRef.current = null;
      pickerMarkerRef.current = null;
      pickerCircleRef.current = null;
      return;
    }

    let active = true;

    const initMap = async () => {
      try {
        await loadMapplsSDK();
        if (!active) return;
        setSdkReady(true);

        // Wait for container to be rendered in DOM
        setTimeout(() => {
          if (!active) return;
          const container = document.getElementById("mappls-picker-map");
          if (!container) return;

          const mappls = (window as any).mappls;
          const initialLat = parseFloat(form.lat) || 22.786999;
          const initialLng = parseFloat(form.lng) || 86.184998;
          const initialRadius = parseFloat(form.radius) || 300;

          const mapObj = new mappls.Map("mappls-picker-map", {
            center: { lat: initialLat, lng: initialLng },
            zoom: 14,
            zoomControl: true,
            search: false,
          });

          pickerMapRef.current = mapObj;

          mapObj.on("load", () => {
            if (!active) return;

            // Add marker
            const markerObj = new mappls.Marker({
              map: mapObj,
              position: { lat: initialLat, lng: initialLng },
              draggable: true,
            });
            pickerMarkerRef.current = markerObj;
            markerObj.on("dragend", handleMarkerDragEnd);

            // Add circle geofence outline
            const circleObj = new mappls.Circle({
              map: mapObj,
              center: { lat: initialLat, lng: initialLng },
              radius: initialRadius,
              fillColor: "#4f8ef7",
              fillOpacity: 0.15,
              strokeColor: "#4f8ef7",
              strokeWeight: 2,
            });
            pickerCircleRef.current = circleObj;
          });

          // Bind map click to pin marker and set form values
          mapObj.on("click", async (e: any) => {
            const clickedLat = e.latlng?.lat ?? e.lngLat?.lat;
            const clickedLng = e.latlng?.lng ?? e.lngLat?.lng;
            if (clickedLat && clickedLng) {
              setForm(p => ({
                ...p,
                lat: clickedLat.toFixed(6),
                lng: clickedLng.toFixed(6),
                centerLat: clickedLat.toFixed(6),
                centerLng: clickedLng.toFixed(6)
              }));
              try {
                const res = await mapApi.reverseGeocode(clickedLat, clickedLng);
                const formattedAddress = res.data?.results?.[0]?.formatted_address || `${clickedLat.toFixed(6)}, ${clickedLng.toFixed(6)}`;
                setSearchQuery(formattedAddress);
              } catch (err) {
                console.error("Reverse geocoding failed on click:", err);
              }
            }
          });
        }, 100);
      } catch (err) {
        console.error("Failed to load picker map:", err);
      }
    };

    initMap();

    return () => {
      active = false;
    };
  }, [showModal]);

  // Synchronize form changes with map view
  useEffect(() => {
    if (!showModal || !pickerMapRef.current) return;

    const latVal = parseFloat(form.lat);
    const lngVal = parseFloat(form.lng);
    const radiusVal = parseFloat(form.radius);

    if (isNaN(latVal) || isNaN(lngVal)) return;

    const mappls = (window as any).mappls;
    const mapObj = pickerMapRef.current;

    // Pan map to new center aggressively
    try {
      if (typeof mapObj.panTo === 'function') {
        mapObj.panTo({ lat: latVal, lng: lngVal });
      } else {
        mapObj.setCenter({ lat: latVal, lng: lngVal });
      }
    } catch (err) {
      console.warn("Failed to pan map:", err);
    }

    // Update marker position
    if (pickerMarkerRef.current) {
      try {
        pickerMarkerRef.current.setPosition({ lat: latVal, lng: lngVal });
      } catch (_) { }
    } else {
      try {
        const markerObj = new mappls.Marker({
          map: mapObj,
          position: { lat: latVal, lng: lngVal },
          draggable: true
        });
        pickerMarkerRef.current = markerObj;
        markerObj.on("dragend", handleMarkerDragEnd);
      } catch (_) { }
    }

    // Update circle radius/position
    if (pickerCircleRef.current) {
      try { mappls.remove({ map: mapObj, layer: pickerCircleRef.current }); } catch (_) { }
    }
    if (!isNaN(radiusVal)) {
      try {
        pickerCircleRef.current = new mappls.Circle({
          map: mapObj,
          center: { lat: latVal, lng: lngVal },
          radius: radiusVal,
          fillColor: "#4f8ef7",
          fillOpacity: 0.15,
          strokeColor: "#4f8ef7",
          strokeWeight: 2,
        });
      } catch (_) { }
    }
  }, [form.lat, form.lng, form.radius, showModal]);

  // Handle autocomplete location search
  const handleSearchInput = (val: string) => {
    setSearchQuery(val);
    if (val.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const jwt = localStorage.getItem("auth_token");
        // ✅ Remove the extra "/v1" – base URL already includes it
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/map/search?query=${encodeURIComponent(val)}`,
          {
            headers: { Authorization: `Bearer ${jwt}` },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            // Token is expired or invalid
            localStorage.removeItem("auth_token");
            window.location.href = "/login";
            return;
          }
          throw new Error(`Search failed: ${response.status}`);
        }

        const result = await response.json();
        setSuggestions(result.data?.suggestions || []);
      } catch (err) {
        console.error("Location search error:", err);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500ms debounce
  };

  const handleSelectSuggestion = async (loc: any) => {
    let latVal = parseFloat(loc.lat || loc.latitude);
    let lngVal = parseFloat(loc.lng || loc.longitude);
    
    const applyLocation = (lat: number, lng: number) => {
      setForm(p => ({
        ...p,
        lat: lat.toFixed(6),
        lng: lng.toFixed(6),
        centerLat: lat.toFixed(6),
        centerLng: lng.toFixed(6),
        name: p.name || loc.placeName || ""
      }));
      setSearchQuery(loc.placeName || loc.placeAddress || "");
      setSuggestions([]);
    };

    if (!isNaN(latVal) && !isNaN(lngVal)) {
      applyLocation(latVal, lngVal);
      return;
    }

    // MapmyIndia API key tier restricts lat/lng and only returns eLoc for obscure places.
    // We use `getPinDetails` to securely resolve it.
    // CRITICAL: NEVER pass `map` to getPinDetails, as Mappls SDK v3 crashes internally (TypeError: push/hasImage).
    setIsSearching(true);
    
    try {
      if (loc.eLoc && typeof (window as any).mappls?.getPinDetails === 'function') {
        (window as any).mappls.getPinDetails({ 
          pin: loc.eLoc, 
          callback: (data: any) => {
            if (data && (data.lat || data.latitude || data.lng || data.longitude)) {
              const finalLat = parseFloat(data.lat || data.latitude);
              const finalLng = parseFloat(data.lng || data.longitude);
              applyLocation(finalLat, finalLng);
              setIsSearching(false);
            } else {
              fallbackGeocoding(loc);
            }
          }
        });
      } else {
        fallbackGeocoding(loc);
      }
    } catch (err) {
      console.warn("Mappls getPinDetails failed", err);
      fallbackGeocoding(loc);
    }
  };

  const fallbackGeocoding = async (loc: any) => {
    try {
      // 1. Try highly specific query
      let searchTerms = [loc.placeName, loc.placeAddress].filter(Boolean).join(', ');
      
      // 2. Prepare progressively broader queries (fallback strategies)
      const queriesToTry = [searchTerms];
      if (loc.placeAddress) {
        queriesToTry.push(loc.placeAddress);
        const parts = loc.placeAddress.split(',').map((p: string) => p.trim());
        if (parts.length > 3) {
           // Try just the city, state, zip (e.g. "Jamshedpur, Jharkhand, 831017")
           queriesToTry.push(parts.slice(-3).join(', '));
        }
        if (parts.length > 2) {
           // Try just city and state
           queriesToTry.push(parts.slice(-2).join(', '));
        }
      }

      let foundCoords: [number, number] | null = null;
      
      for (const q of queriesToTry) {
        const photonRes = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1`);
        const photonData = await photonRes.json();
        if (photonData.features && photonData.features.length > 0) {
          foundCoords = photonData.features[0].geometry.coordinates;
          break; // Found a match!
        }
      }
      
      if (foundCoords) {
        const lat = foundCoords[1];
        const lng = foundCoords[0];
        setForm(p => ({
          ...p,
          lat: lat.toFixed(6),
          lng: lng.toFixed(6),
          centerLat: lat.toFixed(6),
          centerLng: lng.toFixed(6),
          name: p.name || loc.placeName || ""
        }));
        setSearchQuery(loc.placeName || loc.placeAddress || "");
        setSuggestions([]);
      } else {
        setSearchQuery(loc.placeName || loc.placeAddress || "");
        setSuggestions([]);
        alert("This specific location's coordinates are hidden by Mappls. Please manually click on the map to drop the pin.");
      }
    } catch (err) {
      console.error("Fallback geocoding failed", err);
      setSuggestions([]);
      alert("Failed to find coordinates. Please manually click on the map.");
    } finally {
      setIsSearching(false);
    }
  };

  // Helper: generates circular polygon coordinates
  const generateCirclePolygon = (lat: number, lng: number, radiusMeters: number, numPoints: number = 32) => {
    const coords = [];
    const km = radiusMeters / 1000;
    const kRadius = 6371; // Earth radius in km

    const rLat = (lat * Math.PI) / 180;
    const rLng = (lng * Math.PI) / 180;
    const d = km / kRadius; // angular distance in radians

    for (let i = 0; i <= numPoints; i++) {
      const angle = (i * 2 * Math.PI) / numPoints;
      const pLat = Math.asin(
        Math.sin(rLat) * Math.cos(d) +
        Math.cos(rLat) * Math.sin(d) * Math.cos(angle)
      );
      const pLng =
        rLng +
        Math.atan2(
          Math.sin(angle) * Math.sin(d) * Math.cos(rLat),
          Math.cos(d) - Math.sin(rLat) * Math.sin(pLat)
        );
      const latDeg = (pLat * 180) / Math.PI;
      const lngDeg = (pLng * 180) / Math.PI;
      coords.push([lngDeg, latDeg]); // GeoJSON expects [lng, lat]
    }
    return {
      type: "Polygon",
      coordinates: [coords],
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const latVal = parseFloat(form.lat);
    const lngVal = parseFloat(form.lng);
    const radiusVal = parseFloat(form.radius);

    if (isNaN(latVal) || isNaN(lngVal) || isNaN(radiusVal)) {
      alert("Invalid latitude, longitude, or radius values.");
      return;
    }

    try {
      const polygon = generateCirclePolygon(latVal, lngVal, radiusVal);
      
      if (editId) {
        await geofenceApi.updateZone(editId, {
          name: form.name,
          description: form.description,
          polygon
        });
      } else {
        await geofenceApi.createZone({
          name: form.name,
          description: form.description,
          polygon
        });
      }

      setShowModal(false);
      setEditId(null);
      setForm({
        name: "",
        description: "",
        lat: "22.786999",
        lng: "86.184998",
        centerLat: "22.786999",
        centerLng: "86.184998",
        radius: "300"
      });
      fetchTerritories();
    } catch (err: any) {
      alert(err.message || `Failed to ${editId ? 'update' : 'create'} territory.`);
    }
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="page-title" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Map size={24} color="var(--accent-blue)" /> Territory Setup
          </div>
          <div className="page-subtitle">Define operational zones, assign regions, and manage geographical boundaries.</div>
        </div>
        <button
          className="btn-primary"
          style={{ display: "flex", alignItems: "center", gap: "6px", height: "36px", fontSize: "13px" }}
          onClick={() => {
            setEditId(null);
            setForm({
              name: "",
              description: "",
              lat: "22.786999",
              lng: "86.184998",
              centerLat: "22.786999",
              centerLng: "86.184998",
              radius: "300"
            });
            setShowModal(true);
          }}
        >
          <Plus size={16} /> New Territory
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton-card" style={{ height: "180px", padding: "20px", display: "flex", flexDirection: "column", gap: "16px", borderLeft: "4px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div className="skeleton-line" style={{ width: "60%" }} />
                  <div className="skeleton-line" style={{ width: "80%", height: "10px" }} />
                  <div className="skeleton-line" style={{ width: "40%", height: "10px" }} />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <div className="skeleton-box" style={{ width: "28px", height: "28px", borderRadius: "4px" }} />
                  <div className="skeleton-box" style={{ width: "28px", height: "28px", borderRadius: "4px" }} />
                </div>
              </div>
              <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="skeleton-line" style={{ width: "40%", height: "12px" }} />
                <div className="skeleton-line" style={{ width: "20%", height: "12px" }} />
              </div>
              <div className="skeleton-line" style={{ width: "30%", height: "10px", marginTop: "4px" }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" }}>
          {territories.map((t) => {
            // Find a center coordinate estimate from polygon for display
            let displayCoords = "No coordinates";
            if (t.polygon && t.polygon.coordinates && t.polygon.coordinates[0]) {
              const coords = t.polygon.coordinates[0];
              if (coords.length > 0) {
                // average latitude & longitude to find centroid
                let avgLng = 0, avgLat = 0;
                coords.forEach((pt: any) => { avgLng += pt[0]; avgLat += pt[1]; });
                avgLng /= coords.length;
                avgLat /= coords.length;
                displayCoords = `${avgLat.toFixed(6)}, ${avgLng.toFixed(6)}`;
              }
            }

            return (
              <div key={t.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{t.name}</h3>
                    <span style={{ fontSize: "12px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                      <MapPin size={12} /> {displayCoords}
                    </span>
                  </div>
                  <span className="badge badge-green">Active</span>
                </div>

                <p style={{ margin: 0, fontSize: "13px", color: "var(--text-secondary)", minHeight: "38px" }}>
                  {t.description || "No description provided."}
                </p>

                <div style={{ display: "flex", gap: "16px", padding: "12px", background: "var(--bg-secondary)", borderRadius: "4px", border: "1px solid var(--border)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Executives Assigned</div>
                    <div style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-jetbrains)" }}>
                      {t._count?.users ?? 0}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                  <button
                    onClick={() => handleEditClick(t)}
                    style={{ background: "none", border: "none", color: "var(--accent-blue)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 600 }}
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    style={{ background: "none", border: "none", color: "var(--accent-red)", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 600 }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
          {territories.length === 0 && (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "40px", color: "var(--text-secondary)", background: "var(--bg-card)", border: "1px dashed var(--border)" }}>
              No territories defined yet. Click "New Territory" to set up your first boundary.
            </div>
          )}
        </div>
      )}

      {/* New Territory Modal */}
      {showModal && (
        <div className="modal-overlay" style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundColor: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)",
          zIndex: 9999
        }} onClick={() => {
          setShowModal(false);
          setSearchQuery("");
          setSuggestions([]);
        }}>
          <div className="modal-box" style={{ 
            maxWidth: "600px", 
            width: "90%",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            padding: "12px 16px" 
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexShrink: 0 }}>
              <h3 style={{ fontWeight: 700, fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Map size={18} color="var(--accent-blue)" /> {editId ? "Edit Territory Boundary" : "New Territory Boundary"}
              </h3>
              <button onClick={() => {
                setShowModal(false);
                setSearchQuery("");
                setSuggestions([]);
              }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1.5fr", gap: "8px", alignItems: "start", flexShrink: 0 }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Territory Name *</label>
                  <input
                    type="text"
                    className="input"
                    style={{ padding: "6px 10px", fontSize: "12px" }}
                    placeholder="e.g. Bistupur"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Description</label>
                  <input
                    type="text"
                    className="input"
                    style={{ padding: "6px 10px", fontSize: "12px" }}
                    placeholder="Optional..."
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>

                {/* Autocomplete Location Search */}
                <div style={{ position: "relative" }}>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Search Location</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type="text"
                      className="input"
                      style={{ padding: "6px 24px 6px 10px", fontSize: "12px" }}
                      placeholder="Type to search..."
                      value={searchQuery}
                      onChange={(e) => handleSearchInput(e.target.value)}
                    />
                    {isSearching && (
                      <span style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", fontSize: "10px", color: "var(--text-muted)", fontWeight: 600 }}>
                        ...
                      </span>
                    )}
                  </div>
                  {suggestions.length > 0 && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      width: "100%",
                      maxHeight: "150px",
                      overflowY: "auto",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: "4px",
                      zIndex: 1000,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                    }}>
                      {suggestions.map((loc, idx) => (
                        <div
                          key={idx}
                          onClick={() => handleSelectSuggestion(loc)}
                          style={{
                            padding: "6px 10px",
                            fontSize: "11px",
                            cursor: "pointer",
                            borderBottom: idx < suggestions.length - 1 ? "1px solid var(--border)" : "none",
                            color: "var(--text-primary)",
                            backgroundColor: "var(--bg-card)"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "var(--bg-hover)"}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "var(--bg-card)"}
                        >
                          <strong style={{ display: "block", color: "var(--text-primary)" }}>{loc.placeName || "Location"}</strong>
                          <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>{loc.placeAddress || "Address"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Map Canvas */}
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "200px" }}>
                <div
                  id="mappls-picker-map"
                  style={{
                    width: "100%",
                    flex: 1,
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    overflow: "hidden"
                  }}
                ></div>
                <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "4px", textAlign: "right", flexShrink: 0 }}>
                  Interactive Map (Click/Drag pin to set location)
                </div>
              </div>
 
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: "8px", alignItems: "center", flexShrink: 0 }}>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Center Latitude *</label>
                  <input
                    type="text"
                    className="input"
                    style={{ padding: "6px 10px", fontSize: "12px" }}
                    value={form.centerLat}
                    onChange={(e) => handleCoordinateChange('lat', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>Center Longitude *</label>
                  <input
                    type="text"
                    className="input"
                    style={{ padding: "6px 10px", fontSize: "12px" }}
                    value={form.centerLng}
                    onChange={(e) => handleCoordinateChange('lng', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "4px" }}>
                    Radius: <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{form.radius}m</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="2000"
                    step="50"
                    style={{ width: "100%", cursor: "pointer", marginTop: "4px" }}
                    value={form.radius}
                    onChange={(e) => setForm((p) => ({ ...p, radius: e.target.value }))}
                  />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ padding: "8px", fontSize: "13px", width: "100%", justifyContent: "center", display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, marginTop: "4px" }}>
                <Send size={14} /> {editId ? "Save Changes" : "Create Territory"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
