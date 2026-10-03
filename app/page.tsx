import type { Metadata } from 'next'

import { MarketingHub } from '@/app/_components/marketing-hub'
import { SparkleSuitePublicLanding } from '@/app/_components/sparkle-suite-public-landing'
import { sparkleSuiteMarketingHubContent } from '@/lib/sparkle-suite/marketing-hub-content'
import { sparkleSuitePublicLandingContent } from '@/lib/sparkle-suite/public-landing-content'
import { isSuiteSmokeHomeHub } from '@/lib/sparkle-suite/smoke-home-hub'

export const sparkleSuiteProductionHomeMetadata: Metadata = {
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
      description: sparkleSuiteProductionHomeMetadata.description,
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

const smokeHubDescription =
  "You're in the right place for the bling. Now Pick Your Shine. Sparkle Suite is the site and live-show setup for reps. Sparkle Finder is where shoppers find and favorite pieces from the show."

const smokeHubMetadata: Metadata = {
  title: {
    absolute: 'Sparkle Suite and Sparkle Finder',
  },
  description: smokeHubDescription,
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Sparkle Suite and Sparkle Finder',
    description: smokeHubDescription,
    url: '/',
    siteName: 'Sparkle Suite',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sparkle Suite and Sparkle Finder',
    description: smokeHubDescription,
  },
}

const smokeHubJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: sparkleSuiteMarketingHubContent.support,
  description: smokeHubDescription,
  url: 'https://www.yoursparklesuite.com/',
  isPartOf: {
    '@type': 'WebSite',
    name: 'Sparkle Suite',
    url: 'https://www.yoursparklesuite.com/',
  },
}

export function generateMetadata(): Metadata {
  return isSuiteSmokeHomeHub() ? smokeHubMetadata : sparkleSuiteProductionHomeMetadata
}

export default function HomePage() {
  if (isSuiteSmokeHomeHub()) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(smokeHubJsonLd).replace(/</g, '\\u003c'),
          }}
        />
        <MarketingHub />
      </>
    )
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(sparkleSuiteJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <SparkleSuitePublicLanding />
    </>
  )
}
