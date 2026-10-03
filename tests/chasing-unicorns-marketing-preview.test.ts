import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GET } from '@/app/marketing/chasing-unicorns/route'
import { buildChasingUnicornsMarketingDocument, CHASING_UNICORNS_PREVIEW } from '@/lib/sparkle-suite/chasing-unicorns-marketing-preview'

describe('Chasing Unicorns marketing homepage', () => {
  it('serves the full sample homepage with a muted loop instead of the product player', async () => {
    const product = readFileSync('public/amethyst/am01-unicorn.js', 'utf8')
    expect(product).toContain('Play again')
    expect(product).toContain('video.loop = false')
    expect(product).toContain('video.muted = false')

    const document = await buildChasingUnicornsMarketingDocument('https://sparkle-suite-smoke.vercel.app')
    expect(document).toContain('am01-unicorn.css')
    expect(document).toContain('data-appearance-preset')
    expect(document).toContain('Browse the dance floor')
    expect(document).toContain('Sparkle by Sasha')
    expect(document).toContain('hero-motion.mp4')
    expect(document).toContain('hero-poster.webp')
    expect(document).toContain('video.loop = true')
    expect(document).toContain('video.muted = true')
    expect(document).toContain('prefers-reduced-motion:reduce')
    expect(document).not.toContain('Play again')
    expect(document).not.toContain('function amethystUnicorn')
    expect(document).not.toContain('video.loop = false')
    expect(document).toContain('hp-header')
    expect(document).toContain('hp-hero')

    const response = await GET(new Request('https://sparkle-suite-smoke.vercel.app/marketing/chasing-unicorns'))
    expect(response.status).toBe(200)
    expect(response.headers.get('X-Robots-Tag')).toBe('noindex, nofollow')
    expect(response.headers.get('Content-Security-Policy')).toContain('media-src https://sparkle-suite-smoke.vercel.app/amethyst/skins/am01-unicorn/')
    expect(response.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'self'")
    expect(await response.text()).toContain('hero-motion.mp4')
    expect(CHASING_UNICORNS_PREVIEW).toEqual({ width: 1200, height: 1260 })
  })
})