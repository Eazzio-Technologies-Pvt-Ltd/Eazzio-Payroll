import Sidebar from "@/components/layout/Sidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { MobileSidebarProvider } from "@/components/layout/MobileSidebarContext";
import AdminRoleGuard from "@/components/AdminRoleGuard";
import DataInitializer from "@/components/DataInitializer";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileSidebarProvider>
      {/* Admin auth & role check — non-ADMIN → /dashboard, unauthed → /login */}
      <AdminRoleGuard>
        <DataInitializer />
        <div
          data-panel="admin"
          style={{ display: "flex", minHeight: "100vh", background: "var(--bg-primary)" }}
        >
          <Sidebar />
          <div
            className="dashboard-main"
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              transition: "margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <AdminTopbar />
            <main
              className="dashboard-content"
              style={{ flex: 1, padding: "28px", animation: "fadeIn 0.4s ease" }}
            >
              {children}
            </main>
          </div>
        </div>
      </AdminRoleGuard>
    </MobileSidebarProvider>
  );
}
