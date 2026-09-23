import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import {
  type AmethystPublicMetaTag,
  type AmethystPublicPage,
  buildAmethystPublicMetadata,
} from '@/lib/seo/amethyst-public-metadata'
import {
  buildAmethystPublicPageJsonLd,
  serializeJsonLd,
} from '@/lib/seo/amethyst-structured-data'
import { resolveSparkleRequestOrigin } from '@/lib/seo/sparkle-crawl'
import {
  type AmethystPreviewTemplateData,
  loadAmethystPreviewTemplateData,
} from '@/lib/amethyst/preview-template-data'
import { resolveAmethystRequestRepId } from '@/lib/amethyst/request-rep-target'
import { resolveAmethystRequestTarget } from '@/lib/amethyst/request-rep-target'
import { canServeTargetedAmethystJoinPage } from '@/lib/amethyst/join-page-access'
import { getPublicRepName } from '@/lib/amethyst/public-rep-name'

interface RenderAmethystPublicAssetResponseOptions {
  repIdOverride?: string | null
  canonicalPathOverride?: string | null
  publicSiteSlugOverride?: string | null
  joinVisibilityVerified?: boolean
}

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
}

const AMETHYST_ASSETS = new Set([
  'gnome-garden.css',
  'neon-butterfly.css',
  'neon-butterfly.js',
  'skins/gnome-garden/forest.webp',
  'skins/gnome-garden/forest-mobile.webp',
  'skins/gnome-garden/gnome.webp',
  'skins/gnome-garden/lantern.webp',
  'skins/gnome-garden/storybook-original.webp',
  'skins/neon-butterfly/kelly-studio-desktop.webp',
  'skins/neon-butterfly/kelly-studio-mobile.webp',
  'skins/neon-butterfly/kelly-sign-pink.png',
  'skins/neon-butterfly/kelly-sign-gold.png',
  'skins/neon-butterfly/kelly-sign-violet.png',
  'Amethyst Design System.html',
  'components.css',
  'faq.css',
  'homepage.css',
  'Homepage.html',
  'homepage.jsx',
  'join.css',
  'Join.html',
  'join-runtime.js',
  'live-lineup.js',
  'join.jsx',
  'pantry.css',
  'Pantry.html',
  'pantry.jsx',
  'README.md',
  'tokens.css',
  'trade.css',
  'Trade.html',
  'trade.jsx',
  'template-loader.js',
  'tweaks-panel.jsx',
  'Unsubscribe.html',
  'unsubscribe.jsx',
])

const AMETHYST_PUBLIC_HTML_PAGES: Record<string, AmethystPublicPage> = {
  'Homepage.html': 'homepage',
  'Trade.html': 'trade',
  'Join.html': 'join',
  'Pantry.html': 'pantry',
}

const AMETHYST_TEMPLATE_SCRIPT_PAGES: Record<string, AmethystPublicPage> = {
  ...AMETHYST_PUBLIC_HTML_PAGES,
  'Unsubscribe.html': 'homepage',
}

const GOOGLE_SITE_VERIFICATION_BY_HOME_HOST: Record<string, string> = {
  'theblingkitchen.com': 'feEZv_CKufx0oSqVev8dMlnlsW_15Huq4MxQ8qflSmo',
  'brittwithbling.com': 'EwFFAo5oMKSJKVrUGtZ0VkA-lSf7TOHCz90dvz7269s',
  'brisglowtique.com': 'xPwvo7JypLtNV249Kng-6JmVac6hvtMvEVidIDmJmIU',
  'sparklybutterflies.com': 'ivgAtlhf8_GUt8ES7nXdqvJSZbHi6AGwp3dUdmio9aA',
}

export function buildGoogleSiteVerificationTag(
  page: AmethystPublicPage,
  origin: string,
) {
  const hostname = new URL(origin).hostname.toLowerCase()
  const verificationToken = GOOGLE_SITE_VERIFICATION_BY_HOME_HOST[hostname]
  if (page !== 'homepage' || !verificationToken) return ''

  return `<meta name="google-site-verification" content="${verificationToken}" />`
}

function getContentType(filePath: string | URL) {
  const pathname = typeof filePath === 'string' ? filePath : filePath.pathname
  const dotIndex = pathname.lastIndexOf('.')
  const ext = dotIndex >= 0 ? pathname.slice(dotIndex).toLowerCase() : ''
  return CONTENT_TYPES[ext] ?? 'application/octet-stream'
}

