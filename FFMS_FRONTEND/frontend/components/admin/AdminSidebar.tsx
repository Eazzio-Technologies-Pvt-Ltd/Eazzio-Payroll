"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMobileSidebar } from "@/components/layout/MobileSidebarContext";
import {
  Gauge,
  Users,
  FolderKanban,
  BarChart3,
  FileText,
  LogOut,
  MapPin,
  Lightbulb,
  Shield,
  Briefcase,
} from "lucide-react";

const COLLAPSED_WIDTH = 64;
const EXPANDED_WIDTH = 240;

const adminNavItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: Gauge },
  { href: "/admin/managers", label: "Manager Management", icon: Users },
  { href: "/admin/projects", label: "Project Assignment", icon: FolderKanban },
  { href: "/admin/analytics", label: "Org Analytics", icon: BarChart3 },
  { href: "/admin/reports", label: "Reports & Insights", icon: FileText },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { isMobileOpen, closeMobileSidebar } = useMobileSidebar();
  const [isMobile, setIsMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (isMobile) closeMobileSidebar();
  }, [pathname]);

  useEffect(() => {
    if (isMobile) setIsExpanded(true);
  }, [isMobile]);

  const renderIcon = (Icon: React.ElementType, isActive: boolean) => (
    <div
      style={{
        width: "32px",
        height: "32px",
        borderRadius: "50%",
        background: isActive ? "var(--accent-blue)" : "transparent",
        border: isActive ? "none" : "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "all 0.15s ease",
      }}
    >
      <Icon size={15} color={isActive ? "white" : "var(--text-secondary)"} />
    </div>
  );

  const getLinkStyle = (isActive: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: isExpanded ? "10px 12px" : "10px 0",
    justifyContent: isExpanded ? "flex-start" : "center",
    background: isActive ? "rgba(59, 130, 246, 0.08)" : "transparent",
    borderRadius: "0",
    cursor: "pointer",
    color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
    transition: "all 0.2s ease",
    marginBottom: "2px",
  });

  return (
    <>
      {isMobile && isMobileOpen && (
        <div
          onClick={closeMobileSidebar}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 9998,
            animation: "fadeIn 0.2s ease",
          }}
        />
      )}
      <aside
        onMouseEnter={isMobile ? undefined : () => setIsExpanded(true)}
        onMouseLeave={isMobile ? undefined : () => setIsExpanded(false)}
        style={{
          width: isMobile
            ? `${EXPANDED_WIDTH}px`
            : isExpanded
              ? `${EXPANDED_WIDTH}px`
              : `${COLLAPSED_WIDTH}px`,
          height: "100vh",
          maxHeight: "100vh",
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 9999,
          transition: isMobile
            ? "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            : "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
          boxShadow: isMobile
            ? isMobileOpen
              ? "4px 0 24px rgba(0,0,0,0.25)"
              : "none"
            : isExpanded
              ? "4px 0 24px rgba(0,0,0,0.15)"
              : "none",
          transform: isMobile
            ? isMobileOpen
              ? "translateX(0)"
              : "translateX(-100%)"
            : "translateX(0)",
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: isExpanded ? "24px 20px" : "24px 0",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: isExpanded ? "flex-start" : "center",
            alignItems: "center",
            minHeight: "85px",
            transition: "padding 0.25s ease",
          }}
        >
          {/* Logo image */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isExpanded ? "flex-start" : "center",
            width: "100%",
            height: "40px",
            overflow: "hidden",
            transition: "all 0.25s ease",
          }}>
            <img 
              src="/logo.png" 
              alt="TR@NSForce" 
              style={{
                height: "100%",
                width: isExpanded ? "auto" : "200px",
                objectFit: "contain",
                objectPosition: "left center",
                maxWidth: "200px"
              }} 
            />
          </div>
        </div>

        {/* Admin badge */}
        {isExpanded && (
          <div style={{ margin: "12px 12px 0", padding: "6px 12px", background: "rgba(59, 130, 246,0.08)", border: "1px solid rgba(59, 130, 246,0.2)", borderRadius: 0, display: "flex", alignItems: "center", gap: 6 }}>
            <Shield size={12} color="#3b82f6" />
            <span style={{ fontSize: "11px", fontWeight: 700, color: "#3b82f6", textTransform: "uppercase", letterSpacing: "0.06em" }}>Super Admin</span>
          </div>
        )}

        {/* Navigation */}
        <nav
          style={{
            flex: 1,
            padding: isExpanded ? "16px 12px" : "16px 0",
            overflowY: "auto",
            transition: "padding 0.25s ease",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              padding: isExpanded ? "0 8px 10px" : "0 0 10px",
              textTransform: "uppercase",
              textAlign: isExpanded ? "left" : "center",
              opacity: isExpanded ? 1 : 0,
              height: isExpanded ? "auto" : 0,
              overflow: "hidden",
              transition: "opacity 0.2s ease, height 0.2s ease",
            }}
          >
            Admin Menu
          </div>

          {adminNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: "none" }} title={item.label}>
                <div
                  style={getLinkStyle(isActive)}
                  className="sidebar-link"
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {renderIcon(item.icon, isActive)}
                  <span
                    style={{
                      fontSize: "13.5px",
                      fontWeight: isActive ? 700 : 500,
                      opacity: isExpanded ? 1 : 0,
                      width: isExpanded ? "auto" : 0,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      transition: "opacity 0.2s ease 0.05s",
                      color: isActive ? "#3b82f6" : "var(--text-secondary)",
                    }}
                  >
                    {item.label}
                  </span>
                  {isActive && isExpanded && (
                    <div
                      style={{
                        marginLeft: "auto",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#3b82f6",
                        flexShrink: 0,
                      }}
                    />
                  )}
                </div>
              </Link>
            );
          })}

          <div
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              padding: isExpanded ? "20px 8px 10px" : "20px 0 10px",
              textTransform: "uppercase",
              textAlign: isExpanded ? "left" : "center",
              opacity: isExpanded ? 1 : 0,
              height: isExpanded ? "auto" : 0,
              overflow: "hidden",
              transition: "opacity 0.2s ease, height 0.2s ease",
            }}
          >
            Manager Functions
          </div>

          <Link href="/admin/employees" style={{ textDecoration: "none" }} title="My Team">
            <div style={getLinkStyle(pathname === "/admin/employees" || pathname === "/employees")} className="sidebar-link">
              {renderIcon(Users, pathname === "/admin/employees" || pathname === "/employees")}
              <span style={{ fontSize: "13.5px", fontWeight: (pathname === "/admin/employees" || pathname === "/employees") ? 700 : 500, opacity: isExpanded ? 1 : 0, width: isExpanded ? "auto" : 0, overflow: "hidden", whiteSpace: "nowrap", transition: "opacity 0.2s ease 0.05s", color: (pathname === "/admin/employees" || pathname === "/employees") ? "#3b82f6" : "var(--text-secondary)" }}>My Team</span>
            </div>
          </Link>

          <Link href="/admin/tasks" style={{ textDecoration: "none" }} title="Tasks & Attendance">
            <div style={getLinkStyle(pathname === "/admin/tasks" || pathname === "/tasks" || pathname === "/attendance")} className="sidebar-link">
              {renderIcon(FolderKanban, pathname === "/admin/tasks" || pathname === "/tasks" || pathname === "/attendance")}
              <span style={{ fontSize: "13.5px", fontWeight: (pathname === "/admin/tasks" || pathname === "/tasks" || pathname === "/attendance") ? 700 : 500, opacity: isExpanded ? 1 : 0, width: isExpanded ? "auto" : 0, overflow: "hidden", whiteSpace: "nowrap", transition: "opacity 0.2s ease 0.05s", color: (pathname === "/admin/tasks" || pathname === "/tasks" || pathname === "/attendance") ? "#3b82f6" : "var(--text-secondary)" }}>Tasks & Attendance</span>
            </div>
          </Link>

          <Link href="/admin/geofencing" style={{ textDecoration: "none" }} title="Activities">
            <div style={getLinkStyle(pathname === "/admin/geofencing" || pathname === "/geofencing" || pathname.startsWith("/activities") || pathname.startsWith("/admin/activities"))} className="sidebar-link">
              {renderIcon(Briefcase, pathname === "/admin/geofencing" || pathname === "/geofencing" || pathname.startsWith("/activities") || pathname.startsWith("/admin/activities"))}
              <span style={{ fontSize: "13.5px", fontWeight: (pathname === "/admin/geofencing" || pathname === "/geofencing" || pathname.startsWith("/activities") || pathname.startsWith("/admin/activities")) ? 700 : 500, opacity: isExpanded ? 1 : 0, width: isExpanded ? "auto" : 0, overflow: "hidden", whiteSpace: "nowrap", transition: "opacity 0.2s ease 0.05s", color: (pathname === "/admin/geofencing" || pathname === "/geofencing" || pathname.startsWith("/activities") || pathname.startsWith("/admin/activities")) ? "#3b82f6" : "var(--text-secondary)" }}>Activities</span>
            </div>
          </Link>

          <Link href="/admin/map" style={{ textDecoration: "none" }} title="Insights">
            <div style={getLinkStyle(pathname === "/admin/map" || pathname === "/map" || pathname === "/playback" || pathname.startsWith("/insights") || pathname.startsWith("/admin/insights"))} className="sidebar-link">
              {renderIcon(BarChart3, pathname === "/admin/map" || pathname === "/map" || pathname === "/playback" || pathname.startsWith("/insights") || pathname.startsWith("/admin/insights"))}
              <span style={{ fontSize: "13.5px", fontWeight: (pathname === "/admin/map" || pathname === "/map" || pathname === "/playback" || pathname.startsWith("/insights") || pathname.startsWith("/admin/insights")) ? 700 : 500, opacity: isExpanded ? 1 : 0, width: isExpanded ? "auto" : 0, overflow: "hidden", whiteSpace: "nowrap", transition: "opacity 0.2s ease 0.05s", color: (pathname === "/admin/map" || pathname === "/map" || pathname === "/playback" || pathname.startsWith("/insights") || pathname.startsWith("/admin/insights")) ? "#3b82f6" : "var(--text-secondary)" }}>Insights</span>
            </div>
          </Link>

          <Link href="/admin/notifications" style={{ textDecoration: "none" }} title="Notifications">
            <div style={getLinkStyle(pathname === "/admin/notifications" || pathname === "/notifications")} className="sidebar-link">
              {renderIcon(FileText, pathname === "/admin/notifications" || pathname === "/notifications")}
              <span style={{ fontSize: "13.5px", fontWeight: (pathname === "/admin/notifications" || pathname === "/notifications") ? 700 : 500, opacity: isExpanded ? 1 : 0, width: isExpanded ? "auto" : 0, overflow: "hidden", whiteSpace: "nowrap", transition: "opacity 0.2s ease 0.05s", color: (pathname === "/admin/notifications" || pathname === "/notifications") ? "#3b82f6" : "var(--text-secondary)" }}>Notifications</span>
            </div>
          </Link>

          <Link href="/admin/settings/user-management" style={{ textDecoration: "none" }} title="Settings">
            <div style={getLinkStyle(pathname.startsWith("/settings") || pathname.startsWith("/admin/settings"))} className="sidebar-link">
              {renderIcon(LogOut, pathname.startsWith("/settings") || pathname.startsWith("/admin/settings"))}
              <span style={{ fontSize: "13.5px", fontWeight: (pathname.startsWith("/settings") || pathname.startsWith("/admin/settings")) ? 700 : 500, opacity: isExpanded ? 1 : 0, width: isExpanded ? "auto" : 0, overflow: "hidden", whiteSpace: "nowrap", transition: "opacity 0.2s ease 0.05s", color: (pathname.startsWith("/settings") || pathname.startsWith("/admin/settings")) ? "#3b82f6" : "var(--text-secondary)" }}>Settings</span>
            </div>
          </Link>
        </nav>

        {/* Logout */}
        <div
          style={{
            padding: isExpanded ? "16px 12px" : "16px 0",
            borderTop: "1px solid var(--border)",
            transition: "padding 0.25s ease",
          }}
        >
          <Link href="/login" style={{ textDecoration: "none" }} title="Logout">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: isExpanded ? "10px 12px" : "10px 0",
                justifyContent: isExpanded ? "flex-start" : "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              className="logout-link"
            >
              <LogOut size={16} />
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? "auto" : 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  transition: "opacity 0.2s ease 0.05s",
                }}
              >
                Logout
              </span>
            </div>
          </Link>
        </div>
      </aside>
    </>
  );
}
