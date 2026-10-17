import { describe, expect, it } from 'vitest'

import { sparkleMarketingDisclaimer } from '@/app/_components/sparkle-marketing-footer/SparkleMarketingFooter'
import {
  SPARKLE_AGENT_CONTENT_SIGNAL,
  buildDefaultSparkleLlmsText,
  buildSparkleLlmsText,
} from '@/lib/seo/llms'

describe('Sparkle Suite Markdown-for-agents builder', () => {
  it('exports the locked content-signal value for future llms.txt responses', () => {
    expect(SPARKLE_AGENT_CONTENT_SIGNAL).toBe(
      'ai-train=no, search=yes, ai-input=yes',
    )
  })

  it('builds concise per-rep public markdown from fixture content', () => {
    const markdown = buildSparkleLlmsText({
      origin: 'https://sparklebysasha.example/',
      businessName: 'Sparkle by Sasha',
      repName: 'Sasha Patel',
      repLocation: 'Chicago, Illinois',
      summary:
        'Sparkle by Sasha hosts live Bomb Party jewelry reveals and a customer dance floor.',
      publicPages: [
        { title: 'Home', path: '/amethyst/Homepage.html' },
        { title: 'Dance Floor', path: '/amethyst/Trade.html' },
        { title: 'Join Team', path: '/amethyst/Join.html' },
      ],
      liveShows: [
        {
          title: 'Unicorn Magic Drop',
          eventTime: '2099-11-12T20:00:00.000Z',
          url: 'https://www.tiktok.com/@sparklebysasha/live',
        },
      ],
      glossary: [
        {
          term: 'Live reveal',
          definition: 'A streamed jewelry opening where customers see pieces live.',
        },
      ],
    })

    expect(markdown).toContain('# Sparkle by Sasha')
    expect(markdown).toContain('Rep: Sasha Patel')
    expect(markdown).toContain('Location: Chicago, Illinois')
    expect(markdown).toContain(
      '- [Dance Floor](https://sparklebysasha.example/amethyst/Trade.html)',
    )
    expect(markdown).toContain(
      '- Unicorn Magic Drop: 2099-11-12T20:00:00.000Z',
    )
    expect(markdown).toContain('- Live reveal: A streamed jewelry opening')
    expect(markdown).not.toContain('undefined')
  })

  it('adds the FAQ index Bomb Party disclaimer to the Suite llms.txt file', () => {
    const markdown = buildDefaultSparkleLlmsText('https://www.yoursparklesuite.com')

    expect(sparkleMarketingDisclaimer).toBe(
      'Sparkle Suite is an independent tool for Reps and Collectors. We are not affiliated with, endorsed by, sponsored by, or officially connected to Bomb Party.',
    )
    expect(markdown).toContain(sparkleMarketingDisclaimer)
    expect(markdown).not.toMatch(/\bfirst 20\b|\b20 founding\b|\b20 founder\b|founder spots remaining|spots left/)
  })
})
