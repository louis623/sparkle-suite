import {
  sparkleSuitePublicLandingContent,
  sparkleSuiteTikTokChannelUrl,
  sparkleSuiteYouTubeChannelUrl,
} from '@/lib/sparkle-suite/public-landing-content'

/**
 * Demo page embeds. This file is the only place to add or swap a clip.
 *
 * To put a dedicated marketing demo on the page, edit `sparkleSuiteDemoEmbeds`:
 * - Replace the object with `role: 'featured'` to change the hero reel. Keep one.
 * - Append an object with `role: 'clip'` to fill the filtered grid.
 * - Append an object with `role: 'tour'` for the longer walk-through.
 * The clips band and the Clips nav link appear on their own once a
 * non-featured embed passes `isPublishableDemoEmbed`.
 *
 * Each object needs: id, platform ('tiktok' | 'youtube'), title, summary,
 * tags ('site-looks' | 'show-tools' | 'tours'), videoId, url, privacy: 'public',
 * and role. TikTok urls must be `${sparkleSuiteTikTokChannelUrl}/video/<id>`.
 * YouTube urls must be a listed `watch?v=` or youtu.be link, never unlisted
 * and never a playlist. Do not add Workspace, Nic-Nac, or backend factory
 * walkthroughs. Do not invent a video id.
 *
 * Checked 2026-09-28:
 * - Featured reel is the TikTok Louis picked, https://www.tiktok.com/t/ZP8TTK4KU/,
 *   which resolves to video 7684058046800071966 on @yoursparklesuite.com.
 * - YouTube https://youtube.com/@sparklesuite is channel UCpISEvH3gBaRfC8OoCKH7Qg,
 *   the same channel as the icon URL. No listed upload yet, so no YouTube iframe.
 * - Icons stay profile links. The grid stays empty until a real landing demo
 *   is added here. tiktok.com/@sparklesuite is an unrelated Mary Kay account.
 */
export const sparkleSuiteYouTubeChannel = {
  label: 'Sparkle Suite on YouTube',
  href: sparkleSuiteYouTubeChannelUrl,
} as const

export const sparkleSuiteTikTokChannel = {
  label: 'Sparkle Suite on TikTok',
  href: sparkleSuiteTikTokChannelUrl,
} as const

export const sparkleSuiteDemoCta = {
  label: 'Join the build queue',
  href: sparkleSuitePublicLandingContent.hero.primaryCta.href,
  note: 'No payment to join the queue.',
} as const

export const sparkleSuiteDemoPortfolioLink = {
  label: 'See the work',
  href: '/portfolio',
} as const

export const demoClipFilters = [
  { id: 'all', label: 'All' },
  { id: 'site-looks', label: 'Site looks' },
  { id: 'show-tools', label: 'Show tools' },
  { id: 'tours', label: 'Tours' },
] as const

export type DemoClipFilter = (typeof demoClipFilters)[number]['id']
export type DemoClipTag = Exclude<DemoClipFilter, 'all'>
export type DemoPlatform = 'youtube' | 'tiktok'
export type DemoEmbedRole = 'featured' | 'clip' | 'tour'

export type DemoEmbed = {
  id: string
  platform: DemoPlatform
  title: string
  summary: string
  tags: readonly DemoClipTag[]
  videoId: string
  /** Public watch URL. Must match videoId. Never an unlisted share link. */
  url: string
  privacy: 'public'
  role: DemoEmbedRole
}

/**
 * Video ids seen on the channel playlists that are not in the public uploads
 * feed, or that are rep-training walkthroughs. Never render these.
 */
export const demoBlockedYouTubeIds = [
  'YhVfpKXTmf0',
  'Zz6SD0Ydc64',
  'cRij5q-cSpY',
  'iHBIjrynUkg',
  'Za9orxHF2B4',
  'Bst0g9KktlI',
] as const

const blockedYouTubeIds = new Set<string>(demoBlockedYouTubeIds)
const factoryCopy = /\b(workspace|nic-nac|backend|unlisted|factory)\b/i

export function isPublishableDemoEmbed(embed: DemoEmbed) {
  if (embed.privacy !== 'public') return false
  if (factoryCopy.test(`${embed.title} ${embed.summary} ${embed.url}`)) return false
  if (/unlisted/i.test(embed.url)) return false

  if (embed.platform === 'youtube') {
    if (!/^[\w-]{11}$/.test(embed.videoId)) return false
    if (blockedYouTubeIds.has(embed.videoId)) return false
    let parsed: URL
    try {
      parsed = new URL(embed.url)
    } catch {
      return false
    }
    const host = parsed.hostname.replace(/^www\./, '')
    if (parsed.protocol !== 'https:') return false
    if (parsed.searchParams.has('list')) return false
    const fromWatch = host === 'youtube.com' && parsed.searchParams.get('v') === embed.videoId
    const fromShort = host === 'youtu.be' && parsed.pathname === `/${embed.videoId}`
    return fromWatch || fromShort
  }

  if (embed.platform === 'tiktok') {
    if (!/^\d{15,22}$/.test(embed.videoId)) return false
    return embed.url === `${sparkleSuiteTikTokChannelUrl}/video/${embed.videoId}`
  }

  return false
}

