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
    href: '/',
    destinationLabel: 'Open the Sparkle Suite site',
    signInLabel: 'Have an account? Sign in',
    signInHref: '/login',
    signUpLabel: "Don't have an account? Sign up",
    signUpHref: sparkleSuitePublicLandingContent.hero.primaryCta.href,
  },
  finder: {
    product: 'Sparkle Finder',
    detail: 'for the Bomb Party collectors',
    href: sparkleFinderHomeUrl,
    destinationLabel: 'Open Sparkle Finder',
    signInLabel: 'Have an account? Sign in',
    signInHref: sparkleFinderSignInUrl,
    signUpLabel: "Don't have an account? Sign up",
    signUpHref: sparkleFinderSignUpUrl,
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
