"use client";
import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { login } from "@/store/slices/authSlice";
import { useRouter } from "next/navigation";
import { Zap, Eye, EyeOff, MapPin } from "lucide-react";

export default function LoginPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userType, setUserType] = useState<"new" | "existing">("existing");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("type") === "new") {
        router.push("/register");
      }
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 1200));

    if (userType === "new") {
      // Register Flow: Allow registering with ANY email and password!
      const displayName = email.split("@")[0];
      const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      dispatch(login({ token: "dev_fallback_token", user: { name: capitalizedName, email, role: "ADMIN" } }));

      if (typeof window !== "undefined") {
        localStorage.setItem("ff_password", password);
        localStorage.removeItem("adminSetupComplete");
        localStorage.removeItem("adminSetupData");
        setAuthCookies("dev_fallback_token", "ADMIN");
        window.location.href = "/admin-setup";
      }
    } else {
      // Existing User login — try backend first
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

      try {
        const response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
          const resData = await response.json();
          const tokenVal = resData.data?.accessToken || resData.data?.token;
          if (resData.success && tokenVal) {
            const userRole = (resData.data.user.role || "EMPLOYEE").toUpperCase();
            if (typeof window !== "undefined") {
              localStorage.setItem("auth_token", tokenVal);
              localStorage.setItem("adminSetupComplete", "true");
              const profile = { firstName: resData.data.user.name, email: resData.data.user.email, role: userRole, id: resData.data.user.id, territoryId: resData.data.user.territoryId };
              localStorage.setItem("ff_user_profile", JSON.stringify(profile));
              setAuthCookies(tokenVal, userRole);
            }
            dispatch(login({
              token: tokenVal,
              user: {
                name: resData.data.user.name,
                email: resData.data.user.email,
                role: userRole,
                id: resData.data.user.id,
                territoryId: resData.data.user.territoryId,
              }
            }));
            const dest = userRole === "ADMIN" ? "/admin/dashboard" : "/dashboard";
            router.push(dest);
            return;
          }
        } else {
          // Backend returned an error response (e.g. 400 or 401)
          const errData = await response.json();
          setError(errData.error?.message || "Invalid credentials. Please check your email and password.");
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn("[Login] Backend unreachable, falling back to local credentials.", err);
      }

      // Offline/Local Fallback — check stored credentials
      const storedProfile = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("ff_user_profile") || "{}")
        : {};
      const storedEmail = storedProfile.email || "admin@fieldforce.com";
      const storedPassword = typeof window !== "undefined"
        ? (localStorage.getItem("ff_password") || "admin123")
        : "admin123";

      const isCustomCreds = storedProfile.email && email === storedEmail && password === storedPassword;

      if (isCustomCreds) {
        const storedName = storedProfile.firstName || "Admin";
        const fallbackRole = storedProfile.role || "ADMIN";
        dispatch(login({ token: "dev_fallback_token", user: { name: storedName, email, role: fallbackRole } }));

        if (typeof window !== "undefined") {
          localStorage.setItem("adminSetupComplete", "true");
          localStorage.setItem("auth_token", "dev_fallback_token");
          setAuthCookies("dev_fallback_token", fallbackRole);
        }
        const dest = fallbackRole === "ADMIN" ? "/admin/dashboard" : "/dashboard";
        router.push(dest);
      } else {
        setError("Invalid credentials. Please check your email and password.");
        setLoading(false);
      }
    }
  };

  /** Write auth state to cookies so Next.js Edge middleware can read the role. */
  function setAuthCookies(token: string, role: string) {
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    document.cookie = `auth_token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    document.cookie = `ff_user_role=${role}; path=/; max-age=${maxAge}; SameSite=Lax`;
  }

  return (
    <div style={{
      height: "100vh",
      background: "url(/login-bg.jpg) no-repeat center center / cover",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px", position: "relative", overflow: "hidden",
    }}>

      <div style={{ width: "100%", maxWidth: "410px", animation: "fadeIn 0.5s ease", position: "relative", zIndex: 2 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 2px" }}>TR@NSForce Admin</h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", fontWeight: 500 }}>Sign in to your dashboard</p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(255, 255, 255, 0.95)",
          border: "1px solid rgba(0, 82, 255, 0.12)",
          borderRadius: "14px",
          padding: "26px 28px",
          backdropFilter: "blur(20px)",
          boxShadow: "0 15px 35px rgba(0, 82, 255, 0.06), 0 1px 3px rgba(0, 0, 0, 0.02)",
        }}>
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Email */}
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>Email Address</label>
              <input
                id="login-email"
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@fieldforce.com"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: "8px" }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  style={{ paddingRight: "44px" }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex"
                }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)", borderRadius: "0", padding: "10px 14px", color: "var(--accent-red)", fontSize: "13px" }}>
                {error}
              </div>
            )}

            

            {/* Button */}
            {loading ? (
              <div className="skeleton-box" style={{ width: "100%", height: "46px", borderRadius: "8px" }} />
            ) : (
              <button id="login-btn" type="submit" className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "13px", fontSize: "15px" }}>
                Sign In →
              </button>
            )}

            {/* Registration Direct Link */}
            <div style={{ textAlign: "center", marginTop: "2px", fontSize: "13px" }}>
              <span style={{ color: "var(--text-secondary)" }}>Don't have an account? </span>
              <button
                type="button"
                onClick={() => router.push("/register")}
                style={{
                  background: "none", border: "none", color: "var(--accent-blue)",
                  fontWeight: 700, cursor: "pointer", padding: 0, textDecoration: "underline"
                }}
              >
                Register here
              </button>
            </div>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "12px", color: "var(--text-muted)" }}>
          <MapPin size={12} style={{ display: "inline", marginRight: "4px" }} />
          Field Force Management System v1.0
        </p>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
