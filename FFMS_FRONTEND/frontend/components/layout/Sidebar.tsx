/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import { logout } from "@/store/slices/authSlice";
import { useMobileSidebar } from "./MobileSidebarContext";
import {
  Gauge,
  Users,
  CheckSquare,
  Briefcase,
  Wallet,
  TrendingUp,
  FileText,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  MapPin,
  Lightbulb,
  MessageSquare,
  Video,
  CreditCard
} from "lucide-react";

const COLLAPSED_WIDTH = 64;
const EXPANDED_WIDTH = 240;
// Force reload 2

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);
  const isManager = user?.role === "MANAGER";
  const isAdmin = user?.role === "ADMIN";
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const basePath = mounted && isAdmin ? "/admin" : "";
  const { isMobileOpen, closeMobileSidebar } = useMobileSidebar();
  const [isMobile, setIsMobile] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    if (isMobile) closeMobileSidebar();
  }, [pathname]);

  // Force expanded on mobile
  useEffect(() => {
    if (isMobile) setIsExpanded(true);
  }, [isMobile]);

  // Accordion open states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    myTask: false,
    activities: false,
    insights: false,
    reports: false,
    settings: false,
  });

  const getOpenSections = (p: string) => ({
    myTask: p === `${basePath}/tasks` || p === `${basePath}/attendance`,
    activities: p === `${basePath}/geofencing` || p === `${basePath}/map` || p === `${basePath}/playback` || p === `${basePath}/live-feed` || p.startsWith(`${basePath}/activities`),
    insights: p === `${basePath}/map` || p === `${basePath}/playback` || p.startsWith(`${basePath}/insights`),
    reports: p.startsWith(`${basePath}/reports`),
    settings: p.startsWith(`${basePath}/settings`),
  });

  // Automatically keep correct accordion sections open based on active path
  useEffect(() => {
    setOpenSections(getOpenSections(pathname));
  }, [pathname]);

  // Close accordions when collapsing
  useEffect(() => {
    if (!isExpanded) {
      setOpenSections(getOpenSections(pathname));
    }
  }, [isExpanded, pathname]);

  const toggleSection = (section: string) => {
    if (!isExpanded) return;
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Renders round icon wrapper
  const renderIcon = (Icon: any, isActive: boolean) => {
    return (
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: isActive ? "var(--accent-blue)" : "transparent",
          border: isActive ? "none" : "1px solid var(--sidebar-icon-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "all 0.15s ease",
        }}
      >
        <Icon size={15} color={isActive ? "white" : "var(--sidebar-text-inactive)"} />
      </div>
    );
  };

  const getLinkStyle = (isActive: boolean): React.CSSProperties => {
    return {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: isExpanded ? "10px 12px" : "10px 0",
      justifyContent: isExpanded ? "flex-start" : "center",
      background: isActive ? "var(--sidebar-active-bg)" : "transparent",
      borderRadius: "0",
      cursor: "pointer",
      color: isActive ? "var(--sidebar-text)" : "var(--sidebar-text-inactive)",
      transition: "all 0.2s ease",
      marginBottom: "2px",
    };
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
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
          width: isMobile ? `${EXPANDED_WIDTH}px` : (isExpanded ? `${EXPANDED_WIDTH}px` : `${COLLAPSED_WIDTH}px`),
          height: "100%",
          maxHeight: "100%",
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
          display: "flex",
          flexDirection: "column",
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: 0,
          zIndex: 9999,
          transition: isMobile ? "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)" : "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
          boxShadow: isMobile
            ? (isMobileOpen ? "4px 0 24px rgba(0, 0, 0, 0.25)" : "none")
            : "none",
          transform: isMobile ? (isMobileOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
        }}
      >
        {/* Sidebar Content */}
        {/* Accordion Navigation */}
        <nav style={{ flex: 1, padding: isExpanded ? "8px 12px" : "16px 0", overflowY: "auto", transition: "padding 0.25s ease" }}>

          {/* Main Menu Subtitle */}
          <div
            style={{
              fontSize: "11px",
              color: "var(--sidebar-text-muted)",
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
            Main Menu
          </div>

          {/* 1. Dashboard */}
          <Link href={`${basePath}/dashboard`} style={{ textDecoration: "none" }} title="Dashboard">
            <div style={getLinkStyle(pathname === `${basePath}/dashboard`)} className="sidebar-link">
              {renderIcon(Gauge, pathname === `${basePath}/dashboard`)}
              <span style={{
                fontSize: "13.5px",
                fontWeight: pathname === `${basePath}/dashboard` ? 700 : 500,
                opacity: isExpanded ? 1 : 0,
                width: isExpanded ? "auto" : 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                transition: "opacity 0.2s ease 0.05s",
              }}>Dashboard</span>
            </div>
          </Link>

          {/* 2. My Team (Employees) or Managers (Admin) */}
          {isAdmin ? (
            <Link href={`${basePath}/managers`} style={{ textDecoration: "none" }} title="Managers">
              <div style={getLinkStyle(pathname === `${basePath}/managers`)} className="sidebar-link">
                {renderIcon(Users, pathname === `${basePath}/managers`)}
                <span style={{
                  fontSize: "13.5px",
                  fontWeight: pathname === `${basePath}/managers` ? 700 : 500,
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? "auto" : 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  transition: "opacity 0.2s ease 0.05s",
                }}>Managers</span>
              </div>
            </Link>
          ) : (
            <Link href={`${basePath}/employees`} style={{ textDecoration: "none" }} title="My Team">
              <div style={getLinkStyle(pathname === `${basePath}/employees`)} className="sidebar-link">
                {renderIcon(Users, pathname === `${basePath}/employees`)}
                <span style={{
                  fontSize: "13.5px",
                  fontWeight: pathname === `${basePath}/employees` ? 700 : 500,
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? "auto" : 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  transition: "opacity 0.2s ease 0.05s",
                }}>My Team</span>
              </div>
            </Link>
          )}

          {/* Project Management */}
          {isAdmin ? (
            <Link href={`${basePath}/projects`} style={{ textDecoration: "none" }} title="Project Management">
              <div style={getLinkStyle(pathname === `${basePath}/projects`)} className="sidebar-link">
                {renderIcon(Briefcase, pathname === `${basePath}/projects`)}
                <span style={{
                  fontSize: "13.5px",
                  fontWeight: pathname === `${basePath}/projects` ? 700 : 500,
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? "auto" : 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  transition: "opacity 0.2s ease 0.05s",
                }}>Project Management</span>
              </div>
            </Link>
          ) : (
            <Link href={`/my-projects`} style={{ textDecoration: "none" }} title="My Projects">
              <div style={getLinkStyle(pathname === `/my-projects`)} className="sidebar-link">
                {renderIcon(Briefcase, pathname === `/my-projects`)}
                <span style={{
                  fontSize: "13.5px",
                  fontWeight: pathname === `/my-projects` ? 700 : 500,
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? "auto" : 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  transition: "opacity 0.2s ease 0.05s",
                }}>My Projects</span>
              </div>
            </Link>
          )}

          {mounted && (<>
            {/* 3. My Task Accordion */}
            <div>
              <div
                onClick={() => toggleSection("myTask")}
                style={getLinkStyle(pathname === `${basePath}/tasks` || pathname === `${basePath}/attendance`)}
                className="sidebar-link"
                title="My Task"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, justifyContent: isExpanded ? "flex-start" : "center" }}>
                  {renderIcon(CheckSquare, pathname === `${basePath}/tasks` || pathname === `${basePath}/attendance`)}
                  <span style={{
                    fontSize: "13.5px",
                    fontWeight: (pathname === `${basePath}/tasks` || pathname === `${basePath}/attendance`) ? 700 : 500,
                    opacity: isExpanded ? 1 : 0,
                    width: isExpanded ? "auto" : 0,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    transition: "opacity 0.2s ease 0.05s",
                  }}>My Task</span>
                </div>
                {isExpanded && (openSections.myTask ? (
                  <ChevronDown size={14} color="var(--sidebar-text-muted)" />
                ) : (
                  <ChevronRight size={14} color="var(--sidebar-text-muted)" />
                ))}
              </div>

              {isExpanded && openSections.myTask && (
                <div style={{ paddingLeft: "42px", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px", marginTop: "4px" }}>
                  <Link href={`${basePath}/attendance`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: pathname === `${basePath}/attendance` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                        fontWeight: pathname === `${basePath}/attendance` ? 700 : 400,
                        display: "block",
                        padding: "4px 8px",
                      }}
                    >
                      ➔ Attendance
                    </span>
                  </Link>
                  <Link href={`${basePath}/tasks`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: pathname === `${basePath}/tasks` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                        fontWeight: pathname === `${basePath}/tasks` ? 700 : 400,
                        display: "block",
                        padding: "4px 8px",
                      }}
                    >
                      ➔ My Active Tasks
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </>)}

          {/* 4. Activities Accordion */}
          <div>
            <div
              onClick={() => toggleSection("activities")}
              style={getLinkStyle(pathname === `${basePath}/geofencing` || pathname === `${basePath}/map` || pathname === `${basePath}/playback` || pathname === `${basePath}/live-feed` || pathname.startsWith(`${basePath}/activities`))}
              className="sidebar-link"
              title="Activities"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, justifyContent: isExpanded ? "flex-start" : "center" }}>
                {renderIcon(Briefcase, pathname === `${basePath}/geofencing` || pathname === `${basePath}/map` || pathname === `${basePath}/playback` || pathname === `${basePath}/live-feed` || pathname.startsWith(`${basePath}/activities`))}
                <span style={{
                  fontSize: "13.5px",
                  fontWeight: (pathname === `${basePath}/geofencing` || pathname === `${basePath}/map` || pathname === `${basePath}/playback` || pathname === `${basePath}/live-feed` || pathname.startsWith(`${basePath}/activities`)) ? 700 : 500,
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? "auto" : 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  transition: "opacity 0.2s ease 0.05s",
                }}>Activities</span>
              </div>
              {isExpanded && (openSections.activities ? (
                <ChevronDown size={14} color="var(--sidebar-text-muted)" />
              ) : (
                <ChevronRight size={14} color="var(--sidebar-text-muted)" />
              ))}
            </div>

            {isExpanded && openSections.activities && (
              <div style={{ paddingLeft: "42px", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px", marginTop: "4px" }}>
                <Link href={`${basePath}/geofencing`} style={{ textDecoration: "none", color: "inherit" }}>
                  <span
                    style={{
                      fontSize: "12.5px",
                      color: pathname === `${basePath}/geofencing` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                      fontWeight: pathname === `${basePath}/geofencing` ? 700 : 400,
                      display: "block",
                      padding: "4px 8px",
                    }}
                  >
                    ➔ Geofencing Monitor
                  </span>
                </Link>
                <Link href={`${basePath}/map`} style={{ textDecoration: "none", color: "inherit" }}>
                  <span
                    style={{
                      fontSize: "12.5px",
                      color: pathname === `${basePath}/map` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                      fontWeight: pathname === `${basePath}/map` ? 700 : 400,
                      display: "block",
                      padding: "4px 8px",
                    }}
                  >
                    ➔ Live GPS Map
                  </span>
                </Link>
                <Link href={`${basePath}/playback`} style={{ textDecoration: "none", color: "inherit" }}>
                  <span
                    style={{
                      fontSize: "12.5px",
                      color: pathname === `${basePath}/playback` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                      fontWeight: pathname === `${basePath}/playback` ? 700 : 400,
                      display: "block",
                      padding: "4px 8px",
                    }}
                  >
                    ➔ Map Insights (Playback)
                  </span>
                </Link>
                <Link href={`${basePath}/live-feed`} style={{ textDecoration: "none", color: "inherit" }}>
                  <span
                    style={{
                      fontSize: "12.5px",
                      color: pathname === `${basePath}/live-feed` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                      fontWeight: pathname === `${basePath}/live-feed` ? 700 : 400,
                      display: "block",
                      padding: "4px 8px",
                    }}
                  >
                    ➔ Live Feed
                  </span>
                </Link>
              </div>
            )}
          </div>


          {/* 5. Expenses */}
          <Link href={`${basePath}/expenses`} style={{ textDecoration: "none" }} title="Expenses">
            <div style={getLinkStyle(pathname === `${basePath}/expenses`)} className="sidebar-link">
              {renderIcon(Wallet, pathname === `${basePath}/expenses`)}
              <span style={{
                fontSize: "13.5px",
                fontWeight: pathname === `${basePath}/expenses` ? 700 : 500,
                opacity: isExpanded ? 1 : 0,
                width: isExpanded ? "auto" : 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                transition: "opacity 0.2s ease 0.05s",
              }}>Expenses</span>
            </div>
          </Link>

          {/* 5b. Leave Management — approve/reject leaves from all employees */}
          {(isAdmin || isManager) && (
            <Link href="/leaves" style={{ textDecoration: "none" }} title="Leave Management">
              <div style={getLinkStyle(pathname === "/leaves")} className="sidebar-link">
                {renderIcon(FileText, pathname === "/leaves")}
                <span style={{
                  fontSize: "13.5px",
                  fontWeight: pathname === "/leaves" ? 700 : 500,
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? "auto" : 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  transition: "opacity 0.2s ease 0.05s",
                }}>Leave Requests</span>
              </div>
            </Link>
          )}

          {/* 5c. Salary Management */}
          {isAdmin && (
            <Link href={`${basePath}/salary`} style={{ textDecoration: "none" }} title="Salary Management">
              <div style={getLinkStyle(pathname === `${basePath}/salary`)} className="sidebar-link">
                {renderIcon(Wallet, pathname === `${basePath}/salary`)}
                <span style={{
                  fontSize: "13.5px",
                  fontWeight: pathname === `${basePath}/salary` ? 700 : 500,
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? "auto" : 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  transition: "opacity 0.2s ease 0.05s",
                }}>Salary Management</span>
              </div>
            </Link>
          )}

          {/* 6. Insights Accordion */}
          <div>
            <div
              onClick={() => toggleSection("insights")}
              style={getLinkStyle(pathname.startsWith(`${basePath}/insights`))}
              className="sidebar-link"
              title="Insights"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, justifyContent: isExpanded ? "flex-start" : "center" }}>
                {renderIcon(TrendingUp, pathname.startsWith(`${basePath}/insights`))}
                <span style={{
                  fontSize: "13.5px",
                  fontWeight: pathname.startsWith(`${basePath}/insights`) ? 700 : 500,
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? "auto" : 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  transition: "opacity 0.2s ease 0.05s",
                }}>Insights</span>
              </div>
              {isExpanded && (openSections.insights ? (
                <ChevronDown size={14} color="var(--sidebar-text-muted)" />
              ) : (
                <ChevronRight size={14} color="var(--sidebar-text-muted)" />
              ))}
            </div>

            {isExpanded && openSections.insights && (
              <div style={{ paddingLeft: "42px", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px", marginTop: "4px" }}>
                <Link href={`${basePath}/insights/overview`} style={{ textDecoration: "none", color: "inherit" }}>
                  <span
                    style={{
                      fontSize: "12.5px",
                      color: pathname === `${basePath}/insights/overview` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                      fontWeight: pathname === `${basePath}/insights/overview` ? 700 : 400,
                      display: "block",
                      padding: "4px 8px",
                    }}
                  >
                    ➔ Overview
                  </span>
                </Link>
                <Link href={`${basePath}/insights/attendance-analytics`} style={{ textDecoration: "none", color: "inherit" }}>
                  <span
                    style={{
                      fontSize: "12.5px",
                      color: pathname === `${basePath}/insights/attendance-analytics` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                      fontWeight: pathname === `${basePath}/insights/attendance-analytics` ? 700 : 400,
                      display: "block",
                      padding: "4px 8px",
                    }}
                  >
                    ➔ Attendance Analytics
                  </span>
                </Link>
                <Link href={`${basePath}/insights/expense-audits`} style={{ textDecoration: "none", color: "inherit" }}>
                  <span
                    style={{
                      fontSize: "12.5px",
                      color: pathname === `${basePath}/insights/expense-audits` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                      fontWeight: pathname === `${basePath}/insights/expense-audits` ? 700 : 400,
                      display: "block",
                      padding: "4px 8px",
                    }}
                  >
                    ➔ Expense Audits
                  </span>
                </Link>
              </div>
            )}
          </div>

          {/* 7. Forms */}
          <Link href={`${basePath}/forms`} style={{ textDecoration: "none" }} title="Forms & Feedback">
            <div style={getLinkStyle(pathname === `${basePath}/forms` || pathname === `${basePath}/feedback`)} className="sidebar-link">
              {renderIcon(FileText, pathname === `${basePath}/forms` || pathname === `${basePath}/feedback`)}
              <span style={{
                fontSize: "13.5px",
                fontWeight: (pathname === `${basePath}/forms` || pathname === `${basePath}/feedback`) ? 700 : 500,
                opacity: isExpanded ? 1 : 0,
                width: isExpanded ? "auto" : 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                transition: "opacity 0.2s ease 0.05s",
              }}>Forms</span>
            </div>
          </Link>

          {/* 7b. Feedback */}
          <Link href={`${basePath}/feedback`} style={{ textDecoration: "none" }} title="Anonymous Feedback">
            <div style={getLinkStyle(pathname === `${basePath}/feedback`)} className="sidebar-link">
              {renderIcon(MessageSquare, pathname === `${basePath}/feedback`)}
              <span style={{
                fontSize: "13.5px",
                fontWeight: pathname === `${basePath}/feedback` ? 700 : 500,
                opacity: isExpanded ? 1 : 0,
                width: isExpanded ? "auto" : 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                transition: "opacity 0.2s ease 0.05s",
              }}>Feedback</span>
            </div>
          </Link>

          {mounted && !isManager && (<>
            {/* 8. Reports Accordion */}
            <div>
              <div
                onClick={() => toggleSection("reports")}
                style={getLinkStyle(pathname.startsWith(`${basePath}/reports`))}
                className="sidebar-link"
                title="Reports"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, justifyContent: isExpanded ? "flex-start" : "center" }}>
                  {renderIcon(BarChart3, pathname.startsWith(`${basePath}/reports`))}
                  <span style={{
                    fontSize: "13.5px",
                    fontWeight: pathname.startsWith(`${basePath}/reports`) ? 700 : 500,
                    opacity: isExpanded ? 1 : 0,
                    width: isExpanded ? "auto" : 0,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    transition: "opacity 0.2s ease 0.05s",
                  }}>Reports</span>
                </div>
                {isExpanded && (openSections.reports ? (
                  <ChevronDown size={14} color="var(--sidebar-text-muted)" />
                ) : (
                  <ChevronRight size={14} color="var(--sidebar-text-muted)" />
                ))}
              </div>

              {isExpanded && openSections.reports && (
                <div style={{ paddingLeft: "42px", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px", marginTop: "4px" }}>
                  <Link href={`${basePath}/reports`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: pathname === `${basePath}/reports` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                        fontWeight: pathname === `${basePath}/reports` ? 700 : 400,
                        display: "block",
                        padding: "4px 8px",
                      }}
                    >
                      ➔ Visits & Performance
                    </span>
                  </Link>
                  <Link href={`${basePath}/reports/travel-expenses`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span style={{
                      fontSize: "12.5px",
                      color: pathname === `${basePath}/reports/travel-expenses` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                      fontWeight: pathname === `${basePath}/reports/travel-expenses` ? 700 : 400,
                      display: "block",
                      padding: "4px 8px",
                    }}>
                      ➔ Travel Expenses
                    </span>
                  </Link>
                  <Link href={`${basePath}/reports/travel-logs`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span style={{
                      fontSize: "12.5px",
                      color: pathname === `${basePath}/reports/travel-logs` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                      fontWeight: pathname === `${basePath}/reports/travel-logs` ? 700 : 400,
                      display: "block",
                      padding: "4px 8px",
                    }}>
                      ➔ Travel Logs
                    </span>
                  </Link>
                  <Link href={`${basePath}/reports/productivity`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span style={{
                      fontSize: "12.5px",
                      color: pathname === `${basePath}/reports/productivity` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                      fontWeight: pathname === `${basePath}/reports/productivity` ? 700 : 400,
                      display: "block",
                      padding: "4px 8px",
                    }}>
                      ➔ Productivity Reports
                    </span>
                  </Link>
                  <Link href={`${basePath}/reports/compliance`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span style={{
                      fontSize: "12.5px",
                      color: pathname === `${basePath}/reports/compliance` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                      fontWeight: pathname === `${basePath}/reports/compliance` ? 700 : 400,
                      display: "block",
                      padding: "4px 8px",
                    }}>
                      ➔ Compliance Metrics
                    </span>
                  </Link>
                </div>
              )}
            </div>

          </>)}

          {/* 9. Notifications */}
          <Link href={`${basePath}/notifications`} style={{ textDecoration: "none" }} title="Notifications">
            <div style={getLinkStyle(pathname === `${basePath}/notifications`)} className="sidebar-link">
              {renderIcon(Bell, pathname === `${basePath}/notifications`)}
              <span style={{
                fontSize: "13.5px",
                fontWeight: pathname === `${basePath}/notifications` ? 700 : 500,
                opacity: isExpanded ? 1 : 0,
                width: isExpanded ? "auto" : 0,
                overflow: "hidden",
                whiteSpace: "nowrap",
                transition: "opacity 0.2s ease 0.05s",
              }}>Notifications</span>
            </div>
          </Link>

          {/* Billing */}
          {isAdmin && (
            <Link href="/admin/billing" style={{ textDecoration: "none" }} title="Billing">
              <div style={getLinkStyle(pathname === "/admin/billing")} className="sidebar-link">
                {renderIcon(CreditCard, pathname === "/admin/billing")}
                <span style={{
                  fontSize: "13.5px",
                  fontWeight: pathname === "/admin/billing" ? 700 : 500,
                  opacity: isExpanded ? 1 : 0,
                  width: isExpanded ? "auto" : 0,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  transition: "opacity 0.2s ease 0.05s",
                }}>Billing</span>
              </div>
            </Link>
          )}

          {mounted && isAdmin && (<>
            {/* 10. Settings Accordion */}
            <div>
              <div
                onClick={() => toggleSection("settings")}
                style={getLinkStyle(pathname.startsWith(`${basePath}/settings`))}
                className="sidebar-link"
                title="Settings"
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, justifyContent: isExpanded ? "flex-start" : "center" }}>
                  {renderIcon(Settings, pathname.startsWith(`${basePath}/settings`))}
                  <span style={{
                    fontSize: "13.5px",
                    fontWeight: pathname.startsWith(`${basePath}/settings`) ? 700 : 500,
                    opacity: isExpanded ? 1 : 0,
                    width: isExpanded ? "auto" : 0,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    transition: "opacity 0.2s ease 0.05s",
                  }}>Settings</span>
                </div>
                {isExpanded && (openSections.settings ? (
                  <ChevronDown size={14} color="var(--sidebar-text-muted)" />
                ) : (
                  <ChevronRight size={14} color="var(--sidebar-text-muted)" />
                ))}
              </div>

              {isExpanded && openSections.settings && (
                <div style={{ paddingLeft: "42px", display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px", marginTop: "4px" }}>
                  <Link href={`${basePath}/settings/notifications`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: pathname === `${basePath}/settings/notifications` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                        fontWeight: pathname === `${basePath}/settings/notifications` ? 700 : 400,
                        display: "block",
                        padding: "4px 8px",
                      }}
                    >
                      ➔ Notification Settings
                    </span>
                  </Link>
                  <Link href={`${basePath}/settings/user-management`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: pathname === `${basePath}/settings/user-management` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                        fontWeight: pathname === `${basePath}/settings/user-management` ? 700 : 400,
                        display: "block",
                        padding: "4px 8px",
                      }}
                    >
                      ➔ User Management
                    </span>
                  </Link>
                  <Link href={`${basePath}/settings/territory-setup`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: pathname === `${basePath}/settings/territory-setup` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                        fontWeight: pathname === `${basePath}/settings/territory-setup` ? 700 : 400,
                        display: "block",
                        padding: "4px 8px",
                      }}
                    >
                      ➔ Territory Setup
                    </span>
                  </Link>
                  <Link href={`${basePath}/settings/travel-policies`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: pathname === `${basePath}/settings/travel-policies` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                        fontWeight: pathname === `${basePath}/settings/travel-policies` ? 700 : 400,
                        display: "block",
                        padding: "4px 8px",
                      }}
                    >
                      ➔ Travel Policies
                    </span>
                  </Link>
                  <Link href={`${basePath}/settings/timing`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: pathname === `${basePath}/settings/timing` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                        fontWeight: pathname === `${basePath}/settings/timing` ? 700 : 400,
                        display: "block",
                        padding: "4px 8px",
                      }}
                    >
                      ➔ Timing & Shifts
                    </span>
                  </Link>
                  <Link href={`${basePath}/settings/security-access`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: pathname === `${basePath}/settings/security-access` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                        fontWeight: pathname === `${basePath}/settings/security-access` ? 700 : 400,
                        display: "block",
                        padding: "4px 8px",
                      }}
                    >
                      ➔ Security & Access
                    </span>
                  </Link>
                  <Link href={`${basePath}/settings/inactive-persons`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: pathname === `${basePath}/settings/inactive-persons` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                        fontWeight: pathname === `${basePath}/settings/inactive-persons` ? 700 : 400,
                        display: "block",
                        padding: "4px 8px",
                      }}
                    >
                      ➔ Inactive Persons
                    </span>
                  </Link>
                  <Link href={`${basePath}/settings/account-settings`} style={{ textDecoration: "none", color: "inherit" }}>
                    <span
                      style={{
                        fontSize: "12.5px",
                        color: pathname === `${basePath}/settings/account-settings` ? "var(--accent-blue)" : "var(--sidebar-text-inactive)",
                        fontWeight: pathname === `${basePath}/settings/account-settings` ? 700 : 400,
                        display: "block",
                        padding: "4px 8px",
                      }}
                    >
                      ➔ Account Settings
                    </span>
                  </Link>
                </div>
              )}
            </div>

          </>)}

        </nav>

        {/* Logout Row at Bottom */}
        <div style={{ padding: isExpanded ? "16px 12px" : "16px 0", borderTop: "1px solid var(--sidebar-border)", transition: "padding 0.25s ease" }}>
          <div
            onClick={() => {
              dispatch(logout());
              router.push("/login");
            }}
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
            title="Logout"
          >
            <LogOut size={16} />
            <span style={{
              fontSize: "13px",
              fontWeight: 500,
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? "auto" : 0,
              overflow: "hidden",
              whiteSpace: "nowrap",
              transition: "opacity 0.2s ease 0.05s",
            }}>Logout</span>
          </div>
        </div>
      </aside>
    </>
  );
}
