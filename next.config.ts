import type { NextConfig } from "next";
import path from "path";

function getSupabaseImagePattern() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    const { hostname } = new URL(url);
    return {
      protocol: "https" as const,
      hostname,
      pathname: "/storage/v1/object/public/**",
    };
  } catch {
    return null;
  }
}

const supabaseImagePattern = getSupabaseImagePattern();

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/**",
      },
      ...(supabaseImagePattern ? [supabaseImagePattern] : []),
    ],
  },
  async headers() {
    return [
      {
        source: "/images/login-hero.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
