import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Couples paste cover photos from any https host, so images allow https:. Next's bootstrap needs inline scripts.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https: data:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  // The public page embeds the venue's Google Maps.
  "frame-src https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Photos and attachments are uploaded through server actions (core/uploads caps images at 5 MB and PDFs at 10 MB; an upload request carries at most 11 MB).
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  async redirects() {
    return [{ source: "/portal/reportes", destination: "/portal/notificaciones", permanent: true }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Private areas and guests' pages (addresses, bank details) stay out of search engines.
      { source: "/:area(admin|portal|boda|archivos)/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
