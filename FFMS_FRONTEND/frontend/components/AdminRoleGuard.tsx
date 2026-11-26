"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { RootState } from "@/store";
import { logout } from "@/store/slices/authSlice";

/**
 * AdminRoleGuard — mounted in the admin layout.
 *
 * Responsibilities:
 * 1. Not logged in → /login
 * 2. Logged in but NOT ADMIN → /dashboard (non-admins cannot access admin panel)
 * 3. Hydrates cookies from localStorage session if missing (same as RoleGuard)
 */
export default function AdminRoleGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, user, token } = useSelector((s: RootState) => s.auth);
  const dispatch = useDispatch();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      const hasToken = Boolean(localStorage.getItem("auth_token"));
      const hasCookie = document.cookie
        .split(";")
        .some((c) => c.trim().startsWith("auth_token="));
      if (!hasToken || !hasCookie) {
        dispatch(logout());
        router.replace("/login");
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [dispatch, router]);

  useEffect(() => {
    if (!isLoggedIn || !token) {
      document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
      document.cookie = "ff_user_role=; path=/; max-age=0; SameSite=Lax";
      router.replace("/login");
      return;
    }

    const role = (user?.role || "").toUpperCase();

    // Hydrate cookies for Edge middleware
    const cookieExists = document.cookie.includes("auth_token=");
    if (!cookieExists && token) {
      const maxAge = 60 * 60 * 24 * 7;
      document.cookie = `auth_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
      document.cookie = `ff_user_role=${role}; path=/; max-age=${maxAge}; SameSite=Lax`;
    }

    // Only ADMIN is allowed here
    if (role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [isLoggedIn, token, user, router]);

  const isAdmin = isLoggedIn && token && (user?.role || "").toUpperCase() === "ADMIN";

  if (!mounted || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