function resolveAmethystAsset(asset: string[]) {
  const assetPath = asset.join('/')
  if (!AMETHYST_ASSETS.has(assetPath)) return null

  return join(process.cwd(), 'public', 'amethyst', assetPath)
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeHtmlText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderMetaTag(tag: AmethystPublicMetaTag) {
  if (tag.tag === 'title') {
    return `<title>${escapeHtmlText(tag.text)}</title>`
  }

  if (tag.tag === 'link') {
    return `<link rel="${tag.rel}" href="${escapeHtmlAttribute(tag.href)}" />`
  }

  if ('property' in tag) {
    return `<meta property="${tag.property}" content="${escapeHtmlAttribute(
      tag.content,
    )}" />`
  }

  return `<meta name="${tag.name}" content="${escapeHtmlAttribute(tag.content)}" />`
}

function buildTargetedPageText(
  page: AmethystPublicPage,
  templateData: AmethystPreviewTemplateData,
) {
  const businessName = templateData.homepage.businessName
  const repName = getPublicRepName(templateData.homepage.repName)
  const teamName = templateData.join.teamName
  const isBlingKitchen =
    templateData.homepage.publicSiteVariant === 'bling_kitchen_hybrid'

  if (isBlingKitchen) {
    if (page === 'trade') {
      return {
        title: 'BlingKitchen Dance Floor - Heather Daugherty',
        description:
          "Browse Heather's BlingKitchen dance floor for live-show jewelry swaps.",
      }
    }

    if (page === 'join') {
      return {
        title: "Join Heather's BlingKitchen Team - Opal Sparkling Gems",
        description:
          "Learn about Heather Daugherty's Opal Sparkling Gems team, review official enrollment details, and ask what support is currently available.",
      }
    }

    if (page === 'pantry') {
      return {
        title: "In the Pantry - Heather's BlingKitchen Recipes",
        description:
          "Browse Heather's BlingKitchen recipes, kitchen notes, TikTok favorites, and live-show community treats.",
      }
    }

    return {
      title:
        'BlingKitchen - Heather Daugherty | Ohio Bomb Party Host | Serving Sparkle from the Heart of the Home',
      description:
        "Shop Bomb Party reveals with Heather Daugherty at BlingKitchen, join the live show, browse Heather's Pantry recipes, and connect with the Ohio BlingKitchen community.",
    }
  }

  if (page === 'trade') {
    return {
      title: `${businessName} - Dance Floor`,
      description: `Browse available trade pieces from ${businessName}.`,
    }
  }

  if (page === 'join') {
    return {
      title: `Join ${teamName}`,
      description: `Learn how to join ${teamName} with ${repName}.`,
    }
  }

  if (page === 'pantry') {
    return {
      title: `In the Pantry - ${businessName}`,
      description: `Browse Heather's BlingKitchen recipes, kitchen notes, and live-show community favorites.`,
    }
  }

  return {
    title: `${businessName} - Live jewelry reveals`,
    description: `Shop live jewelry reveals and updates with ${businessName}.`,
  }
}

export const buildTargetedAmethystPublicPageTextForTest = buildTargetedPageText

function buildMetadataTagsFromPublicMetadata(
  metadata: ReturnType<typeof buildAmethystPublicMetadata>,
): AmethystPublicMetaTag[] {
  return [
    { tag: 'title', text: metadata.title },
    { tag: 'meta', name: 'description', content: metadata.description },
    { tag: 'meta', name: 'robots', content: metadata.robots },
    { tag: 'link', rel: 'canonical', href: metadata.canonicalUrl },
    { tag: 'meta', property: 'og:type', content: metadata.openGraph.type },
    { tag: 'meta', property: 'og:site_name', content: metadata.openGraph.siteName },
    { tag: 'meta', property: 'og:title', content: metadata.openGraph.title },
    {
      tag: 'meta',
      property: 'og:description',
      content: metadata.openGraph.description,
    },
    { tag: 'meta', property: 'og:url', content: metadata.openGraph.url },
    { tag: 'meta', property: 'og:image', content: metadata.openGraph.image },
    { tag: 'meta', name: 'twitter:card', content: metadata.twitter.card },
    { tag: 'meta', name: 'twitter:title', content: metadata.twitter.title },
    {
      tag: 'meta',
      name: 'twitter:description',
      content: metadata.twitter.description,
    },
    { tag: 'meta', name: 'twitter:image', content: metadata.twitter.image },
  ]
}

function normalizeCanonicalPath(path: string | null | undefined) {
  const cleaned = path?.trim()
  if (!cleaned) return null
  return cleaned.startsWith('/') ? cleaned : `/${cleaned}`
}

function applyCanonicalPathOverride(
  metadata: ReturnType<typeof buildAmethystPublicMetadata>,
  origin: string,
  canonicalPathOverride?: string | null,
) {
  const path = normalizeCanonicalPath(canonicalPathOverride)
  if (!path) return metadata

  const canonicalUrl = new URL(path, origin).toString()
  return {
    ...metadata,
    path,
    canonicalUrl,
    openGraph: {
      ...metadata.openGraph,
      url: canonicalUrl,
    },
  }
}

function buildRenderedPublicMetadata(
  page: AmethystPublicPage,
  origin: string,
  templateData?: AmethystPreviewTemplateData | null,
  canonicalPathOverride?: string | null,
) {
  if (!templateData) {
    return applyCanonicalPathOverride(
      buildAmethystPublicMetadata(page, { origin }),
      origin,
      canonicalPathOverride,
    )
  }

  const pageText = buildTargetedPageText(page, templateData)
  const defaultMetadata = applyCanonicalPathOverride(
    buildAmethystPublicMetadata(page, { origin }),
    origin,
    canonicalPathOverride,
  )
  return {
    ...defaultMetadata,
    ...pageText,
    openGraph: {
      ...defaultMetadata.openGraph,
      ...pageText,
      siteName: templateData.homepage.businessName,
    },
    twitter: {
      ...defaultMetadata.twitter,
      ...pageText,
    },
  }

}

export const buildRenderedAmethystPublicMetadataForTest =
  buildRenderedPublicMetadata

function renderMetadataBlock(
  page: AmethystPublicPage,
  origin: string,
  templateData?: AmethystPreviewTemplateData | null,
  canonicalPathOverride?: string | null,
) {
  const faviconTag = `<link rel="icon" type="image/png" href="${escapeHtmlAttribute(
    new URL('/icon', origin).toString(),
  )}" />`
  const metadata = buildRenderedPublicMetadata(
    page,
    origin,
    templateData,
    canonicalPathOverride,
  )
  const verificationTag = buildGoogleSiteVerificationTag(page, origin)
  return [
    buildMetadataTagsFromPublicMetadata(metadata).map(renderMetaTag).join('\n'),
    verificationTag,
    faviconTag,
  ]
    .filter(Boolean)
    .join('\n')
}

function injectAmethystJsonLd(
  html: string,
  page: AmethystPublicPage,
  origin: string,
  templateData?: AmethystPreviewTemplateData | null,
  canonicalPathOverride?: string | null,
) {
  const defaultMetadata = applyCanonicalPathOverride(
    buildAmethystPublicMetadata(page, { origin }),
    origin,
    canonicalPathOverride,
  )
  const pageText = templateData ? buildTargetedPageText(page, templateData) : null
  const metadata = pageText
    ? { ...defaultMetadata, ...pageText }
    : defaultMetadata
  const homepage = templateData?.homepage
  const join = templateData?.join
  const jsonLd = buildAmethystPublicPageJsonLd({
    origin,
    path: metadata.path,
    title: metadata.title,
    description: metadata.description,
    repName: getPublicRepName(homepage?.repName, 'Jane'),
    businessName: homepage?.businessName ?? "Jane's Sparkle Party",
    repCity: join?.repCity,
    repState: join?.repState,
    shopUrl: homepage?.streamLinks.shop ?? 'https://bombparty.com',
    sameAs: homepage?.socialLinks.map((link) => link.href).filter((href) => href !== '#'),
  })
  const script = `<script type="application/ld+json">${serializeJsonLd(
    jsonLd,
  )}</script>`

  return html.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '')
    .replace('</head>', `${script}\n</head>`)
}

