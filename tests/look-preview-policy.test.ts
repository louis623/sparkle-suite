import { describe, expect, it } from 'vitest'
import {
  LOOK_PREVIEW_DEBOUNCE_MS,
  LOOK_PREVIEW_FIELDS,
  applyLookPreviewFailure,
  assertAllowedLookPreviewUrl,
  buildLookPreviewCaptureUrl,
  isMissingLookPreviewTable,
  lookPreviewDelayElapsed,
  lookPreviewFingerprint,
  shouldQueueLookPreview,
} from '@/lib/look-preview/policy'

const saved = {
  appearancePreset: 'amethyst',
  customerSiteTemplate: 'amethyst',
  businessName: 'Sparkle by Sasha',
  displayName: 'Sasha',
  showJoinPage: true,
  tickerText: 'Tonight’s reveal',
  tickerVisible: true,
  bannerText: '',
  bannerVisible: false,
  danceFloorVisible: true,
  liveLineupVisible: true,
  heroHeadline: 'Real jewelry. Live reveals.',
  heroSubtitle: 'Come watch.',
  heroImageUrl: '',
  heroAnimationType: 'soft_glow',
  aboutNarrative: 'Her story.',
  signupDiscountCode: 'SASHA10',
  tagline: 'Live jewelry.',
}

describe('look preview policy', () => {
  it('recaptures only the top of the site', () => {
    expect(LOOK_PREVIEW_FIELDS).toEqual(expect.arrayContaining([
      'appearancePreset',
      'heroHeadline',
      'tickerText',
      'businessName',
      'danceFloorVisible',
      'liveLineupVisible',
    ]))
    expect(LOOK_PREVIEW_FIELDS).not.toContain('aboutNarrative')
    expect(LOOK_PREVIEW_FIELDS).not.toContain('signupDiscountCode')
    expect(LOOK_PREVIEW_FIELDS).not.toContain('tagline')
    const before = lookPreviewFingerprint(saved)
    expect(shouldQueueLookPreview(before, lookPreviewFingerprint(saved))).toBe(false)
    expect(shouldQueueLookPreview(before, lookPreviewFingerprint({ ...saved, aboutNarrative: 'Changed story' }))).toBe(false)
    expect(shouldQueueLookPreview(before, lookPreviewFingerprint({ ...saved, signupDiscountCode: 'NEW' }))).toBe(false)
    expect(shouldQueueLookPreview(before, lookPreviewFingerprint({ ...saved, heroHeadline: 'New headline' }))).toBe(true)
    expect(shouldQueueLookPreview(before, lookPreviewFingerprint({ ...saved, appearancePreset: 'silver_bells' }))).toBe(true)
    expect(shouldQueueLookPreview(before, lookPreviewFingerprint({ ...saved, tickerVisible: false }))).toBe(true)
    expect(shouldQueueLookPreview(before, lookPreviewFingerprint({ ...saved, danceFloorVisible: false }))).toBe(true)
    expect(shouldQueueLookPreview(null, before)).toBe(true)
  })

  it('waits eight seconds unless the Look editor closes', () => {
    const queuedAt = 1_000
    expect(lookPreviewDelayElapsed(queuedAt, queuedAt + LOOK_PREVIEW_DEBOUNCE_MS - 1, false)).toBe(false)
    expect(lookPreviewDelayElapsed(queuedAt, queuedAt + LOOK_PREVIEW_DEBOUNCE_MS, false)).toBe(true)
    expect(lookPreviewDelayElapsed(queuedAt, queuedAt + 10, true)).toBe(true)
  })

  it('builds only the public customer url for this environment', () => {
    expect(buildLookPreviewCaptureUrl({ slug: 'dudesfizzfest', smoke: true })).toBe(
      'https://sparkle-suite-smoke.vercel.app/dudesfizzfest',
    )
    expect(buildLookPreviewCaptureUrl({ slug: 'dudesfizzfest', smoke: false })).toBe(
      'https://www.yoursparklesuite.com/dudesfizzfest',
    )
    expect(buildLookPreviewCaptureUrl({
      slug: 'dudesfizzfest',
      smoke: false,
      customDomain: 'https://shows.example',
    })).toBe('https://shows.example/')
    expect(() => buildLookPreviewCaptureUrl({ slug: 'a', smoke: true })).toThrow(/slug/)
    expect(assertAllowedLookPreviewUrl(
      'https://sparkle-suite-smoke.vercel.app/dudesfizzfest',
      ['sparkle-suite-smoke.vercel.app'],
    )).toContain('dudesfizzfest')
    expect(() => assertAllowedLookPreviewUrl('https://evil.example/dudesfizzfest', ['sparkle-suite-smoke.vercel.app'])).toThrow(/blocked/)
    expect(() => assertAllowedLookPreviewUrl('http://sparkle-suite-smoke.vercel.app/dudesfizzfest', ['sparkle-suite-smoke.vercel.app'])).toThrow(/blocked/)
  })

  it('keeps the previous shot when a capture fails', () => {
    const failed = applyLookPreviewFailure({
      desktopUrl: 'https://cdn.example/desktop.webp',
      phoneUrl: 'https://cdn.example/phone.webp',
      attemptCount: 1,
    })
    expect(failed.status).toBe('failed')
    expect(failed.desktopUrl).toBe('https://cdn.example/desktop.webp')
    expect(failed.phoneUrl).toBe('https://cdn.example/phone.webp')
    expect(failed.attemptCount).toBe(2)
    expect(isMissingLookPreviewTable({ code: 'PGRST205', message: 'schema cache' })).toBe(true)
    expect(isMissingLookPreviewTable({ code: '42501', message: 'permission denied' })).toBe(false)
  })
})
