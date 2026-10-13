import type { Metadata } from 'next'

import { SparkleSuitePublicLanding } from '@/app/_components/sparkle-suite-public-landing'
import { readLandingFounderAvailability } from '@/lib/sparkle-suite/live-founder-availability'
import { sparkleSuitePublicLandingContent } from '@/lib/sparkle-suite/public-landing-content'

export const metadata: Metadata = {
  title: {
    absolute: 'Sparkle Suite',
  },
  description:
    'A polished website and live-show tools for Bomb Party reps. Now building Sparkle Suite sites—join the build queue for your spot in line.',
  alternates: {
    canonical: '/learn',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Sparkle Suite',
    description:
      'Sparkle Suite gives reps a polished customer site, standout live-show tools, and built-in support that helps customers feel the difference.',
    url: '/learn',
    siteName: 'Sparkle Suite',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Sparkle Suite public landing page.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sparkle Suite',
    description:
      'A polished website and live-show tools for Bomb Party reps. Now building Sparkle Suite sites—join the build queue for your spot in line.',
    images: [
      {
        url: '/opengraph-image',
        alt: 'Sparkle Suite public landing page.',
      },
    ],
  },
}

const sparkleSuiteLearnJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebPage',
      '@id': 'https://www.yoursparklesuite.com/learn#webpage',
      name: 'Sparkle Suite',
      url: 'https://www.yoursparklesuite.com/learn',
      description:
        'A polished website and live-show tools for Bomb Party reps. Now building Sparkle Suite sites—join the build queue for your spot in line.',
      inLanguage: 'en-US',
      isPartOf: {
        '@id': 'https://www.yoursparklesuite.com/#website',
      },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://www.yoursparklesuite.com/#software',
      name: 'Sparkle Suite',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: sparkleSuitePublicLandingContent.hero.body,
      url: 'https://www.yoursparklesuite.com/learn',
      audience: {
        '@type': 'Audience',
        audienceType: 'reps',
      },
      offers: {
        '@type': 'Offer',
        availability: 'https://schema.org/InStock',
        url: 'https://www.yoursparklesuite.com/learn#pricing',
      },
      areaServed: {
        '@type': 'Country',
        name: 'United States',
      },
    },
  ],
}

export default async function LearnPage() {
  const initialAvailability = await readLandingFounderAvailability()
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(sparkleSuiteLearnJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <SparkleSuitePublicLanding initialAvailability={initialAvailability} />
    </>
  )
}
