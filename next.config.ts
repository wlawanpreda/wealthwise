import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,
  // typedRoutes graduated out of `experimental` in Next.js 15.5; keeping it
  // there only logs a deprecation warning today but is removed in 16.x.
  typedRoutes: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "www.google.com" },
    ],
  },
  serverExternalPackages: ["firebase-admin"],
};

export default config;
