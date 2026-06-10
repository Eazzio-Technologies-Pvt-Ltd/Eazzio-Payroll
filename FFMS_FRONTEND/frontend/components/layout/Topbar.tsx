"use client";
import { useState, useRef, useEffect } from "react";
import { Bell, Search, User, ArrowRight, Lock, Edit3, Camera, Check, X, LogOut, Menu } from "lucide-react";
import { useMobileSidebar } from "./MobileSidebarContext";
import { usePathname, useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { updateProfile, logout } from "@/store/slices/authSlice";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Welcome back, Admin 👋" },
  "/map": { title: "Live Map", subtitle: "Real-time employee GPS tracking" },
  "/employees": { title: "Employees", subtitle: "Manage your field workforce" },
  "/employees/hierarchy": { title: "Org Hierarchy", subtitle: "Reporting structure and chain of command" },
  "/tasks": { title: "Task Management", subtitle: "Assign and track field tasks" },
  "/attendance": { title: "Attendance", subtitle: "Daily check-in & check-out records" },
  "/geofencing": { title: "Geofencing Monitor", subtitle: "Live boundary tracking and containment audits" },
  "/activities/visits": { title: "Visits", subtitle: "Field visit logs and client interaction records" },
  "/activities/customers": { title: "Customers", subtitle: "Customer management and engagement tracking" },
  "/expenses": { title: "Expenses", subtitle: "Travel and operational expense management" },
  "/playback": { title: "Routes Playback", subtitle: "Replay historic GPS travel timelines" },
  "/insights/overview": { title: "Insights Overview", subtitle: "Aggregated performance and operational metrics" },
  "/insights/attendance-analytics": { title: "Attendance Analytics", subtitle: "Deep-dive into attendance trends and patterns" },
  "/insights/expense-audits": { title: "Expense Audits", subtitle: "Audit and validate field expense submissions" },
  "/forms": { title: "Forms & Feedback", subtitle: "Custom form builder and submission management" },
  "/feedback": { title: "Feedback", subtitle: "Field staff feedback and survey responses" },
  "/reports": { title: "Reports", subtitle: "Analytics and performance insights" },
  "/reports/travel-expenses": { title: "Travel Expenses Report", subtitle: "Detailed travel cost breakdown and analysis" },
  "/reports/productivity": { title: "Productivity Reports", subtitle: "Field team output and efficiency metrics" },
  "/reports/compliance": { title: "Compliance Metrics", subtitle: "Regulatory and policy adherence monitoring" },
  "/notifications": { title: "Notifications Hub", subtitle: "Central terminal for real-time operations event logs" },
  "/settings/notifications": { title: "Notification Settings", subtitle: "Configure alerts, reminders and notification rules" },
  "/settings/user-management": { title: "User Management", subtitle: "Manage roles, permissions and user accounts" },
  "/settings/territory-setup": { title: "Territory Setup", subtitle: "Define and manage field territory boundaries" },
  "/settings/travel-policies": { title: "Travel Policies", subtitle: "Set allowance rules and travel reimbursement policies" },
  "/settings/timing": { title: "Timing & Shifts", subtitle: "Configure global working shifts and employee timings" },
  "/settings/security-access": { title: "Security & Access", subtitle: "Authentication rules and access control configuration" },
};

