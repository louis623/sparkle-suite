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
      src: '/sparkle-suite/landing/hero-halloween-witch-live.webp',
      alt: 'Halloween Pumpkin and Witch homepage hero, with the live lineup, shop actions, jack-o’-lantern, and flying witch.',
      width: 1024,
      height: 513,
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
          src: '/sparkle-suite/portfolio/mile-high-fizz-hero.webp',
          alt: 'Mile High Fizz custom homepage hero, with Lindsey’s pink and blue show name over the live-reveal video.',
          width: 1440,
          height: 820,
        },
        {
          id: 'britt-with-bling',
          kind: 'capture',
          title: 'Britt with Bling',
          detail: 'Brittany’s custom Britt with Bling site.',
          href: 'https://brittwithbling.com/',
          linkLabel: 'brittwithbling.com',
          src: '/sparkle-suite/portfolio/britt-with-bling-hero.webp',
          alt: 'Britt with Bling custom homepage hero, with the black, gold, and blush show name over Brittany’s portrait.',
          width: 1440,
          height: 820,
        },
        {
          id: 'blingkitchen',
          kind: 'capture',
          title: 'BlingKitchen',
          detail: 'Heather’s custom BlingKitchen site.',
          href: 'https://theblingkitchen.com/',
          linkLabel: 'theblingkitchen.com',
          src: '/sparkle-suite/portfolio/blingkitchen-hero.webp',
          alt: 'BlingKitchen custom homepage hero, with Heather’s kitchen photograph and plum shop actions.',
          width: 1440,
          height: 820,
        },
        {
          id: 'go-for-the-bling',
          kind: 'capture',
          title: 'Go for the Bling',
          detail: 'Kim’s custom Gnome Forest site.',
          href: 'https://goforthebling.com/',
          linkLabel: 'goforthebling.com',
          src: '/sparkle-suite/portfolio/go-for-the-bling-hero.webp',
          alt: 'Go for the Bling custom homepage hero on the Gnome Forest theme, with woodland art and Kim’s show name.',
          width: 1440,
          height: 820,
        },
        {
          id: 'sparkly-butterflies',
          kind: 'capture',
          title: 'Sparkly Butterflies',
          detail: 'Kelly’s custom Neon Butterfly site.',
          href: 'https://sparklybutterflies.com/',
          linkLabel: 'sparklybutterflies.com',
          src: '/sparkle-suite/portfolio/sparkly-butterflies-hero.webp',
          alt: 'Sparkly Butterflies custom homepage hero on the Neon Butterfly theme, with Kelly’s neon studio and glowing signs.',
          width: 1440,
          height: 820,
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
      body: 'Seasonal themes for the shows that mark the calendar. Two Halloween looks are ready now.',
      label: 'Holiday and special occasion themes',
      slides: [
        {
          id: 'halloween-pumpkin-witch',
          kind: 'capture',
          title: 'Halloween Pumpkin and Witch',
          detail: 'A sparkling black-and-orange night with a jack-o’-lantern, silver moon, and a flying witch.',
          src: '/sparkle-suite/landing/hero-halloween-witch-live.webp',
          alt: 'Halloween Pumpkin and Witch homepage hero, with the live lineup, shop actions, jack-o’-lantern, and flying witch.',
          width: 1024,
          height: 513,
        },
        {
          id: 'halloween-pumpkin-cat',
          kind: 'capture',
          title: 'Halloween Pumpkin and Cat',
          detail: 'A glittering pumpkin night, with a black cat perched on the silver moon.',
          src: '/sparkle-suite/landing/hero-halloween-cat-live.webp',
          alt: 'Halloween Pumpkin and Cat homepage hero, with the site header, live lineup, and a black cat beside the jack-o’-lantern.',
          width: 1280,
          height: 576,
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
