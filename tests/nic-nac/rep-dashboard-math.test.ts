import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RepDashboard } from '@/app/nic-nac/components/RepDashboard'
import { REACHABLE_CUSTOMER_FILTER } from '@/lib/services/site-analytics'
import {
  BIRTHDAY_WINDOW_DAYS,
  buildShowStreak,
  compareGlanceMetrics,
  createEmptyRepDashboard,
  getShowCountdown,
  initialsFromDisplayName,
  listUpcomingBirthdays,
} from '@/lib/services/rep-dashboard-math'

const TIME_ZONE = 'America/New_York'

describe('rep dashboard streak math', () => {
  const now = new Date('2026-10-12T16:00:00.000Z')

  it('counts consecutive weeks and keeps the current empty week from breaking a streak', () => {
    const streak = buildShowStreak({
      eventTimes: [
        '2026-10-05T16:00:00.000Z',
        '2026-09-28T16:00:00.000Z',
        '2026-09-21T16:00:00.000Z',
        '2026-10-20T16:00:00.000Z',
        '2026-06-01T16:00:00.000Z',
      ],
      now,
      timeZone: TIME_ZONE,
    })

    expect(streak.weeks).toHaveLength(16)
    expect(streak.weeks[0].days).toHaveLength(7)
    expect(streak.streakWeeks).toBe(3)
    expect(streak.activeDates).toEqual(['2026-09-21', '2026-09-28', '2026-10-05'])
    expect(streak.showsInWindow).toBe(3)
    expect(streak.activeDates).not.toContain('2026-10-20')
    expect(streak.activeDates).not.toContain('2026-06-01')
  })

  it('includes the current week when it already has a past show and stops at a gap', () => {
    const streak = buildShowStreak({
      eventTimes: [
        '2026-10-12T15:00:00.000Z',
        '2026-10-05T16:00:00.000Z',
        '2026-09-14T16:00:00.000Z',
      ],
      now,
      timeZone: TIME_ZONE,
    })

    expect(streak.streakWeeks).toBe(2)
    expect(streak.activeDates).toContain('2026-10-12')
    expect(streak.weeks.at(-1)?.days.find((day) => day.date === '2026-10-12')?.level).toBe(1)
  })

  it('places a late-night UTC event on the local calendar day', () => {
    const streak = buildShowStreak({
      eventTimes: ['2026-10-12T03:00:00.000Z'],
      now,
      timeZone: TIME_ZONE,
    })

    expect(streak.activeDates).toEqual(['2026-10-11'])
    expect(streak.streakWeeks).toBe(1)
  })
})

describe('rep dashboard birthday window', () => {
  it('keeps birthdays inside the next 30 days and returns initials only', () => {
    const birthdays = listUpcomingBirthdays({
      people: [
        { name: 'Jane Doe', month: 10, day: 12 },
        { name: 'Ava Stone', month: 11, day: 11 },
        { name: 'Late Guest', month: 11, day: 12 },
        { name: 'jane@example.com', month: 10, day: 18 },
        { name: '555-010-1212', month: 10, day: 19 },
      ],
      now: new Date('2026-10-12T15:00:00.000Z'),
      timeZone: TIME_ZONE,
      windowDays: BIRTHDAY_WINDOW_DAYS,
    })

    expect(birthdays.map((birthday) => birthday.initials)).toEqual(['JD', '?', '?', 'AS'])
    expect(birthdays.map((birthday) => birthday.daysUntil)).toEqual([0, 6, 7, 30])
    expect(birthdays[0]).toMatchObject({ isToday: true, dateLabel: 'Oct 12' })
    expect(JSON.stringify(birthdays)).not.toContain('Jane')
    expect(JSON.stringify(birthdays)).not.toContain('example.com')
    expect(JSON.stringify(birthdays)).not.toContain('555')
    expect(birthdays.every((birthday) => !('name' in birthday))).toBe(true)
  })

  it('wraps year end and observes February 29 on February 28 in a non-leap year', () => {
    const wrapped = listUpcomingBirthdays({
      people: [
        { name: 'Sam', month: 1, day: 10 },
        { name: 'Pat', month: 1, day: 20 },
      ],
      now: new Date('2026-12-20T17:00:00.000Z'),
      timeZone: TIME_ZONE,
    })
    expect(wrapped.map((birthday) => [birthday.initials, birthday.dateLabel, birthday.daysUntil])).toEqual([
      ['S', 'Jan 10', 21],
    ])

    const observed = listUpcomingBirthdays({
      people: [{ name: 'Leap', month: 2, day: 29 }],
      now: new Date('2027-02-28T17:00:00.000Z'),
      timeZone: TIME_ZONE,
    })
    expect(observed).toEqual([
      expect.objectContaining({
        initials: 'L',
        dateLabel: 'Feb 28',
        daysUntil: 0,
        isToday: true,
        observedLeapDay: true,
      }),
    ])

    const realLeapDay = listUpcomingBirthdays({
      people: [{ name: 'Leap', month: 2, day: 29 }],
      now: new Date('2028-02-28T17:00:00.000Z'),
      timeZone: TIME_ZONE,
    })
    expect(realLeapDay[0]).toMatchObject({
      dateLabel: 'Feb 29',
      daysUntil: 1,
      observedLeapDay: false,
    })
  })

  it('builds initials without using contact-shaped names', () => {
    expect(initialsFromDisplayName('Mary Jane Watson')).toBe('MW')
    expect(initialsFromDisplayName('Madonna')).toBe('M')
    expect(initialsFromDisplayName('')).toBe('?')
  })
})

