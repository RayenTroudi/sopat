import type { NextConfig } from "next";

// ─── Content Security Policy ──────────────────────────────────────────────────
//
// Two policies:
//   adminCsp  — strict, applied only to /admin/* routes
//   publicCsp — permissive enough for the public website (Google Maps, WordPress
//               images, external fonts) while still blocking XSS basics

const isDev = process.env.NODE_ENV === 'development'

// Admin panel: tight policy, no iframes, no external scripts except Cloudinary widget
const adminCsp = [
  `default-src 'self'`,
  // TODO: replace 'unsafe-inline' with a nonce-based CSP for production hardening
  `script-src 'self' 'unsafe-inline' https://widget.cloudinary.com${isDev ? " 'unsafe-eval'" : ''}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `img-src 'self' data: blob: https://res.cloudinary.com https://www.sopat.tn https://sopat.tn`,
  `font-src 'self' https://fonts.gstatic.com`,
  `connect-src 'self' https://*.neon.tech wss://*.neon.tech https://api.cloudinary.com https://vercel.live`,
  `frame-src 'none'`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  ...(isDev ? [] : [`upgrade-insecure-requests`]),
].join('; ')

// Public website: allows Google Maps iframe, WordPress image CDN, external fonts
const publicCsp = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `img-src 'self' data: blob: https: http:`,
  `font-src 'self' data: https://fonts.gstatic.com`,
  `connect-src 'self' https:`,
  `frame-src https://www.google.com https://maps.google.com`,
  `object-src 'none'`,
  `base-uri 'self'`,
].join('; ')

const commonHeaders = [
  { key: 'X-Content-Type-Options',  value: 'nosniff' },
  { key: 'X-Frame-Options',         value: 'SAMEORIGIN' },
  { key: 'X-XSS-Protection',        value: '1; mode=block' },
  { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',      value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
]

const adminHeaders = [
  ...commonHeaders,
  { key: 'Content-Security-Policy', value: adminCsp },
]

const publicHeaders = [
  ...commonHeaders,
  { key: 'Content-Security-Policy', value: publicCsp },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: adminHeaders,
      },
      {
        // validate/edit token pages are also part of the admin flow
        source: '/(validate|edit)/:path*',
        headers: adminHeaders,
      },
      {
        // Everything else: public website
        source: '/((?!admin|validate|edit).*)',
        headers: publicHeaders,
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
