import type { NextConfig } from "next";

// Fully static output — no server, no API routes, nothing to run or babysit.
// `out/` deploys as flat files to Vercel, GitHub Pages, or Cloudflare Pages.
// Security response headers (CSP etc.) can't be set here under output:"export"
// (next.config headers() is inert for static export) — they live in vercel.json.
const nextConfig: NextConfig = {
  output: "export",
  // Don't advertise the framework, and never emit source maps to the client.
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
};

export default nextConfig;
