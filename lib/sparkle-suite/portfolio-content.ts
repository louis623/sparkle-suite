import type { AmethystAppearancePresetId } from '@/lib/amethyst/appearance-presets'
import { halloweenHeroMotion } from '@/lib/sparkle-suite/halloween-hero-motion'
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
      hero?: {
        eyebrow?: string
        headline: string
        sub: string
        tone: 'light' | 'ink'
        font?: 'display' | 'georgia' | 'script'
        align?: 'start' | 'center'
      }
    }
  | {
      id: string
      kind: 'placeholder'
      title: string
      detail: string
    }

function communityThemeSlide(theme: {
  id: AmethystAppearancePresetId
  title: string
  detail: string
  src: string
  alt: string
  width: number
  height: number
  video?: { mp4: string; width: number; height: number }
  hero?: Extract<PortfolioSlide, { kind: 'capture' }>['hero']
}): PortfolioSlide {
  return {
    id: theme.id,
    kind: 'capture',
    title: theme.title,
    detail: theme.detail,
    href: `/skin-preview/${theme.id}/homepage`,
    linkLabel: 'Preview this look',
    src: theme.src,
    alt: theme.alt,
    width: theme.width,
    height: theme.height,
    video: theme.video,
    hero: theme.hero,
  }
}

const communityThemeSlides = [
  communityThemeSlide({
    id: 'amethyst',
    title: 'Chasing Unicorns',
    detail: 'Magical violet and hot-pink light, with a full-body unicorn.',
    src: '/amethyst/skins/am01-unicorn/hero-poster.webp',
    alt: 'Chasing Unicorns homepage hero, with a violet unicorn and glossy cards.',
    width: 1310,
    height: 704,
    video: { mp4: '/amethyst/skins/am01-unicorn/hero-motion.mp4', width: 1310, height: 704 },
    hero: {
      headline: 'Real jewelry. Live reveals. Pure sparkle.',
      sub: 'Join Sasha for live jewelry reveals, friendly conversation, and your next favorite find.',
      tone: 'light',
    },
  }),
  communityThemeSlide({
    id: 'halloween_pumpkin_witch',
    title: 'Pumpkin and Witch',
    detail: 'A sparkling black-and-orange night with a jack-o’-lantern, silver moon, and a flying witch.',
    src: halloweenHeroMotion.witch.poster,
    alt: 'Halloween Pumpkin and Witch homepage hero, with a jack-o’-lantern, silver moon, and flying witch.',
    width: halloweenHeroMotion.witch.posterWidth,
    height: halloweenHeroMotion.witch.posterHeight,
    video: {
      mp4: halloweenHeroMotion.witch.mp4,
      width: halloweenHeroMotion.witch.width,
      height: halloweenHeroMotion.witch.height,
    },
  }),
  communityThemeSlide({
    id: 'halloween_pumpkin_cat',
    title: 'Pumpkin and Cat',
    detail: 'A glittering pumpkin night, with a black cat perched on the silver moon.',
    src: halloweenHeroMotion.cat.poster,
    alt: 'Halloween Pumpkin and Cat homepage hero, with a black cat beside a glowing jack-o’-lantern.',
    width: halloweenHeroMotion.cat.posterWidth,
    height: halloweenHeroMotion.cat.posterHeight,
    video: {
      mp4: halloweenHeroMotion.cat.mp4,
      width: halloweenHeroMotion.cat.width,
      height: halloweenHeroMotion.cat.height,
    },
  }),
  communityThemeSlide({
    id: 'gilded_autumn',
    title: 'The Golden Leaves of Autumn',
    detail: 'Sunlit autumn trees, copper leaves, and a fine champagne shimmer.',
    src: '/amethyst/skins/gilded-autumn/hero-poster.webp',
    alt: 'The Golden Leaves of Autumn homepage hero, with sunlit trees and copper leaves.',
    width: 1204,
    height: 764,
    video: { mp4: '/amethyst/skins/gilded-autumn/hero-motion.mp4', width: 1204, height: 764 },
  }),
  communityThemeSlide({
    id: 'fall_owl_harvest_moon',
    title: 'Fall Owl Harvest Moon',
    detail: 'A jeweled owl beneath the harvest moon, in deep plum and warm gold.',
    src: '/amethyst/skins/fall-owl/hero-poster.webp',
    alt: 'Fall Owl and Harvest Moon homepage hero, with a jeweled owl under a harvest moon.',
    width: 1280,
    height: 720,
    video: { mp4: '/amethyst/skins/fall-owl/hero-loop.mp4', width: 1280, height: 720 },
  }),
  communityThemeSlide({
    id: 'gobble_and_fizz',
    title: 'Gobble & Fizz',
    detail: 'A curious turkey, copper sparkle, and a cozy plum Thanksgiving scene.',
    src: '/amethyst/skins/gobble-and-fizz/hero-poster.webp',
    alt: 'Gobble and Fizz homepage hero, with a turkey in a plum Thanksgiving scene.',
    width: 1280,
    height: 720,
    video: { mp4: '/amethyst/skins/gobble-and-fizz/hero-loop.mp4', width: 1280, height: 720 },
  }),
  communityThemeSlide({
    id: 'pie_please',
    title: 'Pumpkin Pie',
    detail: 'Pumpkin pie, copper jewelry, and soft window light.',
    src: '/amethyst/skins/pie-please/hero-poster-v4.webp',
    alt: 'Pumpkin Pie homepage hero, with pumpkin pie, copper jewelry, and window light.',
    width: 1280,
    height: 720,
    video: { mp4: '/amethyst/skins/pie-please/hero-loop-v4.mp4', width: 1280, height: 720 },
  }),
  communityThemeSlide({
    id: 'midnight_rose',
    title: 'Midnight Rose',
    detail: 'Deep aubergine surfaces with warm copper-blush glitter.',
    src: '/amethyst/skins/midnight-rose/hero-poster.webp',
    alt: 'Midnight Rose homepage hero, with aubergine surfaces and copper-blush glitter.',
    width: 1280,
    height: 720,
    video: { mp4: '/amethyst/skins/midnight-rose/hero-loop.mp4', width: 1280, height: 720 },
  }),
  communityThemeSlide({
    id: 'pearl_rose',
    title: 'Pearl Rose',
    detail: 'Airy ivory surfaces, copper details, and burgundy ink.',
    src: '/amethyst/skins/pearl-rose/hero-poster.webp',
    alt: 'Pearl Rose homepage hero, with ivory surfaces, copper details, and burgundy ink.',
    width: 1280,
    height: 720,
    video: { mp4: '/amethyst/skins/pearl-rose/hero-loop.mp4', width: 1280, height: 720 },
  }),
  communityThemeSlide({
    id: 'rose_champagne',
    title: 'Rose Champagne',
    detail: 'Warm rose-copper shimmer and champagne bokeh.',
    src: '/amethyst/skins/rose-champagne/hero-poster.webp',
    alt: 'Rose Champagne homepage hero, with rose-copper shimmer and champagne bokeh.',
    width: 1280,
    height: 720,
    video: { mp4: '/amethyst/skins/rose-champagne/hero-loop.mp4', width: 1280, height: 720 },
  }),
] as const satisfies readonly PortfolioSlide[]

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
          detail: 'A custom look for Mile High Fizz.',
          href: 'https://milehighfizz.com/',
          linkLabel: 'milehighfizz.com',
          src: '/sparkle-suite/portfolio/mile-high-fizz-hero.webp',
          alt: 'Mile High Fizz custom homepage hero, with a pink and blue show name over the live-reveal video.',
          width: 1440,
          height: 820,
        },
        {
          id: 'britt-with-bling',
          kind: 'capture',
          title: 'Britt with Bling',
          detail: 'A custom look for Britt with Bling.',
          href: 'https://brittwithbling.com/',
          linkLabel: 'brittwithbling.com',
          src: '/sparkle-suite/portfolio/britt-with-bling-hero.webp',
          alt: 'Britt with Bling custom homepage hero, with the black, gold, and blush show name over the show portrait.',
          width: 1440,
          height: 820,
        },
        {
          id: 'go-for-the-bling',
          kind: 'capture',
          title: 'Go for the Bling',
          detail: 'A custom Gnome Forest look for Go for the Bling.',
          href: 'https://goforthebling.com/',
          linkLabel: 'goforthebling.com',
          src: '/sparkle-suite/portfolio/go-for-the-bling-hero.webp',
          alt: 'Go for the Bling custom homepage hero on the Gnome Forest theme, with woodland art and the show name.',
          width: 1440,
          height: 820,
        },
        {
          id: 'sparkly-butterflies',
          kind: 'capture',
          title: 'Sparkly Butterflies',
          detail: 'A custom Neon Butterfly look for Sparkly Butterflies.',
          href: 'https://sparklybutterflies.com/',
          linkLabel: 'sparklybutterflies.com',
          src: '/sparkle-suite/portfolio/sparkly-butterflies-hero.webp',
          alt: 'Sparkly Butterflies custom homepage hero on the Neon Butterfly theme, with a neon studio and glowing signs.',
          width: 1440,
          height: 820,
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
