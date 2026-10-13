import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  normalizeQueueAttribution,
  queueAttributionFromSearch,
  queueSignupSource,
  readBrowserQueueAttribution,
  rememberBrowserQueueAttribution,
  withQueueAttribution,
} from '@/lib/prelaunch/attribution'

afterEach(() => vi.unstubAllGlobals())

describe('private build-queue attribution', () => {
  it('accepts extensible bounded labels and discards identities, click IDs and invalid labels', () => {
    expect(normalizeQueueAttribution({ src: 'TikTok', campaign: 'Fall_26', email: 'rep@example.com', clickId: '123' }))
      .toEqual({ src: 'tiktok', campaign: 'fall_26' })
    for (const src of ['rep@example.com', 'https://example.com', 'x'.repeat(41), '../etc', '<script>']) {
      expect(normalizeQueueAttribution({ src, campaign: 'anything' })).toEqual({})
    }
    expect(normalizeQueueAttribution({ src: 'email', campaign: 'x'.repeat(81) })).toEqual({ src: 'email' })
    expect(normalizeQueueAttribution({ src: 'partner-new', campaign: 'safe' })).toEqual({ src: 'partner-new', campaign: 'safe' })
  })

  it('preserves tagged navigation, existing query and fragments without forwarding unrelated parameters', () => {
    const entry = queueAttributionFromSearch('?src=tiktok&campaign=fall&email=private@example.com')
    const portfolio = withQueueAttribution('/portfolio#sites', entry)
    expect(portfolio).toBe('/portfolio?src=tiktok&campaign=fall#sites')
    expect(withQueueAttribution('/prelaunch?mode=public#waitlist', entry))
      .toBe('/prelaunch?mode=public&src=tiktok&campaign=fall#waitlist')
    for (const href of ['https://youtube.com/@SparkleSuite', '//outside.example', '/\\outside.example']) {
      expect(withQueueAttribution(href, entry)).toBe(href)
    }
    expect(withQueueAttribution('/prelaunch#waitlist', {})).toBe('/prelaunch#waitlist')
  })

  it('retains only campaign labels through an untagged internal route and lets a new tagged visit replace them', () => {
    const data = new Map<string, string>()
    const browser = {
      location: { search: '?src=tiktok&campaign=october&email=private@example.com' },
      sessionStorage: { getItem: (key: string) => data.get(key), setItem: (key: string, value: string) => data.set(key, value) },
    }
    vi.stubGlobal('window', browser)
    rememberBrowserQueueAttribution()
    browser.location.search = ''
    expect(readBrowserQueueAttribution()).toEqual({ src: 'tiktok', campaign: 'october' })
    expect([...data.values()]).toEqual(['{"src":"tiktok","campaign":"october"}'])
    browser.location.search = '?src=email'
    rememberBrowserQueueAttribution()
    browser.location.search = ''
    expect(readBrowserQueueAttribution()).toEqual({ src: 'email' })
  })

  it('still supports URL attribution when storage is blocked and degrades safely without it', () => {
    const browser = {
      location: { search: '?src=email' },
      sessionStorage: { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } },
    }
    vi.stubGlobal('window', browser)
    expect(() => rememberBrowserQueueAttribution()).not.toThrow()
    expect(readBrowserQueueAttribution()).toEqual({ src: 'email' })
    browser.location.search = ''
    expect(readBrowserQueueAttribution()).toEqual({})
    expect(queueSignupSource({})).toBe('prelaunch_site')
    expect(queueSignupSource({ src: 'tiktok', campaign: 'fall' })).toBe('prelaunch_site?src=tiktok&campaign=fall')
  })
})
