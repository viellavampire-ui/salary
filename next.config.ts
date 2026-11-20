import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const isHttps =
  (process.env.BETTER_AUTH_URL ?? "").startsWith("https://") ||
  process.env.VERCEL === "1";

/**
 * Content-Security-Policy без nonce (docs/SPEC.md §12).
 * Nonce-CSP требует динамического рендера и несовместим с частичным
 * пререндером (PPR), на котором построены страницы, — поэтому для скриптов
 * разрешены встроенные (Next.js и скрипт темы), но только со своего домена.
 * Всё остальное — только свой домен; аватары Google — с lh3.googleusercontent.com.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https://lh3.googleusercontent.com",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isHttps ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Запрет встраивания в чужие страницы (кликджекинг) — дублирует frame-ancestors
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  ...(isHttps
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Не раскрывать «X-Powered-By: Next.js»
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
