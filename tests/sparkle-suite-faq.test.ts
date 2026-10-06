import { createElement } from 'react'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { metadata } from '@/app/faq/page'
import { FaqExperience } from '@/app/_components/faq-experience'
import { buildSparkleSuiteFaqJsonLd, sparkleSuiteFaqPlainText, sparkleSuiteFaqQuestions } from '@/lib/sparkle-suite/faq-page-content'

const renderFaq = () => renderToStaticMarkup(createElement(FaqExperience))

describe('Sparkle Suite marketing FAQ', () => {
  it('offers readable native answers, topic anchors, and current conversion paths', () => {
    const html = renderFaq()
    expect(html.match(/<details /g)).toHaveLength(sparkleSuiteFaqQuestions().length)
    expect(html.match(/ open=""/g)).toHaveLength(2)
    expect(html).toContain('aria-label="FAQ topics"')
    for (const href of ['/prelaunch#waitlist', '/portfolio', '/#watch', '#pricing', '#getting-started', '#your-site', '#show-tools']) {
      expect(html).toContain(`href="${href}"`)
    }
    expect(html).not.toContain('href="/demo"')
    expect(html).not.toContain('Ask Nic-Nac')
    expect(html).not.toContain('<form')
    expect(html).toContain('No payment when you join the queue.')
  })

  it('publishes FAQPage structured answers matching the visible copy', () => {
    const html = renderFaq()
    const markup = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? ''
    const parsed = JSON.parse(markup)
    expect(parsed).toEqual(buildSparkleSuiteFaqJsonLd())
    parsed.mainEntity.forEach((entity: { name: string; acceptedAnswer: { text: string } }, index: number) => {
      const question = sparkleSuiteFaqQuestions()[index]
      expect(entity.name).toBe(question.question)
      expect(entity.acceptedAnswer.text).toBe(sparkleSuiteFaqPlainText(question))
      expect(html).toContain(question.question)
    })
  })

  it('states the approved price and call sequence without a queue reservation or promised launch date', () => {
    const plain = sparkleSuiteFaqQuestions().map(sparkleSuiteFaqPlainText).join('\n')
    expect(plain).toContain('$49.99 a month for your first 12 paid months, then $74.99 a month')
    expect(plain).toContain('one-time $49.99 setup fee')
    expect(plain).toContain('$99.98')
    expect(plain).toContain('does not reserve founder pricing')
    expect(plain).toContain('quick 30-minute call')
    expect(plain).toContain('Your build starts once your first month and setup fee are paid.')
    expect(plain).toContain('Email and SMS updates are coming soon.')
    expect(plain).not.toMatch(/eligibility is confirmed at checkout|spots remaining|Bomb Party|Live queue|Ask Nic-Nac/i)
  })

  it('keeps canonical metadata and the customer FAQ compatibility route', () => {
    expect(metadata.alternates?.canonical).toBe('/faq')
    expect(metadata.description).not.toContain('Bomb Party')
    expect(existsSync(join(process.cwd(), 'app/faq/route.ts'))).toBe(false)
    const page = readFileSync(join(process.cwd(), 'app/faq/page.tsx'), 'utf8')
    expect(page).toContain('/internal/customer-faq-preview?c=')
    expect(page).toContain('encodeURIComponent(target)')
  })
})
