import { createElement } from 'react'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { metadata } from '@/app/faq/page'
import { FaqExperience } from '@/app/_components/faq-experience'
import { MarketingFooter, MarketingHeader } from '@/app/_components/landing-experience'
import { SparkleSuitePublicLanding } from '@/app/_components/sparkle-suite-public-landing'
import { SparkleSuitePublicFooter } from '@/app/_components/sparkle-suite-public-chrome'
import {
  buildSparkleSuiteFaqJsonLd,
  sparkleSuiteFaqCta,
  sparkleSuiteFaqGroups,
  sparkleSuiteFaqPlainText,
  sparkleSuiteFaqQuestions,
} from '@/lib/sparkle-suite/faq-page-content'
import { sparkleSuitePublicLandingContent, sparkleSuitePublicLandingSafety } from '@/lib/sparkle-suite/public-landing-content'
import { buildSparkleSitemap } from '@/lib/seo/sparkle-crawl'

function renderFaq() {
  return renderToStaticMarkup(createElement(FaqExperience))
}

describe('Sparkle Suite marketing FAQ', () => {
  it('keeps the build queue, portfolio, and demo on the existing public paths', () => {
    expect(sparkleSuiteFaqCta).toMatchObject({
      label: 'Join the build queue',
      href: '/prelaunch#waitlist',
    })
    expect(sparkleSuiteFaqCta.href).toBe(sparkleSuitePublicLandingContent.hero.primaryCta.href)
    expect(sparkleSuiteFaqQuestions()).toHaveLength(16)
    expect(sparkleSuiteFaqGroups.map((group) => group.label)).toEqual([
      'Pricing',
      'Included',
      'Independence',
      'Domains',
      'Mobile',
      'Updates',
      'Getting started',
    ])
  })

  it('renders grouped answers, footer FAQ, and no primary-nav FAQ', () => {
    const html = renderFaq()
    const header = renderToStaticMarkup(createElement(MarketingHeader, { current: 'faq' }))
    const footer = renderToStaticMarkup(createElement(MarketingFooter, { current: 'faq' }))
    const homeFooter = renderToStaticMarkup(createElement(MarketingFooter))
    const chromeFooter = renderToStaticMarkup(createElement(SparkleSuitePublicFooter))
    const landing = renderToStaticMarkup(createElement(SparkleSuitePublicLanding))
    const explore = header.match(/aria-label="Explore Sparkle Suite">([\s\S]*?)<\/nav>/)?.[1] ?? ''
    const bands = [...html.matchAll(/data-band="([^"]+)"/g)].map((match) => match[1])

    expect(bands).toEqual(['night', 'paper', 'paper', 'blush', 'ink', 'night'])
    expect(html.match(/<details /g)).toHaveLength(16)
    expect(explore).toContain('>Home<')
    expect(explore).toContain('>Portfolio<')
    expect(explore).toContain('>Demo<')
    expect(explore).not.toContain('href="/faq"')
    expect(explore).not.toContain('>FAQ<')
    expect(explore).not.toContain('#customer-site-proof')
    expect(footer).toContain('href="/faq"')
    expect(footer).toContain('>FAQ<')
    expect(footer).toContain('aria-current="page"')
    expect(homeFooter).toContain('href="/faq"')
    expect(homeFooter).not.toContain('aria-current="page"')
    expect(chromeFooter).toContain('href="/faq"')
    expect(chromeFooter).toContain('>FAQ<')
    expect(html).toContain('Answers for reps who want')
    expect(html).toContain('the full story.')
    expect(html).toContain('href="/prelaunch#waitlist"')
    expect(html).toContain('href="/portfolio"')
    expect(html).toContain('href="/demo"')
    expect(html).toContain('Ask Nic-Nac')
    expect(html).toContain('You still follow the guidelines your company gives you.')
    expect(html.match(new RegExp(sparkleSuitePublicLandingSafety.disclaimer, 'g'))?.length).toBeGreaterThanOrEqual(2)
    expect(landing).toContain('More answers')
    expect(landing).toContain('href="/faq"')
    expect(landing.match(/<details>/g)).toHaveLength(6)
    expect(landing).not.toContain('How much does Sparkle Suite cost?')
    expect(landing).not.toContain('FAQPage')

    for (const question of sparkleSuiteFaqQuestions()) {
      expect(html).toContain(question.question)
      for (const paragraph of question.paragraphs) {
        for (const run of paragraph) {
          expect(html).toContain(typeof run === 'string' ? run : run.label)
        }
      }
    }
  })

  it('publishes FAQPage JSON-LD that matches the visible questions', () => {
    const html = renderFaq()
    const jsonLd = buildSparkleSuiteFaqJsonLd()
    const markup = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? ''
    const parsed = JSON.parse(markup.replace(/\\u003c/g, '<'))

    expect(jsonLd['@type']).toBe('FAQPage')
    expect(parsed).toEqual(jsonLd)
    expect(parsed.mainEntity).toHaveLength(16)
    expect(parsed.mainEntity.map((entity: { name: string; acceptedAnswer: { text: string } }) => entity.name)).toEqual(
      sparkleSuiteFaqQuestions().map((question) => question.question),
    )
    parsed.mainEntity.forEach((entity: { name: string; acceptedAnswer: { text: string } }, index: number) => {
      expect(entity.acceptedAnswer.text).toBe(sparkleSuiteFaqPlainText(sparkleSuiteFaqQuestions()[index]))
      expect(entity.acceptedAnswer.text.length).toBeGreaterThan(80)
    })
    expect(metadata.title).toEqual({
      absolute: 'Sparkle Suite FAQ — Pricing, Setup & Live-Show Tools',
    })
    expect(metadata.alternates?.canonical).toBe('/faq')
    expect(metadata.description).toContain('not affiliated with Bomb Party')
    expect(buildSparkleSitemap().some((entry) => entry.url.endsWith('/faq') && entry.priority === 0.8)).toBe(true)
    expect(readFileSync(join(process.cwd(), 'app/page.tsx'), 'utf8')).not.toContain('FAQPage')
    expect(existsSync(join(process.cwd(), 'app/faq/route.ts'))).toBe(false)
    expect(readFileSync(join(process.cwd(), 'app/internal/customer-faq-preview/route.ts'), 'utf8')).toContain(
      'renderCustomerFaq',
    )
  })

  it('keeps the Option D palette and refuses scarcity, factory, and support-desk copy', () => {
    const html = renderFaq()
    const css = readFileSync(join(process.cwd(), 'app/_components/faq-experience.module.css'), 'utf8')
    const plain = sparkleSuiteFaqQuestions().map(sparkleSuiteFaqPlainText).join('\n')

    expect(css).toContain('#fcf8f6')
    expect(css).toContain('#fff6fa')
    expect(css).toContain('#f3e4ec')
    expect(css).toContain('#402924')
    expect(css).toContain('#1b1218')
    expect(css).toContain('#ee2c9b')
    expect(css).toContain('overflow-x: clip')
    expect(css).toContain('prefers-reduced-motion')
    expect(html).not.toContain('<span></span><span></span><span></span>')
    for (const blocked of [
      'spots remaining',
      'spots left',
      'only 3',
      'unlisted',
      'Workspace',
      'backend',
      'official partner',
      'Help Center',
      'Intercom',
      'countdown',
    ]) {
      expect(plain).not.toContain(blocked)
      expect(html).not.toContain(blocked)
    }
    expect(plain).toContain('Joining the build queue does not reserve a founder rate')
    expect(plain).toContain('There is no public date.')
    expect(plain).not.toMatch(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/)
  })
})
