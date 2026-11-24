import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy. default-src 'self' locks the app to its own origin;
 * the extra hosts are the exact third parties the browser actually talks to:
 *   - cdn.paddle.com / *.paddle.com — the checkout overlay (Paddle.js + its iframe)
 *   - cdn.jsdelivr.net, huggingface.co/*.hf.co — the optional on-device voice engine
 *     (onnxruntime-web + wasm, and the Piper voice models), which also needs
 *     'wasm-unsafe-eval' and blob: workers.
 * 'unsafe-inline' is kept for scripts/styles because the app ships Next's inline
 * bootstrap and a tiny inline theme script with no nonce; it still blocks loading
 * any off-origin script or exfiltrating to any off-allowlist host. 'unsafe-eval'
 * is added in development only (HMR needs it).
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net https://cdn.paddle.com${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.paddle.com",
  "font-src 'self' data:",
  "media-src 'self' blob: data:",
  "connect-src 'self' blob: data: https://cdn.jsdelivr.net https://huggingface.co https://*.huggingface.co https://*.hf.co https://*.paddle.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "frame-src https://*.paddle.com",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  async rewrites() {
    return [{ source: "/.well-known/assetlinks.json", destination: "/api/assetlinks" }];
  },
  webpack(config, { isServer }) {
    // The on-device voice engine (Emscripten) mentions Node modules it never uses in the browser.
    if (!isServer) config.resolve.fallback = { ...(config.resolve.fallback ?? {}), fs: false, path: false, crypto: false };
    return config;
  },
};

export default nextConfig;
