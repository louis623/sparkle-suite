import type { Metadata } from 'next'

import { PortfolioExperience } from '@/app/_components/portfolio-experience'

export const metadata: Metadata = {
  title: {
    absolute: 'Sparkle Suite Portfolio',
  },
  description:
    'Explore real rep websites built with Sparkle Suite. Find a look for your live-selling business.',
  alternates: {
    canonical: '/portfolio',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Sparkle Suite Portfolio',
    description:
      'Real rep websites, each with its own personality. Explore Sparkle Suite and join the build queue.',
    url: '/portfolio',
    siteName: 'Sparkle Suite',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Sparkle Suite portfolio.',
      },
    ],
  },
}

export default function PortfolioPage() {
  return <PortfolioExperience />
}
