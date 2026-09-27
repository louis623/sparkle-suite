import { sparkleSuitePublicLandingContent } from '@/lib/sparkle-suite/public-landing-content'

export const sparkleSuiteScheduleBuild = {
  label: 'Schedule your build now',
  href: sparkleSuitePublicLandingContent.hero.primaryCta.href,
  note: 'This opens the build queue. No payment to get in line.',
} as const

export type PortfolioSlide =
  | {
      id: string
      kind: 'capture'
      title: string
      detail: string
      href?: string
      linkLabel?: string
      src: string
      alt: string
      width: number
      height: number
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
      body: 'These are customer-facing sites on the floor right now. Each one is a real show.',
      label: 'Rep highlights',
      slides: [
        {
          id: 'mile-high-fizz',
          kind: 'capture',
          title: 'Mile High Fizz',
          detail: 'Lindsey’s live customer site, dressed for Halloween.',
          href: 'https://milehighfizz.com/',
          linkLabel: 'milehighfizz.com',
          src: '/sparkle-suite/portfolio/mile-high-fizz-hero.webp',
          alt: 'Mile High Fizz customer homepage hero on the Halloween theme, with the show name and shop actions.',
          width: 1440,
          height: 820,
        },
        {
          id: 'britt-with-bling',
          kind: 'capture',
          title: 'Britt with Bling',
          detail: 'Brittany’s live customer site, dressed for Halloween.',
          href: 'https://brittwithbling.com/',
          linkLabel: 'brittwithbling.com',
          src: '/sparkle-suite/portfolio/britt-with-bling-hero.webp',
          alt: 'Britt with Bling customer homepage hero on the Halloween theme, with the show name and shop actions.',
          width: 1440,
          height: 820,
        },
        {
          id: 'blingkitchen',
          kind: 'capture',
          title: 'BlingKitchen',
          detail: 'Heather’s live customer site, dressed for Halloween.',
          href: 'https://theblingkitchen.com/',
          linkLabel: 'theblingkitchen.com',
          src: '/sparkle-suite/portfolio/blingkitchen-hero.webp',
          alt: 'BlingKitchen customer homepage hero on the Halloween theme, with the show headline and shop actions.',
          width: 1440,
          height: 886,
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
          src: '/sparkle-suite/landing/hero-emerald-desktop-v3.webp',
          alt: 'Emerald Garden desktop theme preview of a Sparkle Suite customer site.',
          width: 1265,
          height: 961,
        },
        {
          id: 'amethyst',
          kind: 'capture',
          title: 'Amethyst',
          detail: 'Vibrant violet for a show that feels unmistakably hers.',
          src: '/sparkle-suite/landing/site-amethyst-v2.webp',
          alt: 'Amethyst customer-site theme preview with violet light and jewelry.',
          width: 1265,
          height: 961,
        },
        {
          id: 'rose-gold',
          kind: 'capture',
          title: 'Rose Gold',
          detail: 'Rose, pearl, and champagne, shown on a phone.',
          src: '/sparkle-suite/landing/hero-rose-mobile-v3.webp',
          alt: 'Rose Gold mobile theme preview of a Sparkle Suite customer site.',
          width: 390,
          height: 1020,
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
          src: '/sparkle-suite/landing/hero-halloween-desktop-v1.webp',
          alt: 'Halloween Pumpkin and Witch community theme preview, with a dark night hero and shop actions.',
          width: 1440,
          height: 825,
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
