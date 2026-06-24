"use client";
import { useState, useRef, useEffect } from "react";
import { Bell, Search, User, ArrowRight, Lock, Edit3, Camera, Check, X, LogOut, Menu, Shield } from "lucide-react";
import { useMobileSidebar } from "@/components/layout/MobileSidebarContext";
import { usePathname, useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { updateProfile, changePassword, logout } from "@/store/slices/authSlice";

const adminPageTitles: Record<string, { title: string; subtitle: string }> = {
  "/admin/dashboard": { title: "Admin Dashboard", subtitle: "Organization-wide overview & KPIs" },
  "/admin/managers": { title: "Manager Management", subtitle: "Create, edit and manage all managers" },
  "/admin/projects": { title: "Project Assignment", subtitle: "Assign and track projects across teams" },
  "/admin/analytics": { title: "Organization Analytics", subtitle: "Org-wide employee, attendance & productivity data" },
  "/admin/reports": { title: "Reports & Insights", subtitle: "Export attendance, project and performance reports" },
};

const adminSearchablePages = [
  { label: "Admin Dashboard", path: "/admin/dashboard", keywords: ["admin", "dashboard", "home", "overview", "kpi"] },
  { label: "Manager Management", path: "/admin/managers", keywords: ["managers", "team leads", "create manager", "edit"] },
  { label: "Project Assignment", path: "/admin/projects", keywords: ["projects", "assign", "tasks", "create project"] },
  { label: "Org Analytics", path: "/admin/analytics", keywords: ["analytics", "growth", "productivity", "metrics"] },
  { label: "Reports & Insights", path: "/admin/reports", keywords: ["reports", "export", "attendance", "performance"] },
];

interface SearchResult {
  type: "page";
  label: string;
  sub: string;
  path: string;
}

export default function AdminTopbar() {
  const pathname = usePathname();
  const router = useRouter();
  const info = adminPageTitles[pathname] || { title: "Admin Panel", subtitle: "" };

  const dispatch = useDispatch();
  const currentUser = useSelector((s: RootState) => s.auth.user);
  const passwordHash = useSelector((s: RootState) => s.auth.passwordHash);
  const { toggleMobileSidebar } = useMobileSidebar();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => { setMounted(true); }, []);

  const defaultUser = {
    firstName: "Global",
    lastName: "Ops",
    designation: "Super Admin",
    photoUrl: null as string | null,
    email: "admin@fieldforce.com",
    mobileNo: "+1 (555) 019-2834",
  };

  const getInitials = () => {
    if (!mounted) return "GA";
    const u = currentUser || defaultUser;
    const f = u.firstName?.charAt(0).toUpperCase() || "";
    const l = u.lastName?.charAt(0).toUpperCase() || "";
    return `${f}${l}` || "GA";
  };

  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const [profileForm, setProfileForm] = useState({
    firstName: "", lastName: "", designation: "",
    photoUrl: null as string | null, email: "", mobileNo: "",
  });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const h = (e: MouseEvent) => { if (searchRef.current && !searchRef.current.contains(e.target as Node)) setIsFocused(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (profileRef.current && !profileRef.current.contains(e.target as Node)) setIsProfileDropdownOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    const u = currentUser || defaultUser;
    setProfileForm({ firstName: u.firstName, lastName: u.lastName, designation: u.designation, photoUrl: u.photoUrl, email: u.email, mobileNo: u.mobileNo });
  }, [currentUser]);

  const getResults = (): SearchResult[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return adminSearchablePages
      .filter((p) => p.label.toLowerCase().includes(q) || p.keywords.some((k) => k.includes(q)))
      .map((p) => ({ type: "page" as const, label: p.label, sub: p.path, path: p.path }))
      .slice(0, 6);
  };

  const results = getResults();
  const showDropdown = isFocused && query.trim().length > 0;

  const handleLogout = () => {
    dispatch(logout());
    document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "ff_user_role=; path=/; max-age=0; SameSite=Lax";
    window.location.href = "/login";
  };
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(updateProfile({ firstName: profileForm.firstName, lastName: profileForm.lastName, designation: profileForm.designation, photoUrl: profileForm.photoUrl, email: profileForm.email, mobileNo: profileForm.mobileNo }));
    showToast("Profile updated successfully!", "success");
    setIsEditProfileOpen(false);
  };
  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.currentPassword !== passwordHash) { showToast("Current password is incorrect.", "error"); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { showToast("Passwords do not match.", "error"); return; }
    if (passwordForm.newPassword.length < 6) { showToast("Password must be at least 6 characters.", "error"); return; }
    dispatch(changePassword(passwordForm.newPassword));
    showToast("Password updated successfully!", "success");
    setIsChangePasswordOpen(false);
  };
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { showToast("File size exceeds 2MB limit", "error"); return; }
      const reader = new FileReader();
      reader.onloadend = () => setProfileForm((p) => ({ ...p, photoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  return (
    <header
      style={{
        height: "70px",
        background: "var(--sidebar-bg)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "0 16px" : "0 28px",
        position: "sticky", top: 0, zIndex: 50,
      }}
    >
      {/* Left */}
      <div style={{ display: "flex", alignItems: "center", gap: "24px", minWidth: 0 }}>
        {/* Logo */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          height: "70px",
          width: "240px",
          padding: "0 20px",
          marginLeft: isMobile ? "-16px" : "-28px",
          borderRight: "none",
        }}>
          <img
            src="/logo.png"
            alt="Eazzio Logo"
            style={{ height: "56px", objectFit: "contain", maxWidth: "200px" }}
          />
        </div>

        {/* Separator */}
        <div style={{ display: "none" }} />

        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          {isMobile && (
            <button
              onClick={toggleMobileSidebar}
              aria-label="Toggle navigation menu"
              style={{ background: "none", border: "1px solid rgba(255, 255, 255, 0.2)", cursor: "pointer", color: "white", display: "flex", alignItems: "center", justifyContent: "center", width: "38px", height: "38px", flexShrink: 0 }}
            >
              <Menu size={20} />
            </button>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: isMobile ? "16px" : "20px", fontWeight: 600, color: "white", margin: 0, fontFamily: "var(--font-hanken), sans-serif", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {info.title}
              </h1>
              {!isMobile && (
                <span style={{ fontSize: "10px", fontWeight: 700, color: "white", background: "rgba(255, 255, 255, 0.2)", padding: "2px 8px", borderRadius: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Admin
                </span>
              )}
            </div>
            {!isMobile && <p style={{ fontSize: "12px", color: "rgba(255, 255, 255, 0.7)", margin: 0, fontFamily: "'Inter', sans-serif" }}>{info.subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Right */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Search */}
        {!isMobile && (
          <div ref={searchRef} style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(255, 255, 255, 0.6)", zIndex: 1 }} />
            <input
              id="admin-topbar-search"
              placeholder="Search admin pages..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onKeyDown={(e) => { if (e.key === "Escape") { setIsFocused(false); setQuery(""); } }}
              style={{
                background: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: "9999px",
                padding: "10px 16px 10px 40px", color: "white", fontSize: "13px",
                outline: "none", width: "280px", fontFamily: "Inter, sans-serif",
                boxShadow: isFocused ? "0 0 0 2px rgba(255, 255, 255, 0.5)" : "none",
              }}
            />
            {showDropdown && (
              <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, width: "280px", background: "var(--bg-card)", border: "1px solid var(--border)", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", zIndex: 999, maxHeight: "320px", overflowY: "auto" }}>
                {results.length > 0 ? results.map((r, i) => (
                  <div key={i} onClick={() => { router.push(r.path); setQuery(""); setIsFocused(false); }}
                    style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "rgba(59, 130, 246,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Search size={12} color="#3b82f6" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{r.label}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{r.sub}</div>
                    </div>
                    <ArrowRight size={14} color="var(--text-muted)" />
                  </div>
                )) : (
                  <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>No results for &quot;{query}&quot;</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Admin Badge */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "rgba(255, 255, 255, 0.1)", border: "1px solid rgba(255, 255, 255, 0.2)", borderRadius: 0 }}>
            <Shield size={14} color="white" />
            <span style={{ fontSize: "12px", fontWeight: 700, color: "white" }}>Super Admin</span>
          </div>
        )}

        {/* Profile */}
        <div ref={profileRef} style={{ position: "relative" }}>
          <div
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
            style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", padding: "4px", borderRadius: "50%", transition: "all 0.15s ease" }}
          >
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "13px", color: "white", fontFamily: "Inter, sans-serif", overflow: "hidden" }}>
              {getInitials()}
            </div>
          </div>

          {isProfileDropdownOpen && (
            <div style={{ position: "absolute", top: "100%", right: 0, width: "240px", background: "var(--bg-card)", border: "1px solid var(--text-primary)", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", zIndex: 999, marginTop: "6px", animation: "fadeIn 0.15s ease" }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-hover)", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "0", border: "1px solid var(--border)", background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {(currentUser || defaultUser).photoUrl ? <img src={(currentUser || defaultUser).photoUrl!} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <User size={18} color="var(--text-secondary)" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, color: "#3b82f6", textTransform: "uppercase", fontFamily: "var(--font-jetbrains), monospace" }}>Admin</div>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: "2px" }}>{(currentUser || defaultUser).email}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {[
                  { label: "Profile Edit", icon: <Edit3 size={15} color="var(--text-secondary)" />, onClick: () => { setIsEditProfileOpen(true); setIsProfileDropdownOpen(false); } },
                  { label: "Change Password", icon: <Lock size={15} color="var(--text-secondary)" />, onClick: () => { setIsChangePasswordOpen(true); setIsProfileDropdownOpen(false); } },
                ].map((item) => (
                  <button key={item.label} onClick={item.onClick} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "11px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", color: "var(--text-primary)", fontSize: "13px", fontFamily: "Inter, sans-serif" }} onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    {item.icon}<span>{item.label}</span>
                  </button>
                ))}
                <div style={{ height: "1px", background: "var(--border)" }} />
                <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "11px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left", color: "var(--accent-red)", fontSize: "13px", fontFamily: "Inter, sans-serif" }} onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(186,26,26,0.06)")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <LogOut size={15} color="var(--accent-red)" /><span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", background: toast.type === "success" ? "var(--accent-green)" : "var(--accent-red)", color: "white", padding: "12px 20px", display: "flex", alignItems: "center", gap: "10px", zIndex: 9999, animation: "fadeIn 0.2s ease", border: "1px solid rgba(0,0,0,0.1)" }}>
          {toast.type === "success" ? <Check size={16} /> : <X size={16} />}
          <span style={{ fontSize: "13px", fontWeight: 600, fontFamily: "Inter, sans-serif" }}>{toast.message}</span>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: "520px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-hanken), sans-serif" }}>
                <Edit3 size={18} color="#3b82f6" /> Edit Admin Profile
              </h2>
              <button type="button" onClick={() => setIsEditProfileOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "20px", padding: "14px", border: "1px dashed var(--border)", background: "var(--bg-hover)" }}>
                <div style={{ position: "relative", width: "70px", height: "70px", background: "var(--bg-card)", border: "1px solid var(--border)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {profileForm.photoUrl ? <img src={profileForm.photoUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <User size={30} color="var(--text-secondary)" />}
                  <label htmlFor="admin-profile-upload" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s ease", cursor: "pointer" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "0")}><Camera size={18} color="white" /></label>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>Profile Photo</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "8px" }}>Upload JPG or PNG (Max 2MB)</div>
                  <input id="admin-profile-upload" type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
                  <button type="button" onClick={() => document.getElementById("admin-profile-upload")?.click()} className="btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }}>Choose Photo</button>
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>First Name</label><input type="text" required className="input" value={profileForm.firstName} onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))} /></div>
                <div style={{ flex: 1 }}><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Last Name</label><input type="text" required className="input" value={profileForm.lastName} onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))} /></div>
              </div>
              <div><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Designation</label><input type="text" required className="input" value={profileForm.designation} onChange={(e) => setProfileForm((p) => ({ ...p, designation: e.target.value }))} /></div>
              <div style={{ display: "flex", gap: "12px" }}>
                <div style={{ flex: 1 }}><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Email</label><input type="email" required className="input" value={profileForm.email} onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))} /></div>
                <div style={{ flex: 1 }}><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>Mobile No.</label><input type="text" required className="input" value={profileForm.mobileNo} onChange={(e) => setProfileForm((p) => ({ ...p, mobileNo: e.target.value }))} /></div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => setIsEditProfileOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: "#3b82f6" }}>Save Changes</button>
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
                <Lock size={18} color="#3b82f6" /> Change Password
              </h2>
              <button type="button" onClick={() => setIsChangePasswordOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={18} /></button>
            </div>
            <form onSubmit={handleSavePassword} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { label: "Current Password", key: "currentPassword" as const },
                { label: "New Password", key: "newPassword" as const },
                { label: "Confirm New Password", key: "confirmPassword" as const },
              ].map((field) => (
                <div key={field.key}><label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "4px" }}>{field.label}</label><input type="password" required className="input" value={passwordForm[field.key]} onChange={(e) => setPasswordForm((p) => ({ ...p, [field.key]: e.target.value }))} /></div>
              ))}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" onClick={() => setIsChangePasswordOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: "#3b82f6" }}>Update Password</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
