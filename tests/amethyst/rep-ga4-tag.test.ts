import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

import {
  GA4_SMOKE_TEST_MEASUREMENT_ID,
  GA4_SMOKE_TEST_PROPERTY_ID,
  decideRepGa4MeasurementId,
  buildRepGa4Snippet,
  resolveRepGa4TagHtml,
  type RepGa4TagRecord,
} from '@/lib/amethyst/rep-ga4-tag'

const REP_A = '9a971c05-3631-443e-bcb8-4e9a26e15885'
const REP_B = '2b5a27c5-9c05-4014-8d0b-754e19815bf6'
const REP_A_MEASUREMENT = 'G-FYP8WPK3SW'
const REP_B_MEASUREMENT = 'G-VKFLMW866F'

const records: Record<string, RepGa4TagRecord> = {
  [REP_A]: {
    customDomain: 'theblingkitchen.com',
    accountClassification: 'customer',
    measurementId: REP_A_MEASUREMENT,
    enabled: true,
  },
  [REP_B]: {
    customDomain: 'brisglowtique.com',
    accountClassification: 'customer',
    measurementId: REP_B_MEASUREMENT,
    enabled: true,
  },
}

function requestFor(host: string, path = '/customer-site/home', query = '') {
  return new Request(`https://sparkle-suite.example${path}${query}`, {
    headers: {
      host,
      'x-forwarded-host': host,
    },
  })
}

