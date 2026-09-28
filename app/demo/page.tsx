import type { Metadata } from 'next'

import { DemoExperience } from '@/app/_components/demo-experience'

export const metadata: Metadata = {
  title: {
    absolute: 'Sparkle Suite Demo',
  },
  description:
    'See Sparkle Suite in motion: the customer site, the lineup, and the Dance Floor. Public clips only, for Bomb Party reps.',
  alternates: {
    canonical: '/demo',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Sparkle Suite Demo',
    description:
      'Watch the customer side of a live show. Join the build queue when you are ready.',
    url: '/demo',
    siteName: 'Sparkle Suite',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Sparkle Suite demo.',
      },
    ],
  },
}

export default function DemoPage() {
  return <DemoExperience />
}
