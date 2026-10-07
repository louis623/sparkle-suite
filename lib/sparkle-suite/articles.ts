import type { Metadata } from 'next'
import { whySeriousBpRepArticle } from './article-content/why-serious-bp-rep'

const ORIGIN = 'https://www.yoursparklesuite.com'

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
export const suiteArticles: readonly SuiteArticle[] = [whySeriousBpRepArticle]

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

export function articleDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(value))
}

export function articleMetadata(article: SuiteArticle): Metadata {
  const url = articleUrl(article)
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: 'article', url, siteName: 'Sparkle Suite', title: article.title,
      description: article.description, publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt, authors: article.author ? [article.author.name] : undefined,
    },
    twitter: { card: 'summary', title: article.title, description: article.description },
  }
}

export function articleJsonLd(article: SuiteArticle) {
  return {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: article.title, description: article.description,
    url: articleUrl(article), mainEntityOfPage: articleUrl(article),
    ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
    ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
    ...(article.author ? { author: { '@type': article.author.type, name: article.author.name, ...(article.author.url ? { url: article.author.url } : {}) } } : {}),
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
