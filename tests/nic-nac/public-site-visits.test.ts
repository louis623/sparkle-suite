import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  US_STATE_HEX,
  US_STATE_NAMES,
  buildPublicSiteVisitBeacon,
  dailyVisitorHash,
  interpretPublicSiteVisit,
  summarizeSiteVisits,
} from '@/lib/services/site-visit-summary'

const NOW = new Date('2026-10-13T18:00:00.000Z')

function headers(extra: Record<string, string> = {}) {
  return new Headers({
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    ...extra,
  })
}

describe('public site visit capture', () => {
  it('drops bots, stores a US state, and never keeps an IP or referrer query', () => {
    expect(interpretPublicSiteVisit({
      headers: headers({ 'user-agent': 'Googlebot/2.1' }),
      body: { path: '/blingkitchen' },
      now: NOW,
    })).toEqual({ action: 'ignore', reason: 'bot' })

    expect(interpretPublicSiteVisit({
      headers: headers({ purpose: 'prefetch' }),
      body: { path: '/blingkitchen' },
      now: NOW,
    })).toEqual({ action: 'ignore', reason: 'bot' })

    const visit = interpretPublicSiteVisit({
      headers: headers({
        'x-vercel-ip-country': 'US',
        'x-vercel-ip-country-region': 'ca',
        'x-forwarded-for': '203.0.113.10',
      }),
      body: {
        path: '/blingkitchen',
        referrer: 'https://instagram.com/stories/view?token=secret',
        src: 'QR',
        utmSource: 'card',
      },
      now: NOW,
      salt: 'test-salt',
    })

    expect(visit.action).toBe('insert')
    if (visit.action !== 'insert') return
    expect(visit.row).toMatchObject({
      path: '/blingkitchen',
      referrer: 'https://instagram.com/stories/view',
      src: 'qr',
      utm_source: 'card',
      us_state: 'CA',
    })
    expect(JSON.stringify(visit.row)).not.toContain('203.0.113.10')
    expect(JSON.stringify(visit.row)).not.toContain('secret')
    expect(visit.row.visitor_day_hash).toMatch(/^[a-f0-9]{32}$/)

    const canada = interpretPublicSiteVisit({
      headers: headers({
        'x-vercel-ip-country': 'CA',
        'x-vercel-ip-country-region': 'CA',
      }),
      body: { path: '/blingkitchen' },
      now: NOW,
    })
    expect(canada.action).toBe('insert')
    if (canada.action === 'insert') expect(canada.row.us_state).toBeNull()
  })

  it('hashes a visitor for one day and skips the hash when no salt is set', () => {
    const first = dailyVisitorHash({ salt: 'salt', userAgent: 'Browser', now: NOW })
    const sameDay = dailyVisitorHash({ salt: 'salt', userAgent: 'Browser', now: new Date('2026-10-13T23:00:00.000Z') })
    const nextDay = dailyVisitorHash({ salt: 'salt', userAgent: 'Browser', now: new Date('2026-10-14T00:00:00.000Z') })
    expect(first).toBe(sameDay)
    expect(first).not.toBe(nextDay)
    expect(dailyVisitorHash({ salt: '', userAgent: 'Browser', now: NOW })).toBeNull()
  })

  it('counts QR visits apart from direct ones and fills the hour heatmap', () => {
    const summary = summarizeSiteVisits({
      now: new Date('2026-10-13T19:00:00.000Z'),
      timeZone: 'America/New_York',
      rows: [
        { viewed_at: '2026-10-13T18:00:00.000Z', src: 'qr', us_state: 'NY' },
        { viewed_at: '2026-10-13T18:30:00.000Z', src: null, us_state: 'NY' },
        { viewed_at: '2026-10-12T15:00:00.000Z', src: 'email', us_state: 'CA' },
        { viewed_at: '2026-08-01T15:00:00.000Z', src: 'qr', us_state: 'TX' },
      ],
    })

    expect(summary.total).toBe(3)
    expect(summary.qrVisits).toBe(1)
    expect(summary.directVisits).toBe(2)
    expect(summary.qrShare).toBeCloseTo(1 / 3)
    expect(summary.states.map((state) => state.code)).toEqual(['NY', 'CA'])
    expect(summary.busiest?.count).toBe(2)
    expect(summary.dayLabels).toHaveLength(28)
    expect(summary.heatmap).toHaveLength(7)
    expect(summary.heatmap[0]).toHaveLength(24)
  })

  it('beacon script does not set a cookie and the table is rep-read only', () => {
    const beacon = buildPublicSiteVisitBeacon({
      repId: 'a1b2c3d4-e5f6-4789-8012-3456789abcde',
      slug: 'blingkitchen',
    })
    expect(beacon).toContain('/api/public-site/visit')
    expect(beacon).toContain('blingkitchen')
    expect(beacon).not.toContain('document.cookie')
    expect(beacon).not.toContain('localStorage')
    expect(buildPublicSiteVisitBeacon({ repId: 'not-a-rep', slug: '../admin' })).toBe('')

    const sql = readFileSync(
      resolve('supabase/migrations/20261013160000_ss_public_site_visits.sql'),
      'utf8',
    )
    expect(sql).toContain('enable row level security')
    expect(sql).toContain('public_site_visits_rep_read')
    expect(sql).toContain('for select')
    expect(sql).not.toMatch(/for insert/i)
    expect(sql).toContain('revoke all on table public.public_site_visits from anon, authenticated')
    expect(sql.toLowerCase()).not.toContain('ip_address')

    const route = readFileSync(resolve('app/api/public-site/visit/route.ts'), 'utf8')
    expect(route).not.toContain('x-forwarded-for')
    expect(route).not.toContain('x-real-ip')
    expect(US_STATE_HEX.map((state) => state.code).sort()).toEqual(Object.keys(US_STATE_NAMES).sort())
  })
})
