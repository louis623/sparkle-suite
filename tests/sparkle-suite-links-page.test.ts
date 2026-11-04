import { createElement } from 'react'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import LinksPage, { metadata } from '@/app/links/page'
import { sparkleLinksPage } from '@/lib/sparkle-suite/links-page-content'
import { buildSparkleSitemap } from '@/lib/seo/sparkle-crawl'

function render() {
  return renderToStaticMarkup(createElement(LinksPage))
}

describe('Sparkle Suite /links (TikTok bio page)', () => {
  it('is noindex, follow and canonical to itself', () => {
    expect(metadata.robots).toEqual({ index: false, follow: true })
    expect(metadata.alternates?.canonical).toBe('/links')
  })

  it('is left out of the sitemap', () => {
    const xml = buildSparkleSitemap('https://www.yoursparklesuite.com')
    expect(String(xml)).not.toContain('/links')
  })

  it('shows the headshot and one card each for Suite and Finder with tracking tags', () => {
    const html = render()
    expect(html).toContain('src="/brand/louis-chapman-headshot-480.jpg"')
    expect(html).toContain('src="/brand/sparkle-suite-logo-transparent.png"')
    expect(html).toContain('src="/brand/sparkle-finder-logo-transparent.png"')
    expect(html.match(/data-card="/g)).toHaveLength(2)
    expect(html).toContain(
      'href="/?utm_source=tiktok&amp;utm_medium=bio&amp;utm_campaign=links_page&amp;utm_content=suite_card"',
    )
    expect(html).toContain(
      'href="https://yoursparklefinder.com/?utm_source=tiktok&amp;utm_medium=bio&amp;utm_campaign=links_page&amp;utm_content=finder_card"',
    )
    for (const asset of [sparkleLinksPage.headshot.src, ...sparkleLinksPage.cards.map((card) => card.logo.src)]) {
      expect(existsSync(join(process.cwd(), 'public', asset))).toBe(true)
    }
  })

  it('follows the wording rules', () => {
    const text = render().replace(/<[^>]+>/g, ' ').toLowerCase()
    for (const banned of ['trial', 'trade', 'sold', 'sale', 'free', 'founder', 'yoursparklesuite.com', 'live queue']) {
      expect(text).not.toContain(banned)
    }
    expect(text).toContain('dance floor swaps')
    expect(text).toContain('live lineup')
  })

  it('keeps Finder violet inside the Finder card only', async () => {
    const { readFileSync } = await import('node:fs')
    const css = readFileSync(join(process.cwd(), 'app/links/links.module.css'), 'utf8')
    const violetRules = css
      .split('}')
      .filter((rule) => rule.toLowerCase().includes('#5c0eff'))
      .map((rule) => rule.split('{')[0].replace(/\/\*[\s\S]*?\*\//g, '').trim())
    expect(violetRules.length).toBeGreaterThan(0)
    for (const selector of violetRules) expect(selector.startsWith('.finderCard')).toBe(true)
  })
})