export function demoEmbedSrc(embed: DemoEmbed) {
  if (embed.platform === 'youtube') {
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(embed.videoId)}?rel=0`
  }
  return `https://www.tiktok.com/embed/v2/${encodeURIComponent(embed.videoId)}`
}

function tiktok(videoId: string) {
  return `${sparkleSuiteTikTokChannelUrl}/video/${videoId}`
}

/**
 * Landing demos on /demo. Louis's featured TikTok is the only embed until
 * a dedicated marketing demo is added in this array.
 */
export const sparkleSuiteDemoEmbeds = [
  {
    id: 'pick-your-theme',
    platform: 'tiktok',
    title: 'Pick a theme. Change it when the night should feel new.',
    summary: 'Customer-facing sites with themes you can switch, so the show stays fresh.',
    tags: ['site-looks'],
    videoId: '7684058046800071966',
    url: tiktok('7684058046800071966'),
    privacy: 'public',
    role: 'featured',
  },
] as const satisfies readonly DemoEmbed[]

export const sparkleSuitePublicDemoEmbeds = sparkleSuiteDemoEmbeds.filter(isPublishableDemoEmbed)

export function filterDemoEmbeds(embeds: readonly DemoEmbed[], filter: DemoClipFilter) {
  const publishable = embeds.filter(isPublishableDemoEmbed)
  if (filter === 'all') return publishable
  return publishable.filter((embed) => embed.tags.includes(filter))
}

export function featuredDemoEmbed(embeds: readonly DemoEmbed[] = sparkleSuitePublicDemoEmbeds) {
  return embeds.find((embed) => embed.role === 'featured') ?? null
}

/** Grid and tour clips. The featured reel stays in the hero, not in this list. */
export function gridDemoEmbeds(embeds: readonly DemoEmbed[] = sparkleSuitePublicDemoEmbeds) {
  return embeds.filter(isPublishableDemoEmbed).filter((embed) => embed.role !== 'featured')
}

export function tourDemoEmbed(embeds: readonly DemoEmbed[] = sparkleSuitePublicDemoEmbeds) {
  return embeds.find((embed) => embed.role === 'tour') ?? null
}

export const sparkleSuiteDemoStories = [
  {
    id: 'dance-floor',
    eyebrow: 'Dance Floor',
    title: 'Mid-show trades, without the pileup.',
    body: 'Available pieces stay on the Dance Floor, with a clear way to ask. The show keeps moving.',
    image: {
      src: '/sparkle-suite/landing/dance-floor-garnet-v2.webp',
      alt: 'Garnet-themed Dance Floor with jewelry cards, real earring photos, and search.',
      width: 1002,
      height: 728,
    },
  },
  {
    id: 'live-queue',
    eyebrow: 'Live queue',
    title: 'A lineup customers can actually find.',
    body: 'The show site is the front door. The lineup belongs there, not buried in a comment thread.',
    image: {
      src: '/sparkle-suite/landing/jane-customer-home-mobile.png',
      alt: 'Mobile customer homepage for a Sparkle Suite show, with the show name and actions a customer would open first.',
      width: 390,
      height: 844,
    },
  },
  {
    id: 'live-calendar',
    eyebrow: 'Live calendar',
    title: 'The next live, already on the calendar.',
    body: 'Date, time, and what the night is about, before anyone has to ask in the comments.',
    image: {
      src: '/sparkle-suite/landing/calendar-emerald-garden-v2.webp',
      alt: 'Emerald Garden show card with the date, time, collection, and add-to-calendar actions.',
      width: 429,
      height: 469,
    },
  },
] as const

export const sparkleSuiteDemoContent = {
  hero: {
    eyebrow: 'Demo',
    headlineLead: 'See the Suite in',
    headlineEmphasis: 'motion.',
    body: 'The customer side of a live show: the site, the lineup, and the Dance Floor, the way a customer would meet it.',
  },
  featured: {
    eyebrow: 'Featured reel',
    emptyTitle: 'Listed clips play here.',
    emptyBody: 'Public TikTok and listed YouTube only. When a clip is ready for anyone to watch, it takes this stage.',
  },
  stories: {
    eyebrow: 'Show night',
    heading: 'Three moments that used to live in the comments.',
    body: 'Customers should not have to hunt through posts to trade, find their place in line, or see when you go live.',
  },
  clips: {
    eyebrow: 'Clips',
    heading: 'Pick the part of the show you want to see.',
    empty: 'No public clip in this set yet. Listed YouTube and public TikTok will show up here. Only clips anyone can watch, and nothing invented.',
  },
  tour: {
    eyebrow: 'Longer tour',
    heading: 'Stay for the full walk-through.',
  },
  portfolio: {
    eyebrow: 'Portfolio',
    heading: 'Prefer the stills?',
    body: 'Customer sites, community looks, and seasonal themes are gathered on the portfolio.',
  },
  close: {
    heading: 'Your next show can feel easier to follow.',
  },
} as const
