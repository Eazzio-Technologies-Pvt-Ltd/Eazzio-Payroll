"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Building, 
  MapPin, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowRight, 
  Clock, 
  Calendar, 
  User, 
  Check, 
  Globe, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Eye,
  AlertTriangle,
  RotateCcw,
  Users,
  Compass,
  ArrowLeft,
  Zap
} from "lucide-react";
import { loadMapplsSDK } from "@/lib/mappls-loader";

// Interface definitions
interface LocationData {
  id: number;
  name: string;
  address: string;
  city: string;
  country: string;
  lat?: number;
  lng?: number;
  radius?: number;
  accuracy?: number;
  autoDetected?: boolean;
}

interface ShiftData {
  id: number;
  name: string;
  starts: string;
  ends: string;
  grace: number;
  halfDay: number;
  color?: string;
}

interface HolidayData {
  id: number | string;
  name: string;
  date: string;
  desc: string;
}

interface SetupStore {
  initializedGeo: boolean;
  locations: LocationData[];
  schedule: {
    departments: string[];
    days: Record<string, boolean | string>;
    leaves: {
      privilege: number;
      sick: number;
      lwp: number;
      custom: Array<{ name: string; days: number; carryForward: boolean }>;
    };
    shifts: ShiftData[];
    flexi: {
      active: boolean;
      name: string;
      workHours: number;
      halfDay: number;
    };
  };
  holidays: HolidayData[];
}

