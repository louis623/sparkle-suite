import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [128, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  serverExternalPackages: ['@resvg/resvg-js'],
  outputFileTracingIncludes: {
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
      { source: '/learn', destination: '/', statusCode: 301 },
      { source: '/demo', destination: '/#watch', statusCode: 301 },
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