// Searchable items — pages + features
const searchablePages = [
  { label: "Dashboard", path: "/dashboard", keywords: ["home", "overview", "stats", "dashboard"] },
  { label: "Live GPS Map", path: "/map", keywords: ["map", "gps", "tracking", "location", "live"] },
  { label: "My Team — Employees", path: "/employees", keywords: ["employees", "team", "staff", "workforce", "people"] },
  { label: "Org Hierarchy", path: "/employees/hierarchy", keywords: ["hierarchy", "org chart", "reporting", "structure"] },
  { label: "Task Management", path: "/tasks", keywords: ["tasks", "assign", "work", "todo", "management"] },
  { label: "Attendance Records", path: "/attendance", keywords: ["attendance", "checkin", "checkout", "present", "absent"] },
  { label: "Geofencing Monitor", path: "/geofencing", keywords: ["geofence", "boundary", "zone", "containment", "monitor"] },
  { label: "Visits", path: "/activities/visits", keywords: ["visits", "field visit", "client", "activities"] },
  { label: "Customers", path: "/activities/customers", keywords: ["customers", "clients", "contacts", "activities"] },
  { label: "Expenses", path: "/expenses", keywords: ["expenses", "reimbursement", "travel cost", "bills"] },
  { label: "Routes Playback", path: "/playback", keywords: ["playback", "routes", "history", "timeline", "replay"] },
  { label: "Insights Overview", path: "/insights/overview", keywords: ["insights", "overview", "summary", "analytics"] },
  { label: "Attendance Analytics", path: "/insights/attendance-analytics", keywords: ["attendance analytics", "trends", "patterns"] },
  { label: "Expense Audits", path: "/insights/expense-audits", keywords: ["expense audit", "validate", "review"] },
  { label: "Forms & Feedback", path: "/forms", keywords: ["forms", "feedback", "survey", "builder"] },
  { label: "Reports & Analytics", path: "/reports", keywords: ["reports", "analytics", "performance", "kpi", "metrics"] },
  { label: "Travel Expenses Report", path: "/reports/travel-expenses", keywords: ["travel expenses", "cost report", "mileage"] },
  { label: "Productivity Reports", path: "/reports/productivity", keywords: ["productivity", "efficiency", "output"] },
  { label: "Compliance Metrics", path: "/reports/compliance", keywords: ["compliance", "regulatory", "policy", "adherence"] },
  { label: "Notifications Hub", path: "/notifications", keywords: ["notifications", "alerts", "events", "bell", "hub"] },
  { label: "Notification Settings", path: "/settings/notifications", keywords: ["notification settings", "alerts", "configure"] },
  { label: "User Management", path: "/settings/user-management", keywords: ["user management", "roles", "permissions", "accounts"] },
  { label: "Territory Setup", path: "/settings/territory-setup", keywords: ["territory", "boundaries", "zones", "regions"] },
  { label: "Travel Policies", path: "/settings/travel-policies", keywords: ["travel policy", "allowance", "reimbursement rules"] },
  { label: "Timing & Shifts", path: "/settings/timing", keywords: ["timing", "shift", "shifts", "hours", "late", "break", "work hours"] },
  { label: "Security & Access", path: "/settings/security-access", keywords: ["security", "access", "auth", "login", "permissions"] },
];

