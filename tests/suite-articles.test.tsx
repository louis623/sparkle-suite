import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { articleJsonLd, articleMetadata, articleSitemapEntries, publishedArticles, suiteArticles, type SuiteArticle } from '@/lib/sparkle-suite/articles'
import { FaqArticles } from '@/app/_components/faq-articles'
import { SuiteArticleExperience } from '@/app/_components/suite-article'
import { FaqExperience } from '@/app/_components/faq-experience'
import ArticlePage, { generateMetadata } from '@/app/faq/articles/[slug]/page'
import BlogIndex from '@/app/faq/articles/page'
import { proxy } from '@/proxy'
import { buildSparkleSitemap } from '@/lib/seo/sparkle-crawl'

const requestState = vi.hoisted(() => ({ host: 'www.yoursparklesuite.com' }))
vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: requestState.host }) }))

// Synthetic regression data only; never enters the application article catalog.
const fixture: SuiteArticle = {
  slug: 'test-reading', status: 'published', title: 'Synthetic reading test',
  description: 'A test description.', author: { name: 'Test author', type: 'Person' },
  publishedAt: '2026-01-01T12:00:00Z',
  body: [{ type: 'paragraph', text: 'Test paragraph <script>alert(1)</script>.' },
    { type: 'heading', text: 'Test heading' }, { type: 'list', items: ['First test item', 'Second test item'] }],
}

let savedCatalog: SuiteArticle[] = []
beforeEach(() => {
  requestState.host = 'www.yoursparklesuite.com'
  // Isolate test-only fixtures so adding a real approved article never breaks these tests.
  savedCatalog = (suiteArticles as SuiteArticle[]).splice(0)
})
afterEach(() => {
  const catalog = suiteArticles as SuiteArticle[]
  catalog.splice(0, catalog.length, ...savedCatalog)
})

describe('FAQ article publication boundary', () => {
  it('renders an empty catalog without a placeholder, FAQ section, or sitemap article', () => {
    expect(suiteArticles).toEqual([])
    expect(renderToStaticMarkup(createElement(FaqArticles))).toBe('')
    expect(buildSparkleSitemap().some((entry) => entry.url.includes('/faq/articles'))).toBe(false)
  })

  it.each([
    { status: 'draft' }, { title: ' ' }, { description: '' }, { author: { name: '', type: 'Person' } },
    { body: [] }, { body: [{ type: 'heading', text: 'Only a heading' }] },
    { publishedAt: '' }, { publishedAt: '2026-01-01' }, { publishedAt: 'invalid' },
    { publishedAt: '2026-02-30T12:00:00Z' }, { publishedAt: '2026-01-01T24:00:00Z' },
    { publishedAt: '2099-01-01T00:00:00Z' }, { updatedAt: '2099-01-01T00:00:00Z' },
    { updatedAt: '2020-01-01T00:00:00Z' }, { slug: '../draft' },
  ])('excludes incomplete, unpublished or scheduled content: %j', (override) => {
    const invalid = { ...fixture, ...override } as SuiteArticle
    expect(publishedArticles([invalid])).toEqual([])
    expect(articleSitemapEntries('https://www.yoursparklesuite.com', [invalid])).toEqual([])
  })

  it('rejects duplicate URLs and orders published content by publication date', () => {
    expect(publishedArticles([fixture, fixture])).toEqual([])
    const newer = { ...fixture, slug: 'newer-test', publishedAt: '2026-02-01T00:00:00Z' }
    expect(publishedArticles([fixture, newer]).map((article) => article.slug)).toEqual(['newer-test', fixture.slug])
  })

  it('renders semantic reading content and schema matching visible authors, dates and title', () => {
    const html = renderToStaticMarkup(createElement(SuiteArticleExperience, { article: fixture }))
    expect(html).toContain('<h1>Synthetic reading test</h1>')
    expect(html).toContain('<h2>Test heading</h2>')
    expect(html).toContain('<time dateTime="2026-01-01T12:00:00Z">January 1, 2026</time>')
    expect(html).toContain('By Test author')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).toContain('href="/faq#articles"')
    expect(html).not.toContain('aria-current="page"')
    const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1]
    expect(JSON.parse(json!)).toEqual(articleJsonLd(fixture))
    expect(articleJsonLd(fixture)).not.toHaveProperty('image')
    expect(articleJsonLd(fixture)).not.toHaveProperty('dateModified')
  })

  it('uses the same canonical URL for metadata, schema and main-site sitemap only', () => {
    const metadata = articleMetadata(fixture)
    expect(metadata.alternates?.canonical).toBe('https://www.yoursparklesuite.com/faq/articles/test-reading')
    expect(metadata.openGraph).toMatchObject({ type: 'article', url: metadata.alternates?.canonical })
    expect(articleJsonLd(fixture).url).toBe(metadata.alternates?.canonical)
    expect(articleSitemapEntries('https://www.yoursparklesuite.com', [fixture])[0].url).toBe(metadata.alternates?.canonical)
    expect(articleSitemapEntries('https://rep.example', [fixture])).toEqual([])
  })

  it('serves published detail and metadata, linking from below FAQ answers', async () => {
    const catalog = suiteArticles as SuiteArticle[]
    catalog.push(fixture)
    try {
      const props = { params: Promise.resolve({ slug: fixture.slug }) }
      expect((await generateMetadata(props)).alternates?.canonical).toBe(articleJsonLd(fixture).url)
      expect(renderToStaticMarkup(await ArticlePage(props))).toContain(fixture.title)
      const faq = renderToStaticMarkup(createElement(FaqExperience))
      expect(faq).toContain('href="/faq/articles/test-reading"')
      expect(faq.indexOf('id="articles"')).toBeGreaterThan(faq.indexOf('id="answers"'))
      expect(faq.indexOf('id="articles"')).toBeLessThan(faq.indexOf('id="faq-proof-title"'))
      requestState.host = 'rep.example'
      await expect(ArticlePage(props)).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
      await expect(generateMetadata(props)).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    } finally { catalog.pop() }
  })

  it('returns notFound for missing/draft slugs and the intentionally absent blog index', async () => {
    const props = { params: Promise.resolve({ slug: 'missing' }) }
    await expect(ArticlePage(props)).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    await expect(generateMetadata(props)).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    expect(() => BlogIndex()).toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
    const catalog = suiteArticles as SuiteArticle[]
    catalog.push({ ...fixture, status: 'draft' })
    try {
      await expect(ArticlePage({ params: Promise.resolve({ slug: fixture.slug }) })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404')
      expect(renderToStaticMarkup(createElement(FaqArticles))).toBe('')
    } finally { catalog.pop() }
  })

  it.each(['/faq/articles', '/faq/articles/test-reading'])('blocks %s on customer domains before marketing renders', (path) => {
    const response = proxy(new NextRequest(`https://rep.example${path}`, { headers: { host: 'rep.example' } }))
    expect(response.status).toBe(404)
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex')
    const platform = proxy(new NextRequest(`https://www.yoursparklesuite.com${path}`, { headers: { host: 'www.yoursparklesuite.com' } }))
    expect(platform.status).toBe(200)
  })
})
