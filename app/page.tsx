import type { Metadata } from 'next'

import { SparkleSuitePublicLanding } from '@/app/_components/sparkle-suite-public-landing'
import { readLandingFounderAvailability } from '@/lib/sparkle-suite/live-founder-availability'
import { sparkleSuitePublicLandingContent } from '@/lib/sparkle-suite/public-landing-content'

export const metadata: Metadata = {
  title: {
    absolute: 'Sparkle Suite',
  },
  description: 'A polished website and live-show tools for Bomb Party reps. Now building Sparkle Suite sites—join the build queue for your spot in line.',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Sparkle Suite',
    description:
      'Sparkle Suite gives reps a polished customer site, standout live-show tools, and built-in support that helps customers feel the difference.',
    url: '/',
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
    description: 'A polished website and live-show tools for Bomb Party reps. Now building Sparkle Suite sites—join the build queue for your spot in line.',
    images: [
      {
        url: '/opengraph-image',
        alt: 'Sparkle Suite public landing page.',
      },
    ],
  },
}

const sparkleSuiteJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://www.yoursparklesuite.com/#website',
      name: 'Sparkle Suite',
      url: 'https://www.yoursparklesuite.com/',
      description: metadata.description,
      inLanguage: 'en-US',
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://www.yoursparklesuite.com/#software',
      name: 'Sparkle Suite',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: sparkleSuitePublicLandingContent.hero.body,
      url: 'https://www.yoursparklesuite.com/',
      audience: {
        '@type': 'Audience',
        audienceType: 'reps',
      },
      offers: {
        '@type': 'Offer',
        availability: 'https://schema.org/InStock',
        url: 'https://www.yoursparklesuite.com/#pricing',
      },
      areaServed: {
        '@type': 'Country',
        name: 'United States',
      },
    },
    {
      '@type': 'Organization',
      '@id': 'https://www.yoursparklesuite.com/#organization',
      name: 'Sparkle Suite',
      url: 'https://www.yoursparklesuite.com/',
    },
  ],
}

export default async function HomePage() {
  const initialAvailability = await readLandingFounderAvailability()
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(sparkleSuiteJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <SparkleSuitePublicLanding initialAvailability={initialAvailability} />
    </>
  )
}
