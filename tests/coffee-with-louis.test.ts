import { describe, expect, it } from 'vitest'
import {
  COFFEE_WITH_LOUIS_CADENCE,
  COFFEE_WITH_LOUIS_MEET_URL,
  formatCoffeeWithLouisLabel,
  getCoffeeWithLouisSessionStart,
  getNextCoffeeWithLouisSession,
  isCoffeeWithLouisVisible,
} from '@/lib/help/coffee-with-louis'

const FIRST_SESSION = 'Thursday, Oct 8, 2026 · 8 PM ET'
const SECOND_SESSION = 'Thursday, Oct 22, 2026 · 8 PM ET'
const THIRD_SESSION = 'Thursday, Nov 5, 2026 · 8 PM ET'

describe('Coffee with Louis next session', () => {
  it('keeps every session on Thursday at 8:00 PM America/New_York', () => {
    for (let index = 0; index < 12; index += 1) {
      const startsAt = getCoffeeWithLouisSessionStart(index)
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(startsAt)
      const value = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value

      expect(value('weekday')).toBe('Thu')
      expect(value('hour')).toBe('20')
      expect(value('minute')).toBe('00')
    }
  })

  it('anchors the first session at 8 PM Eastern on Oct 8, 2026', () => {
    expect(getCoffeeWithLouisSessionStart(0).toISOString()).toBe(
      '2026-10-09T00:00:00.000Z',
    )
    expect(formatCoffeeWithLouisLabel(getCoffeeWithLouisSessionStart(0))).toBe(
      FIRST_SESSION,
    )
  })

  it('keeps 8 PM Eastern after the November daylight-saving change', () => {
    expect(getCoffeeWithLouisSessionStart(2).toISOString()).toBe(
      '2026-11-06T01:00:00.000Z',
    )
    expect(formatCoffeeWithLouisLabel(getCoffeeWithLouisSessionStart(2))).toBe(
      THIRD_SESSION,
    )
  })

  it('shows the first session before it starts', () => {
    const session = getNextCoffeeWithLouisSession(
      new Date('2026-10-01T16:00:00.000Z'),
    )

    expect(session.label).toBe(FIRST_SESSION)
    expect(session.cadence).toBe(COFFEE_WITH_LOUIS_CADENCE)
    expect(COFFEE_WITH_LOUIS_MEET_URL).toBe(
      'https://meet.google.com/ydu-jgut-drf',
    )
    expect(session.meetUrl).toBe(COFFEE_WITH_LOUIS_MEET_URL)
  })

  it('shows the same session on Thursday before 8 PM ET', () => {
    expect(
      getNextCoffeeWithLouisSession(
        new Date('2026-10-08T23:59:00.000Z'),
      ).label,
    ).toBe(FIRST_SESSION)
  })

  it('advances at 8:00 PM ET, during the 8–9 PM window, and after it', () => {
    for (const now of [
      '2026-10-09T00:00:00.000Z',
      '2026-10-09T00:30:00.000Z',
      '2026-10-09T01:00:00.000Z',
      '2026-10-09T01:01:00.000Z',
    ]) {
      expect(getNextCoffeeWithLouisSession(new Date(now)).label).toBe(
        SECOND_SESSION,
      )
    }
  })

  it('shows the following session between Thursdays', () => {
    expect(
      getNextCoffeeWithLouisSession(
        new Date('2026-10-15T16:00:00.000Z'),
      ).label,
    ).toBe(SECOND_SESSION)
    expect(
      getNextCoffeeWithLouisSession(
        new Date('2026-10-22T23:59:00.000Z'),
      ).label,
    ).toBe(SECOND_SESSION)
    expect(
      getNextCoffeeWithLouisSession(
        new Date('2026-10-23T00:00:00.000Z'),
      ).label,
    ).toBe(THIRD_SESSION)
  })

  it('shows Nov 5 at 8 PM ET when that session is still upcoming', () => {
    expect(
      getNextCoffeeWithLouisSession(
        new Date('2026-11-06T00:59:00.000Z'),
      ).label,
    ).toBe(THIRD_SESSION)
    expect(
      getNextCoffeeWithLouisSession(
        new Date('2026-11-06T01:00:00.000Z'),
      ).startsAt.toISOString(),
    ).toBe(getCoffeeWithLouisSessionStart(3).toISOString())
  })
})

describe('Coffee with Louis smoke gate', () => {
  it('stays hidden unless the public Smoke marker is exactly smoke', () => {
    expect(isCoffeeWithLouisVisible({})).toBe(false)
    expect(
      isCoffeeWithLouisVisible({
        NEXT_PUBLIC_SPARKLE_ENVIRONMENT: 'production',
      }),
    ).toBe(false)
    expect(
      isCoffeeWithLouisVisible({ NEXT_PUBLIC_SPARKLE_ENVIRONMENT: 'Smoke' }),
    ).toBe(false)
    expect(
      isCoffeeWithLouisVisible({ NEXT_PUBLIC_SPARKLE_ENVIRONMENT: 'smoke' }),
    ).toBe(true)
  })
})
