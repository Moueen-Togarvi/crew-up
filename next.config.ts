import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external IPs and localhost to access dev resources (fixes the infinite loading bug)
  // @ts-expect-error - Next.js 15+ undocumented property for dev cross-origin
  allowedDevOrigins: ["127.0.0.1", "192.168.0.106", "21.0.13.39"],
  output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
