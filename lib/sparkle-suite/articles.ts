import type { Metadata } from 'next'
import { bombPartyDancerSwapsWithoutTheDmChaosArticle } from './article-content/bomb-party-dancer-swaps-without-the-dm-chaos'
import { bombPartyJoinMyTeamPageArticle } from './article-content/bomb-party-join-my-team-page'
import { foundOnGoogleAndAiArticle } from './article-content/found-on-google-and-ai'
import { howToGetYourOwnBombPartyRepWebsiteArticle } from './article-content/how-to-get-your-own-bomb-party-rep-website'
import { howToOnboardANewBombPartyTeamRepArticle } from './article-content/how-to-onboard-a-new-bomb-party-team-rep'
import { joiningBombPartyWhyJoinUnderASparkleSuiteRepArticle } from './article-content/joining-bomb-party-why-join-under-a-sparkle-suite-rep'
import { liveRevealCustomersCanFollowArticle } from './article-content/live-reveal-customers-can-follow'
import { meetNicNacSparkleSuiteAssistantArticle } from './article-content/meet-nic-nac-sparkle-suite-assistant'
import { sparkleSuitePricingExplainedArticle } from './article-content/sparkle-suite-pricing-explained'
import { whatIsSparkleSuiteArticle } from './article-content/what-is-sparkle-suite'
import { whyPostingBombPartyShowTimesGrowsYourAudienceArticle } from './article-content/why-posting-bomb-party-show-times-grows-your-audience'
import { whySeriousBpRepArticle } from './article-content/why-serious-bp-rep'

const ORIGIN = 'https://www.yoursparklesuite.com'

export const suiteArticleAuthor = {
  name: 'Louis Chapman',
  type: 'Person' as const,
  url: ORIGIN,
}

export const suiteArticleImage = {
  url: `${ORIGIN}/opengraph-image`,
  width: 1200,
  height: 630,
  alt: 'Sparkle Suite, websites and tools for independent Bomb Party reps',
}

export function resolveArticleAuthor(article: SuiteArticle) {
  return article.author?.name.trim() ? article.author : suiteArticleAuthor
}

export const ARTICLE_INDEX_PATH = '/faq/articles'
export const articleIndexTitle = 'Sparkle Suite Articles — Sites, Live Lineup, and the Dance Floor'
export const articleIndexDescription =
  'Published Sparkle Suite articles for Bomb Party reps. Read about the customer site, Live Lineup, Dance Floor, dancer swaps, pricing, and getting started.'

export type ArticleBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: readonly string[] }

export type SuiteArticle = {
  slug: string
  status: 'draft' | 'published'
  title: string
  description: string
  author?: { name: string; type: 'Person' | 'Organization'; url?: string }
  publishedAt?: string
  updatedAt?: string
  body: readonly ArticleBlock[]
}

// Add approved articles here. Draft content must never be imported by a client component.
export const suiteArticles: readonly SuiteArticle[] = [sparkleSuitePricingExplainedArticle, meetNicNacSparkleSuiteAssistantArticle, joiningBombPartyWhyJoinUnderASparkleSuiteRepArticle, bombPartyJoinMyTeamPageArticle, howToOnboardANewBombPartyTeamRepArticle, whyPostingBombPartyShowTimesGrowsYourAudienceArticle, bombPartyDancerSwapsWithoutTheDmChaosArticle, howToGetYourOwnBombPartyRepWebsiteArticle, whatIsSparkleSuiteArticle, liveRevealCustomersCanFollowArticle, foundOnGoogleAndAiArticle, whySeriousBpRepArticle]

function validDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) return false
  // Date.parse normalizes dates such as February 30; reject those as incomplete metadata.
  const calendarDate = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  return Number.isFinite(calendarDate.getTime()) && calendarDate.toISOString().slice(0, 10) === value.slice(0, 10)
}

