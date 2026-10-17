import { describe, expect, it } from 'vitest'

import { GET } from '@/app/llms.txt/route'

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

    await expect(localResponse.text()).resolves.toContain(
      'Canonical origin: https://www.yoursparklesuite.com',
    )
    await expect(previewResponse.text()).resolves.toContain(
      'Canonical origin: https://www.yoursparklesuite.com',
    )
  })
})
