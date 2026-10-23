import type { CommunityCarouselThemeId } from '@/lib/sparkle-suite/community-theme-site-preview'
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
      video?: {
        mp4: string
        width: number
        height: number
      }
      fixedShowcase?: boolean
      hero?: {
        eyebrow?: string
        headline: string
        sub: string
        tone: 'light' | 'ink'
        font?: 'display' | 'georgia' | 'script'
        align?: 'start' | 'center'
        accent?: 'copper'
        lockup?: 'britt'
        instruction?: string
        actions?: readonly string[]
      }
    }
  | {
      id: CommunityCarouselThemeId
      kind: 'site'
      title: string
      detail: string
      href: string
      linkLabel: string
      theme: CommunityCarouselThemeId
    }
  | {
      id: string
      kind: 'placeholder'
      title: string
      detail: string
    }

function communityThemeSlide(theme: {
  id: CommunityCarouselThemeId
  title: string
  detail: string
}): PortfolioSlide {
  return {
    id: theme.id,
    kind: 'site',
    title: theme.title,
    detail: theme.detail,
    href: `/skin-preview/${theme.id}/homepage`,
    linkLabel: 'Preview this look',
    theme: theme.id,
  }
}

// Each slide is a sample customer homepage for that skin, not the hero plate.
const communityThemeSlides = [
  communityThemeSlide({
    id: 'amethyst',
    title: 'Chasing Unicorns',
    detail: 'Magical violet and hot-pink light, with a full-body unicorn.',
  }),
  communityThemeSlide({
    id: 'halloween_pumpkin_witch',
    title: 'Pumpkin and Witch',
    detail: 'A sparkling black-and-orange night with a jack-o’-lantern, silver moon, and a flying witch.',
  }),
  communityThemeSlide({
    id: 'halloween_pumpkin_cat',
    title: 'Pumpkin and Cat',
    detail: 'A glittering pumpkin night, with a black cat perched on the silver moon.',
  }),
  communityThemeSlide({
    id: 'gilded_autumn',
    title: 'The Golden Leaves of Autumn',
    detail: 'Sunlit autumn trees, copper leaves, and a fine champagne shimmer.',
  }),
  communityThemeSlide({
    id: 'fall_owl_harvest_moon',
    title: 'Fall Owl Harvest Moon',
    detail: 'A jeweled owl beneath the harvest moon, in deep plum and warm gold.',
  }),
  communityThemeSlide({
    id: 'gobble_and_fizz',
    title: 'Gobble & Fizz',
    detail: 'A curious turkey, copper sparkle, and a cozy plum Thanksgiving scene.',
  }),
  communityThemeSlide({
    id: 'pie_please',
    title: 'Pumpkin Pie',
    detail: 'Pumpkin pie, copper jewelry, and soft window light.',
  }),
  communityThemeSlide({
    id: 'midnight_rose',
    title: 'Midnight Rose',
    detail: 'Deep aubergine surfaces with warm copper-blush glitter.',
  }),
  communityThemeSlide({
    id: 'pearl_rose',
    title: 'Pearl Rose',
    detail: 'Airy ivory surfaces, copper details, and burgundy ink.',
  }),
  communityThemeSlide({
    id: 'rose_champagne',
    title: 'Rose Champagne',
    detail: 'Warm rose-copper shimmer and champagne bokeh.',
  }),
] as const satisfies readonly PortfolioSlide[]

