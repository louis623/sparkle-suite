import { describe, expect, it } from 'vitest'
import { buildSkinPreviewDocument, renderSkinPreview, SKIN_PREVIEW_SKINS, skinPreviewMediaSource, resolveLineupReviewState } from '@/lib/amethyst/skin-preview'

describe('Rose Champagne sample theme review', () => {
  it('allows RG-01 and only its own hosted video inside the opaque sandbox', async () => {
    const origin = 'https://sparkle-suite-smoke.vercel.app'
    expect(SKIN_PREVIEW_SKINS).toContain('rose_gold')
    expect(skinPreviewMediaSource('rose_gold', origin)).toBe(origin + '/amethyst/skins/rose-champagne/')
    const doc = await buildSkinPreviewDocument('rose_gold', 'homepage', origin)
    expect(doc).toContain('rose-champagne.css')
    expect(doc).toContain('hero-loop.mp4')
    expect(doc).not.toMatch(/<script[^>]+src="[^"]*rose-champagne\.js/)
    expect(doc).toContain("connect-src 'none'"); expect(doc).toContain("form-action 'none'")
    expect(doc).toContain('noindex,nofollow')
    expect(doc).toContain('Real jewelry. Live reveals. Pure sparkle.')
    expect(doc).toContain('Sample'); expect(doc).toContain('Sparkle by Sasha')
    expect(doc).toContain('halloween_pumpkin_cat|gilded_autumn|rose_gold')
    const outer = await renderSkinPreview('rose_gold', 'homepage', origin)
    expect(outer).toContain('Rose Champagne'); expect(outer).toContain('Theme preview · Sample content')
    expect(outer).toContain('sandbox="allow-scripts"'); expect(outer).not.toContain('allow-same-origin')
  })
  it.each(['trade', 'join', 'unsubscribe'] as const)('retains real %s renderer and sample branding', async page => {
    const doc = await buildSkinPreviewDocument('rose_gold', page, 'https://sparkle-suite-smoke.vercel.app')
    expect(doc).toContain('rose-champagne.css'); expect(doc).toContain('Sparkle by Sasha')
    expect(doc).toContain("form-action 'none'"); expect(doc).toContain('Uploads are unavailable in this sample preview')
  })
  it('does not enable lineup review controls with production configuration', () => {
    const url = new URL('https://www.yoursparklesuite.com/skin-preview/rose_gold/homepage?lineupReview=delayed')
    expect(resolveLineupReviewState(url.href, { SPARKLE_ENVIRONMENT: 'production', NEXT_PUBLIC_SPARKLE_ENVIRONMENT: 'production' })).toBeNull()
    expect(resolveLineupReviewState(url.href, { SPARKLE_ENVIRONMENT: 'smoke', NEXT_PUBLIC_SPARKLE_ENVIRONMENT: 'production' })).toBeNull()
    expect(resolveLineupReviewState(url.href, { SPARKLE_ENVIRONMENT: 'smoke', NEXT_PUBLIC_SPARKLE_ENVIRONMENT: 'smoke' })).toBe('delayed')
  })
})
