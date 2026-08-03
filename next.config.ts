import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This is the magic line! It tells Next.js NOT to scramble the PDF library.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;