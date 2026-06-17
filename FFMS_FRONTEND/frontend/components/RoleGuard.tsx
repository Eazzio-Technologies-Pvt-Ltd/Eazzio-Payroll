"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { RootState } from "@/store";

/**
 * RoleGuard — rendered inside the dashboard layout.
 *
 * Responsibilities:
 * 1. If the user is not logged in → redirect to /login
 * 2. If the user is ADMIN → redirect to /admin/dashboard
 *    (handles existing sessions created before the cookie-middleware was added)
 * 3. Hydrates the auth cookies from localStorage so future page loads are
 *    correctly handled by the Edge middleware without requiring a re-login.
 */
export default function RoleGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, user, token } = useSelector((s: RootState) => s.auth);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    // Not logged in — send to login
    if (!isLoggedIn || !token) {
      document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
      document.cookie = "ff_user_role=; path=/; max-age=0; SameSite=Lax";
      router.replace("/login");
      return;
    }

    const role = (user?.role || "").toUpperCase();

    // Hydrate cookies from the existing localStorage session so the
    // middleware works correctly on subsequent navigations/refreshes
    const cookieExists = document.cookie.includes("auth_token=");
    if (!cookieExists && token) {
      const maxAge = 60 * 60 * 24 * 7; // 7 days
      document.cookie = `auth_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
      document.cookie = `ff_user_role=${role}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }

    // If the user is ADMIN and they are in the (dashboard) layout (which this guard covers),
    // they should be redirected to the /admin/* equivalent route.
    // Since Cloudflare static export doesn't run middleware, this client-side redirect is necessary.
    // Exception: routes that exist only in (dashboard) group (shared between roles)
    const sharedRoutes = ["/leaves"];
    if (role === "ADMIN") {
      const pathname = window.location.pathname;
      const isShared = sharedRoutes.some(r => pathname.startsWith(r));
      if (!isShared && !pathname.startsWith("/admin")) {
        router.replace(`/admin${pathname === "/" ? "/dashboard" : pathname}`);
      }
    }
  }, [isLoggedIn, token, user, router]);

  const role = (user?.role || "").toUpperCase();
  const sharedRoutes = ["/leaves"];
  const isOnSharedRoute = typeof window !== "undefined" && sharedRoutes.some(r => window.location.pathname.startsWith(r));

  // Render children if:
  // 1. Non-admin logged-in user (normal case)
  // 2. Admin on a shared route like /leaves
  const isUser = isLoggedIn && token && (role !== "ADMIN" || isOnSharedRoute);

  if (!mounted || !isUser) {
    return null;
  }

  return <>{children}</>;
}
