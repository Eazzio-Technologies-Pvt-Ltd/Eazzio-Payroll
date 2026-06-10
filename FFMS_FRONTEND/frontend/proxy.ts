import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Role-based access middleware.
 *
 * Route rules:
 *  - /login, /register        → always accessible (redirect to dashboard if already logged in)
 *  - /admin/*                 → ADMIN role only
 *  - /dashboard, (dashboard)/* → any authenticated role (ADMIN, MANAGER, EMPLOYEE, etc.)
 *  - everything else          → pass through (landing page, API routes, etc.)
 *
 * Auth state is read from cookies set during login:
 *  - `auth_token`       → presence means logged in
 *  - `ff_user_role`     → the user's role string (set alongside auth_token at login)
 */

const PUBLIC_ROUTES = ["/login", "/register", "/", "/forceadmin", "/admin-setup"];
const ADMIN_ROUTES_PREFIX = "/admin";
const DASHBOARD_ROUTES_PREFIX = "/dashboard";
const PROTECTED_PREFIXES = [
  "/dashboard", "/employees", "/tasks", "/attendance", "/geofencing",
  "/activities", "/expenses", "/map", "/playback", "/insights",
  "/forms", "/feedback", "/reports", "/notifications", "/settings",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets, Next.js internals — always pass through
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("auth_token")?.value;
  const role = request.cookies.get("ff_user_role")?.value?.toUpperCase();
  const isLoggedIn = Boolean(token);

  // Public routes — if already authenticated, redirect to the correct home
  if (PUBLIC_ROUTES.includes(pathname)) {
    if (isLoggedIn && (pathname === "/login" || pathname === "/register")) {
      const dest = role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  // Admin routes — only ADMIN role allowed
  if (pathname.startsWith(ADMIN_ROUTES_PREFIX)) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    if (role !== "ADMIN") {
      // Non-admin trying to access /admin → send to their dashboard
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Protected dashboard routes — any authenticated user
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files.
     * This regex excludes: _next/static, _next/image, favicon.ico, and files with extensions.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|ttf|eot)$).*)",
  ],
};
