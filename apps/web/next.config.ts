import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Users are on mid-range Android phones over 3G. Keep the payload small.
  compress: true,
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "motion", "recharts"],
  },
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // A service worker in development caches the very thing you are editing.
  disable: process.env.NODE_ENV === "development",
  reloadOnOnline: false,
});

export default withSerwist(nextConfig);
