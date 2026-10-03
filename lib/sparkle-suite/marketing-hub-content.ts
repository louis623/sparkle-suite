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
  veteranBanner: 'U.S. military veteran-owned and operated.',
  supportLines: ["You're in the right place", 'for the bling.'] as const,
  support: "You're in the right place for the bling.",
  prompt: 'Now Pick Your Shine',
  suite: {
    product: 'Sparkle Suite',
    detail: 'for the Bomb Party reps',
    body: 'Sparkle Suite gives reps a polished customer site, standout live-show tools, and built-in support that helps customers feel the difference.',
    href: '/',
    destinationLabel: 'Open the Sparkle Suite site',
    narrative:
      'Sparkle Suite is the workspace for Bomb Party reps. You get a polished customer site, live-show tools for the night itself, and built-in support that helps customers feel the difference. Customers land somewhere that feels like you.',
    learnMoreLabel: 'Learn More',
    learnMoreHref: 'https://www.yoursparklesuite.com/',
    signInLabel: 'Sign In',
    /**
     * Smoke shell only. The Suite card must not link to /login, NextAuth, or Workspace.
     * Google opens this URL with no client id and no redirect back to Sparkle Suite.
     * Forgot password stays a labeled demo until Suite sends resetPasswordForEmail.
     */
    smokeSignIn: {
      title: 'Sign in to Sparkle Suite',
      googleNotice:
        'Smoke preview. Google sign-in is not fully wired here. It opens Google only and will not land in your Workspace. Google may say this preview is not connected.',
      googleLabel: 'Google sign-in',
      googleUrl: 'https://accounts.google.com/o/oauth2/v2/auth?prompt=select_account',
      passwordNotice: 'Email and password sign-in is not part of this preview.',
      forgotLabel: 'Forgot password',
      forgotDemo: 'Demo — not a live password reset.',
      forgotResult:
        'Nothing was emailed. A real reset has to come from Sparkle Suite later. This preview does not send email or change a password.',
      popupBlocked:
        'Pop-up blocked. Open Google in a new tab. This still does not sign you into Sparkle Suite.',
      closeLabel: 'Close',
    },
    signUpLabel: 'Sign Up',
    signUpHref: sparkleSuitePublicLandingContent.hero.primaryCta.href,
  },
  finder: {
    product: 'Sparkle Finder',
    detail: 'for the Bomb Party collectors',
    body: 'Find the pieces you love, and build the collection that you adore.',
    href: sparkleFinderHomeUrl,
    destinationLabel: 'Open Sparkle Finder',
    narrative:
      "Sparkle Finder is for Bomb Party collectors. Find the pieces you love, and build the collection that you adore. It is the shopper's side of the show, close to the pieces that caught your eye.",
    comingSoon: 'Coming soon.',
    /** Destination stays unwired until Louis chooses it. */
    sneakPeekLabel: 'Get a sneak peek',
    sneakPeekHref: '',
    learnMoreLabel: 'Learn More',
    learnMoreHref: sparkleFinderHomeUrl,
    signInLabel: 'Sign In',
    signInHref: sparkleFinderSignInUrl,
    signUpLabel: 'Sign Up',
    signUpHref: sparkleFinderSignUpUrl,
    deepLinks: [] as ReadonlyArray<{ label: string; href: string }>,
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