describe('rep dashboard countdown math', () => {
  const now = new Date('2026-10-12T15:00:00.000Z')

  it('splits the remaining time and fills the ring inside a seven-day window', () => {
    const countdown = getShowCountdown('2026-10-15T17:30:00.000Z', now)

    expect(countdown).toMatchObject({
      totalMs: 268_200_000,
      days: 3,
      hours: 2,
      minutes: 30,
      seconds: 0,
      isPast: false,
    })
    expect(countdown.ringProgress).toBeCloseTo(1 - 268_200_000 / (7 * 86_400_000), 8)
  })

  it('keeps the ring empty until the show is inside seven days', () => {
    expect(getShowCountdown('2026-10-20T15:00:00.000Z', now).ringProgress).toBe(0)
    expect(getShowCountdown('2026-10-19T15:00:00.000Z', now).ringProgress).toBe(0)
  })

  it('treats a past show as complete', () => {
    expect(getShowCountdown('2026-10-12T14:59:00.000Z', now)).toMatchObject({
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isPast: true,
      ringProgress: 1,
    })
  })
})

describe('rep dashboard glance arrows', () => {
  it('marks movement against the previous snapshot and leaves missing values alone', () => {
    expect(
      compareGlanceMetrics(
        [
          { key: 'customers_added', label: 'Customers added', value: 4, status: 'tracked' },
          { key: 'shows_scheduled', label: 'Shows on your calendar', value: 1, status: 'tracked' },
          { key: 'support_reports', label: 'Support reports filed', value: null, status: 'unavailable' },
        ],
        [
          { key: 'customers_added', label: 'Customers added', value: 2, status: 'tracked' },
          { key: 'shows_scheduled', label: 'Shows on your calendar', value: 1, status: 'tracked' },
        ],
      ),
    ).toEqual([
      expect.objectContaining({ key: 'customers_added', direction: 'up', previous: 2 }),
      expect.objectContaining({ key: 'shows_scheduled', direction: 'flat', previous: 1 }),
      expect.objectContaining({ key: 'support_reports', direction: 'none', value: null, previous: null }),
    ])
  })
})

describe('rep dashboard presentation', () => {
  it('shows encouraging empty states and a site-visits card without digits', () => {
    const now = new Date('2026-10-12T15:00:00.000Z')
    const html = renderToStaticMarkup(
      createElement(RepDashboard, {
        onOpenSection: () => undefined,
        data: createEmptyRepDashboard(now, TIME_ZONE),
        now,
      }),
    )
    const visits = html
      .slice(
        html.indexOf('data-testid="site-visits-coming-soon"'),
        html.indexOf('</article>', html.indexOf('data-testid="site-visits-coming-soon"')),
      )
      .replace(/<[^>]+>/g, '')

    expect(html).toContain('Your dashboard')
    expect(html).toContain('Add your first customer')
    expect(html).toContain('No show on the books')
    expect(html).toContain('Host a show and this lights up')
    expect(html).toContain('Site visits — coming soon')
    expect(visits).not.toMatch(/\d/)
    expect(html).not.toContain('Choose a tool')
    expect(html).not.toContain('data-pulse="true"')
  })

  it('uses the same reachable-customer filter as site analytics', () => {
    expect(REACHABLE_CUSTOMER_FILTER).toBe(
      'and(sms_consent.eq.true,sms_opted_out_at.is.null,stop_keyword_received_at.is.null),and(email_consent.eq.true,email_opted_out_at.is.null)',
    )
  })

  it('shows a pulse when pending trades are waiting', () => {
    const now = new Date('2026-10-12T15:00:00.000Z')
    const data = createEmptyRepDashboard(now, TIME_ZONE)
    data.pendingTrades.count = 2
    data.nextShow = {
      title: 'Friday Live',
      platform: 'TikTok',
      eventTime: '2026-10-15T17:30:00.000Z',
      timeZone: TIME_ZONE,
    }
    const html = renderToStaticMarkup(
      createElement(RepDashboard, {
        onOpenSection: () => undefined,
        data,
        now,
      }),
    )

    expect(html).toContain('data-pulse="true"')
    expect(html).toContain('Friday Live')
    expect(html).toContain('3')
    expect(html).toContain('Open Dance Floor')
  })
})