function rewriteTemplateScriptTarget(
  html: string,
  page: AmethystPublicPage,
  requestUrl: URL,
  options: RenderAmethystPublicAssetResponseOptions = {},
) {
  const target =
    options.repIdOverride?.trim() ||
    requestUrl.searchParams.get('c') ||
    requestUrl.searchParams.get('repId')
  if (!target) return html
  const publicSiteSlug = options.publicSiteSlugOverride?.trim()
  const endpoint =
    page === 'homepage'
      ? '/api/amethyst/homepage-template'
      : page === 'trade'
        ? '/api/amethyst/trade-template'
        : page === 'join'
          ? '/api/amethyst/join-template'
          : '/api/amethyst/pantry-template'
  const query = new URLSearchParams({ c: target })
  if (publicSiteSlug) query.set('publicSiteSlug', publicSiteSlug)

  const rewrittenEndpoint = `${endpoint}?${escapeHtmlAttribute(query.toString())}`

  return html
    .replace(`src="${endpoint}"`, `src="${rewrittenEndpoint}"`)
    .replace(`data-template-src="${endpoint}"`, `data-template-src="${rewrittenEndpoint}"`)
}

function rewriteAmethystStaticAssetUrls(html: string) {
  return Array.from(AMETHYST_ASSETS).reduce(
    (rewritten, assetPath) =>
      rewritten.replaceAll(`="${assetPath}`, `="/amethyst/${assetPath}`),
    html,
  )
}