export function publishedArticles(articles: readonly SuiteArticle[] = suiteArticles, now = Date.now()) {
  const counts = new Map<string, number>()
  articles.forEach(({ slug }) => counts.set(slug, (counts.get(slug) ?? 0) + 1))
  return articles.filter((article) =>
    article.status === 'published' &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug) && counts.get(article.slug) === 1 &&
    article.title.trim() && article.description.trim() && (!article.author || article.author.name.trim()) &&
    (article.publishedAt === undefined || (validDate(article.publishedAt) && Date.parse(article.publishedAt) <= now)) &&
    (article.updatedAt === undefined || (validDate(article.updatedAt) && Date.parse(article.updatedAt) <= now &&
      (!article.publishedAt || Date.parse(article.updatedAt) >= Date.parse(article.publishedAt)))) &&
    article.body.length > 0 && article.body.some((block) => block.type === 'paragraph' && block.text.trim()) &&
    article.body.every((block) => block.type === 'list' ? block.items.length > 0 && block.items.every((item) => item.trim()) : block.text.trim()),
  ).sort((a, b) => (b.publishedAt ? Date.parse(b.publishedAt) : 0) - (a.publishedAt ? Date.parse(a.publishedAt) : 0))
}

export function findPublishedArticle(slug: string) {
  return publishedArticles().find((article) => article.slug === slug)
}

export function articleUrl(article: SuiteArticle) {
  return `${ORIGIN}/faq/articles/${article.slug}`
}

export function articleIndexUrl() {
  return `${ORIGIN}${ARTICLE_INDEX_PATH}`
}

export function articleIndexMetadata(): Metadata {
  const url = articleIndexUrl()
  return {
    title: { absolute: articleIndexTitle },
    description: articleIndexDescription,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      url,
      siteName: 'Sparkle Suite',
      title: articleIndexTitle,
      description: articleIndexDescription,
    },
    twitter: { card: 'summary', title: articleIndexTitle, description: articleIndexDescription },
  }
}

export function articleIndexJsonLd(articles: readonly SuiteArticle[] = publishedArticles()) {
  const url = articleIndexUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: articleIndexTitle,
    description: articleIndexDescription,
    url,
    isPartOf: { '@type': 'WebSite', name: 'Sparkle Suite', url: ORIGIN },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: articles.length,
      itemListElement: articles.map((article, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: article.title,
        description: article.description,
        url: articleUrl(article),
      })),
    },
  }
}

export function articleDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value))
}

export function articleMetadata(article: SuiteArticle): Metadata {
  const url = articleUrl(article)
  const author = resolveArticleAuthor(article)
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'article', url, siteName: 'Sparkle Suite', title: article.title,
      description: article.description, publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt, authors: [author.name],
      images: [{ url: suiteArticleImage.url, width: suiteArticleImage.width, height: suiteArticleImage.height, alt: suiteArticleImage.alt }],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.description,
      images: [suiteArticleImage.url],
    },
  }
}

export function articleJsonLd(article: SuiteArticle) {
  const author = resolveArticleAuthor(article)
  return {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: article.title, description: article.description,
    url: articleUrl(article), mainEntityOfPage: articleUrl(article),
    image: {
      '@type': 'ImageObject',
      url: suiteArticleImage.url,
      width: suiteArticleImage.width,
      height: suiteArticleImage.height,
      caption: suiteArticleImage.alt,
    },
    ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
    ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
    author: { '@type': author.type, name: author.name, ...(author.url ? { url: author.url } : {}) },
    publisher: { '@type': 'Organization', name: 'Sparkle Suite', url: ORIGIN },
  }
}

export function articleSitemapEntries(origin: string, articles: readonly SuiteArticle[] = suiteArticles) {
  if (new URL(origin).origin !== ORIGIN) return []
  return publishedArticles(articles).map((article) => ({
    url: articleUrl(article),
    ...(article.updatedAt || article.publishedAt ? { lastModified: new Date((article.updatedAt ?? article.publishedAt)!) } : {}),
  }))
}
