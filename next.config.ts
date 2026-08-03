import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Keeps the library from being scrambled by the minifier
  serverExternalPackages: ["pdf-parse"],
  
  // 2. THE FIX: Forces Vercel to upload the hidden worker files to your API route
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/pdf-parse/**/*"],
  },
};

export default nextConfig;