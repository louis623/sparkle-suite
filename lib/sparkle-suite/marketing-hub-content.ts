import {
  sparkleSuitePublicLandingContent,
  sparkleSuitePublicLandingSafety,
} from '@/lib/sparkle-suite/public-landing-content'

/** Finder marketing root. This hub does not redirect the Finder domain. */
export const sparkleFinderHomeUrl = 'https://yoursparklefinder.com/' as const
/** Current Finder app sign-in. */
export const sparkleFinderSignInUrl = 'https://yoursparklefinder.com/auth/sign-in' as const
/** Live Finder public landing creates an account with this return path. */
export const sparkleFinderSignUpUrl = 'https://yoursparklefinder.com/auth/sign-up?next=/' as const

/**
 * Joint front door. Finder deep-drill pages under /finder stay empty for a later pass.
 */
export const sparkleSuiteMarketingHubContent = {
  wordmark: ['Sparkle Suite', 'Sparkle Finder'] as const,
  support: "You're in, you're in the right place for the bling.",
  prompt: 'Now Pick Your Shine',
  suite: {
    product: 'Sparkle Suite',
    detail: 'for the Bomb Party reps',
    body: 'Sparkle Suite gives reps a polished customer site, standout live-show tools, and built-in support that helps customers feel the difference.',
    href: '/',
    destinationLabel: 'Open the Sparkle Suite site',
    signInLabel: 'Sign In',
    signInHref: '/login',
    signUpLabel: 'Sign Up',
    signUpHref: sparkleSuitePublicLandingContent.hero.primaryCta.href,
  },
  finder: {
    product: 'Sparkle Finder',
    detail: 'for the Bomb Party collectors',
    body: 'Find the pieces you love, and build the collection that you adore.',
    href: sparkleFinderHomeUrl,
    destinationLabel: 'Open Sparkle Finder',
    comingSoon: 'Coming soon.',
    /** Destination stays unwired until Louis chooses it. */
    sneakPeekLabel: 'Get a sneak peek',
    sneakPeekHref: '',
    signInLabel: 'Sign In',
    signInHref: sparkleFinderSignInUrl,
    signUpLabel: 'Sign Up',
    signUpHref: sparkleFinderSignUpUrl,
    deepLinks: [] as ReadonlyArray<{ label: string; href: string }>,
  },
  about: {
    suite: {
      product: 'Sparkle Suite',
      body: 'Sparkle Suite is the workspace for Bomb Party reps. You get a polished customer site, live-show tools for the night itself, and built-in support that helps customers feel the difference. Customers land somewhere that feels like you.',
      ctaLabel: 'Learn More',
      ctaHref: 'https://www.yoursparklesuite.com/',
    },
    finder: {
      product: 'Sparkle Finder',
      body: "Sparkle Finder is for Bomb Party collectors. Find the pieces you love, and build the collection that you adore. It is the shopper's side of the show, close to the pieces that caught your eye.",
      ctaLabel: 'Learn More',
      ctaHref: sparkleFinderHomeUrl,
    },
  },
  quietExits: {
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
