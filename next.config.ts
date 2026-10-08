import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@resvg/resvg-js'],
  outputFileTracingIncludes: {
    '/api/workspace/card-qr/flyer': ['./lib/workspace/card-qr/fonts/**/*'],
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
