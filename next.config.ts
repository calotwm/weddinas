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
  // Photos and attachments are uploaded through server actions (core/uploads caps images at 5 MB and PDFs at 10 MB; up to 10 files per upload are checked one by one).
  experimental: { serverActions: { bodySizeLimit: "25mb" } },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Private areas and guests' pages (addresses, bank details) stay out of search engines.
      { source: "/:area(admin|portal|boda|archivos)/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // Uploaded PDFs open in the browser viewer; sandboxing keeps any embedded script away from the site's origin.
      { source: "/archivos/:path*", headers: [{ key: "Content-Security-Policy", value: `${csp}; sandbox` }] },
    ];
  },
};

export default nextConfig;
