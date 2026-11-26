import { describe, expect, it } from 'vitest'
import {
  LOOK_PREVIEW_MAX_ATTEMPTS,
  applyLookPreviewFailure,
  applyLookPreviewSkip,
  decideLookPreviewReady,
  type LookPreviewPageSignals,
} from '@/lib/look-preview/policy'

const painted: LookPreviewPageSignals = {
  httpStatus: 200,
  hasHpHeader: true,
  hasHpHero: true,
  hasTemplateSrc: false,
  fontsReady: true,
  heroDecoded: true,
  settled: false,
  textLength: 400,
}

describe('look preview ready check', () => {
  it('captures an SSR page once its header, hero, fonts, and hero image are ready', () => {
    expect(decideLookPreviewReady(painted)).toEqual({ action: 'capture', mode: 'markers' })
    expect(decideLookPreviewReady({ ...painted, fontsReady: false })).toEqual({ action: 'wait' })
    expect(decideLookPreviewReady({ ...painted, heroDecoded: false })).toEqual({ action: 'wait' })
  })

  it('waits for the template-src page to paint the same header and hero', () => {
    expect(decideLookPreviewReady({
      ...painted,
      hasHpHeader: false,
      hasHpHero: false,
      hasTemplateSrc: true,
      settled: false,
    })).toEqual({ action: 'wait' })
    expect(decideLookPreviewReady({
      ...painted,
      hasTemplateSrc: true,
    })).toEqual({ action: 'capture', mode: 'markers' })
  })

  it('captures a 200 page with neither marker after it settles, and skips a blank or missing page', () => {
    expect(decideLookPreviewReady({
      ...painted,
      hasHpHeader: false,
      hasHpHero: false,
      hasTemplateSrc: false,
      settled: false,
    })).toEqual({ action: 'wait' })
    expect(decideLookPreviewReady({
      ...painted,
      hasHpHeader: false,
      hasHpHero: false,
      settled: true,
      textLength: 180,
    })).toEqual({ action: 'capture', mode: 'settled' })
    expect(decideLookPreviewReady({
      ...painted,
      hasHpHeader: false,
      hasHpHero: false,
      settled: true,
      textLength: 8,
    })).toEqual({ action: 'skip', reason: 'blank' })
    expect(decideLookPreviewReady({ ...painted, httpStatus: 404 })).toEqual({ action: 'skip', reason: 'page-missing' })
    expect(decideLookPreviewReady({ ...painted, httpStatus: 500 })).toEqual({ action: 'wait' })
  })

  it('records a missing page as skipped and keeps any previous shot', () => {
    const skipped = applyLookPreviewSkip({
      desktopUrl: 'https://cdn.example/desktop.webp',
      phoneUrl: 'https://cdn.example/phone.webp',
    }, 'page-missing')
    expect(skipped.status).toBe('skipped')
    expect(skipped.lastError).toBe('page-missing')
    expect(skipped.desktopUrl).toBe('https://cdn.example/desktop.webp')
    expect(skipped.attemptCount).toBe(LOOK_PREVIEW_MAX_ATTEMPTS)

    const failed = applyLookPreviewFailure({
      desktopUrl: 'https://cdn.example/desktop.webp',
      phoneUrl: 'https://cdn.example/phone.webp',
      attemptCount: 0,
    })
    expect(failed.status).toBe('failed')
    expect(failed.desktopUrl).toBe('https://cdn.example/desktop.webp')
  })
})