export const sparkleSuitePortfolioContent = {
  hero: {
    eyebrow: 'Portfolio',
    headline: 'Shows we’re proud to put on the floor.',
    body:
      'Real customer sites, community looks, and seasonal themes. Sparkle Suite builds the customer side so a live show has a polished place to land.',
    image: {
      src: '/amethyst/skins/halloween-pumpkin-witch/hero-desktop.webp',
      alt: 'Pumpkin and Witch theme hero, with a jack-o’-lantern, silver moon, and flying witch.',
      width: 1672,
      height: 941,
      label: 'Halloween · Pumpkin and Witch',
    },
  },
  carousels: [
    {
      id: 'rep-highlights',
      eyebrow: 'Rep highlights',
      heading: 'Live shows, with the name on the door.',
      body: 'Real Sparkle Suite sites, live right now. Each one is built around its rep’s own look.',
      label: 'Rep highlights',
      slides: [
        {
          id: 'mile-high-fizz',
          kind: 'capture',
          title: 'Mile High Fizz',
          detail: 'A custom look for Mile High Fizz.',
          href: 'https://milehighfizz.com/',
          linkLabel: 'milehighfizz.com',
          src: '/sparkle-suite/portfolio/mile-high-fizz-custom-hero.webp',
          alt: 'Mile High Fizz custom hero video, with the show name over the live-reveal footage.',
          width: 1284,
          height: 716,
          fixedShowcase: true,
          video: { mp4: '/mile-high-fizz/hero.mp4', width: 1284, height: 716 },
          hero: {
            eyebrow: 'With Lindsey',
            headline: 'Mile High Fizz',
            sub: 'Revealing something magical together.',
            tone: 'light',
            font: 'script',
            align: 'center',
          },
        },
        {
          id: 'britt-with-bling',
          kind: 'capture',
          title: 'Britt with Bling',
          detail: 'A custom look for Britt with Bling.',
          href: 'https://brittwithbling.com/',
          linkLabel: 'brittwithbling.com',
          src: '/britt-with-bling/hero.jpeg',
          alt: 'Britt with Bling custom hero, with the Virtuous Fizzers name and show title on her sparkle background.',
          width: 1200,
          height: 675,
          fixedShowcase: true,
          hero: {
            eyebrow: 'The Virtuous Fizzers',
            headline: 'Britt with Bling',
            sub: 'Where Faith Meets Fizz & Every Reveal is a VIP Experience.',
            instruction: 'Place your order and return to the live party to watch your reveal',
            actions: ['Shop Now', 'Join the Team'],
            tone: 'light',
            align: 'center',
            lockup: 'britt',
          },
        },
        {
          id: 'go-for-the-bling',
          kind: 'capture',
          title: 'Go for the Bling',
          detail: 'A custom Gnome Forest look for Go for the Bling.',
          href: 'https://goforthebling.com/',
          linkLabel: 'goforthebling.com',
          src: '/amethyst/skins/gnome-garden/forest.webp',
          alt: 'Go for the Bling homepage hero on the Gnome Forest theme, with the show headline over the woodland art.',
          width: 1536,
          height: 1024,
          fixedShowcase: true,
          hero: {
            headline: 'A little wonder, a lot of sparkle.',
            sub: 'Settle in for live reveals, friendly faces, and the joy of discovering something you love.',
            tone: 'light',
            align: 'center',
          },
        },
        {
          id: 'sparkly-butterflies',
          kind: 'capture',
          title: 'Sparkly Butterflies',
          detail: 'A custom Neon Butterfly look for Sparkly Butterflies.',
          href: 'https://sparklybutterflies.com/',
          linkLabel: 'sparklybutterflies.com',
          src: '/amethyst/skins/neon-butterfly/kelly-studio-desktop.webp',
          alt: 'Sparkly Butterflies homepage hero on the Neon Butterfly theme, with the show headline over the neon studio.',
          width: 1920,
          height: 1080,
          fixedShowcase: true,
          hero: {
            headline: 'Your Sparkle Taking Flight',
            sub: 'Live jewelry reveals, electric color, and a welcoming place to find your next favorite.',
            tone: 'light',
            align: 'center',
          },
        },
      ],
    },
    {
      id: 'community-themes',
      eyebrow: 'Community themes',
      heading: 'Looks the whole community can wear.',
      body: 'Shared themes any rep can choose. The tools stay familiar, and the night can feel personal.',
      label: 'Community themes',
      slides: communityThemeSlides,
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
