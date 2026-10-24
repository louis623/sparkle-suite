import type { CommunityCarouselThemeId } from '@/lib/sparkle-suite/community-theme-site-preview'
import { portfolioMotion } from '@/lib/sparkle-suite/portfolio-motion'
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
    detail: 'A glittering pumpkin night, with a black cat perched on a jack-o’-lantern.',
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
    id: 'sunset_beach',
    title: 'Sunset Beach',
    detail: 'Gentle waves, sunset palms, and pink-coral-gold warmth.',
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
      slides: (['mile-high-fizz', 'britt-with-bling', 'go-for-the-bling', 'sparkly-butterflies'] as const).map((id) => {
        const recording = portfolioMotion[id]
        const copy = {
          'mile-high-fizz': {
            title: 'Mile High Fizz',
            detail: 'A custom look for Mile High Fizz.',
            href: 'https://milehighfizz.com/',
            linkLabel: 'milehighfizz.com',
          },
          'britt-with-bling': {
            title: 'Britt with Bling',
            detail: 'A custom look for Britt with Bling.',
            href: 'https://brittwithbling.com/',
            linkLabel: 'brittwithbling.com',
          },
          'go-for-the-bling': {
            title: 'Go for the Bling',
            detail: 'A custom Gnome Forest look for Go for the Bling.',
            href: 'https://goforthebling.com/',
            linkLabel: 'goforthebling.com',
          },
          'sparkly-butterflies': {
            title: 'Sparkly Butterflies',
            detail: 'A custom Neon Butterfly look for Sparkly Butterflies.',
            href: 'https://sparklybutterflies.com/',
            linkLabel: 'sparklybutterflies.com',
          },
        }[id]
        return {
          id,
          kind: 'capture' as const,
          ...copy,
          src: recording.poster,
          alt: `Recorded website header and complete hero from ${copy.title}`,
          width: recording.width,
          height: recording.height,
        }
      }),
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
