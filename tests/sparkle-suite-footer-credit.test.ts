import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  SPARKLE_SUITE_MARKETING_URL,
  SPARKLE_SUITE_POWERED_BY_LABEL,
  renderSparkleSuitePoweredByLinkHtml,
} from '@/lib/amethyst/sparkle-suite-footer-credit'

const root = process.cwd()

function read(path: string) {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('Sparkle Suite footer credit', () => {
  it('links the powered-by phrase to the marketing site in a new tab', () => {
    const html = renderSparkleSuitePoweredByLinkHtml()
    expect(html).toContain(`href="${SPARKLE_SUITE_MARKETING_URL}"`)
    expect(html).toContain('This site&#39;s powered by Sparkle Suite')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noreferrer noopener"')
    expect(html).toContain('aria-label="This site&#39;s powered by Sparkle Suite (opens in a new tab)"')
    expect(html).toContain('class="ss-powered-by"')
  })

  it('uses one browser credit on every public customer footer', () => {
    const script = read('public/amethyst/sparkle-suite-footer-credit.js')
    const pages = [
      'public/amethyst/homepage.jsx',
      'public/amethyst/trade.jsx',
      'public/amethyst/join.jsx',
      'public/amethyst/unsubscribe.jsx',
    ]
    const htmlPages = [
      'public/amethyst/Homepage.html',
      'public/amethyst/Trade.html',
      'public/amethyst/Join.html',
      'public/amethyst/Unsubscribe.html',
    ]

    expect(script).toContain(SPARKLE_SUITE_MARKETING_URL)
    expect(script).toContain(SPARKLE_SUITE_POWERED_BY_LABEL)
    expect(script).toContain('window.SparkleSuiteFooterCredit = SparkleSuiteFooterCredit')
    expect(read('components/amethyst/site-shell.tsx')).toContain('<SparkleSuiteFooterCredit />')
    expect(read('lib/amethyst/public-asset-response.ts')).toContain("'sparkle-suite-footer-credit.js'")

    for (const page of pages) {
      const source = read(page)
      expect(source).toContain('<window.SparkleSuiteFooterCredit />')
      expect(source).not.toContain('Powered by Sparkle Suite')
    }

    for (const page of htmlPages) {
      expect(read(page)).toContain('sparkle-suite-footer-credit.js?v=20260927-powered-by')
    }
  })

  it('keeps the copyright line and only links the powered-by phrase', () => {
    expect(read('public/amethyst/homepage.jsx')).toContain(
      '© 2026 {businessName} · <window.SparkleSuiteFooterCredit />',
    )
    expect(read('public/amethyst/trade.jsx')).toContain(
      '&copy; 2026 {businessName} - <window.SparkleSuiteFooterCredit />',
    )
    expect(read('public/amethyst/join.jsx')).toContain(
      '© {year} {businessName} · <window.SparkleSuiteFooterCredit />',
    )
    expect(read('public/amethyst/unsubscribe.jsx')).toContain(
      '© 2026 {BUSINESS_NAME} · <window.SparkleSuiteFooterCredit />',
    )
    expect(read('components/amethyst/site-shell.tsx')).toContain(
      '© {year} {content.businessName} · <SparkleSuiteFooterCredit />',
    )
    expect(read('lib/amethyst/customer-faq.ts')).toContain(
      'renderSparkleSuitePoweredByLinkHtml()',
    )
    expect(read('public/amethyst/join-runtime.js')).toContain('window.SparkleSuiteFooterCredit')
  })
})
