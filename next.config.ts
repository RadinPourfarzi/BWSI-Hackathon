import type { NextConfig } from "next";

const remotePatterns: {
  protocol: "http" | "https";
  hostname: string;
  port: string;
  pathname: string;
}[] = [];

try {
  const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");

  if (supabaseUrl.protocol === "http:" || supabaseUrl.protocol === "https:") {
    remotePatterns.push({
      protocol: supabaseUrl.protocol.slice(0, -1) as "http" | "https",
      hostname: supabaseUrl.hostname,
      port: supabaseUrl.port,
      pathname: "/storage/v1/object/**",
    });
  }
} catch {
  // Local-only builds do not require a remote image host.
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), geolocation=(), microphone=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
