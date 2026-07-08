import Sidebar from "@/components/layout/Sidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";
import { MobileSidebarProvider } from "@/components/layout/MobileSidebarContext";
import AdminRoleGuard from "@/components/AdminRoleGuard";
import DataInitializer from "@/components/DataInitializer";
import SubscriptionGuard from "@/components/payment/SubscriptionGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileSidebarProvider>
      {/* Admin auth & role check — non-ADMIN → /dashboard, unauthed → /login */}
      <AdminRoleGuard>
        <DataInitializer />
        <div
          data-panel="admin"
          style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", background: "var(--bg-primary)" }}
        >
          <AdminTopbar />
          <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
            <Sidebar />
            <main
              className="dashboard-content"
              style={{ flex: 1, padding: "28px", animation: "fadeIn 0.4s ease", overflowY: "auto" }}
            >
              <SubscriptionGuard>{children}</SubscriptionGuard>
            </main>
          </div>
        </div>
      </AdminRoleGuard>
    </MobileSidebarProvider>
  );
}


