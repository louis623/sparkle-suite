import { articleUrl, publishedArticles } from '@/lib/sparkle-suite/articles'
import { canonicalizeSparkleCrawlOrigin, normalizeSparkleOrigin } from './sparkle-crawl'

export const SPARKLE_AGENT_CONTENT_SIGNAL = 'ai-train=no, search=yes, ai-input=yes'

export interface SparkleLlmsPublicPage {
  title: string
  path: string
}

export interface SparkleLlmsLiveShow {
  title: string
  eventTime: string
  url?: string
}

export interface SparkleLlmsGlossaryItem {
  term: string
  definition: string
}

export interface SparkleLlmsInput {
  origin: string | URL
  businessName: string
  repName: string
  repLocation?: string
  summary: string
  publicPages: SparkleLlmsPublicPage[]
  liveShows?: SparkleLlmsLiveShow[]
  glossary?: SparkleLlmsGlossaryItem[]
}

function absoluteUrl(origin: string, pathOrUrl: string) {
  return new URL(pathOrUrl, origin).toString()
}

function cleanLine(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function renderPages(origin: string, pages: SparkleLlmsPublicPage[]) {
  return pages.map(
    (page) => `- [${cleanLine(page.title)}](${absoluteUrl(origin, page.path)})`,
  )
}

function renderLiveShows(origin: string, shows: SparkleLlmsLiveShow[] | undefined) {
  if (!shows?.length) return ['- No upcoming public live shows are published.']

  return shows.map((show) => {
    const prefix = `- ${cleanLine(show.title)}: ${show.eventTime}`
    return show.url ? `${prefix} (${absoluteUrl(origin, show.url)})` : prefix
  })
}

function renderGlossary(glossary: SparkleLlmsGlossaryItem[] | undefined) {
  if (!glossary?.length) return []

  return [
    '## Glossary',
    '',
    ...glossary.map(
      (item) => `- ${cleanLine(item.term)}: ${cleanLine(item.definition)}`,
    ),
  ]
}

export function buildSparkleLlmsText(input: SparkleLlmsInput): string {
  const origin = normalizeSparkleOrigin(input.origin)
  const location = input.repLocation?.trim()
  const glossary = renderGlossary(input.glossary)

  return [
    `# ${cleanLine(input.businessName)}`,
    '',
    cleanLine(input.summary),
    '',
    '## Public Site',
    '',
    `- Canonical origin: ${origin}`,
    `- Rep: ${cleanLine(input.repName)}`,
    ...(location ? [`- Location: ${location}`] : []),
    '',
    '## Public Pages',
    '',
    ...renderPages(origin, input.publicPages),
    '',
    '## Upcoming Live Shows',
    '',
    ...renderLiveShows(origin, input.liveShows),
    '',
    '## Agent Use',
    '',
    `- Content-Signal: ${SPARKLE_AGENT_CONTENT_SIGNAL}`,
    '- Use this file to understand public shopping, dance floor, and team information.',
    '- Do not treat this file as permission to train on private customer or rep data.',
    ...(glossary.length ? ['', ...glossary] : []),
    '',
  ].join('\n')
}

const SPARKLE_SUITE_SUMMARY =
  'Sparkle Suite is a website and live-show setup for Bomb Party reps. It gives the rep a customer site, a Live Lineup, a Dance Floor for dancer swaps, and tools to run the show.'

const SPARKLE_SUITE_KEY_PAGES: SparkleLlmsPublicPage[] = [
  { title: 'Home', path: '/' },
  { title: 'Portfolio', path: '/portfolio' },
  { title: 'Tools', path: '/tools' },
  { title: 'FAQ', path: '/faq' },
  { title: 'Articles', path: '/faq/articles' },
  { title: 'Sparkle Suite and Sparkle Finder', path: '/adventure' },
  { title: 'Build queue', path: '/prelaunch' },
  { title: 'Privacy Policy', path: '/privacy-policy' },
  { title: 'Terms and Conditions', path: '/terms-and-conditions' },
]

export function buildDefaultSparkleLlmsText(origin: string | URL): string {
  const canonical = canonicalizeSparkleCrawlOrigin(origin)
  const articles = publishedArticles()

  return [
    '# Sparkle Suite',
    '',
    SPARKLE_SUITE_SUMMARY,
    '',
    'Sparkle Suite is an independent tool for Reps and Collectors. We are not affiliated with, endorsed by, sponsored by, or officially connected to Bomb Party.',
    '',
    '## Public Site',
    '',
    `- Canonical origin: ${canonical}`,
    '- Location: Jacksonville, FL',
    '',
    '## Key Pages',
    '',
    ...renderPages(canonical, SPARKLE_SUITE_KEY_PAGES),
    '',
    '## FAQ Articles',
    '',
    ...(articles.length
      ? articles.map(
          (article) =>
            `- [${cleanLine(article.title)}](${articleUrl(article)}): ${cleanLine(article.description)}`,
        )
      : ['- No published FAQ articles are listed.']),
    '',
    '## Agent Use',
    '',
    `- Content-Signal: ${SPARKLE_AGENT_CONTENT_SIGNAL}`,
    '- Use this file to understand Sparkle Suite, its public pages, and published FAQ articles.',
    '- Do not treat this file as permission to train on private customer or rep data.',
    '',
  ].join('\n')
}
