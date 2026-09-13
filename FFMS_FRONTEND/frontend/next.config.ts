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
};

export default nextConfig;
