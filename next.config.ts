import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // o service worker nunca fica em cache: a versão nova chega logo
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          // connect-src libera o service worker a buscar as imagens no Storage do Supabase
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self'; connect-src 'self' ${process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://*.supabase.co"}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
