import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET as getShortLink } from '@/app/q/[code]/route'
import {
  DEFAULT_CARD_QR_DESIGN,
  parseCardQrDesign,
} from '@/lib/workspace/card-qr/design'
import { contrastRatio, qrModuleColor } from '@/lib/workspace/card-qr/flyer-contrast'
import { cardQrBadgeHitsFinders, cardQrBadgeModules } from '@/lib/workspace/card-qr/qr-icon'
import {
  isMissingQrIconColumn,
  readCardQrProfile,
  saveCardQrProfile,
} from '@/lib/workspace/card-qr/store'
import {
  buildCardQrShortUrl,
  cardQrShortCode,
  cardQrUuidPrefixBounds,
  cardQrUuidPrefixFromCode,
  resolveCardQrShortLinkTarget,
} from '@/lib/workspace/card-qr/short-link'

const REP_ID = 'a1b2c3d4-e5f6-4789-8012-3456789abcde'
const OTHER_ID = 'a1b2c3d4-1111-4111-8111-111111111111'
const ORIGIN = 'https://sparkle-suite-smoke.vercel.app'

const mocks = vi.hoisted(() => ({
  lookup: vi.fn(),
}))

vi.mock('@/lib/workspace/card-qr/short-link-lookup', () => ({
  lookupCardQrShortLinkReps: (...args: unknown[]) => mocks.lookup(...args),
}))

beforeEach(() => {
  mocks.lookup.mockReset()
})

describe('card QR short codes', () => {
  it('derives a 6-character code from the first 32 bits and reverses it', () => {
    const code = cardQrShortCode(REP_ID)
    expect(code).toHaveLength(6)
    expect(cardQrUuidPrefixFromCode(code)).toBe('a1b2c3d4')
    expect(cardQrShortCode(REP_ID.toUpperCase())).toBe(code)
    expect(cardQrShortCode('00000000-0000-4000-8000-000000000000')).toBe('000000')
    expect(cardQrShortCode('rep-1')).toBeNull()
    expect(cardQrUuidPrefixFromCode('nope')).toBeNull()
    expect(cardQrUuidPrefixFromCode('!!!!!!')).toBeNull()
    const bounds = cardQrUuidPrefixBounds('a1b2c3d4')
    expect(REP_ID >= bounds.from && REP_ID <= bounds.to).toBe(true)
    expect('b1b2c3d4-e5f6-4789-8012-3456789abcde' <= bounds.to).toBe(false)
    expect(buildCardQrShortUrl(ORIGIN, REP_ID)).toBe(`${ORIGIN}/q/${code}`)
    expect(buildCardQrShortUrl(ORIGIN, 'rep-1')).toBeNull()
  })

  it('redirects one match and 404s unknown or colliding codes', () => {
    const code = cardQrShortCode(REP_ID) as string
    expect(
      resolveCardQrShortLinkTarget(
        code,
        [{ id: REP_ID, public_site_slug: 'fizzfest', custom_domain: null }],
        ORIGIN,
      ),
    ).toEqual({ status: 302, location: `${ORIGIN}/fizzfest` })
    expect(
      resolveCardQrShortLinkTarget(
        code,
        [{ id: REP_ID, public_site_slug: 'fizzfest', custom_domain: 'dudesfizzfest.com' }],
        ORIGIN,
      ),
    ).toEqual({ status: 302, location: 'https://dudesfizzfest.com' })
    expect(resolveCardQrShortLinkTarget(code, [], ORIGIN)).toEqual({ status: 404 })
    expect(
      resolveCardQrShortLinkTarget(
        code,
        [
          { id: REP_ID, public_site_slug: 'fizzfest' },
          { id: OTHER_ID, public_site_slug: 'other' },
        ],
        ORIGIN,
      ),
    ).toEqual({ status: 404 })
    expect(resolveCardQrShortLinkTarget('not-a-code', [], ORIGIN)).toEqual({ status: 404 })
  })

  it('keeps the center badge off the finder patterns', () => {
    for (const modules of [21, 25, 29, 33, 37, 41]) {
      const badge = cardQrBadgeModules(modules)
      expect(badge / modules).toBeLessThanOrEqual(0.2)
      expect(cardQrBadgeHitsFinders(modules, badge)).toBe(false)
    }
  })

  it('darkens a light color until it clears 7:1 on white and keeps a dark one', () => {
    expect(qrModuleColor('#5b1e3b')).toBe('#5b1e3b')
    expect(contrastRatio(qrModuleColor('#ff6a00'), '#ffffff')).toBeGreaterThanOrEqual(7)
    expect(contrastRatio(qrModuleColor('#ffffff'), '#ffffff')).toBeGreaterThanOrEqual(7)
    expect(qrModuleColor('#ffffff')).not.toBe('#ffffff')
  })

  it('does not require a signed-in visitor', () => {
    const source = readFileSync(resolve('app/q/[code]/route.ts'), 'utf8')
    expect(source).not.toContain('getPaidNicNacContext')
    expect(source).not.toContain('loadCardQrContext')
    expect(source).toContain('302')
  })
})