function rewriteAmethystPublicHtml(
  html: string,
  page: AmethystPublicPage,
  origin: string,
  request: Request,
  requestUrl: URL,
  templateData?: AmethystPreviewTemplateData | null,
  options: RenderAmethystPublicAssetResponseOptions = {},
) {
  const metadataBlock = renderMetadataBlock(
    page,
    origin,
    templateData,
    options.canonicalPathOverride,
  )
  const rewritten = html.replace(
    /<title>[\s\S]*?<meta name="twitter:image" content="[^"]+" \/>\r?\n?/,
    `${metadataBlock}\n`,
  )

  return injectAmethystJsonLd(
    rewriteAmethystStaticAssetUrls(
      rewriteTemplateScriptTarget(rewritten, page, requestUrl, options),
    ),
    page,
    origin,
    templateData,
    options.canonicalPathOverride,
  )
}

export async function renderAmethystPublicAssetResponse(
  request: Request,
  asset: string[],
  options: RenderAmethystPublicAssetResponseOptions = {},
) {
  const filePath = resolveAmethystAsset(asset)
  if (!filePath) return new Response('Not found', { status: 404 })

  try {
    const body = await readFile(filePath)
    const contentType = getContentType(filePath)
    const assetPath = asset.join('/')
    const page = AMETHYST_PUBLIC_HTML_PAGES[assetPath]
    const templateScriptPage = AMETHYST_TEMPLATE_SCRIPT_PAGES[assetPath]
    const requestUrl = new URL(request.url)
    if (page === 'join' && !options.joinVisibilityVerified) {
      const target = resolveAmethystRequestTarget(request)
      if (!(await canServeTargetedAmethystJoinPage(target))) {
        return new Response('Not found', {
          status: 404,
          headers: { 'Cache-Control': 'no-store' },
        })
      }
    }
    const repId = options.repIdOverride?.trim() || resolveAmethystRequestRepId(request)
    const resolvedOptions = repId ? { ...options, repIdOverride: repId } : options
    const templateData =
      page && contentType.startsWith('text/html') && repId
        ? await loadAmethystPreviewTemplateData({
            repId,
            publicSiteSlug: options.publicSiteSlugOverride,
          })
        : null
    let responseBody: BodyInit = new Uint8Array(body)
    if (contentType.startsWith('text/html')) {
      const html = body.toString('utf8')
      if (page) {
        responseBody = rewriteAmethystPublicHtml(
          html,
          page,
          resolveSparkleRequestOrigin(request),
          request,
          requestUrl,
          templateData,
          resolvedOptions,
        )
      } else if (templateScriptPage) {
        responseBody = rewriteTemplateScriptTarget(
          html,
          templateScriptPage,
          requestUrl,
          resolvedOptions,
        )
      }
    }

    const cacheControl = contentType.startsWith('text/html')
      ? 'no-store'
      : 'public, max-age=0, must-revalidate'

    return new Response(responseBody, {
      headers: {
        'Cache-Control': cacheControl,
        'Content-Type': contentType,
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