describe('rep GA4 tag', () => {
  it.each([true, false])('queues consent and clicks before downloading analytics after paint (observer: %s)', (hasObserver) => {
    const listeners: Record<string, (...args: any[]) => void> = {}
    const frames: (() => void)[] = []
    let paint: ((list: { getEntries: () => { name: string }[] }) => void) | undefined
    const appendChild = vi.fn()
    const context: any = {
      URL,
      document: {
        readyState: 'loading',
        addEventListener: (name: string, handler: (...args: any[]) => void) => { listeners[name] = handler },
        createElement: () => ({}), head: { appendChild },
      },
      requestAnimationFrame: (callback: () => void) => frames.push(callback),
    }
    if (hasObserver) context.PerformanceObserver = class {
      constructor(callback: typeof paint) { paint = callback }
      observe() {} disconnect() {}
    }
    context.window = context
    runInNewContext(buildRepGa4Snippet({ measurementId: REP_A_MEASUREMENT, shopHref: 'https://shop.bombparty.com/bling' })
      .replace(/^<script[^>]*>/, '').replace(/<\/script>$/, ''), context)
    expect(appendChild).not.toHaveBeenCalled()
    expect(Array.from(context.dataLayer[0]).slice(0, 2)).toEqual(['consent', 'default'])
    expect(Array.from(context.dataLayer[2])).toEqual(['config', REP_A_MEASUREMENT])
    listeners.click({ target: { closest: () => ({ href: 'https://shop.bombparty.com/bling' }) } })
    expect(Array.from(context.dataLayer[3])).toEqual(['event', 'shop_click'])
    if (hasObserver) {
      paint!({ getEntries: () => [{ name: 'first-paint' }] })
      expect(appendChild).not.toHaveBeenCalled()
      paint!({ getEntries: () => [{ name: 'first-contentful-paint' }] })
      paint!({ getEntries: () => [{ name: 'first-contentful-paint' }] })
    } else {
      listeners.DOMContentLoaded()
      frames.shift()!()
      expect(appendChild).not.toHaveBeenCalled()
      frames.shift()!()
    }
    expect(appendChild).toHaveBeenCalledTimes(1)
    expect(appendChild).toHaveBeenCalledWith(expect.objectContaining({ async: true, fetchPriority: 'low', src: `https://www.googletagmanager.com/gtag/js?id=${REP_A_MEASUREMENT}` }))
  })

  it('puts rep A measurement id on rep A and never rep B', async () => {
    const html = await resolveRepGa4TagHtml({
      request: requestFor('www.theblingkitchen.com'),
      repId: REP_A,
      shopHref: 'https://shop.bombparty.com/bling',
      lookup: async (repId) => records[repId] ?? null,
    })

    expect(html).toContain(REP_A_MEASUREMENT)
    expect(html).not.toContain(REP_B_MEASUREMENT)
    expect(html).toContain("ad_storage: 'denied'")
    expect(html).toContain("ad_user_data: 'denied'")
    expect(html).toContain("ad_personalization: 'denied'")
    expect(html).toContain("analytics_storage: 'granted'")
    expect(html).toContain("gtag('event', 'shop_click')")
    expect(html).not.toMatch(/@/)
    expect(html.startsWith('<script id="sparkle-rep-ga4">')).toBe(true)
  })

  it('renders no tag when ?c= asks for a different rep than the host', async () => {
    const lookups: string[] = []
    const html = await resolveRepGa4TagHtml({
      request: requestFor('theblingkitchen.com', '/customer-site/home', '?c=brisglowtique.com'),
      repId: REP_B,
      lookup: async (repId) => {
        lookups.push(repId)
        return records[repId] ?? null
      },
    })

    expect(html).toBe('')
    expect(lookups).toEqual([REP_B])
    expect(decideRepGa4MeasurementId({
      host: 'theblingkitchen.com',
      pathname: '/',
      record: records[REP_B],
    })).toBeNull()
  })

  it('renders no tag on the Suite site, Nic-Nac, or admin pages', async () => {
    const lookup = async () => records[REP_A]
    const suite = await resolveRepGa4TagHtml({
      request: requestFor('www.yoursparklesuite.com', '/'),
      repId: REP_A,
      env: { GA4_SMOKE_TEST_MEASUREMENT_ID: GA4_SMOKE_TEST_MEASUREMENT_ID },
      lookup,
    })
    const nicNac = await resolveRepGa4TagHtml({
      request: requestFor('theblingkitchen.com', '/nic-nac'),
      repId: REP_A,
      lookup,
    })
    const admin = await resolveRepGa4TagHtml({
      request: requestFor('theblingkitchen.com', '/control-center'),
      repId: REP_A,
      lookup,
    })

    expect(suite).toBe('')
    expect(nicNac).toBe('')
    expect(admin).toBe('')
    expect(`${suite}${nicNac}${admin}`).not.toContain('G-')
  })

  it('renders no tag for a demo rep or a rep with no analytics row', async () => {
    const demo = await resolveRepGa4TagHtml({
      request: requestFor('theblingkitchen.com'),
      repId: REP_A,
      lookup: async () => ({ ...records[REP_A], accountClassification: 'demo' }),
    })
    const missing = await resolveRepGa4TagHtml({
      request: requestFor('theblingkitchen.com'),
      repId: REP_A,
      lookup: async () => null,
    })

    expect(demo).toBe('')
    expect(missing).toBe('')
  })

  it('uses the Smoke measurement id only on a vercel.app preview', async () => {
    expect(GA4_SMOKE_TEST_MEASUREMENT_ID).toBe('G-3XK98BLX70')
    expect(GA4_SMOKE_TEST_PROPERTY_ID).toBe('559335478')
    const env = { GA4_SMOKE_TEST_MEASUREMENT_ID: 'G-3XK98BLX70' }
    const lookup = async () => records[REP_A]

    const preview = await resolveRepGa4TagHtml({
      request: requestFor('sparkle-suite-git-preview.vercel.app'),
      repId: REP_A,
      env,
      lookup,
    })
    const production = await resolveRepGa4TagHtml({
      request: requestFor('theblingkitchen.com'),
      repId: REP_A,
      env,
      lookup,
    })
    const suite = await resolveRepGa4TagHtml({
      request: requestFor('www.yoursparklesuite.com'),
      repId: REP_A,
      env,
      lookup,
    })
    const previewWithoutSwitch = await resolveRepGa4TagHtml({
      request: requestFor('sparkle-suite-git-preview.vercel.app'),
      repId: REP_A,
      env: {},
      lookup,
    })

    expect(preview).toContain('G-3XK98BLX70')
    expect(preview).not.toContain(REP_A_MEASUREMENT)
    expect(production).toContain(REP_A_MEASUREMENT)
    expect(production).not.toContain('G-3XK98BLX70')
    expect(suite).toBe('')
    expect(previewWithoutSwitch).toBe('')
  })

  it('fires lead and swap_request without personal details', () => {
    const homepage = readFileSync(resolve('public/amethyst/homepage.jsx'), 'utf8')
    const danceFloor = readFileSync(resolve('public/amethyst/trade.jsx'), 'utf8')
    expect(homepage).toContain('window.gtag("event", "lead")')
    expect(homepage).not.toContain('gtag("event", "lead",')
    expect(danceFloor).toContain('window.gtag("event", "swap_request")')
    expect(danceFloor).not.toContain('gtag("event", "swap_request",')
  })
})
