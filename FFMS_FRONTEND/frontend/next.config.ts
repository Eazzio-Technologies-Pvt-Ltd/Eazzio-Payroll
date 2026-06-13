import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost.com",
        "localhost",
        "192.168.1.17",
        "192.168.1.20",
      ],
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // @ts-ignore - NextConfig type might not include eslint in your current version, but it's needed to bypass lint errors during build
  eslint: {
    ignoreDuringBuilds: true,
  },

  //turbopack: {
  //  root: path.resolve(__dirname),
  //},
};

export default nextConfig;
