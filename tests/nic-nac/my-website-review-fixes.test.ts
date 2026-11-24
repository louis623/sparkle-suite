import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { skinsOfferedToRep } from '@/lib/amethyst/skin-offer'
import {
  inlinePreviewMediaIcons,
  previewNeedsProductionImages,
  sitePreviewContentSecurityPolicy,
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
  })
})

describe('theme preview assets', () => {
  it('inlines the media sprite and allows only the production image origin that the page uses', () => {
    const html = '<html><body><svg><use href="/amethyst/media-icons.svg#video" /></svg><img src="https://www.yoursparklesuite.com/amethyst/skins/icon.png" alt=""></body></html>'
    const inlined = inlinePreviewMediaIcons(html)
    expect(inlined).not.toContain('/amethyst/media-icons.svg')
    expect(inlined).toContain('href="#preview-media-icon-video"')
    expect(inlined).toContain('id="preview-media-icon-video"')
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
