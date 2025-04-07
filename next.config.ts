import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
      bodySizeLimit: "2mb"
    },
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  webpack: (config) => {
    // Ignore Supabase functions during build
    config.module.rules.push({
      test: /supabase\/functions\/.*\.ts$/,
      use: 'null-loader',
    });
    return config;
  },
};

export default nextConfig;
