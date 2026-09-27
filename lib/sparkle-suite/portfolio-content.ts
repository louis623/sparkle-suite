import { sparkleSuitePublicLandingContent } from '@/lib/sparkle-suite/public-landing-content'

export const sparkleSuiteScheduleBuild = {
  label: 'Schedule your build now',
  href: sparkleSuitePublicLandingContent.hero.primaryCta.href,
  note: 'This opens the build queue. No payment to get in line.',
} as const

export type PortfolioCaptureImage = {
  src: string
  width: number
  height: number
}

export type PortfolioSlide =
  | {
      id: string
      kind: 'capture'
      title: string
      detail: string
      href?: string
      linkLabel?: string
      alt: string
      desktop: PortfolioCaptureImage
      mobile: PortfolioCaptureImage
    }
  | {
      id: string
      kind: 'placeholder'
      title: string
      detail: string
    }

export const sparkleSuitePortfolioContent = {
  hero: {
    eyebrow: 'Portfolio',
    headline: 'Shows we’re proud to put on the floor.',
    body:
      'Real customer sites, community looks, and seasonal themes. Sparkle Suite builds the customer side so a live show has a polished place to land.',
    image: {
      src: '/sparkle-suite/landing/hero-halloween-desktop-v1.webp',
      alt: 'Halloween Pumpkin and Witch customer-site theme, with a dark night hero, shop actions, and the flying-witch decoration.',
      width: 1440,
      height: 825,
      label: 'Halloween · Pumpkin and Witch',
    },
  },
  carousels: [
    {
      id: 'rep-highlights',
      eyebrow: 'Rep highlights',
      heading: 'Live shows, with the name on the door.',
      body: 'These are customer-facing sites on the floor right now. Each peek is that show’s own custom look.',
      label: 'Rep highlights',
      slides: [
        {
          id: 'mile-high-fizz',
          kind: 'capture',
          title: 'Mile High Fizz',
          detail: 'Lindsey’s custom Mile High Fizz site.',
          href: 'https://milehighfizz.com/',
          linkLabel: 'milehighfizz.com',
          alt: 'Mile High Fizz custom homepage hero, with Lindsey’s pink and blue show name over the live-reveal video.',
          desktop: {
            src: '/sparkle-suite/portfolio/mile-high-fizz-hero.webp',
            width: 1440,
            height: 820,
          },
          mobile: {
            src: '/sparkle-suite/portfolio/mile-high-fizz-mobile.webp',
            width: 390,
            height: 844,
          },
        },
        {
          id: 'britt-with-bling',
          kind: 'capture',
          title: 'Britt with Bling',
          detail: 'Brittany’s custom Britt with Bling site.',
          href: 'https://brittwithbling.com/',
          linkLabel: 'brittwithbling.com',
          alt: 'Britt with Bling custom homepage hero, with the black, gold, and blush show name over Brittany’s portrait.',
          desktop: {
            src: '/sparkle-suite/portfolio/britt-with-bling-hero.webp',
            width: 1440,
            height: 820,
          },
          mobile: {
            src: '/sparkle-suite/portfolio/britt-with-bling-mobile.webp',
            width: 390,
            height: 844,
          },
        },
        {
          id: 'blingkitchen',
          kind: 'capture',
          title: 'BlingKitchen',
          detail: 'Heather’s custom BlingKitchen site.',
          href: 'https://theblingkitchen.com/',
          linkLabel: 'theblingkitchen.com',
          alt: 'BlingKitchen custom homepage hero, with Heather’s kitchen photograph and plum shop actions.',
          desktop: {
            src: '/sparkle-suite/portfolio/blingkitchen-hero.webp',
            width: 1440,
            height: 820,
          },
          mobile: {
            src: '/sparkle-suite/portfolio/blingkitchen-mobile.webp',
            width: 390,
            height: 844,
          },
        },
        {
          id: 'go-for-the-bling',
          kind: 'capture',
          title: 'Go for the Bling',
          detail: 'Kim’s custom Gnome Forest site.',
          href: 'https://goforthebling.com/',
          linkLabel: 'goforthebling.com',
          alt: 'Go for the Bling custom homepage hero on the Gnome Forest theme, with woodland art and Kim’s show name.',
          desktop: {
            src: '/sparkle-suite/portfolio/go-for-the-bling-hero.webp',
            width: 1440,
            height: 820,
          },
          mobile: {
            src: '/sparkle-suite/portfolio/go-for-the-bling-mobile.webp',
            width: 390,
            height: 844,
          },
        },
        {
          id: 'sparkly-butterflies',
          kind: 'capture',
          title: 'Sparkly Butterflies',
          detail: 'Kelly’s custom Neon Butterfly site.',
          href: 'https://sparklybutterflies.com/',
          linkLabel: 'sparklybutterflies.com',
          alt: 'Sparkly Butterflies custom homepage hero on the Neon Butterfly theme, with Kelly’s neon studio and glowing signs.',
          desktop: {
            src: '/sparkle-suite/portfolio/sparkly-butterflies-hero.webp',
            width: 1440,
            height: 820,
          },
          mobile: {
            src: '/sparkle-suite/portfolio/sparkly-butterflies-mobile.webp',
            width: 390,
            height: 844,
          },
        },
      ],
    },
    {
      id: 'community-themes',
      eyebrow: 'Community themes',
      heading: 'Looks the whole community can wear.',
      body: 'Shared themes any rep can choose. The tools stay familiar. The night can feel like hers.',
      label: 'Community themes',
      slides: [
        {
          id: 'emerald-garden',
          kind: 'capture',
          title: 'Emerald Garden',
          detail: 'Soft green light, ivory lettering, and a calm garden night.',
          alt: 'Emerald Garden homepage, with soft green light, ivory lettering, and a calm garden night.',
          desktop: {
            src: '/sparkle-suite/portfolio/emerald-garden-desktop.webp',
            width: 1440,
            height: 820,
          },
          mobile: {
            src: '/sparkle-suite/portfolio/emerald-garden-mobile.webp',
            width: 390,
            height: 844,
          },
        },
        {
          id: 'amethyst',
          kind: 'capture',
          title: 'Amethyst',
          detail: 'Vibrant violet for a show that feels unmistakably hers.',
          alt: 'Amethyst homepage, with violet light and a jewelry show name.',
          desktop: {
            src: '/sparkle-suite/portfolio/amethyst-desktop.webp',
            width: 1440,
            height: 820,
          },
          mobile: {
            src: '/sparkle-suite/portfolio/amethyst-mobile.webp',
            width: 390,
            height: 844,
          },
        },
        {
          id: 'rose-gold',
          kind: 'capture',
          title: 'Rose Gold',
          detail: 'Rose, pearl, and champagne for a warm, glowing show.',
          alt: 'Rose Gold homepage, with rose, pearl, and champagne light.',
          desktop: {
            src: '/sparkle-suite/portfolio/rose-gold-desktop.webp',
            width: 1440,
            height: 820,
          },
          mobile: {
            src: '/sparkle-suite/portfolio/rose-gold-mobile.webp',
            width: 390,
            height: 844,
          },
        },
      ],
    },
    {
      id: 'holiday-themes',
      eyebrow: 'Holiday and special occasions',
      heading: 'Nights that deserve their own look.',
      body: 'Seasonal themes for the shows that mark the calendar. Halloween is on the floor now.',
      label: 'Holiday and special occasion themes',
      slides: [
        {
          id: 'halloween-pumpkin-witch',
          kind: 'capture',
          title: 'Halloween Pumpkin and Witch',
          detail: 'A sparkling black-and-orange night with a jack-o’-lantern, silver moon, and a flying witch.',
          alt: 'Halloween Pumpkin and Witch homepage, with a dark night hero, jack-o’-lantern, and shop actions.',
          desktop: {
            src: '/sparkle-suite/portfolio/halloween-pumpkin-witch-desktop.webp',
            width: 1440,
            height: 820,
          },
          mobile: {
            src: '/sparkle-suite/portfolio/halloween-pumpkin-witch-mobile.webp',
            width: 390,
            height: 844,
          },
        },
        {
          id: 'holiday-placeholder-winter',
          kind: 'placeholder',
          title: 'Winter night',
          detail: 'Placeholder. A real capture still needs to be placed here.',
        },
        {
          id: 'holiday-placeholder-celebration',
          kind: 'placeholder',
          title: 'Celebration look',
          detail: 'Placeholder. A real capture still needs to be placed here.',
        },
      ],
    },
  ],
} as const satisfies {
  hero: {
    eyebrow: string
    headline: string
    body: string
    image: { src: string; alt: string; width: number; height: number; label: string }
  }
  carousels: ReadonlyArray<{
    id: string
    eyebrow: string
    heading: string
    body: string
    label: string
    slides: readonly PortfolioSlide[]
  }>
}
