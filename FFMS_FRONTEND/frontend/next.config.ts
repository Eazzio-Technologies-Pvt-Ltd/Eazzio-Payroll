import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Allow ngrok and local dev network origins
  allowedDevOrigins: [
    "*.ngrok-free.dev",
    "*.ngrok.app",
    "wavy-commodity-jittery.ngrok-free.dev",
    "localhost:3000",
  ],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost.com",
        "localhost",
        "*.ngrok-free.dev",
        "wavy-commodity-jittery.ngrok-free.dev",
        "192.168.1.17",
        "192.168.1.20",
      ],
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    const noStoreHeaders = [
      {
        key: "Cache-Control",
        value: "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
      {
        key: "Pragma",
        value: "no-cache",
      },
      {
        key: "Expires",
        value: "0",
      },
    ];

    const protectedSources = [
      "/admin/:path*",
      "/dashboard/:path*",
      "/employees/:path*",
      "/tasks/:path*",
      "/attendance/:path*",
      "/geofencing/:path*",
      "/activities/:path*",
      "/expenses/:path*",
      "/leaves/:path*",
      "/managers/:path*",
      "/map/:path*",
      "/my-projects/:path*",
      "/playback/:path*",
      "/projects/:path*",
      "/insights/:path*",
      "/forms/:path*",
      "/feedback/:path*",
      "/reports/:path*",
      "/notifications/:path*",
      "/settings/:path*",
    ];

    return protectedSources.map((source) => ({
      source,
      headers: noStoreHeaders,
    }));
  },
};

export default nextConfig;
