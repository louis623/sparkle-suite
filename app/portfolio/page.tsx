import type { Metadata } from 'next'

import { PortfolioExperience } from '@/app/_components/portfolio-experience'

export const metadata: Metadata = {
  title: {
    absolute: 'Sparkle Suite Portfolio',
  },
  description:
    'Customer sites, community looks, and seasonal themes Sparkle Suite is proud to put on the floor for Bomb Party reps.',
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
      'Real customer sites, community looks, and seasonal themes. Schedule your Sparkle Suite build.',
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
