import type { NextConfig } from "next";

// ─── Content Security Policy ──────────────────────────────────────────────────
//
// Sources covered:
//  - self              : the app itself
//  - neon.tech         : database connections (fetch from server components)
//  - res.cloudinary.com: uploaded images, PDFs served via <img> and fetch
//  - widget.cloudinary.com: Cloudinary Upload Widget script
//  - sopat.tn          : company website images referenced in the panel
//  - vercel.live       : Vercel preview toolbar (dev/preview only, harmless in prod)
//  - fonts.googleapis.com / gstatic: if Inter is ever loaded from CDN
//
// Intentionally tight:
//  - no 'unsafe-eval'  (XGBoost model runs Python-side, never eval in browser)
//  - no 'unsafe-inline' for scripts (NextAuth CSRF uses same-site cookies, not inline JS)
//  - style 'unsafe-inline' is required by Tailwind's runtime class injection in dev;
//    in production Tailwind is compiled so this could be tightened further with a nonce,
//    but keeping it here avoids breaking shadcn/ui components that inject inline styles.

const isDev = process.env.NODE_ENV === 'development'

const csp = [
  `default-src 'self'`,
  `script-src 'self' https://widget.cloudinary.com${isDev ? " 'unsafe-eval'" : ''}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `img-src 'self' data: blob: https://res.cloudinary.com https://www.sopat.tn https://sopat.tn`,
  `font-src 'self' https://fonts.gstatic.com`,
  // connect-src: NextAuth callbacks, Neon serverless driver (WebSocket + HTTPS),
  //              Cloudinary signed upload endpoint, Vercel Analytics
  `connect-src 'self' https://*.neon.tech wss://*.neon.tech https://api.cloudinary.com https://vercel.live`,
  `frame-src 'none'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  // Blocks MIME-type sniffing attacks on uploaded PDFs/images
  `upgrade-insecure-requests`,
].join('; ')

const securityHeaders = [
  { key: 'Content-Security-Policy',        value: csp },
  { key: 'X-Content-Type-Options',         value: 'nosniff' },
  { key: 'X-Frame-Options',                value: 'DENY' },
  { key: 'X-XSS-Protection',               value: '1; mode=block' },
  { key: 'Referrer-Policy',                value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',             value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    // 2-year max-age; includeSubDomains covers api.sopat.tn etc.
    value: 'max-age=63072000; includeSubDomains; preload',
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to all admin routes; public validate/edit pages also benefit
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/dtnelwn73/**',
      },
      {
        protocol: 'https',
        hostname: 'www.sopat.tn',
        pathname: '/wp-content/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'sopat.tn',
        pathname: '/wp-content/uploads/**',
      },
    ],
  },
};

export default nextConfig;
