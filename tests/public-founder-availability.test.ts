import { describe, expect, it } from 'vitest'
import { toPublicFounderAvailability, unavailablePublicFounderAvailability } from '@/lib/sparkle-suite/public-founder-availability'

const checkedAt = '2026-10-17T16:30:00.000Z'

describe('public founder availability sanitizer', () => {
  it.each(['available', 'full'] as const)('keeps only status and checkedAt for %s', status => {
    const out = toPublicFounderAvailability({ status, remaining: 18, taken: 2, claimed: 2, checkedAt })
    expect(out).toEqual({ status, checkedAt })
    expect(Object.keys(out).sort()).toEqual(['checkedAt', 'status'])
  })

  it('maps anything unrecognised to unavailable', () => {
    for (const input of [null, undefined, 'available', { status: 'unavailable', remaining: null }, { status: 'open' }, { status: 'full', checkedAt: 0 }]) {
      expect(toPublicFounderAvailability(input)).toEqual(unavailablePublicFounderAvailability())
    }
  })

  it('treats a missing checkedAt as null', () => {
    expect(toPublicFounderAvailability({ status: 'available' })).toEqual({ status: 'available', checkedAt: null })
  })
})
