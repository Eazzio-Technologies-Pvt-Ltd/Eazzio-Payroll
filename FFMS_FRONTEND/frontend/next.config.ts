import type { NextConfig } from "next";
import path from "path";

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
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;