import { describe, expect, it } from 'vitest'
import { buildSkinPreviewDocument, renderSkinPreview, SKIN_PREVIEW_SKINS, skinPreviewMediaSource, resolveLineupReviewState } from '@/lib/amethyst/skin-preview'

describe('Rose Champagne sample theme review', () => {
  it('supplies the real media glyphs inside the opaque RG-04 preview without relaxing isolation', async () => {
    const doc = await buildSkinPreviewDocument('rose_champagne', 'homepage', 'https://sparkle-suite-smoke.vercel.app')
    expect(doc.includes('<svg id="rgc-preview-media-symbols"')).toBe(true)
    for (const name of ['video', 'camera', 'shopping-bag', 'gift', 'sparkles', 'facebook', 'tiktok', 'youtube', 'instagram']) {
      expect(doc.includes(`id="rgc-preview-icon-${name}"`)).toBe(true)
    }
    expect(doc).toContain('stroke="currentColor"')
    expect(doc.includes('<use data-preview-icon={name} />')).toBe(true)
    expect(doc.includes('<use href={`/amethyst/media-icons.svg#${name}`} />')).toBe(false)
    expect(doc).toContain("connect-src 'none'")
    const outer = await renderSkinPreview('rose_champagne', 'homepage', 'https://sparkle-suite-smoke.vercel.app')
    expect(outer).not.toContain('allow-same-origin')
  })
  it('does not add RG-04 icon definitions to other themes or unrelated customer pages', async () => {
    for (const [skin, page] of [['amethyst', 'homepage'], ['gnome_garden', 'homepage'], ['rose_champagne', 'trade'], ['rose_champagne', 'join'], ['rose_champagne', 'unsubscribe']] as const) {
      expect(await buildSkinPreviewDocument(skin, page, 'https://sparkle-suite-smoke.vercel.app')).not.toContain('<svg id="rgc-preview-media-symbols"')
    }
  })
  it('allows RG-04 and only its own hosted video inside the opaque sandbox', async () => {
    const origin = 'https://sparkle-suite-smoke.vercel.app'
    expect(SKIN_PREVIEW_SKINS).toContain('rose_champagne')
    expect(skinPreviewMediaSource('rose_champagne', origin)).toBe(origin + '/amethyst/skins/rose-champagne/')
    const doc = await buildSkinPreviewDocument('rose_champagne', 'homepage', origin)
    expect(doc).toContain('rose-champagne.css')
    expect(doc).toContain('hero-loop.mp4')
    expect(doc).not.toMatch(/<script[^>]+src="[^"]*rose-champagne\.js/)
    expect(doc).toContain("connect-src 'none'"); expect(doc).toContain("form-action 'none'")
    expect(doc).toContain('noindex,nofollow')
    expect(doc).toContain('Real jewelry. Live reveals. Pure sparkle.')
    expect(doc).toContain('Sample'); expect(doc).toContain('Sparkle by Sasha')
    expect(doc).toContain('halloween_pumpkin_cat|gilded_autumn|rose_gold')
    const outer = await renderSkinPreview('rose_champagne', 'homepage', origin)
    expect(outer).toContain('Rose Champagne'); expect(outer).toContain('Theme preview · Sample content')
    expect(outer).toContain('sandbox="allow-scripts"'); expect(outer).not.toContain('allow-same-origin')
  })
  it.each(['trade', 'join', 'unsubscribe'] as const)('retains real %s renderer and sample branding', async page => {
    const doc = await buildSkinPreviewDocument('rose_champagne', page, 'https://sparkle-suite-smoke.vercel.app')
    expect(doc).toContain('rose-champagne.css'); expect(doc).toContain('Sparkle by Sasha')
    expect(doc).toContain("form-action 'none'"); expect(doc).toContain('Uploads are unavailable in this sample preview')
  })
  it('does not enable lineup review controls with production configuration', () => {
    const url = new URL('https://www.yoursparklesuite.com/skin-preview/rose_champagne/homepage?lineupReview=delayed')
    expect(resolveLineupReviewState(url.href, { SPARKLE_ENVIRONMENT: 'production', NEXT_PUBLIC_SPARKLE_ENVIRONMENT: 'production' })).toBeNull()
    expect(resolveLineupReviewState(url.href, { SPARKLE_ENVIRONMENT: 'smoke', NEXT_PUBLIC_SPARKLE_ENVIRONMENT: 'production' })).toBeNull()
    expect(resolveLineupReviewState(url.href, { SPARKLE_ENVIRONMENT: 'smoke', NEXT_PUBLIC_SPARKLE_ENVIRONMENT: 'smoke' })).toBe('delayed')
  })
})
