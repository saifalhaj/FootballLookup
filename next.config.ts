import type { NextConfig } from "next";

// Fully static output — no server, no API routes, nothing to run or babysit.
// `out/` deploys as flat files to Vercel, GitHub Pages, or Cloudflare Pages.
const nextConfig: NextConfig = {
  output: "export",
};

export default nextConfig;
