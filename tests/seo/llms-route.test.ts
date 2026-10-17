import { describe, expect, it } from 'vitest'

import { sparkleMarketingDisclaimer } from '@/app/_components/sparkle-marketing-footer/SparkleMarketingFooter'
import { GET } from '@/app/llms.txt/route'
import { articleUrl, publishedArticles } from '@/lib/sparkle-suite/articles'

describe('GET /llms.txt', () => {
  it('returns 404 noindex for an unmapped custom host instead of demo or Suite text', async () => {
    const response = await GET(
      new Request('https://sparklebysasha.example/llms.txt'),
    )

    expect(response.status).toBe(404)
    expect(response.headers.get('x-robots-tag')).toContain('noindex')
    await expect(response.text()).resolves.not.toMatch(/Sasha|Jane|Sparkle Suite/)
  })

  it('keeps local and preview hosts on the default Sparkle Suite origin', async () => {
    const localResponse = await GET(
      new Request('http://localhost:3001/llms.txt'),
    )
    const previewResponse = await GET(
      new Request('https://sparkle-suite-git-wave-3.vercel.app/llms.txt'),
    )

    const localText = await localResponse.text()
    const previewText = await previewResponse.text()

    expect(localText).toContain('Canonical origin: https://www.yoursparklesuite.com')
    expect(previewText).toContain('Canonical origin: https://www.yoursparklesuite.com')
    for (const text of [localText, previewText]) {
      expect(text).not.toContain("Jane's Sparkle Party")
      expect(text).not.toContain('Rep: Jane')
      expect(text).not.toContain('/amethyst/')
      expect(text).not.toMatch(/\btrades?\b/i)
      expect(text).toContain(sparkleMarketingDisclaimer)
      expect(text).toContain('# Sparkle Suite')
      expect(text).toContain('Live Lineup')
      expect(text).toContain('Dance Floor')
      expect(text).toContain('Location: Jacksonville, FL')
      expect(text).toContain('https://www.yoursparklesuite.com/faq/articles')
      for (const article of publishedArticles()) {
        expect(text).toContain(`[${article.title}](${articleUrl(article)})`)
        expect(text).toContain(article.description)
      }
    }
  })
})
