import {
  SPARKLE_PUBLIC_ORIGIN,
  normalizeSparkleOrigin,
} from './sparkle-crawl'

export type AmethystPublicPage = 'homepage' | 'trade' | 'join' | 'pantry'

export interface AmethystPublicPageDefinition {
  path: string
  title: string
  description: string
}

export interface BuildAmethystPublicMetadataOptions {
  origin?: string | URL
}

export interface AmethystPublicMetadata {
  page: AmethystPublicPage
  path: string
  title: string
  description: string
  robots: 'index,follow'
  canonicalUrl: string
  openGraph: {
    type: 'website'
    siteName: string
    title: string
    description: string
    url: string
    image: string
  }
  twitter: {
    card: 'summary_large_image'
    title: string
    description: string
    image: string
  }
}

export type AmethystPublicMetaTag =
  | {
      tag: 'title'
      text: string
    }
  | {
      tag: 'link'
      rel: 'canonical'
      href: string
    }
  | {
      tag: 'meta'
      name: string
      content: string
    }
  | {
      tag: 'meta'
      property: string
      content: string
    }

export const AMETHYST_PUBLIC_PAGES: Record<
  AmethystPublicPage,
  AmethystPublicPageDefinition
> = {
  homepage: {
    path: '/amethyst/Homepage.html',
    title: "Jane's Sparkle Party - Live jewelry reveals",
    description:
      "Shop live jewelry reveals, dance floor highlights, and upcoming shows with Jane's Sparkle Party.",
  },
  trade: {
    path: '/amethyst/Trade.html',
    title: "Jane's Sparkle Party - Dance Floor",
    description:
      "Browse dancers on Jane's Sparkle Party Dance Floor and swap dancers from live reveal shows.",
  },
  join: {
    path: '/amethyst/Join.html',
    title: "Jane's Sparkle Party - Join the Team",
    description:
      "Learn how to join Jane's Sparkle Party and build a Bomb Party business with practical support from an active team.",
  },
  pantry: {
    path: '/amethyst/Pantry.html',
    title: "Jane's Sparkle Party - In the Pantry",
    description:
      "Browse recipe notes, kitchen favorites, and community updates from Jane's Sparkle Party.",
  },
}

function resolveAmethystPublicUrl(origin: string, path: string) {
  return new URL(path, origin).toString()
}

export function buildAmethystPublicMetadata(
  page: AmethystPublicPage,
  options: BuildAmethystPublicMetadataOptions = {},
): AmethystPublicMetadata {
  const definition = AMETHYST_PUBLIC_PAGES[page]
  const origin = normalizeSparkleOrigin(
    options.origin ?? SPARKLE_PUBLIC_ORIGIN,
  )
  const canonicalUrl = resolveAmethystPublicUrl(origin, definition.path)
  const image = resolveAmethystPublicUrl(origin, '/opengraph-image')

  return {
    page,
    path: definition.path,
    title: definition.title,
    description: definition.description,
    robots: 'index,follow',
    canonicalUrl,
    openGraph: {
      type: 'website',
      siteName: 'Sparkle Suite',
      title: definition.title,
      description: definition.description,
      url: canonicalUrl,
      image,
    },
    twitter: {
      card: 'summary_large_image',
      title: definition.title,
      description: definition.description,
      image,
    },
  }
}

export function buildAmethystPublicMetaTags(
  page: AmethystPublicPage,
  options: BuildAmethystPublicMetadataOptions = {},
): AmethystPublicMetaTag[] {
  const metadata = buildAmethystPublicMetadata(page, options)

  return [
    {
      tag: 'title',
      text: metadata.title,
    },
    {
      tag: 'meta',
      name: 'description',
      content: metadata.description,
    },
    {
      tag: 'meta',
      name: 'robots',
      content: metadata.robots,
    },
    {
      tag: 'link',
      rel: 'canonical',
      href: metadata.canonicalUrl,
    },
    {
      tag: 'meta',
      property: 'og:type',
      content: metadata.openGraph.type,
    },
    {
      tag: 'meta',
      property: 'og:site_name',
      content: metadata.openGraph.siteName,
    },
    {
      tag: 'meta',
      property: 'og:title',
      content: metadata.openGraph.title,
    },
    {
      tag: 'meta',
      property: 'og:description',
      content: metadata.openGraph.description,
    },
    {
      tag: 'meta',
      property: 'og:url',
      content: metadata.openGraph.url,
    },
    {
      tag: 'meta',
      property: 'og:image',
      content: metadata.openGraph.image,
    },
    {
      tag: 'meta',
      name: 'twitter:card',
      content: metadata.twitter.card,
    },
    {
      tag: 'meta',
      name: 'twitter:title',
      content: metadata.twitter.title,
    },
    {
      tag: 'meta',
      name: 'twitter:description',
      content: metadata.twitter.description,
    },
    {
      tag: 'meta',
      name: 'twitter:image',
      content: metadata.twitter.image,
    },
  ]
}

/**
 * City and state already shown on the public Join page.
 * There is no separate "approved to show location" flag. Blank city and state
 * means the rep has not published a location, so callers omit it.
 */
export function publicRepLocationLabel(
  city?: string | null,
  state?: string | null,
) {
  const locality = city?.trim() ?? ''
  const region = state?.trim() ?? ''
  if (locality && region) return `${locality}, ${region}`
  return locality || region
}

export function buildRepPublicPageText(input: {
  page: AmethystPublicPage
  businessName: string
  repName: string
  teamName: string
  city?: string | null
  state?: string | null
}) {
  const businessName = input.businessName.trim() || 'Sparkle Suite rep'
  const repName = input.repName.trim() || 'the rep'
  const teamName = input.teamName.trim() || businessName
  const location = publicRepLocationLabel(input.city, input.state)
  const place = location ? ` in ${location}` : ''

  if (input.page === 'trade') {
    return {
      title: `${businessName} Dance Floor${place}`,
      description: `Browse dancers from ${businessName} and swap dancers on the Dance Floor${place}.`,
    }
  }

  if (input.page === 'join') {
    // /join title and description belong to cursor/rep-join-unique-content.
    return {
      title: `Join ${teamName}`,
      description: `Learn how to join ${teamName} with ${repName}.`,
    }
  }

  if (input.page === 'pantry') {
    return {
      title: `In the Pantry | ${businessName}`,
      description: `Browse recipes, kitchen notes, and live-show favorites from ${businessName}${place}.`,
    }
  }

  return {
    title: `${businessName} | Live jewelry reveals and Dance Floor${place}`,
    description: `Independent Bomb Party rep site for ${businessName}${place}. Watch live jewelry reveals, follow the Live Lineup, and browse dancers on the Dance Floor.`,
  }
}
