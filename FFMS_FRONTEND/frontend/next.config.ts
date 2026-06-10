import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost.com",
    "localhost",
    "192.168.1.17",
    "192.168.1.20",
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;