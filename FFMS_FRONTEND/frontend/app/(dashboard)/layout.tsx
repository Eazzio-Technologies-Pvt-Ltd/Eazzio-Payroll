import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { MobileSidebarProvider } from "@/components/layout/MobileSidebarContext";
import DataInitializer from "@/components/DataInitializer";
import RoleGuard from "@/components/RoleGuard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileSidebarProvider>
      {/* Auth & role check — redirects ADMIN → /admin/dashboard, unauthed → /login */}
      <RoleGuard>
        <DataInitializer />
        <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}>
          <Sidebar />
          <div
            className="dashboard-main"
            style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, transition: "margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)" }}
          >
            <Topbar />
            <main className="dashboard-content" style={{ flex: 1, padding: "28px", animation: "fadeIn 0.4s ease" }}>
              {children}
            </main>
          </div>
        </div>
      </RoleGuard>
    </MobileSidebarProvider>
  );
}
