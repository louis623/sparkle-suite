import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { skinsOfferedToRep } from '@/lib/amethyst/skin-offer'
import {
  inlinePreviewMediaIcons,
  previewNeedsProductionImages,
  sitePreviewContentSecurityPolicy,
  stripPreviewProductionIcons,
} from '@/lib/amethyst/site-preview'

describe('private theme offer', () => {
  const catalog = [
    { skin_id: 'alpine_opal', visibility: 'private', owner_rep_id: 'lindsey-rep' },
    { skin_id: 'amethyst', visibility: 'community', owner_rep_id: null },
  ]

  it('offers a private theme only to its owner', () => {
    expect(skinsOfferedToRep({
      repId: 'reviewer-rep',
      availableIds: ['amethyst', 'alpine_opal'],
      catalog,
    })).toEqual({ skinIds: ['amethyst'], ownedPrivateSkinIds: [] })
    expect(skinsOfferedToRep({
      repId: 'lindsey-rep',
      availableIds: ['amethyst', 'alpine_opal'],
      catalog,
    })).toEqual({ skinIds: ['amethyst', 'alpine_opal'], ownedPrivateSkinIds: ['alpine_opal'] })
    expect(skinsOfferedToRep({
      repId: 'reviewer-rep',
      availableIds: ['amethyst', 'alpine_opal'],
      catalog: [{ skin_id: 'amethyst', visibility: 'community', owner_rep_id: null }],
    })).toEqual({ skinIds: ['amethyst'], ownedPrivateSkinIds: [] })
    expect(skinsOfferedToRep({
      repId: 'reviewer-rep',
      availableIds: ['alpine_opal'],
      catalog: [{ skin_id: 'alpine_opal', visibility: 'community', owner_rep_id: null }],
    })).toEqual({ skinIds: [], ownedPrivateSkinIds: [] })
  })
})

describe('theme preview assets', () => {
  it('inlines the media sprite and allows only the production image origin that the page uses', () => {
    const html = '<html><body><svg><use href="/amethyst/media-icons.svg#video" /></svg><img src="https://www.yoursparklesuite.com/amethyst/skins/icon.png" alt=""></body></html>'
    const inlined = inlinePreviewMediaIcons(html)
    expect(inlined).not.toContain('/amethyst/media-icons.svg')
    expect(inlined).toContain('href="#preview-media-icon-video"')
    expect(inlined).toContain('id="preview-media-icon-video"')
    const scripted = inlinePreviewMediaIcons(
      '<html><head><link rel="icon" href="https://www.yoursparklesuite.com/icon" /><link rel="apple-touch-icon" href="https://www.yoursparklesuite.com/apple-icon" /></head><body><script>node.setAttribute("href","/amethyst/media-icons.svg#calendar")</script></body></html>',
    )
    expect(scripted).toContain('#preview-media-icon-calendar')
    expect(scripted).not.toContain('/amethyst/media-icons.svg')
    expect(scripted).not.toContain('yoursparklesuite.com/icon')
    expect(scripted).not.toContain('apple-icon')
    expect(stripPreviewProductionIcons('<link rel="stylesheet" href="https://fonts.googleapis.com/css2">')).toContain('stylesheet')
    const policy = sitePreviewContentSecurityPolicy(inlined, 'https://sparkle-suite-smoke.vercel.app')
    expect(policy.header).toContain('img-src https://sparkle-suite-smoke.vercel.app data: blob: https://www.yoursparklesuite.com')
    expect(policy.header).not.toMatch(/(?:^|;)\s*\*\s*(?:;|$)/)
    const plain = sitePreviewContentSecurityPolicy('<html><body><p>Preview</p></body></html>', 'https://sparkle-suite-smoke.vercel.app')
    expect(previewNeedsProductionImages('<p>Preview</p>')).toBe(false)
    expect(plain.header).not.toContain('https://www.yoursparklesuite.com')
  })
})

describe('save bar layout', () => {
  it('keeps the publish label on one line and pads the workspace scroller by the bar', () => {
    expect(readFileSync('app/nic-nac/components/SiteSaveBar.module.css', 'utf8')).toContain('white-space: nowrap')
    expect(readFileSync('app/nic-nac/components/WorkspaceShell.module.css', 'utf8')).toContain('padding-bottom: var(--site-save-bar-block, 0px)')
    expect(readFileSync('app/nic-nac/components/SiteSaveBar.tsx', 'utf8')).toContain('prefers-reduced-motion: reduce')
  })
})
