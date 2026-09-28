import { createElement } from 'react'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { metadata } from '@/app/demo/page'
import { DemoExperience } from '@/app/_components/demo-experience'
import { MarketingHeader } from '@/app/_components/landing-experience'
import {
  demoBlockedYouTubeIds,
  demoEmbedSrc,
  filterDemoEmbeds,
  isPublishableDemoEmbed,
  sparkleSuiteDemoCta,
  sparkleSuiteDemoEmbeds,
  sparkleSuiteDemoPortfolioLink,
  sparkleSuiteDemoStories,
  sparkleSuitePublicDemoEmbeds,
  type DemoEmbed,
} from '@/lib/sparkle-suite/demo-page-content'
import { sparkleSuitePublicLandingContent, sparkleSuitePublicLandingSafety } from '@/lib/sparkle-suite/public-landing-content'
import { buildSparkleSitemap } from '@/lib/seo/sparkle-crawl'

function renderDemo() {
  return renderToStaticMarkup(createElement(DemoExperience))
}

describe('Sparkle Suite demo page', () => {
  it('points the build-queue action at the existing waitlist and links the portfolio', () => {
    expect(sparkleSuiteDemoCta).toMatchObject({
      label: 'Join the build queue',
      href: '/prelaunch#waitlist',
    })
    expect(sparkleSuiteDemoCta.href).toBe(sparkleSuitePublicLandingContent.hero.primaryCta.href)
    expect(sparkleSuiteDemoPortfolioLink).toEqual({
      label: 'See the work',
      href: '/portfolio',
    })
  })

  it('replaces Demo soon with a real Demo link and marks the page current', () => {
    const html = renderDemo()
    const home = renderToStaticMarkup(createElement(MarketingHeader))
    const portfolio = renderToStaticMarkup(createElement(MarketingHeader, { current: 'portfolio' }))

    expect(html).toContain('href="/demo"')
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('>Demo<')
    expect(html).toContain('href="/"')
    expect(html).toContain('href="/portfolio"')
    expect(html).toContain('href="#featured"')
    expect(html).not.toContain('Demo soon')
    expect(home).toContain('href="/demo"')
    expect(home).not.toContain('Demo soon')
    expect(home).not.toContain('aria-current="page"')
    expect(portfolio).toContain('href="/demo"')
    expect(portfolio).toContain('href="/portfolio"')
    expect(portfolio).not.toContain('Demo soon')
  })

  it('renders the night-to-paper demo chapters with real stills and no invented players', () => {
    const html = renderDemo()
    const bands = [...html.matchAll(/data-band="([^"]+)"/g)].map((match) => match[1])

    expect(bands).toEqual(['night', 'paper', 'blush', 'ink', 'night'])
    expect(html).toContain('See the Suite in')
    expect(html).toContain('motion.')
    expect(html).toContain('Mid-show trades, without the pileup.')
    expect(html).toContain('A lineup customers can actually find.')
    expect(html).toContain('The next live, already on the calendar.')
    expect(html).toContain('All')
    expect(html).toContain('Site looks')
    expect(html).toContain('Show tools')
    expect(html).toContain('Tours')
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('No public clip in this set yet.')
    expect(html).toContain('href="https://www.youtube.com/@SparkleSuite"')
    expect(html).toContain(sparkleSuitePublicLandingSafety.disclaimer)
    expect(html).not.toContain('<iframe')
    expect(html).not.toContain('youtube-nocookie.com')
    expect(html).not.toContain('tiktok.com')
    expect(html).not.toContain('<span></span><span></span><span></span>')
    expect(html).not.toContain('Workspace')
    expect(html).not.toContain('backend')
    expect(html).not.toContain('Nic-Nac')
    expect(html).not.toContain('unlisted')

    for (const story of sparkleSuiteDemoStories) {
      expect(existsSync(join(process.cwd(), 'public', ...story.image.src.split('/').filter(Boolean)))).toBe(true)
      expect(html).toContain(story.image.alt)
    }
  })

  it('keeps the Option D palette and refuses unlisted or factory clips', () => {
    const css = readFileSync(join(process.cwd(), 'app/_components/demo-experience.module.css'), 'utf8')
    const experience = readFileSync(join(process.cwd(), 'app/_components/demo-experience.tsx'), 'utf8')
    const grid = readFileSync(join(process.cwd(), 'app/_components/demo-clip-grid.tsx'), 'utf8')

    expect(css).toContain('#fcf8f6')
    expect(css).toContain('#fff6fa')
    expect(css).toContain('#f3e4ec')
    expect(css).toContain('#402924')
    expect(css).toContain('#1b1218')
    expect(css).toContain('#ee2c9b')
    expect(css).toContain('overflow-x: clip')
    expect(css).toContain('prefers-reduced-motion')
    expect(experience).not.toContain('setInterval')
    expect(grid).not.toContain('setInterval')
    expect(sparkleSuiteDemoEmbeds).toEqual([])
    expect(sparkleSuitePublicDemoEmbeds).toEqual([])
    expect(metadata.title).toEqual({ absolute: 'Sparkle Suite Demo' })
    expect(metadata.alternates?.canonical).toBe('/demo')
    expect(buildSparkleSitemap().some((entry) => entry.url.endsWith('/demo'))).toBe(true)

    const blocked = {
      id: 'blocked',
      platform: 'youtube',
      title: 'Live Calendar Demo',
      summary: 'A public-looking title that is still a blocked id.',
      tags: ['show-tools'],
      videoId: demoBlockedYouTubeIds[1],
      url: `https://www.youtube.com/watch?v=${demoBlockedYouTubeIds[1]}`,
      privacy: 'public',
      role: 'featured',
    } as const satisfies DemoEmbed
    const unlisted = {
      ...blocked,
      videoId: 'abcdefghijk',
      url: 'https://www.youtube.com/watch?v=abcdefghijk&feature=unlisted',
    } as const satisfies DemoEmbed
    const factory = {
      ...blocked,
      title: 'How the Workspace fits together',
      videoId: 'abcdefghijk',
      url: 'https://www.youtube.com/watch?v=abcdefghijk',
    } as const satisfies DemoEmbed
    const listed = {
      id: 'listed',
      platform: 'youtube',
      title: 'A customer site walk-through',
      summary: 'Shopper-level look at the show site.',
      tags: ['site-looks'],
      videoId: 'abcdefghijk',
      url: 'https://www.youtube.com/watch?v=abcdefghijk',
      privacy: 'public',
      role: 'clip',
    } as const satisfies DemoEmbed

    expect(isPublishableDemoEmbed(blocked)).toBe(false)
    expect(isPublishableDemoEmbed(unlisted)).toBe(false)
    expect(isPublishableDemoEmbed(factory)).toBe(false)
    expect(isPublishableDemoEmbed(listed)).toBe(true)
    expect(demoEmbedSrc(listed)).toBe('https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0')
    expect(filterDemoEmbeds([listed, blocked], 'site-looks')).toEqual([listed])
    expect(filterDemoEmbeds([listed], 'tours')).toEqual([])
    for (const id of demoBlockedYouTubeIds) {
      expect(readFileSync(join(process.cwd(), 'lib/sparkle-suite/demo-page-content.ts'), 'utf8')).toContain(id)
      expect(renderDemo()).not.toContain(id)
    }
  })
})