describe('short link route', () => {
  it('302s a known code and shows a friendly page for an unknown one', async () => {
    const code = cardQrShortCode(REP_ID) as string
    mocks.lookup.mockResolvedValue([
      { id: REP_ID, public_site_slug: 'fizzfest', custom_domain: null },
    ])
    const found = await getShortLink(
      new Request(`${ORIGIN}/q/${code}`),
      { params: Promise.resolve({ code }) },
    )
    expect(found.status).toBe(302)
    expect(found.headers.get('location')).toBe(`${ORIGIN}/fizzfest`)
    expect(mocks.lookup).toHaveBeenCalledWith('a1b2c3d4')

    mocks.lookup.mockResolvedValue([])
    const missing = await getShortLink(
      new Request(`${ORIGIN}/q/${code}`),
      { params: Promise.resolve({ code }) },
    )
    expect(missing.status).toBe(404)
    expect(missing.headers.get('content-type')).toContain('text/html')
    await expect(missing.text()).resolves.toContain('This QR link is not in use')

    const garbage = await getShortLink(
      new Request(`${ORIGIN}/q/nope`),
      { params: Promise.resolve({ code: 'nope' }) },
    )
    expect(garbage.status).toBe(404)
    expect(mocks.lookup).toHaveBeenCalledTimes(2)
  })

  it('returns a friendly unavailable page when lookup fails', async () => {
    const code = cardQrShortCode(REP_ID) as string
    mocks.lookup.mockRejectedValue(new Error('database down'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const response = await getShortLink(
      new Request(`${ORIGIN}/q/${code}`),
      { params: Promise.resolve({ code }) },
    )
    expect(response.status).toBe(503)
    await expect(response.text()).resolves.toContain('not available right now')
    errorSpy.mockRestore()
  })
})

describe('center mark profile storage', () => {
  it('falls back to none when the qr_icon column is absent', async () => {
    expect(
      isMissingQrIconColumn({
        code: 'PGRST204',
        message: "Could not find the 'qr_icon' column of 'rep_card_qr_profiles' in the schema cache",
      }),
    ).toBe(true)
    expect(parseCardQrDesign({ templateId: 'match-site' }).qrIcon).toBe('none')
    expect(parseCardQrDesign({ qrIcon: 'diamond' }).qrIcon).toBe('diamond')
    expect(DEFAULT_CARD_QR_DESIGN.qrIcon).toBe('none')

    const missingColumn = {
      code: '42703',
      message: 'column rep_card_qr_profiles.qr_icon does not exist',
    }
    const row = {
      destination_url: `${ORIGIN}/fizzfest`,
      template_id: 'match-site',
      show_name: true,
      show_email: true,
      show_qr: true,
      show_discount: false,
      discount_code: '',
      show_social: true,
      appearance_preset: 'sparkle_suite_morganite',
      updated_at: '2026-10-09T00:00:00.000Z',
    }
    const client = fakeProfileClient([
      { data: null, error: missingColumn },
      { data: row, error: null },
      { data: null, error: missingColumn },
      { data: row, error: null },
    ])

    const loaded = await readCardQrProfile(client as never, REP_ID)
    expect(loaded.persistence).toBe('database')
    expect(loaded.profile?.design.qrIcon).toBe('none')

    const saved = await saveCardQrProfile(client as never, {
      repId: REP_ID,
      destinationUrl: `${ORIGIN}/fizzfest`,
      appearancePreset: 'sparkle_suite_morganite',
      design: { ...DEFAULT_CARD_QR_DESIGN, qrIcon: 'unicorn' },
    })
    expect(saved.iconStored).toBe(false)
    expect(saved.profile?.design.qrIcon).toBe('none')
    expect(saved.persistence).toBe('database')
  })
})

function fakeProfileClient(results: Array<{ data: unknown; error: { code?: string; message?: string } | null }>) {
  const next = () => {
    const result = results.shift()
    if (!result) throw new Error('unexpected profile query')
    return Promise.resolve(result)
  }
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return { maybeSingle: () => next() }
            },
          }
        },
        upsert() {
          return {
            select() {
              return { single: () => next() }
            },
          }
        },
      }
    },
  }
}
