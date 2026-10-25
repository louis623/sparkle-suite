import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep disposable checkouts isolated from unrelated parent lockfiles.
  turbopack: { root: __dirname },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'bqhzfkgkjyuhlsozpylf.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'pukemqiwlyqmyytxkdmo.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  serverExternalPackages: ['@resvg/resvg-js'],
  outputFileTracingIncludes: {
    '/*': [
      './lib/amethyst/generated/homepage-server.cjs',
      './public/amethyst/compiled/*.js',
      './public/amethyst/live-lineup.js',
      './public/amethyst/responsive-image.js',
      './public/amethyst/sparkle-suite-footer-credit.js',
      './public/amethyst/dance-floor-ticker-label.js',
      './public/amethyst/*.css',
      './public/amethyst/bling-kitchen/framed-hero.css',
    ],
    // Server-rendered email shells read with readFileSync (official notice + Weekly Fizz).
    '/api/**/*': [
      './brand-assets/email/official-notices/*.html',
      './brand-assets/email/weekly-fizz-report/weekly-fizz-report.resend-template.html',
    ],
    '/api/workspace/card-qr/flyer': [
      './lib/workspace/card-qr/fonts/**/*',
      './public/amethyst/skins/**/flyer/plate.webp',
    ],
    '/api/workspace/card-qr/card': [
      './lib/workspace/card-qr/fonts/card/**/*',
      './lib/workspace/card-qr/card-plates/**/*',
    ],
  },
  async redirects() {
    return [
      // /demo -> /#watch and /learn -> / live in proxy.ts. A config redirect
      // runs before the proxy and would also apply on rep hosts, which must
      // return 404 for both.
    ]
  },
  async headers() {
    return [
      {
        source: '/onboarding/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow, noarchive',
          },
          {
            key: 'Cache-Control',
            value: 'private, no-store, max-age=0',
          },
          {
            key: 'Referrer-Policy',
            value: 'no-referrer',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
        ],
      },
      {
        source: '/onboarding/:path*',
        headers: [
          {
            key: 'Referrer-Policy',
            value: 'no-referrer',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
