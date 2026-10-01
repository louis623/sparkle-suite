import type { Metadata } from 'next'

import { MarketingHub } from '@/app/_components/marketing-hub'
import { sparkleSuiteMarketingHubContent } from '@/lib/sparkle-suite/marketing-hub-content'

const description =
  'Are you here for the bling? Choose your adventure. Sparkle Suite is the site and live-show setup for reps. Sparkle Finder is where shoppers find and favorite pieces from the show.'

export const metadata: Metadata = {
  title: {
    absolute: 'Sparkle Suite and Sparkle Finder',
  },
  description,
  alternates: {
    canonical: '/adventure',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Sparkle Suite and Sparkle Finder',
    description,
    url: '/adventure',
    siteName: 'Sparkle Suite',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sparkle Suite and Sparkle Finder',
    description,
  },
}

const hubJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: sparkleSuiteMarketingHubContent.headline,
  description,
  url: 'https://www.yoursparklesuite.com/adventure',
  isPartOf: {
    '@type': 'WebSite',
    name: 'Sparkle Suite',
    url: 'https://www.yoursparklesuite.com/',
  },
}

export default function AdventurePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(hubJsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <MarketingHub />
    </>
  )
}