interface SearchResult {
  type: "page" | "employee";
  label: string;
  sub: string;
  path: string;
}

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const currentUser = useSelector((s: RootState) => s.auth.user);

  const info = { ...(pageTitles[pathname] || { title: "Field Force", subtitle: "" }) };
  if (pathname === "/dashboard") {
    const role = currentUser?.role || currentUser?.designation || "Admin";
    const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    info.subtitle = `Welcome back, ${roleDisplay} 👋`;
  }

  const employees = useSelector((s: RootState) => s.employees.list);
  const dispatch = useDispatch();
  const notifications = useSelector((s: RootState) => s.notifications.list);
  const unreadCount = notifications.filter((n: { read: any; }) => !n.read).length;
  const { toggleMobileSidebar } = useMobileSidebar();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const defaultUser = {
    firstName: "Rahul",
    lastName: "Kumar",
    designation: "Admin",
    photoUrl: null as string | null,
    email: "rahul@fieldforce.com",
    mobileNo: "+1 (555) 019-2834",
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const getInitials = () => {
    if (!mounted) return "RK"; // Default server-side render
    const activeUser = currentUser || defaultUser;
    const firstInit = activeUser.firstName ? activeUser.firstName.charAt(0).toUpperCase() : "";
    const lastInit = activeUser.lastName 
      ? activeUser.lastName.charAt(0).toUpperCase() 
      : (activeUser.designation ? activeUser.designation.charAt(0).toUpperCase() : "");
    return `${firstInit}${lastInit}` || "RK";
  };

  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  // Dropdown & Modal States
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Form States
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    designation: "",
    photoUrl: null as string | null,
    email: "",
    mobileNo: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const profileRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync profile details with store
  useEffect(() => {
    const activeUser = currentUser || defaultUser;
    setProfileForm({
      firstName: activeUser.firstName,
      lastName: activeUser.lastName,
      designation: activeUser.designation,
      photoUrl: activeUser.photoUrl,
      email: activeUser.email,
      mobileNo: activeUser.mobileNo,
    });
  }, [currentUser]);
  // Build search results
  const getResults = (): SearchResult[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Search pages
    for (const page of searchablePages) {
      const match =
        page.label.toLowerCase().includes(q) ||
        page.keywords.some((kw) => kw.includes(q));
      if (match) {
        results.push({ type: "page", label: page.label, sub: page.path, path: page.path });
      }
    }

    // Search employees
    for (const emp of employees) {
      const match =
        emp.name.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        emp.territory.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q);
      if (match) {
        results.push({
          type: "employee",
          label: emp.name,
          sub: `${emp.role} · ${emp.territory}`,
          path: "/employees",
        });
      }
    }

    return results.slice(0, 8);
  };

  const results = getResults();
  const showDropdown = isFocused && query.trim().length > 0;

  const handleSelect = (result: SearchResult) => {
    router.push(result.path);
    setQuery("");
    setIsFocused(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && results.length > 0) {
      handleSelect(results[0]);
    }
    if (e.key === "Escape") {
      setIsFocused(false);
      setQuery("");
    }
  };

  // Profile Action Handlers
  const handleOpenEditProfile = () => {
    const activeUser = currentUser || defaultUser;
    setProfileForm({
      firstName: activeUser.firstName,
      lastName: activeUser.lastName,
      designation: activeUser.designation,
      photoUrl: activeUser.photoUrl,
      email: activeUser.email,
      mobileNo: activeUser.mobileNo,
    });
    setIsEditProfileOpen(true);
    setIsProfileDropdownOpen(false);
  };

  const handleOpenChangePassword = () => {
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setIsChangePasswordOpen(true);
    setIsProfileDropdownOpen(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        showToast("File size exceeds 2MB limit", "error");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm((prev) => ({ ...prev, photoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(updateProfile({
      firstName: profileForm.firstName,
      lastName: profileForm.lastName,
      designation: profileForm.designation,
      photoUrl: profileForm.photoUrl,
      email: profileForm.email,
      mobileNo: profileForm.mobileNo,
    }));
    showToast("Profile updated successfully!", "success");
    setIsEditProfileOpen(false);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }
    // Password change should go through backend API
    showToast("Password change requires backend integration.", "error");
    setIsChangePasswordOpen(false);
  };

  const handleLogout = () => {
    dispatch(logout());
    document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "ff_user_role=; path=/; max-age=0; SameSite=Lax";
    window.location.href = "/login";
  };
  return (
    <header style={{
      height: "70px",
      background: "var(--bg-secondary)",
      borderBottom: "1px solid var(--border)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: isMobile ? "0 16px" : "0 28px",
      position: "sticky", top: 0, zIndex: 50,
    }}>
      {/* Left — Hamburger (mobile) + Page title */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
        {isMobile && (
          <button
            onClick={toggleMobileSidebar}
            aria-label="Toggle navigation menu"
            style={{
              background: "none",
              border: "1px solid var(--border)",
              cursor: "pointer",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "38px",
              height: "38px",
              flexShrink: 0,
              transition: "background 0.15s ease",
            }}
          >
            <Menu size={20} />
          </button>
        )}
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: isMobile ? "16px" : "20px", fontWeight: 600, color: "var(--text-primary)", margin: 0, fontFamily: "var(--font-hanken), sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{info.title}</h1>
          {!isMobile && <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0, fontFamily: "'Inter', sans-serif" }}>{info.subtitle}</p>}
        </div>
      </div>

      {/* Right — Search + Notifications + Profile */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Search bar with dropdown — hidden on mobile */}
        {!isMobile && (
        <div ref={searchRef} style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8", zIndex: 1 }} />
          <input
            id="topbar-search"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={handleSearchKeyDown}
            style={{
              background: "#f1f5f9", border: "none",
              borderRadius: "9999px", padding: "10px 16px 10px 40px",
              color: "var(--text-primary)", fontSize: "13px", outline: "none",
              width: "320px", fontFamily: "Inter, sans-serif",
              transition: "all 0.15s ease",
              boxShadow: isFocused ? "0 0 0 2px #2563eb" : "none",
            }}
          />

          {/* Search results dropdown */}
          {showDropdown && (
            <div style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              width: "320px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              zIndex: 999,
              maxHeight: "360px",
              overflowY: "auto",
            }}>
              {results.length > 0 ? (
                <>
                  {results.map((r, i) => (
                    <div
                      key={`${r.path}-${i}`}
                      onClick={() => handleSelect(r)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 14px",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--border)",
                        transition: "background 0.1s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {/* Type badge */}
                      <div style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: r.type === "page" ? "rgba(79,142,247,0.12)" : "rgba(34,211,165,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        {r.type === "page" ? (
                          <Search size={12} color="var(--accent-blue)" />
                        ) : (
                          <User size={12} color="#22d3a5" />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {r.label}
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {r.sub}
                        </div>
                      </div>

                      <ArrowRight size={14} color="var(--text-muted)" />
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
                  No results for &quot;{query}&quot;
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* Notification bell — navigates to /notifications */}
        <div
          id="topbar-notification-bell"
          onClick={() => router.push("/notifications")}
          style={{
            width: "38px", height: "38px", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", position: "relative",
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          title="Notification Settings"
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
            <Bell size={18} color={pathname === "/notifications" ? "#2563eb" : "#475569"} />
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: "7px", right: "7px",
                width: "8px", height: "8px", borderRadius: "50%",
                background: "#ef4444", border: "1.5px solid white"
              }} />
            )}
          </div>
        </div>

        {/* Admin avatar dropdown trigger */}
        <div ref={profileRef} style={{ position: "relative" }}>
          <div
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "50%",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "13px",
              color: "white",
              fontFamily: "Inter, sans-serif",
              overflow: "hidden",
            }}>
              {(mounted && (currentUser || defaultUser).photoUrl) ? (
                <img 
                  src={(currentUser || defaultUser).photoUrl!} 
                  alt="Profile" 
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                />
              ) : (
                getInitials()
              )}
            </div>
            {!isMobile && (
            <div style={{ display: "none" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>
                {!mounted ? "Admin" : (currentUser ? (currentUser.lastName ? `${currentUser.firstName} ${currentUser.lastName}` : currentUser.firstName) : "Admin")}
              </span>
              <span style={{ fontSize: "10px", color: "var(--text-muted)", fontFamily: "var(--font-jetbrains), monospace", textTransform: "uppercase" }}>
                {!mounted ? "Global Ops" : (currentUser?.designation || "Global Ops")}
              </span>
            </div>
            )}
          </div>

          {/* Profile Dropdown Menu */}
          {isProfileDropdownOpen && (
            <div style={{
              position: "absolute",
              top: "100%",
              right: 0,
              width: "240px",
              background: "var(--bg-card)",
              border: "1px solid var(--text-primary)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              zIndex: 999,
              marginTop: "6px",
              animation: "fadeIn 0.15s ease",
            }}>
              {/* Dropdown Header */}
              <div style={{ 
                padding: "12px 16px", 
                borderBottom: "1px solid var(--border)", 
                background: "var(--bg-hover)",
                display: "flex",
                alignItems: "center",
                gap: "12px"
              }}>
                <div style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "0",
                  border: "1px solid var(--border)",
                  background: "var(--bg-card)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  flexShrink: 0,
                }}>
                  {(currentUser || defaultUser).photoUrl ? (
                    <img 
                      src={(currentUser || defaultUser).photoUrl!} 
                      alt="Profile" 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                    />
                  ) : (
                    <User size={18} color="var(--text-secondary)" />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", fontFamily: "var(--font-jetbrains), monospace" }}>Signed in as</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>
                    {(currentUser || defaultUser).email}
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                <button
                  onClick={handleOpenEditProfile}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    width: "100%", padding: "11px 16px", background: "none",
                    border: "none", cursor: "pointer", textAlign: "left",
                    color: "var(--text-primary)", fontSize: "13px",
                    fontFamily: "Inter, sans-serif",
                    transition: "background 0.15s ease"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Edit3 size={15} color="var(--text-secondary)" />
                  <span>Profile Edit</span>
                </button>

                <button
                  onClick={handleOpenChangePassword}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    width: "100%", padding: "11px 16px", background: "none",
                    border: "none", cursor: "pointer", textAlign: "left",
                    color: "var(--text-primary)", fontSize: "13px",
                    fontFamily: "Inter, sans-serif",
                    transition: "background 0.15s ease"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Lock size={15} color="var(--text-secondary)" />
                  <span>Change Password</span>
                </button>

                <div style={{ height: "1px", background: "var(--border)" }} />

                <button
                  onClick={handleLogout}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    width: "100%", padding: "11px 16px", background: "none",
                    border: "none", cursor: "pointer", textAlign: "left",
                    color: "var(--accent-red)", fontSize: "13px",
                    fontFamily: "Inter, sans-serif",
                    transition: "background 0.15s ease"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(186,26,26,0.06)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <LogOut size={15} color="var(--accent-red)" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating toast notification */}
      {toast && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: toast.type === "success" ? "var(--accent-green)" : "var(--accent-red)",
          color: "white",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          zIndex: 9999,
          animation: "fadeIn 0.2s ease",
          border: "1px solid rgba(0,0,0,0.1)",
        }}>
          {toast.type === "success" ? <Check size={16} /> : <X size={16} />}
          <span style={{ fontSize: "13px", fontWeight: 600, fontFamily: "Inter, sans-serif" }}>{toast.message}</span>
        </div>
      )}

      {/* Profile Edit Modal */}
      {isEditProfileOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "520px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-hanken), sans-serif" }}>
                <Edit3 size={18} color="var(--accent-blue)" /> Edit Admin Profile
              </h2>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Photo Upload area */}
              <div style={{ display: "flex", alignItems: "center", gap: "20px", padding: "14px", border: "1px dashed var(--border)", background: "var(--bg-hover)" }}>
                <div style={{ position: "relative", width: "70px", height: "70px", background: "var(--bg-card)", border: "1px solid var(--border)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {profileForm.photoUrl ? (
                    <img src={profileForm.photoUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <User size={30} color="var(--text-secondary)" />
                  )}
                  <label
                    htmlFor="profile-upload"
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.5)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0,
                      transition: "opacity 0.2s ease",
                      cursor: "pointer"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}
                  >
                    <Camera size={18} color="white" />
                  </label>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", fontFamily: "Inter, sans-serif" }}>Profile Photo</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px", fontFamily: "Inter, sans-serif" }}>Upload JPG or PNG image (Max 2MB).</div>
                  <input
                    id="profile-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => document.getElementById("profile-upload")?.click()}
                    className="btn-secondary"
                    style={{ padding: "6px 12px", fontSize: "12px" }}
                  >
                    Choose Photo
                  </button>
                  {profileForm.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setProfileForm(p => ({ ...p, photoUrl: null }))}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent-red)", fontSize: "11px", marginLeft: "12px", textDecoration: "underline" }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Name Fields Row */}
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", fontFamily: "Inter, sans-serif" }}>First Name</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm(p => ({ ...p, firstName: e.target.value }))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", fontFamily: "Inter, sans-serif" }}>Last Name</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm(p => ({ ...p, lastName: e.target.value }))}
                  />
                </div>
              </div>

              {/* Designation */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", fontFamily: "Inter, sans-serif" }}>Designation</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={profileForm.designation}
                  onChange={(e) => setProfileForm(p => ({ ...p, designation: e.target.value }))}
                />
              </div>

              {/* Email & Mobile Row */}
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", fontFamily: "Inter, sans-serif" }}>Email</label>
                  <input
                    type="email"
                    required
                    className="input"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", fontFamily: "Inter, sans-serif" }}>Mobile No.</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={profileForm.mobileNo}
                    onChange={(e) => setProfileForm(p => ({ ...p, mobileNo: e.target.value }))}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => setIsEditProfileOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "420px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-hanken), sans-serif" }}>
                <Lock size={18} color="var(--accent-blue)" /> Change Password
              </h2>
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePassword} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Current Password */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", fontFamily: "Inter, sans-serif" }}>Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  className="input"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                />
              </div>

              {/* New Password */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", fontFamily: "Inter, sans-serif" }}>New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  className="input"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px", fontFamily: "Inter, sans-serif" }}>Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Confirm new password"
                  className="input"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => setIsChangePasswordOpen(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
