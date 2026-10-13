import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { describe, expect, it, vi } from 'vitest'
import { SuiteArticleExperience } from '@/app/_components/suite-article'
import { FaqExperience } from '@/app/_components/faq-experience'
import ArticlePage, { generateMetadata } from '@/app/faq/articles/[slug]/page'
import { articleJsonLd, articleMetadata, articleSitemapEntries, articleUrl, publishedArticles } from '@/lib/sparkle-suite/articles'
import { whySeriousBpRepArticle as article, whySeriousBpRepSource as provenance } from '@/lib/sparkle-suite/article-content/why-serious-bp-rep'
import { articleInlineParts } from '@/lib/sparkle-suite/article-inline'

vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'www.yoursparklesuite.com' }) }))
const source = readFileSync('docs/sparkle-suite/article-sources/2026-10-07-why-serious-bp-rep-uses-sparkle-suite.md', 'utf8').replace(/\r\n/g, '\n')
const bodyCopy = article.body.map(block => block.type === 'heading' ? `## ${block.text}` :
  block.type === 'list' ? block.items.map(item => `- ${item}`).join('\n') : block.text).join('\n\n')

describe('owner-supplied first public FAQ article', () => {
  it('matches the pinned source blob and exact public copy without editorial sections', () => {
    const bytes = Buffer.from(source)
    expect(createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex')).toBe(provenance.blob)
    expect(bodyCopy).toBe(source.split('\n---\n')[1].trim())
    expect(article.title).toBe(source.split('\n')[0].slice(2))
    expect(article.description).toBe(source.match(/\*\*Meta description \(~155 chars\)\*\*\n([^\n]+)/)![1])
    expect(bodyCopy).not.toMatch(/Suggested meta|Status:|Voice:|Placement idea:|Research:|SEO\/AEO note:|\$\d|referral/i)
    expect(article.body.filter(block => block.type === 'heading')).toHaveLength(7)
  })

  it('renders emphasis, source destinations and unchanged soft queue/payment wording', () => {
    const html = renderToStaticMarkup(createElement(SuiteArticleExperience, { article }))
    expect(html).toContain('<strong>Live Lineup</strong>')
    expect(html).toContain('<strong>Dance Floor</strong>')
    expect(html).toContain('Join the build queue at <a href="/">yoursparklesuite.com</a>.')
    expect(html).toContain('Peek the <a href="/portfolio">Portfolio</a>.')
    expect(html).toContain('No payment when you join. I’ll email you to book a quick 30-minute call.')
    expect(html).toContain('Email and SMS updates for customers are coming soon. They’re not live yet.')
    expect(html).not.toContain('Voice: Louis')
    expect(html).not.toContain('Suggested meta')
    expect(html).not.toContain('By Louis')
    expect(html).not.toContain('<time')
  })

  it('is linked only from the FAQ collection and has matching canonical/metadata/schema/sitemap', async () => {
    const props = { params: Promise.resolve({ slug: article.slug }) }
    const faq = renderToStaticMarkup(createElement(FaqExperience))
    expect(faq).toContain(`href="/faq/articles/${article.slug}"`)
    expect(publishedArticles()).toContainEqual(article)
    expect((await generateMetadata(props)).alternates?.canonical).toBe(articleUrl(article))
    expect(renderToStaticMarkup(await ArticlePage(props))).toContain(article.title)
    expect(articleMetadata(article).description).toBe(article.description)
    const schema = articleJsonLd(article)
    expect(schema).toMatchObject({ '@type': 'BlogPosting', headline: article.title, mainEntityOfPage: articleUrl(article), url: articleUrl(article) })
    expect(schema).not.toHaveProperty('author')
    expect(schema).not.toHaveProperty('datePublished')
    expect(schema).not.toHaveProperty('dateModified')
    const entries = articleSitemapEntries('https://www.yoursparklesuite.com')
    expect(entries).toContainEqual({ url: articleUrl(article) })
    expect(articleSitemapEntries('https://rep.example')).toEqual([])
  })

  it('only interprets explicit bold and http(s) links, leaving HTML and unsafe schemes as text', () => {
    expect(articleInlineParts('**Bold** and [FAQ](https://www.yoursparklesuite.com/faq)')).toEqual([
      { type: 'strong', text: 'Bold' }, { type: 'text', text: ' and ' },
      { type: 'link', text: 'FAQ', href: 'https://www.yoursparklesuite.com/faq' },
    ])
    expect(articleInlineParts('<script>x</script> [bad](javascript:alert)')).toEqual([
      { type: 'text', text: '<script>x</script> [bad](javascript:alert)' },
    ])
  })
})
