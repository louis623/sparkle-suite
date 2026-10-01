import {
  sparkleSuitePublicLandingContent,
  sparkleSuitePublicLandingSafety,
} from '@/lib/sparkle-suite/public-landing-content'

/** Finder marketing root. This hub does not redirect the Finder domain. */
export const sparkleFinderHomeUrl = 'https://yoursparklefinder.com/' as const
/** Current Finder app sign-in. */
export const sparkleFinderSignInUrl = 'https://yoursparklefinder.com/auth/sign-in' as const

/**
 * Joint front door. Finder deep-drill pages under /finder stay empty for a later pass.
 */
export const sparkleSuiteMarketingHubContent = {
  wordmark: ['Sparkle Suite', 'Sparkle Finder'] as const,
  headline: 'Are you here for the bling?',
  prompt: 'Choose your adventure.',
  suite: {
    title: 'Selling tonight?',
    product: 'Sparkle Suite',
    detail: 'for reps',
    href: '/',
    destinationLabel: 'Open the Sparkle Suite site',
    signInLabel: 'Sign in',
    signInHref: '/login',
  },
  finder: {
    title: 'Shopping the show?',
    product: 'Sparkle Finder',
    detail: 'find & favorite',
    href: sparkleFinderHomeUrl,
    destinationLabel: 'Open Sparkle Finder',
    signInLabel: 'Sign in',
    signInHref: sparkleFinderSignInUrl,
    deepLinks: [] as ReadonlyArray<{ label: string; href: string }>,
  },
  suiteContinue: {
    eyebrow: 'Sparkle Suite',
    heading: 'A polished setup for the reps who sell the show.',
    body: sparkleSuitePublicLandingContent.hero.body,
    note: 'Join the build queue for your spot in line. No payment to join.',
    links: [
      sparkleSuitePublicLandingContent.hero.primaryCta,
      { label: 'Portfolio', href: '/portfolio' },
      { label: 'Demo', href: '/demo' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
  disclaimer: sparkleSuitePublicLandingSafety.disclaimer,
} as const
