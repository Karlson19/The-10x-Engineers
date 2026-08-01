import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

/**
 * The API is served through this app's own origin rather than called directly.
 *
 * The refresh token lives in an httpOnly cookie. Called directly, the browser
 * is on Vercel and the API is on Render, so that cookie is a third party one:
 * Chrome in incognito, and anyone who has blocked third party cookies, never
 * stores it, and the session dies on the next page load. Proxying through this
 * origin makes it a first party cookie, and removes the CORS dependency along
 * with it.
 *
 * The upstream is taken from NEXT_PUBLIC_API_URL, which is already configured
 * in every environment, so this needs no new setting anywhere.
 */
function apiProxyTarget(): string | null {
  const configured = process.env.NEXT_PUBLIC_API_URL;

  if (!configured) {
    return null;
  }

  try {
    // Only absolute upstreams can be proxied. A relative value means somebody
    // has already pointed this at the same origin, and rewriting it to itself
    // would loop.
    return new URL(configured).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Users are on mid-range Android phones over 3G. Keep the payload small.
  compress: true,
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "motion", "recharts"],
  },
  async rewrites() {
    const target = apiProxyTarget();

    if (!target) {
      return [];
    }

    return [{ source: "/api/v1/:path*", destination: `${target}/:path*` }];
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
