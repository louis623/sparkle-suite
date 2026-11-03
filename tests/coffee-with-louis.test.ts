import { describe, expect, it } from 'vitest'
import {
  COFFEE_WITH_LOUIS_CADENCE,
  COFFEE_WITH_LOUIS_MEET_URL,
  formatCoffeeWithLouisLabel,
  formatCoffeeWithLouisReminderDate,
  getCoffeeWithLouisSessionStart,
  getNextCoffeeWithLouisSession,
} from '@/lib/help/coffee-with-louis'

const FIRST_SESSION = 'Thursday, Nov 12, 2026 · 8 PM ET'
const SECOND_SESSION = 'Thursday, Nov 26, 2026 · 8 PM ET'
const THIRD_SESSION = 'Thursday, Dec 10, 2026 · 8 PM ET'

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

  it('anchors the first session at 8 PM Eastern on Nov 12, 2026', () => {
    expect(getCoffeeWithLouisSessionStart(0).toISOString()).toBe(
      '2026-11-13T01:00:00.000Z',
    )
    expect(formatCoffeeWithLouisLabel(getCoffeeWithLouisSessionStart(0))).toBe(
      FIRST_SESSION,
    )
    expect(formatCoffeeWithLouisReminderDate(getCoffeeWithLouisSessionStart(0))).toBe(
      'Thursday, Nov 12',
    )
  })

  it('keeps 8 PM Eastern across the March daylight-saving change', () => {
    expect(getCoffeeWithLouisSessionStart(8).toISOString()).toBe(
      '2027-03-05T01:00:00.000Z',
    )
    expect(getCoffeeWithLouisSessionStart(9).toISOString()).toBe(
      '2027-03-19T00:00:00.000Z',
    )
    expect(formatCoffeeWithLouisLabel(getCoffeeWithLouisSessionStart(9))).toBe(
      'Thursday, Mar 18, 2027 · 8 PM ET',
    )
    expect(
      formatCoffeeWithLouisReminderDate(
        getNextCoffeeWithLouisSession(new Date('2026-11-13T01:00:00.000Z')).startsAt,
      ),
    ).toBe('Thursday, Nov 26')
  })

  it('shows the first session before it starts', () => {
    const session = getNextCoffeeWithLouisSession(
      new Date('2026-11-05T16:00:00.000Z'),
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
        new Date('2026-11-13T00:59:00.000Z'),
      ).label,
    ).toBe(FIRST_SESSION)
  })

  it('advances at 8:00 PM ET, during the 8–9 PM window, and after it', () => {
    for (const now of [
      '2026-11-13T01:00:00.000Z',
      '2026-11-13T01:30:00.000Z',
      '2026-11-13T02:00:00.000Z',
      '2026-11-13T02:01:00.000Z',
    ]) {
      expect(getNextCoffeeWithLouisSession(new Date(now)).label).toBe(
        SECOND_SESSION,
      )
    }
  })

  it('shows the following session between Thursdays', () => {
    expect(
      getNextCoffeeWithLouisSession(
        new Date('2026-11-19T16:00:00.000Z'),
      ).label,
    ).toBe(SECOND_SESSION)
    expect(
      getNextCoffeeWithLouisSession(
        new Date('2026-11-27T00:59:00.000Z'),
      ).label,
    ).toBe(SECOND_SESSION)
    expect(
      getNextCoffeeWithLouisSession(
        new Date('2026-11-27T01:00:00.000Z'),
      ).label,
    ).toBe(THIRD_SESSION)
  })

  it('shows Dec 10 at 8 PM ET when that session is still upcoming', () => {
    expect(
      getNextCoffeeWithLouisSession(
        new Date('2026-12-11T00:59:00.000Z'),
      ).label,
    ).toBe(THIRD_SESSION)
    expect(
      getNextCoffeeWithLouisSession(
        new Date('2026-12-11T01:00:00.000Z'),
      ).startsAt.toISOString(),
    ).toBe(getCoffeeWithLouisSessionStart(3).toISOString())
  })
})
