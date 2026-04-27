import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "img.cuisineaz.com" },
      { protocol: "https", hostname: "**.cuisineactuelle.fr" },
    ],
  },
};

export default nextConfig;
