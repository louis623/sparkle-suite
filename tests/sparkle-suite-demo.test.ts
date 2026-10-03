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
  gridDemoEmbeds,
  isPublishableDemoEmbed,
  sparkleSuiteDemoContent,
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

function pngSize(bytes: Buffer) {
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  expect(bytes.subarray(12, 16).toString('ascii')).toBe('IHDR')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
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
    expect(html).toContain('>Demos<')
    expect(html).toContain('href="/"')
    expect(html).toContain('href="/portfolio"')
    expect(html).toContain('href="#featured"')
    expect(html).not.toContain('Demo soon')
    expect(home).toContain('href="/demo"')
    expect(home).toContain('>Demos<')
    expect(home).not.toContain('>Demo<')
    expect(home).not.toContain('Your site')
    expect(home).not.toContain('Show tools')
    expect(home).not.toContain('Founding offer')
    expect(home).not.toContain('Demo soon')
    expect(home).not.toContain('aria-current="page"')
    expect(portfolio).toContain('href="/demo"')
    expect(portfolio).toContain('>Demos<')
    expect(portfolio).toContain('href="/portfolio"')
    expect(portfolio).not.toContain('Demo soon')
  })

  it('renders the night-to-paper demo chapters with real stills and no invented players', () => {
    const html = renderDemo()
    const bands = [...html.matchAll(/data-band="([^"]+)"/g)].map((match) => match[1])

    expect(bands).toEqual(['night', 'paper', 'ink', 'night'])
    expect(html).toContain('See the Suite in')
    expect(html).toContain('motion.')
    expect(html).toContain('Mid-show trades, without the pileup.')
    expect(html).toContain('A lineup customers can actually find.')
    expect(html).toContain('The next live, already on the calendar.')
    expect(html).not.toContain('href="#clips"')
    expect(html).not.toContain('id="clips"')
    expect(html).toContain('Pick a theme. Change it when the night should feel new.')
    expect(html).toContain('href="https://www.youtube.com/@SparkleSuite"')
    expect(html).toContain('href="https://www.tiktok.com/@yoursparklesuite.com"')
    expect(html).toContain('aria-label="Sparkle Suite on TikTok"')
    expect(html).toContain('aria-label="Sparkle Suite on YouTube"')
    expect(html).toContain('aria-label="Sparkle Suite channels"')
    expect(html).toMatch(
      /data-variant="hero"[\s\S]*?src="https:\/\/www\.tiktok\.com\/embed\/v2\/7684058046800071966"/,
    )
    expect(html.match(/tiktok\.com\/embed\/v2\/\d+/g)).toEqual([
      'tiktok.com/embed/v2/7684058046800071966',
    ])
    expect(html).not.toContain('src="https://www.tiktok.com/@yoursparklesuite.com"')
    expect(html).not.toContain('src="https://www.youtube.com/@SparkleSuite"')
    expect(html).toContain(sparkleSuitePublicLandingSafety.disclaimer)
    expect(html).toContain('<iframe')
    expect(html).not.toContain('youtube-nocookie.com')
    expect(html).not.toContain('https://www.tiktok.com/@sparklesuite/video')
    expect(html).not.toContain('<span></span><span></span><span></span>')
    expect(html).not.toContain('Workspace')
    expect(html).not.toContain('backend')
    expect(html).not.toContain('Nic-Nac')
    expect(html).not.toContain('unlisted')

    for (const story of sparkleSuiteDemoStories) {
      const file = join(process.cwd(), 'public', ...story.image.src.split('/').filter(Boolean))
      expect(existsSync(file)).toBe(true)
      expect(html).toContain(story.image.alt)
      if (story.image.src.endsWith('.png')) {
        const size = pngSize(readFileSync(file))
        expect(size).toEqual({ width: story.image.width, height: story.image.height })
      }
    }

    const [danceFloor, liveLineup, liveCalendar] = sparkleSuiteDemoStories
    expect(danceFloor.image.src).toBe('/sparkle-suite/landing/dance-floor-garnet-v2.webp')
    expect(liveLineup.eyebrow).toBe('Live Lineup')
    expect(liveLineup.image.src).toBe('/sparkle-suite/landing/demo-live-lineup-v1.png')
    expect(liveLineup.image.alt).toContain('Live Lineup')
    expect(liveLineup.image.alt.toLowerCase()).not.toContain('homepage')
    expect(liveLineup.image.alt.toLowerCase()).not.toContain('calendar')
    expect(liveCalendar.eyebrow).toBe('Live calendar')
    expect(liveCalendar.image.src).toBe('/sparkle-suite/landing/demo-live-calendar-v1.png')
    expect(liveCalendar.image.alt).toContain('Upcoming Shows')
    expect(liveLineup.image.src).not.toBe(liveCalendar.image.src)
    expect(html).toContain('>Live Lineup<')
    expect(html).not.toContain('jane-customer-home-mobile.png')
    expect(html).not.toContain('calendar-emerald-garden-v2.webp')
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
    expect(sparkleSuiteDemoEmbeds.map((embed) => embed.videoId)).toEqual(['7684058046800071966'])
    expect(sparkleSuiteDemoEmbeds.find((embed) => embed.role === 'featured')?.videoId).toBe(
      '7684058046800071966',
    )
    expect(gridDemoEmbeds()).toEqual([])
    expect(sparkleSuitePublicDemoEmbeds).toHaveLength(sparkleSuiteDemoEmbeds.length)
    expect(sparkleSuiteDemoEmbeds.every((embed) => embed.platform === 'tiktok' && embed.privacy === 'public')).toBe(true)
    expect(sparkleSuiteDemoEmbeds.every((embed) => embed.url === `https://www.tiktok.com/@yoursparklesuite.com/video/${embed.videoId}`)).toBe(true)
    expect(sparkleSuiteDemoEmbeds.filter((embed) => embed.role === 'featured')).toHaveLength(1)
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
    const otherTikTok = {
      id: 'wrong-account',
      platform: 'tiktok',
      title: 'A customer site walk-through',
      summary: 'A public clip from a different account.',
      tags: ['site-looks'],
      videoId: '7688536158795615518',
      url: 'https://www.tiktok.com/@sparklesuite/video/7688536158795615518',
      privacy: 'public',
      role: 'clip',
    } as const satisfies DemoEmbed

    expect(isPublishableDemoEmbed(listed)).toBe(true)
    expect(gridDemoEmbeds([listed])).toEqual([listed])
    expect(isPublishableDemoEmbed(otherTikTok)).toBe(false)
    expect(demoEmbedSrc(listed)).toBe('https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0')
    expect(filterDemoEmbeds([listed, blocked], 'site-looks')).toEqual([listed])
    expect(filterDemoEmbeds([listed], 'tours')).toEqual([])
    expect(filterDemoEmbeds(sparkleSuiteDemoEmbeds, 'tours')).toEqual([])
    expect(sparkleSuiteDemoContent.clips.empty).toContain('No public clip in this set yet.')
    for (const id of demoBlockedYouTubeIds) {
      expect(readFileSync(join(process.cwd(), 'lib/sparkle-suite/demo-page-content.ts'), 'utf8')).toContain(id)
      expect(renderDemo()).not.toContain(id)
    }
  })
})
