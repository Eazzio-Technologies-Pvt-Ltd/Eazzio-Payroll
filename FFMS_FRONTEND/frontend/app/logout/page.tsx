"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { logout } from "@/store/slices/authSlice";

export default function LogoutPage() {
  const dispatch = useDispatch();

  useEffect(() => {
    // 1. Dispatch logout to clear Redux state
    dispatch(logout());

    // 2. Clear cookies
    document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
    document.cookie = "ff_user_role=; path=/; max-age=0; SameSite=Lax";

    // 3. Clear local storage explicitly
    localStorage.removeItem("auth_token");
    localStorage.removeItem("ff_is_logged_in");
    localStorage.removeItem("ff_user_profile");

    // 4. Force a full page reload to the login page to ensure clean state
    window.location.href = "/login";
  }, [dispatch]);

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
      fontFamily: "Inter, sans-serif"
    }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "16px", fontWeight: 500 }}>Logging out...</p>
      </div>
    </div>
  );
}