export default function AdminSetupPage() {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const mapMarkersRef = useRef<any[]>([]);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  
  // Tab/Navigation State
  const [activeTab, setActiveTab] = useState<"locations" | "schedule" | "holidays" | "employees" | "customers" | "finish">("locations");
  const [completedTabs, setCompletedTabs] = useState<Record<string, boolean>>({});

  // ---------------- STATE MANAGEMENT ----------------
  const currentYear = new Date().getFullYear();
  const [store, setStore] = useState<SetupStore>({
    initializedGeo: false,
    locations: [],
    schedule: {
      departments: ['Sales', 'Marketing', 'Accounts', 'Human Resources', 'Information Technology'],
      days: { 'Monday': true, 'Tuesday': true, 'Wednesday': true, 'Thursday': true, 'Friday': true, 'Saturday': false, 'Sunday': false },
      leaves: { privilege: 21, sick: 7, lwp: 30, custom: [] },
      shifts: [], // loaded dynamically
      flexi: { active: false, name: 'General (Flexi)', workHours: 9, halfDay: 5 }
    },
    holidays: [
      { id: 1, name: "New Year's Day", date: `${currentYear}-01-01`, desc: "Start of the new year" },
      { id: 2, name: "Spring Festival", date: `${currentYear}-03-20`, desc: "Spring celebration" },
      { id: 3, name: "Labour Day", date: `${currentYear}-05-01`, desc: "International Workers' Day" },
      { id: 4, name: "Autumn Break", date: `${currentYear}-09-15`, desc: "Mid-year break" },
      { id: 5, name: "Christmas Day", date: `${currentYear}-12-25`, desc: "Christmas celebration" }
    ]
  });

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modal States
  const [locModalOpen, setLocModalOpen] = useState(false);
  const [locForm, setLocForm] = useState<{
    id: string;
    name: string;
    address: string;
    city: string;
    country: string;
    radius: number;
    lat?: number;
    lng?: number;
    accuracy?: number;
  }>({ id: "", name: "", address: "", city: "", country: "", radius: 50 });

  const [holModalOpen, setHolModalOpen] = useState(false);
  const [holForm, setHolForm] = useState({ id: "", name: "", date: "", desc: "" });

  // Autocomplete & Banner States
  const [autocompleteResults, setAutocompleteResults] = useState<any[]>([]);
  const [locLoadingBanner, setLocLoadingBanner] = useState(false);
  const [locSuccessBanner, setLocSuccessBanner] = useState(false);
  const [locSuccessText, setLocSuccessText] = useState("");
  const [locDeniedText, setLocDeniedText] = useState(false);
  const [locAccuracyWarning, setLocAccuracyWarning] = useState(false);
  const [locAccuracyVal, setLocAccuracyVal] = useState(0);

  // Calendar State
  const [currentCalDate, setCurrentCalDate] = useState(new Date());
  const [importCountry, setImportCountry] = useState("en.indian");
  const [importYear, setImportYear] = useState(currentYear);
  const [importLoading, setImportLoading] = useState(false);

  // Show Toast helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Load from local storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("adminSetupData");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setStore(parsed);
        } catch (e) {
          console.error("Error parsing adminSetupData", e);
        }
      } else {
        // Initialize default shifts with current timestamp
        const initialShifts = [{ id: Date.now(), name: 'A', starts: '09:30', ends: '18:30', grace: 30, halfDay: 5, color: '#3b82f6' }];
        const freshStore = {
          ...store,
          schedule: {
            ...store.schedule,
            shifts: initialShifts
          }
        };
        setStore(freshStore);
        localStorage.setItem("adminSetupData", JSON.stringify(freshStore));
      }
    }

    // Load Mappls SDK
    loadMapplsSDK()
      .then(() => setSdkReady(true))
      .catch((err) => {
        console.error("Mappls SDK load error:", err);
        setSdkError(err.message || "Failed to load Mappls SDK");
      });
  }, []);

  // Sync Store
  const saveStore = (updatedStore: SetupStore) => {
    setStore(updatedStore);
    if (typeof window !== "undefined") {
      localStorage.setItem("adminSetupData", JSON.stringify(updatedStore));
    }
  };

  // ---------------- GEOLOCATION DETECT ON MOUNT ----------------
  useEffect(() => {
    if (activeTab === "locations" && store.locations.length === 0 && !store.initializedGeo) {
      detectOfficeLocation();
    }
  }, [activeTab, store.locations.length]);

  const detectOfficeLocation = async () => {
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      setLocLoadingBanner(true);
      setLocDeniedText(false);

      const getPos = (opts?: PositionOptions) => 
        new Promise<GeolocationPosition>((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, opts));

      try {
        let position: GeolocationPosition;
        try {
          // Attempt GPS accuracy
          position = await getPos({ enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
        } catch {
          // Fallback
          position = await getPos({ enableHighAccuracy: false, timeout: 10000 });
        }

        setLocLoadingBanner(false);
        const { latitude, longitude, accuracy } = position.coords;

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, { headers: { 'User-Agent': 'AdminSetupApp/1.0' } });
          const data = await res.json();

          let city = data.address.city || data.address.town || data.address.county || 'Unknown';
          let country = data.address.country || 'Unknown';
          let pincode = data.address.postcode || '';
          let address = data.display_name || `${latitude}, ${longitude}`;
          if (pincode && address && !address.includes(pincode)) address += `, ${pincode}`;

          const newLoc: LocationData = {
            id: Date.now(),
            name: "Auto-detected Office (Headquarters)",
            address: address,
            city: city,
            country: country,
            lat: latitude,
            lng: longitude,
            accuracy: Math.round(accuracy),
            autoDetected: true,
            radius: 50
          };

          const updatedStore = {
            ...store,
            initializedGeo: true,
            locations: [...store.locations, newLoc]
          };
          saveStore(updatedStore);

          setLocSuccessText(`Location detected — ${city}, ${country}. Please verify and edit if needed.`);
          setLocSuccessBanner(true);
        } catch (e) {
          showToast("Could not reverse geocode coordinates. Please enter manually.", "error");
          openLocModal();
        }
      } catch (err) {
        setLocLoadingBanner(false);
        setLocDeniedText(true);
        const updatedStore = { ...store, initializedGeo: true };
        saveStore(updatedStore);
      }
    }
  };

  // ---------------- 1. LOCATIONS MAP ENGINE ----------------
  useEffect(() => {
    if (!sdkReady || activeTab !== "locations") return;

    const mappls = (window as any).mappls;
    const L = (window as any).L;

    if (!mappls || !L) return;

    const container = document.getElementById("map-container");
    if (!container) return;

    // Create Map
    if (!mapRef.current) {
      try {
        mapRef.current = new mappls.Map('map-container', {
          center: [20, 0],
          zoom: 2,
          zoomControl: true,
          search: false,
        });

        mapRef.current.on("load", () => {
          syncMapItems();
        });

        setTimeout(() => {
          syncMapItems();
        }, 800);
      } catch (e) {
        console.error("Map init error:", e);
      }
    } else {
      syncMapItems();
    }

    function syncMapItems() {
      const mapObj = mapRef.current;
      if (!mapObj) return;

      // Clear markers & circles
      mapMarkersRef.current.forEach(item => {
        try { mapObj.removeLayer(item); } catch (_) {}
      });
      mapMarkersRef.current = [];

      const bounds: any[] = [];

      store.locations.forEach(loc => {
        if (loc.lat && loc.lng) {
          const radius = loc.radius || 50;
          
          // Marker
          const m = L.marker([loc.lat, loc.lng], { draggable: true })
            .addTo(mapObj)
            .bindPopup(`<b>${loc.name}</b><br>${loc.city}<br>Radius: ${radius}m`);

          // Geofence Circle
          const c = L.circle([loc.lat, loc.lng], {
            radius: radius,
            color: '#2563eb',
            fillColor: '#3b82f6',
            fillOpacity: 0.15,
            weight: 2
          }).addTo(mapObj);

          mapMarkersRef.current.push(m);
          mapMarkersRef.current.push(c);
          bounds.push([loc.lat, loc.lng]);

          // Drag handles
          m.on('drag', function (e: any) {
            c.setLatLng(e.target.getLatLng());
          });

          m.on('dragend', async function (e: any) {
            const pos = e.target.getLatLng();
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.lat}&lon=${pos.lng}&zoom=18&addressdetails=1`, { headers: { 'User-Agent': 'AdminSetupApp/1.0' } });
              const data = await res.json();
              if (data && data.address) {
                let city = data.address.city || data.address.town || data.address.county || loc.city;
                let country = data.address.country || loc.country;
                let pincode = data.address.postcode || '';
                let address = data.display_name;
                if (pincode && !address.includes(pincode)) address += `, ${pincode}`;

                const updatedLocs = store.locations.map(item => {
                  if (item.id === loc.id) {
                    return {
                      ...item,
                      address,
                      city,
                      country,
                      lat: parseFloat(pos.lat.toFixed(6)),
                      lng: parseFloat(pos.lng.toFixed(6)),
                      accuracy: 10
                    };
                  }
                  return item;
                });

                saveStore({ ...store, locations: updatedLocs });
                showToast("Location updated from map pin!");
              }
            } catch (err) {
              console.error("Map geocoding failed", err);
            }
          });
        }
      });

      // Fit bounds
      if (bounds.length > 0) {
        try {
          mapObj.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
        } catch (_) {}
      } else {
        try {
          mapObj.setView([20, 0], 2);
        } catch (_) {}
      }

      // Handle Map layout refresh
      setTimeout(() => {
        try { mapObj.invalidateSize(); } catch (_) {}
      }, 200);
    }
  }, [store.locations, activeTab, sdkReady]);

  // Cleanup Map
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

  // ---------------- TAB CHANGE NAVIGATION ----------------
  const handleTabClick = (tab: typeof activeTab, index: number) => {
    // Mark prior tabs as completed
    const tabsList: Array<typeof activeTab> = ["locations", "schedule", "holidays", "employees", "customers", "finish"];
    const targetIdx = tabsList.indexOf(tab);

    const newCompleted = { ...completedTabs };
    tabsList.forEach((t, idx) => {
      if (idx < targetIdx) {
        newCompleted[t] = true;
      } else {
        newCompleted[t] = false;
      }
    });

    setCompletedTabs(newCompleted);
    setActiveTab(tab);
  };

  const nextTab = () => {
    const tabsList: Array<typeof activeTab> = ["locations", "schedule", "holidays", "employees", "customers", "finish"];
    const activeIdx = tabsList.indexOf(activeTab);

    if (activeIdx < tabsList.length - 1) {
      // Mark current tab as completed
      setCompletedTabs({
        ...completedTabs,
        [activeTab]: true
      });
      setActiveTab(tabsList[activeIdx + 1]);
    } else {
      completeSetup();
    }
  };

  // ---------------- LOCATIONS CRUDS ----------------
  const openLocModal = (id: number | null = null) => {
    if (id) {
      const loc = store.locations.find(l => l.id === id);
      if (loc) {
        setLocForm({
          id: String(loc.id),
          name: loc.name,
          address: loc.address,
          city: loc.city,
          country: loc.country,
          radius: loc.radius || 50,
          lat: loc.lat,
          lng: loc.lng,
          accuracy: loc.accuracy
        });
        if (loc.accuracy && loc.accuracy > 500) {
          setLocAccuracyVal(loc.accuracy);
          setLocAccuracyWarning(true);
        } else {
          setLocAccuracyWarning(false);
        }
      }
    } else {
      setLocForm({ id: "", name: "", address: "", city: "", country: "", radius: 50 });
      setLocAccuracyWarning(false);
    }
    setLocModalOpen(true);
  };

  const closeLocModal = () => {
    setLocModalOpen(false);
    setAutocompleteResults([]);
  };

  const handleLocSearchChange = async (val: string) => {
    setLocForm(prev => ({ ...prev, address: val }));

    if (val.trim().length < 3) {
      setAutocompleteResults([]);
      return;
    }

    // Debounced trigger or direct async
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(val)}&addressdetails=1&limit=5`, { headers: { 'User-Agent': 'AdminSetupApp/1.0' } });
      const data = await res.json();
      setAutocompleteResults(data || []);
    } catch (e) {
      console.warn("Autocomplete failed");
    }
  };

  const selectPlace = (item: any) => {
    let city = item.address.city || item.address.town || item.address.county || '';
    let country = item.address.country || '';
    let pincode = item.address.postcode || '';
    let address = item.display_name;
    if (pincode && !address.includes(pincode)) address += `, ${pincode}`;

    setLocForm(prev => ({
      ...prev,
      address,
      city,
      country,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      accuracy: 10
    }));
    setAutocompleteResults([]);
  };

  const saveLocation = async () => {
    if (!locForm.name.trim() || !locForm.address.trim()) {
      showToast("Name and Address are required.", "error");
      return;
    }

    let lat = locForm.lat;
    let lng = locForm.lng;
    let accuracy = locForm.accuracy || 50;

    // Trigger geocoding fallback if no lat/lng selected
    if (!lat || !lng) {
      try {
        const query = encodeURIComponent(`${locForm.address}, ${locForm.city}, ${locForm.country}`);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, { headers: { 'User-Agent': 'AdminSetupApp/1.0' } });
        const geoData = await res.json();
        if (geoData && geoData.length > 0) {
          lat = parseFloat(parseFloat(geoData[0].lat).toFixed(6));
          lng = parseFloat(parseFloat(geoData[0].lon).toFixed(6));
          accuracy = 50;
        }
      } catch (e) {
        console.warn("Geocoding failed for manual entry");
      }
    } else {
      lat = parseFloat(lat.toFixed(6));
      lng = parseFloat(lng.toFixed(6));
    }

    const updatedLoc: LocationData = {
      id: locForm.id ? Number(locForm.id) : Date.now(),
      name: locForm.name.trim(),
      address: locForm.address.trim(),
      city: locForm.city.trim(),
      country: locForm.country.trim(),
      radius: Number(locForm.radius) || 50,
      lat,
      lng,
      accuracy
    };

    let newLocations = [...store.locations];
    if (locForm.id) {
      newLocations = newLocations.map(l => l.id === Number(locForm.id) ? updatedLoc : l);
      showToast("Location updated successfully!");
    } else {
      newLocations.push(updatedLoc);
      showToast("Location added successfully!");
    }

    saveStore({ ...store, locations: newLocations });
    closeLocModal();
  };

  const deleteLocation = (id: number) => {
    if (confirm("Delete this location?")) {
      const newLocs = store.locations.filter(l => l.id !== id);
      saveStore({ ...store, locations: newLocs });
      showToast("Location removed.");
    }
  };

  // ---------------- 2. WORK SCHEDULE OPERATIONS ----------------
  const handleUpdateDept = (idx: number, val: string) => {
    const newDepts = [...store.schedule.departments];
    if (val.trim()) {
      newDepts[idx] = val;
    } else {
      newDepts.splice(idx, 1);
    }
    saveStore({
      ...store,
      schedule: { ...store.schedule, departments: newDepts }
    });
  };

  const handleAddDept = () => {
    saveStore({
      ...store,
      schedule: {
        ...store.schedule,
        departments: [...store.schedule.departments, "New Department"]
      }
    });
  };

  const handleDeleteDept = (idx: number) => {
    const newDepts = store.schedule.departments.filter((_, i) => i !== idx);
    saveStore({
      ...store,
      schedule: { ...store.schedule, departments: newDepts }
    });
  };

  const handleToggleDay = (day: string) => {
    const currentVal = store.schedule.days[day];
    const newDays = {
      ...store.schedule.days,
      [day]: !currentVal
    };
    saveStore({
      ...store,
      schedule: { ...store.schedule, days: newDays }
    });
  };

  const handleToggleSat = (checked: boolean) => {
    const newDays = {
      ...store.schedule.days,
      Saturday: checked ? true : false
    };
    saveStore({
      ...store,
      schedule: { ...store.schedule, days: newDays }
    });
  };

  const handleUpdateSatRule = (val: string) => {
    const newDays = {
      ...store.schedule.days,
      Saturday: val === "true" ? true : val
    };
    saveStore({
      ...store,
      schedule: { ...store.schedule, days: newDays }
    });
  };

  const handleUpdateStdLeave = (type: 'privilege' | 'sick' | 'lwp', val: string) => {
    saveStore({
      ...store,
      schedule: {
        ...store.schedule,
        leaves: {
          ...store.schedule.leaves,
          [type]: parseInt(val) || 0
        }
      }
    });
  };

  const handleAddCustomLeave = () => {
    saveStore({
      ...store,
      schedule: {
        ...store.schedule,
        leaves: {
          ...store.schedule.leaves,
          custom: [...store.schedule.leaves.custom, { name: "Custom Leave", days: 1, carryForward: false }]
        }
      }
    });
  };

  const handleUpdateCustomLeave = (idx: number, field: 'name' | 'days' | 'carryForward', val: any) => {
    const newCustom = store.schedule.leaves.custom.map((item, i) => {
      if (i === idx) {
        return {
          ...item,
          [field]: field === 'days' ? (parseInt(val) || 0) : val
        };
      }
      return item;
    });

    saveStore({
      ...store,
      schedule: {
        ...store.schedule,
        leaves: {
          ...store.schedule.leaves,
          custom: newCustom
        }
      }
    });
  };

  const handleDeleteCustomLeave = (idx: number) => {
    const newCustom = store.schedule.leaves.custom.filter((_, i) => i !== idx);
    saveStore({
      ...store,
      schedule: {
        ...store.schedule,
        leaves: {
          ...store.schedule.leaves,
          custom: newCustom
        }
      }
    });
  };

  const handleAddShift = () => {
    const newShift: ShiftData = {
      id: Date.now(),
      name: `Shift ${String.fromCharCode(65 + store.schedule.shifts.length)}`,
      starts: '09:00',
      ends: '17:00',
      grace: 30,
      halfDay: 4,
      color: '#10b981'
    };
    saveStore({
      ...store,
      schedule: {
        ...store.schedule,
        shifts: [...store.schedule.shifts, newShift]
      }
    });
  };

  const handleUpdateShift = (idx: number, field: keyof ShiftData, val: any) => {
    const newShifts = store.schedule.shifts.map((s, i) => {
      if (i === idx) {
        return {
          ...s,
          [field]: field === 'grace' || field === 'halfDay' ? (parseFloat(val) || 0) : val
        };
      }
      return s;
    });

    saveStore({
      ...store,
      schedule: {
        ...store.schedule,
        shifts: newShifts
      }
    });
  };

  const handleDeleteShift = (idx: number) => {
    const newShifts = store.schedule.shifts.filter((_, i) => i !== idx);
    saveStore({
      ...store,
      schedule: {
        ...store.schedule,
        shifts: newShifts
      }
    });
  };

  const handleToggleFlexi = () => {
    saveStore({
      ...store,
      schedule: {
        ...store.schedule,
        flexi: {
          ...store.schedule.flexi,
          active: !store.schedule.flexi.active
        }
      }
    });
  };

  const handleUpdateFlexi = (field: 'name' | 'workHours' | 'halfDay', val: any) => {
    saveStore({
      ...store,
      schedule: {
        ...store.schedule,
        flexi: {
          ...store.schedule.flexi,
          [field]: field === 'name' ? val : (parseFloat(val) || 0)
        }
      }
    });
  };

  // ---------------- 3. HOLIDAYS OPERATIONS ----------------
  const changeCalYear = (delta: number) => {
    const nextDate = new Date(currentCalDate);
    nextDate.setFullYear(currentCalDate.getFullYear() + delta);
    setCurrentCalDate(nextDate);
    setImportYear(nextDate.getFullYear());
  };

  const changeCalMonth = (delta: number) => {
    const nextDate = new Date(currentCalDate);
    nextDate.setMonth(currentCalDate.getMonth() + delta);
    setCurrentCalDate(nextDate);
  };

  const handleDropdownYearSync = (yearStr: string) => {
    const year = parseInt(yearStr);
    if (year && !isNaN(year)) {
      setImportYear(year);
      const nextDate = new Date(currentCalDate);
      nextDate.setFullYear(year);
      setCurrentCalDate(nextDate);
    }
  };

  const openHolModal = (id: number | string | null = null) => {
    if (id) {
      const hol = store.holidays.find(h => h.id === id);
      if (hol) {
        setHolForm({
          id: String(hol.id),
          name: hol.name,
          date: hol.date,
          desc: hol.desc
        });
      }
    } else {
      setHolForm({ id: "", name: "", date: "", desc: "" });
    }
    setHolModalOpen(true);
  };

  const saveHoliday = () => {
    if (!holForm.name.trim() || !holForm.date) {
      showToast("Name and Date are required.", "error");
      return;
    }

    const updatedHol: HolidayData = {
      id: holForm.id ? (isNaN(Number(holForm.id)) ? holForm.id : Number(holForm.id)) : Date.now(),
      name: holForm.name.trim(),
      date: holForm.date,
      desc: holForm.desc.trim() || 'Custom Holiday'
    };

    let newHolidays = [...store.holidays];
    if (holForm.id) {
      newHolidays = newHolidays.map(h => String(h.id) === String(holForm.id) ? updatedHol : h);
      showToast("Holiday updated!");
    } else {
      newHolidays.push(updatedHol);
      showToast("Holiday added!");
    }

    newHolidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    saveStore({ ...store, holidays: newHolidays });
    setHolModalOpen(false);
  };

  const deleteHoliday = (id: number | string) => {
    if (confirm("Delete this holiday?")) {
      const newHols = store.holidays.filter(h => String(h.id) !== String(id));
      saveStore({ ...store, holidays: newHols });
      showToast("Holiday deleted.");
    }
  };

  const importHolidays = async () => {
    setImportLoading(true);
    const calendarId = encodeURIComponent(`${importCountry}#holiday@group.v.calendar.google.com`);
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "mlddjdgsiiceeksvmdvagxxyghickrnvcbjl"; // mock/development standard key

    try {
      const timeMin = `${importYear}-01-01T00:00:00Z`;
      const timeMax = `${importYear}-12-31T23:59:59Z`;
      const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&key=${apiKey}`;

      const res = await fetch(url);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || 'Google API Error');
      }
      const apiData = await res.json();

      if (!apiData.items || apiData.items.length === 0) {
        showToast("No holidays found for this region/year.", "error");
        return;
      }

      let added = 0;
      const newHols = [...store.holidays];

      apiData.items.forEach((h: any) => {
        const hDate = h.start.date || (h.start.dateTime ? h.start.dateTime.split('T')[0] : null);
        if (!hDate) return;
        if (!newHols.some(existing => existing.date === hDate)) {
          newHols.push({
            id: String(Date.now() + Math.random()),
            date: hDate,
            name: h.summary,
            desc: h.description || 'Public Holiday'
          });
          added++;
        }
      });

      if (added > 0) {
        newHols.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        saveStore({ ...store, holidays: newHols });
        showToast(`Successfully imported ${added} holidays!`);
        
        // Focus calendar on January of imported year
        setCurrentCalDate(new Date(importYear, 0, 1));
      } else {
        showToast("Holidays are already up-to-date.", "error");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to fetch holidays.", "error");
    } finally {
      setImportLoading(false);
    }
  };

  // Render Holiday Calendar Grid cells helper
  const renderCalendarCells = () => {
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: React.ReactNode[] = [];

    // Empty cells for first day padding
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`pad-${i}`} className="border-b border-r border-slate-100 bg-gray-50/20"></div>);
    }

    // Days cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const hol = store.holidays.find(h => h.date === dateStr);

      const hasHol = !!hol;
      cells.push(
        <div 
          key={`day-${day}`} 
          className={`border-b border-r border-slate-100 flex flex-col justify-start items-center p-1 relative hover:bg-slate-50 transition-colors group ${hasHol ? 'bg-red-50 hover:bg-red-100/80' : ''}`}
        >
          <div className={`w-6 h-6 flex items-center justify-center rounded-full text-[13px] font-[500] mb-1 ${hasHol ? 'bg-red-500 text-white font-[700]' : 'text-slate-800'}`}>
            {day}
          </div>
          {hol && (
            <div 
              className="text-[10px] font-[700] text-red-700 leading-tight w-full px-1 overflow-hidden truncate cursor-pointer hover:underline mt-1 text-center"
              title={hol.name}
              onClick={() => openHolModal(hol.id)}
            >
              {hol.name}
            </div>
          )}
        </div>
      );
    }

    // Empty cells for end padding
    const totalCells = firstDay + daysInMonth;
    const remaining = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remaining; i++) {
      cells.push(<div key={`endpad-${i}`} className="border-b border-r border-slate-100 bg-gray-50/20"></div>);
    }

    return cells;
  };

  // ---------------- 6. FINISH wizard REDIRECTS ----------------
  const completeSetup = async () => {
    // Dynamic Confetti loading
    if (typeof window !== "undefined") {
      try {
        if (!(window as any).confetti) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js";
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load confetti"));
            document.head.appendChild(script);
          });
        }
        (window as any).confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#2563eb', '#10b981', '#f59e0b', '#ec4899'],
          zIndex: 9999
        });
      } catch (e) {
        console.warn("Confetti error:", e);
      }
    }

    setTimeout(() => {
      if (typeof window !== "undefined") {
        localStorage.setItem("adminSetupComplete", "true");
        showToast("Setup fully complete! Redirecting to dashboard...");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      }
    }, 500);
  };

  // Render Stats helper for step 6
  const renderFinishStats = () => {
    const workingDaysCount = Object.values(store.schedule.days).filter(v => v).length;
    const customLeavesTotal = store.schedule.leaves.custom.reduce((sum, l) => sum + Number(l.days), 0);
    const totalLeaves = store.schedule.leaves.privilege + store.schedule.leaves.sick + store.schedule.leaves.lwp + customLeavesTotal;
    const shiftCount = store.schedule.shifts.length + (store.schedule.flexi.active ? 1 : 0);

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-slate-50/80 rounded-xl p-6 text-center border border-slate-100 hover:scale-102 hover:shadow-md transition-all duration-300">
          <div className="text-blue-600 text-3xl mb-2 flex justify-center"><Building className="w-8 h-8" /></div>
          <div className="text-3xl font-[800] text-slate-800">{store.locations.length}</div>
          <div className="text-[11px] font-[600] tracking-wider text-slate-400 uppercase mt-1">Locations</div>
        </div>
        <div className="bg-slate-50/80 rounded-xl p-6 text-center border border-slate-100 hover:scale-102 hover:shadow-md transition-all duration-300">
          <div className="text-blue-600 text-3xl mb-2 flex justify-center"><Compass className="w-8 h-8" /></div>
          <div className="text-3xl font-[800] text-slate-800">{store.schedule.departments.length}</div>
          <div className="text-[11px] font-[600] tracking-wider text-slate-400 uppercase mt-1">Departments</div>
        </div>
        <div className="bg-slate-50/80 rounded-xl p-6 text-center border border-slate-100 hover:scale-102 hover:shadow-md transition-all duration-300">
          <div className="text-blue-600 text-3xl mb-2 flex justify-center"><Calendar className="w-8 h-8" /></div>
          <div className="text-3xl font-[800] text-slate-800">{workingDaysCount}</div>
          <div className="text-[11px] font-[600] tracking-wider text-slate-400 uppercase mt-1">Working Days</div>
        </div>
        <div className="bg-slate-50/80 rounded-xl p-6 text-center border border-slate-100 hover:scale-102 hover:shadow-md transition-all duration-300">
          <div className="text-blue-600 text-3xl mb-2 flex justify-center"><Clock className="w-8 h-8" /></div>
          <div className="text-3xl font-[800] text-slate-800">{shiftCount}</div>
          <div className="text-[11px] font-[600] tracking-wider text-slate-400 uppercase mt-1">Shifts</div>
        </div>
        <div className="bg-slate-50/80 rounded-xl p-6 text-center border border-slate-100 col-span-2 hover:scale-101 hover:shadow-md transition-all duration-300">
          <div className="text-blue-600 text-3xl mb-2 flex justify-center"><Globe className="w-8 h-8" /></div>
          <div className="text-3xl font-[800] text-slate-800">{totalLeaves}</div>
          <div className="text-[11px] font-[600] tracking-wider text-slate-400 uppercase mt-1">Total Leave Days</div>
        </div>
        <div className="bg-slate-50/80 rounded-xl p-6 text-center border border-slate-100 col-span-2 hover:scale-101 hover:shadow-md transition-all duration-300">
          <div className="text-blue-600 text-3xl mb-2 flex justify-center"><Sparkles className="w-8 h-8" /></div>
          <div className="text-3xl font-[800] text-slate-800">{store.holidays.length}</div>
          <div className="text-[11px] font-[600] tracking-wider text-slate-400 uppercase mt-1">Holidays</div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden relative bg-slate-50 font-sans selection:bg-blue-600 selection:text-white">
      {/* Background Glow Orbs */}
      <div className="fixed top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-gradient-to-r from-blue-200/10 to-indigo-200/10 pointer-events-none z-0 filter blur-3xl animate-pulse"></div>
      <div className="fixed bottom-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-gradient-to-r from-indigo-200/10 to-purple-200/10 pointer-events-none z-0 filter blur-3xl animate-pulse"></div>

      <div className="flex flex-1 h-screen relative z-10">
        
        {/* Left Sidebar */}
        <div className="w-[70px] bg-white/80 backdrop-blur-md border-r border-slate-200 flex flex-col items-center py-6 shrink-0 z-20">
          <div 
            onClick={() => router.push("/")}
            className="w-[42px] h-[42px] bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/35 text-white mb-auto cursor-pointer transition-transform hover:scale-105"
          >
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div className="mt-auto w-10 h-10 flex items-center justify-center cursor-pointer text-slate-400 hover:bg-slate-100 hover:text-blue-600 rounded-xl transition-colors">
            <Building className="w-5 h-5" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Header */}
          <div className="px-8 pt-8 pb-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">FieldForce Admin Setup</h1>
                <p className="text-sm text-slate-500 mt-0.5">Configure your workspace defaults</p>
              </div>
            </div>
            
            {/* Quick Back button to landing */}
            <button 
              onClick={() => router.push("/")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
          </div>

          {/* Stepper Navigation */}
          <div className="w-full px-8 shrink-0 border-b border-slate-200 bg-white/50 backdrop-blur-sm z-10">
            <div className="flex items-center justify-between max-w-5xl mx-auto py-4 relative">
              <div className="absolute top-[28px] left-[30px] right-[30px] h-[2px] bg-slate-200/60 -z-10"></div>
              
              {[
                { tab: "locations", label: "Locations", num: 1 },
                { tab: "schedule", label: "Schedule", num: 2 },
                { tab: "holidays", label: "Holidays", num: 3 },
                { tab: "employees", label: "Employees", num: 4 },
                { tab: "customers", label: "Customers", num: 5 },
                { tab: "finish", label: "Finish", num: 6 }
              ].map((step, idx) => {
                const isActive = activeTab === step.tab;
                const isCompleted = completedTabs[step.tab];
                
                return (
                  <div 
                    key={step.tab}
                    onClick={() => handleTabClick(step.tab as any, idx)}
                    className="flex flex-col items-center gap-2 flex-1 cursor-pointer group"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all duration-300 shadow-sm ${
                      isActive 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 border-transparent text-white scale-110 shadow-blue-500/20' 
                        : isCompleted
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'bg-white border-slate-200 text-slate-400 group-hover:border-blue-500 group-hover:text-blue-600'
                    }`}>
                      {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : step.num}
                    </div>
                    <span className={`text-xs font-semibold tracking-tight transition-colors duration-300 ${
                      isActive ? 'text-slate-800 font-bold' : 'text-slate-400 group-hover:text-slate-700'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scrollable Setup Tab Container */}
          <div className="flex-1 overflow-y-auto p-8 min-h-0">

            {/* TAB 1: LOCATIONS */}
            {activeTab === "locations" && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Office Locations</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Manage office addresses, coordinates, and geofence radii.</p>
                  </div>
                  <button 
                    onClick={() => openLocModal(null)}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold text-sm px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Location
                  </button>
                </div>

                {/* Banner Notifications */}
                {locLoadingBanner && (
                  <div className="bg-blue-50 text-blue-800 px-4 py-3 rounded-xl border border-blue-200 flex items-center text-sm shadow-sm animate-pulse">
                    <Compass className="w-4 h-4 mr-3 animate-spin text-blue-500" /> 
                    Detecting your office location… Please allow location access when prompted.
                  </div>
                )}
                {locSuccessBanner && (
                  <div className="bg-emerald-50 text-emerald-800 px-4 py-3 rounded-xl border border-emerald-200 flex items-center justify-between text-sm shadow-sm">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>{locSuccessText}</span>
                    </div>
                    <button onClick={() => setLocSuccessBanner(false)} className="text-emerald-500 hover:text-emerald-700">
                      <Plus className="w-4 h-4 rotate-45" />
                    </button>
                  </div>
                )}
                {locDeniedText && (
                  <div className="text-xs text-slate-500 py-2 text-center bg-slate-100 rounded-lg border border-slate-200/50">
                    💡 Geolocation access was denied or timed out. You can easily add office location manually.
                  </div>
                )}

                {/* Map Display Container */}
                <div 
                  id="map-container"
                  className="w-full h-72 bg-slate-100 rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative z-0 flex items-center justify-center"
                >
                  {sdkError ? (
                    <div className="flex flex-col items-center justify-center p-4 text-center gap-2">
                      <span className="text-xl">⚠️</span>
                      <div className="text-xs font-semibold text-slate-800">Map Load Failed</div>
                      <div className="text-[11px] text-slate-500 max-w-xs">{sdkError}</div>
                    </div>
                  ) : !sdkReady ? (
                    <div className="text-xs text-slate-400 font-mono">Loading Mappls Map...</div>
                  ) : null}
                </div>

                {/* Locations Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <th className="py-4 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                        <th className="py-4 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Address</th>
                        <th className="py-4 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">City</th>
                        <th className="py-4 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Country</th>
                        <th className="py-4 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right w-28">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {store.locations.length > 0 ? (
                        store.locations.map(loc => (
                          <tr key={loc.id} className={`hover:bg-slate-50/50 transition-colors group ${loc.autoDetected ? 'border-l-4 border-l-blue-500' : ''}`}>
                            <td className="py-4 px-5 font-semibold text-slate-800">{loc.name}</td>
                            <td className="py-4 px-5 text-slate-500 truncate max-w-xs" title={loc.address}>{loc.address}</td>
                            <td className="py-4 px-5 text-slate-500">{loc.city}</td>
                            <td className="py-4 px-5 text-slate-500">{loc.country}</td>
                            <td className="py-4 px-5 text-right space-x-1">
                              <button 
                                onClick={() => openLocModal(loc.id)} 
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => deleteLocation(loc.id)} 
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-16 text-center text-slate-400 font-medium">
                            <div className="text-4xl text-slate-200 mb-3 flex justify-center"><MapPin className="w-12 h-12" /></div>
                            No locations configured yet.<br />
                            <span className="text-xs opacity-75 font-normal mt-1 block">Add your first office location to get started.</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-4">
                  <button onClick={nextTab} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold text-sm px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 cursor-pointer">
                    Save & Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: SCHEDULE */}
            {activeTab === "schedule" && (
              <div className="max-w-6xl mx-auto space-y-6">
                <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm flex items-start gap-3">
                  <span className="text-base">💡</span>
                  <div>
                    <strong className="font-semibold text-blue-900">Standard Settings Configured:</strong> We've filled in standard industry defaults for departments, leaves, and shifts. Customize them as per your company regulations.
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col lg:flex-row gap-8">
                  {/* Departments column */}
                  <div className="flex-1 min-w-[200px] lg:border-r lg:border-slate-100 lg:pr-8">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Departments</h3>
                    <div className="space-y-3">
                      {store.schedule.departments.map((dept, i) => (
                        <div key={i} className="flex items-center gap-2 group">
                          <input 
                            type="text" 
                            value={dept} 
                            onChange={(e) => handleUpdateDept(i, e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                          />
                          <button 
                            onClick={() => handleDeleteDept(i)} 
                            className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={handleAddDept}
                      className="text-blue-600 hover:text-blue-500 font-semibold flex items-center text-xs mt-4 gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Department
                    </button>
                  </div>

                  {/* Working Days Column */}
                  <div className="w-[200px] lg:border-r lg:border-slate-100 lg:pr-8 shrink-0">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Working Days</h3>
                    <div className="space-y-3.5">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => {
                        const val = store.schedule.days[d];
                        const isSaturday = d === 'Saturday';
                        const isChecked = isSaturday ? val !== false : val;

                        return (
                          <div key={d} className="flex flex-col py-1.5 px-2 hover:bg-slate-50 rounded-lg transition-colors">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={!!isChecked} 
                                onChange={(e) => isSaturday ? handleToggleSat(e.target.checked) : handleToggleDay(d)}
                                className="w-4.5 h-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                              />
                              <span className={`text-sm ${isChecked ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>{d}</span>
                            </label>
                            {isSaturday && val !== false && (
                              <select 
                                value={String(val)}
                                onChange={(e) => handleUpdateSatRule(e.target.value)}
                                className="mt-2 text-xs p-1.5 border border-slate-200 rounded-md bg-white text-slate-600 focus:outline-none focus:border-blue-500 outline-none"
                              >
                                <option value="true">Full Day</option>
                                <option value="Half Day">Half Day</option>
                                <option value="Alternate">Alternate (1st & 3rd Off)</option>
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Leaves Column */}
                  <div className="flex-1 min-w-[220px] lg:border-r lg:border-slate-100 lg:pr-8">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Annual Leaves (Days)</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <input type="text" value="Privilege" readOnly className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed" />
                        <input 
                          type="number" 
                          value={store.schedule.leaves.privilege} 
                          onChange={(e) => handleUpdateStdLeave('privilege', e.target.value)}
                          className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-center text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="text" value="Sick" readOnly className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed" />
                        <input 
                          type="number" 
                          value={store.schedule.leaves.sick} 
                          onChange={(e) => handleUpdateStdLeave('sick', e.target.value)}
                          className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-center text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="text" value="Leave Without Pay" readOnly className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-400 cursor-not-allowed" />
                        <input 
                          type="number" 
                          value={store.schedule.leaves.lwp} 
                          onChange={(e) => handleUpdateStdLeave('lwp', e.target.value)}
                          className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-center text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                        />
                      </div>
                      
                      {/* Custom Leaves */}
                      <div className="space-y-4 pt-2">
                        {store.schedule.leaves.custom.map((lv, i) => (
                          <div key={i} className="flex items-center gap-2 group flex-wrap">
                            <input 
                              type="text" 
                              value={lv.name} 
                              onChange={(e) => handleUpdateCustomLeave(i, 'name', e.target.value)}
                              className="flex-1 min-w-[100px] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500" 
                            />
                            <input 
                              type="number" 
                              value={lv.days} 
                              onChange={(e) => handleUpdateCustomLeave(i, 'days', e.target.value)}
                              className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-sm text-center text-slate-800 focus:outline-none focus:border-blue-500" 
                            />
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={lv.carryForward}
                                onChange={(e) => handleUpdateCustomLeave(i, 'carryForward', e.target.checked)}
                                className="w-3.5 h-3.5 text-blue-600 focus:ring-blue-500 accent-blue-600"
                              />
                              <span className="text-[10px] text-slate-500 whitespace-nowrap">Carry Fwd</span>
                            </label>
                            <button 
                              onClick={() => handleDeleteCustomLeave(i)} 
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button 
                        onClick={handleAddCustomLeave}
                        className="text-blue-600 hover:text-blue-500 font-semibold flex items-center text-xs mt-3 gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add custom leave type
                      </button>
                    </div>
                  </div>

                  {/* Shifts Column */}
                  <div className="flex-[1.2] min-w-[300px] space-y-6">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shifts</h3>
                    <div className="space-y-4">
                      {store.schedule.shifts.map((sh, i) => (
                        <div key={sh.id} className="space-y-4 bg-slate-50/50 p-4 border border-slate-100 rounded-xl relative group">
                          {store.schedule.shifts.length > 1 && (
                            <button 
                              onClick={() => handleDeleteShift(i)}
                              className="absolute top-3 right-3 text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          
                          <div className="flex items-center gap-3 pr-6">
                            <input 
                              type="color" 
                              value={sh.color || '#3b82f6'} 
                              onChange={(e) => handleUpdateShift(i, 'color', e.target.value)}
                              className="w-7 h-7 rounded-md border-none p-0 cursor-pointer"
                              title="Shift Color" 
                            />
                            <span className="bg-blue-50 text-blue-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded">Name</span>
                            <input 
                              type="text" 
                              value={sh.name} 
                              onChange={(e) => handleUpdateShift(i, 'name', e.target.value)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-500" 
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-xs font-semibold w-12 text-right">Starts</span>
                              <input 
                                type="time" 
                                value={sh.starts} 
                                onChange={(e) => handleUpdateShift(i, 'starts', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500" 
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-xs font-semibold w-12 text-right">Ends</span>
                              <input 
                                type="time" 
                                value={sh.ends} 
                                onChange={(e) => handleUpdateShift(i, 'ends', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500" 
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-xs font-semibold w-12 text-right">Grace</span>
                              <input 
                                type="number" 
                                value={sh.grace} 
                                onChange={(e) => handleUpdateShift(i, 'grace', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500" 
                              />
                              <span className="text-slate-400 text-xxs">min.</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-xs font-semibold w-12 text-right">Half</span>
                              <input 
                                type="number" 
                                value={sh.halfDay} 
                                step="0.5"
                                onChange={(e) => handleUpdateShift(i, 'halfDay', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500" 
                              />
                              <span className="text-slate-400 text-xxs">hrs</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button 
                      onClick={handleAddShift}
                      className="text-blue-600 hover:text-blue-500 font-semibold flex items-center text-xs mt-3 gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Another Shift
                    </button>

                    <hr className="my-6 border-slate-100" />

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          id="flexi-active" 
                          checked={store.schedule.flexi.active} 
                          onChange={handleToggleFlexi}
                          className="w-4.5 h-4.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer accent-blue-600"
                        />
                        <label htmlFor="flexi-active" className="font-semibold text-slate-800 cursor-pointer text-sm">General (Flexi)</label>
                      </div>

                      <div className={`space-y-4 transition-opacity duration-300 ${store.schedule.flexi.active ? 'opacity-100 pointer-events-auto' : 'opacity-40 pointer-events-none'}`}>
                        <div className="flex items-center gap-3">
                          <span className="bg-blue-50 text-blue-600 text-[10px] uppercase font-bold px-2 py-1 rounded">Name</span>
                          <input 
                            type="text" 
                            value={store.schedule.flexi.name} 
                            onChange={(e) => handleUpdateFlexi('name', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white" 
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-xs font-semibold w-16 text-right">Work Hrs</span>
                            <input 
                              type="number" 
                              value={store.schedule.flexi.workHours} 
                              onChange={(e) => handleUpdateFlexi('workHours', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none" 
                            />
                            <span className="text-slate-400 text-xs">hrs</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-xs font-semibold w-16 text-right">Half Day</span>
                            <input 
                              type="number" 
                              value={store.schedule.flexi.halfDay} 
                              onChange={(e) => handleUpdateFlexi('halfDay', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none" 
                            />
                            <span className="text-slate-400 text-xs">hrs</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button onClick={nextTab} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold text-sm px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 cursor-pointer">
                    Save & Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: HOLIDAYS */}
            {activeTab === "holidays" && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{currentCalDate.getFullYear()} Annual Holidays</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Manage holidays and import regional public holidays.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      value={importCountry} 
                      onChange={(e) => setImportCountry(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500"
                    >
                      <option value="en.indian">IN (India)</option>
                      <option value="en.usa">US (USA)</option>
                      <option value="en.uk">GB (UK)</option>
                      <option value="en.australian">AU (Australia)</option>
                      <option value="en.canadian">CA (Canada)</option>
                    </select>
                    
                    <select 
                      value={importYear} 
                      onChange={(e) => handleDropdownYearSync(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-500"
                    >
                      {Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>

                    <button 
                      onClick={importHolidays} 
                      disabled={importLoading}
                      className="bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {importLoading ? <RotateCcw className="w-3.5 h-3.5 animate-spin text-blue-500" /> : <Globe className="w-3.5 h-3.5 text-blue-500" />}
                      Import
                    </button>
                    
                    <button 
                      onClick={() => openHolModal(null)}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Holiday
                    </button>
                  </div>
                </div>

                {/* Calendar Grid Container */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  {/* Cal header */}
                  <div className="flex justify-between items-center p-4 bg-slate-50 border-b border-slate-200">
                    <div className="flex gap-1.5">
                      <button onClick={() => changeCalYear(-1)} className="p-1.5 border border-slate-200 hover:bg-white rounded-lg transition-colors text-slate-500" title="Previous Year">
                        <ChevronLeft className="w-4 h-4 -mr-1.5" /><ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={() => changeCalMonth(-1)} className="p-1.5 border border-slate-200 hover:bg-white rounded-lg transition-colors text-slate-500" title="Previous Month">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm">
                      {currentCalDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex gap-1.5">
                      <button onClick={() => changeCalMonth(1)} className="p-1.5 border border-slate-200 hover:bg-white rounded-lg transition-colors text-slate-500" title="Next Month">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button onClick={() => changeCalYear(1)} className="p-1.5 border border-slate-200 hover:bg-white rounded-lg transition-colors text-slate-500" title="Next Year">
                        <ChevronRight className="w-4 h-4" /><ChevronRight className="w-4 h-4 -ml-1.5" />
                      </button>
                    </div>
                  </div>

                  {/* Day Names Row */}
                  <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 py-2.5 border-b border-slate-200 bg-slate-50/50 uppercase tracking-wider font-mono">
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                  </div>

                  {/* Grid cells */}
                  <div className="grid grid-cols-7 text-center auto-rows-[65px] bg-slate-50/10">
                    {renderCalendarCells()}
                  </div>
                </div>

                {/* Holiday Listing Table */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200">
                        <th className="py-4 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-36">Date</th>
                        <th className="py-4 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                        <th className="py-4 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</th>
                        <th className="py-4 px-5 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {store.holidays.filter(h => new Date(h.date).getFullYear() === currentCalDate.getFullYear()).length > 0 ? (
                        store.holidays
                          .filter(h => new Date(h.date).getFullYear() === currentCalDate.getFullYear())
                          .map(h => {
                            const d = new Date(h.date);
                            const daysStr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                            const dayName = daysStr[d.getDay()];
                            const isWeekend = store.schedule.days[dayName] === false;

                            return (
                              <tr key={h.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-4 px-5 font-semibold text-blue-600 whitespace-nowrap">
                                  {d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="py-4 px-5 font-semibold text-slate-800 flex items-center flex-wrap gap-2">
                                  <span>{h.name}</span>
                                  {isWeekend && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60" title="Falls on a non-working day">
                                      <AlertTriangle className="w-2.5 h-2.5 mr-0.5 text-amber-500" /> Weekend Conflict
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-5 text-slate-500">{h.desc}</td>
                                <td className="py-4 px-5 text-right space-x-1">
                                  <button 
                                    onClick={() => openHolModal(h.id)} 
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => deleteHoliday(h.id)} 
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-16 text-center text-slate-400 font-medium">
                            <div className="text-4xl text-slate-200 mb-3 flex justify-center"><Calendar className="w-12 h-12" /></div>
                            No holidays configured for {currentCalDate.getFullYear()}.<br />
                            <span className="text-xs opacity-75 font-normal mt-1 block">Use the Import tool above to fetch holidays or click "Add Holiday".</span>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-4">
                  <button onClick={nextTab} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold text-sm px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 cursor-pointer">
                    Save & Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: EMPLOYEES */}
            {activeTab === "employees" && (
              <div className="max-w-2xl mx-auto text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                <div className="text-blue-600 mb-6 flex justify-center"><Users className="w-16 h-16 stroke-[1.5]" /></div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Employee Management</h2>
                <p className="text-slate-500 mb-8 max-w-md mx-auto text-sm">You can import and completely configure your employee lists and dynamic hierarchy from the main admin panel once you finish setup.</p>
                <div className="flex justify-center gap-4">
                  <button onClick={nextTab} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors cursor-pointer">
                    Import Later
                  </button>
                  <button onClick={nextTab} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold text-sm px-6 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 cursor-pointer">
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: CUSTOMERS */}
            {activeTab === "customers" && (
              <div className="max-w-2xl mx-auto text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                <div className="text-blue-600 mb-6 flex justify-center"><Globe className="w-16 h-16 stroke-[1.5]" /></div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Customer Configuration</h2>
                <p className="text-slate-500 mb-8 max-w-md mx-auto text-sm">Customer accounts, billing templates, territories and feedback channels will be fully accessible on the primary dashboard after setup concludes.</p>
                <div className="flex justify-center">
                  <button onClick={nextTab} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold text-sm px-8 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2 cursor-pointer">
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 6: FINISHING UP */}
            {activeTab === "finish" && (
              <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 p-10 shadow-sm">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center justify-center w-[60px] h-[60px] rounded-2xl bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100 shadow-sm">
                    <Check className="w-8 h-8 stroke-[2.5]" />
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">You're almost done!</h2>
                  <p className="text-sm text-slate-500 mt-2">Please review your setup configuration details below.</p>
                </div>

                {renderFinishStats()}

                <div className="flex justify-center gap-4 pt-8 border-t border-slate-100">
                  <button 
                    onClick={() => setActiveTab("schedule")}
                    className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm px-6 py-3 rounded-lg transition-colors cursor-pointer"
                  >
                    Edit Settings
                  </button>
                  <button 
                    onClick={completeSetup}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold text-sm px-8 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 cursor-pointer"
                  >
                    Complete Setup <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* ---------------- 1. LOCATIONS MODAL ---------------- */}
      {locModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-lg p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{locForm.id ? 'Edit Location' : 'Add Location'}</h3>
            
            <div className="space-y-4">
              {locAccuracyWarning && (
                <div className="bg-amber-50 text-amber-800 px-4 py-2.5 rounded-lg text-xs border border-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Location accuracy level is low (±{locAccuracyVal}m) — please double check coordinates.</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Location Name</label>
                <input 
                  type="text" 
                  value={locForm.name}
                  onChange={(e) => setLocForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="e.g. Branch Office / HQ" 
                />
              </div>

              <div className="relative">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Full Address</label>
                <input 
                  type="text" 
                  value={locForm.address}
                  onChange={(e) => handleLocSearchChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="Start typing address..." 
                  autoComplete="off"
                />

                {/* Autocomplete items dropdown */}
                {autocompleteResults.length > 0 && (
                  <div className="absolute z-[10000] left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {autocompleteResults.map((item, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => selectPlace(item)}
                        className="p-3 text-xs text-slate-700 hover:bg-blue-50 cursor-pointer transition-colors"
                      >
                        {item.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">City</label>
                  <input 
                    type="text" 
                    value={locForm.city}
                    onChange={(e) => setLocForm(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                    placeholder="City" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Country</label>
                  <input 
                    type="text" 
                    value={locForm.country}
                    onChange={(e) => setLocForm(prev => ({ ...prev, country: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                    placeholder="Country" 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-500">Geofence Radius</label>
                  <span className="text-xs font-bold text-blue-600">{locForm.radius}m</span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="1000" 
                  step="10"
                  value={locForm.radius}
                  onChange={(e) => setLocForm(prev => ({ ...prev, radius: parseInt(e.target.value) || 50 }))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button onClick={closeLocModal} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={saveLocation} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-md transition-all cursor-pointer">
                Save Location
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 3. HOLIDAYS MODAL ---------------- */}
      {holModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">{holForm.id ? 'Edit Holiday' : 'Add Holiday'}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Holiday Name</label>
                <input 
                  type="text" 
                  value={holForm.name}
                  onChange={(e) => setHolForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="e.g. Christmas" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Date</label>
                <input 
                  type="date" 
                  value={holForm.date}
                  onChange={(e) => setHolForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white" 
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Description (Optional)</label>
                <input 
                  type="text" 
                  value={holForm.desc}
                  onChange={(e) => setHolForm(prev => ({ ...prev, desc: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white"
                  placeholder="Optional description notes..." 
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
              <button onClick={() => setHolModalOpen(false)} className="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-sm px-4 py-2 rounded-lg transition-colors cursor-pointer">
                Cancel
              </button>
              <button onClick={saveHoliday} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold text-sm px-4 py-2 rounded-lg shadow-md transition-all cursor-pointer">
                Save Holiday
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST CONTAINER */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[10000] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-xl flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              {toast.type === 'success' ? <Check className="w-5 h-5 stroke-[2.5]" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <span className="text-sm font-semibold text-slate-700">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
