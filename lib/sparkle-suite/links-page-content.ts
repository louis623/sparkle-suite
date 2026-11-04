import {
  sparkleSuitePublicLandingSafety,
  sparkleSuiteYouTubeChannelUrl,
} from '@/lib/sparkle-suite/public-landing-content'

/**
 * yoursparklesuite.com/links is the single TikTok bio link
 * (@SparkleSuiteandFinder). It points to both sites. Suite host only:
 * proxy.ts returns 404 for /links on a rep custom domain, and `links` is a
 * reserved public site name. noindex, and left out of the sitemap.
 */
const bioTracking = 'utm_source=tiktok&utm_medium=bio&utm_campaign=links_page'

export const sparkleLinksPage = {
  name: 'Louis Chapman',
  tagline: 'Show sites and live-show tools for Bomb Party reps. Plus a place to find your next piece.',
  headshot: {
    src: '/brand/louis-chapman-headshot-480.jpg',
    width: 480,
    height: 480,
  },
  cards: [
    {
      id: 'suite',
      logo: { src: '/brand/sparkle-suite-logo-transparent.png', alt: 'Sparkle Suite' },
      summary: 'Your own show site, a Live Lineup for every show, and Dance Floor swaps for your customers.',
      cta: 'Visit Sparkle Suite',
      href: `/?${bioTracking}&utm_content=suite_card`,
    },
    {
      id: 'finder',
      logo: { src: '/brand/sparkle-finder-logo-transparent.png', alt: 'Sparkle Finder' },
      summary: 'Find the jewelry you are hunting for.',
      cta: 'Visit Sparkle Finder',
      href: `https://yoursparklefinder.com/?${bioTracking}&utm_content=finder_card`,
    },
  ],
  youtube: {
    label: 'YouTube @SparkleSuite',
    href: sparkleSuiteYouTubeChannelUrl,
  },
  disclaimer: sparkleSuitePublicLandingSafety.disclaimer,
} as const
