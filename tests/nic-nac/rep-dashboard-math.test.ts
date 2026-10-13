import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RepDashboard } from '@/app/nic-nac/components/RepDashboard'
import { buildDanceFloorInsights, type DanceFloorInsightInput } from '@/lib/services/dance-floor-insights'
import { summarizeSiteVisits } from '@/lib/services/site-visit-summary'
import { REACHABLE_CUSTOMER_FILTER } from '@/lib/services/site-analytics'
import {
  BIRTHDAY_WINDOW_DAYS,
  compareGlanceMetrics,
  createEmptyRepDashboard,
  getShowCountdown,
  initialsFromDisplayName,
  listUpcomingBirthdays,
} from '@/lib/services/rep-dashboard-math'

const TIME_ZONE = 'America/New_York'

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
    const showCard = html.slice(
      html.indexOf('aria-label="Next show"'),
      html.indexOf('</article>', html.indexOf('aria-label="Next show"')),
    )

    expect(html).toContain('Your dashboard')
    expect(html).toContain('Last month at a glance')
    expect(html).not.toContain('This month at a glance')
    expect(html).toContain('Add your first customer')
    expect(showCard).toContain('No show on the books')
    expect(showCard).toContain('Ask Nic-Nac to put your next show on the calendar.')
    expect(showCard).not.toContain('<button')
    expect(showCard).not.toContain('Open calendar')
    expect(html).toContain('Birthdays')
    expect(html).toContain('Platform mix')
    expect(html).not.toContain('Add a show')
    expect(html).not.toContain('Show streak')
    expect(html).not.toContain('askNicNac')
    expect(html).not.toContain('ringPlaceholder')
    expect(html).toContain('Your site visitors')
    expect(html).toContain('Your Dance Floor')
    expect(html).toContain('Darker states sent you more visitors.')
    expect(html).toContain('Light = few visits. Dark = most visits.')
    expect(html).toContain('October 13, 2026')
    expect(html).not.toContain('Site visits — coming soon')
    expect(html).not.toContain('hidden=""')
    expect(html.indexOf('Next show')).toBeLessThan(html.indexOf('Birthdays'))
    expect(html.indexOf('Birthdays')).toBeLessThan(html.indexOf('Platform mix'))
    expect(html.indexOf('Platform mix')).toBeLessThan(html.indexOf('Last month at a glance'))
    expect(html.indexOf('Last month at a glance')).toBeLessThan(html.indexOf('data-testid="site-visitors"'))
    expect(html.indexOf('data-testid="site-visitors"')).toBeLessThan(html.indexOf('data-testid="dance-floor-insights"'))
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
    expect(html).toContain('Open calendar')
    expect(html).not.toContain('Add a show')
    expect(html).not.toContain('Show streak')
    expect(html).not.toContain('No show on the books')
  })

  it('shows a zero for team onboarding and a purple Live Lineup link', () => {
    const now = new Date('2026-10-12T15:00:00.000Z')
    const data = createEmptyRepDashboard(now, TIME_ZONE)
    data.monthAtAGlance = {
      periodLabel: 'September 2026',
      comparedToLabel: 'August 2026',
      rows: [
        {
          key: 'team_participants_added',
          label: 'Team onboarding participants added',
          value: 0,
          previous: 0,
          direction: 'flat',
        },
      ],
    }
    data.liveLineup = { count: 4 }
    const html = renderToStaticMarkup(
      createElement(RepDashboard, {
        onOpenSection: () => undefined,
        data,
        now,
      }),
    )
    const teamRow = html.slice(
      html.indexOf('Team onboarding participants added'),
      html.indexOf('</li>', html.indexOf('Team onboarding participants added')),
    )

    expect(teamRow).toContain('>0<')
    expect(teamRow).not.toContain('—')
    expect(html).toContain('Open Live Lineup')
    expect(html).toContain('textAction')
    expect(html).not.toContain('<small>Open Live Lineup</small>')
  })

  it('keeps every v1 card, then site visitors, then Dance Floor insights', () => {
    const now = new Date('2026-10-13T16:00:00.000Z')
    const data = createEmptyRepDashboard(now, TIME_ZONE)
    const day = 24 * 60 * 60 * 1000
    const listings: DanceFloorInsightInput[] = [
      {
        id: 'sitter',
        name: 'Unapologetically Luxe',
        itemNumber: 'ER49274',
        typePrefix: 'ER',
        collectionName: 'OG',
        price: 120,
        status: 'available',
        removalReason: null,
        listedAt: new Date(now.getTime() - 50 * day).toISOString(),
        createdAt: new Date(now.getTime() - 50 * day).toISOString(),
        updatedAt: new Date(now.getTime() - 50 * day).toISOString(),
        deletedAt: null,
        requestCount: 0,
      },
      {
        id: 'sold',
        name: 'The Sugar Kiss Earrings',
        itemNumber: 'ER99962',
        typePrefix: 'ER',
        collectionName: 'Original',
        price: 132,
        status: 'removed',
        removalReason: 'sold',
        listedAt: new Date(now.getTime() - 18 * day).toISOString(),
        createdAt: new Date(now.getTime() - 18 * day).toISOString(),
        updatedAt: now.toISOString(),
        deletedAt: now.toISOString(),
        requestCount: 1,
      },
    ]
    data.danceFloorInsights = buildDanceFloorInsights(listings, now)
    const viewedAt = now.toISOString()
    data.siteVisits = summarizeSiteVisits({
      now,
      timeZone: TIME_ZONE,
      rows: [
        { viewed_at: viewedAt, src: 'qr', us_state: 'NY' },
        { viewed_at: viewedAt, src: null, us_state: 'NY' },
        { viewed_at: viewedAt, src: null, us_state: 'NY' },
        { viewed_at: viewedAt, src: null, us_state: 'NY' },
        { viewed_at: viewedAt, src: null, us_state: 'NY' },
        { viewed_at: viewedAt, src: null, us_state: 'CA' },
        { viewed_at: viewedAt, src: null, us_state: 'TX' },
        { viewed_at: viewedAt, src: null, us_state: 'FL' },
        { viewed_at: viewedAt, src: null, us_state: 'IL' },
        { viewed_at: viewedAt, src: null, us_state: 'WA' },
      ],
    })
    const html = renderToStaticMarkup(
      createElement(RepDashboard, {
        onOpenSection: () => undefined,
        data,
        now,
      }),
    )

    expect(html).toContain('Sitting on the floor')
    expect(html).toContain('Unapologetically Luxe')
    expect(html).toContain('Original (OG)')
    expect(html).toContain('Fast movers vs sitters')
    expect(html).toContain('early data')
    expect(html).toContain('The Sugar Kiss Earrings')
    expect(html).toContain('Days on floor by type')
    expect(html).toContain('Sold')
    expect(html).not.toContain('Removed · "other"')
    expect(html).toContain('QR visits')
    expect(html).toContain('Where they are')
    expect(html).toContain('Top 5 states')
    expect(html).toContain('Darker states sent you more visitors.')
    expect(html).toContain('Light = few visits. Dark = most visits.')
    expect(html).toContain('1\u20132 visits')
    expect(html).toContain('5 visits')
    expect(html).toContain('New York, 5 visits')
    expect(html).toContain('Hover or tap a state to see its name and visit count.')
    expect(html).toContain('Dance Floor totals')
    expect(html).toContain('Feature them in your next live')
    const topStates = html.slice(html.indexOf('data-testid="top-states"'), html.indexOf('</ol>', html.indexOf('data-testid="top-states"')))
    expect(topStates).toContain('New York')
    expect(topStates).toContain('California')
    expect(topStates).toContain('Texas')
    expect(topStates).not.toContain('Washington')
    expect(html).not.toContain('hidden=""')
    expect(html).not.toContain('Site visits — coming soon')
    expect(html.indexOf('aria-label="Next show"')).toBeLessThan(html.indexOf('Birthdays'))
    expect(html.indexOf('Birthdays')).toBeLessThan(html.indexOf('Platform mix'))
    expect(html.indexOf('Platform mix')).toBeLessThan(html.indexOf('Last month at a glance'))
    expect(html.indexOf('Last month at a glance')).toBeLessThan(html.indexOf('data-testid="site-visitors"'))
    expect(html.indexOf('data-testid="site-visitors"')).toBeLessThan(html.indexOf('Sitting on the floor'))
    expect(html.indexOf('Customers')).toBeLessThan(html.indexOf('data-testid="site-visitors"'))
    expect(html.indexOf('Pending trades')).toBeLessThan(html.indexOf('Unread messages'))
    expect(html.indexOf('Unread messages')).toBeLessThan(html.indexOf('data-testid="site-visitors"'))
  })

  it('counts team onboarding participants by owner, not rep_id', () => {
    const source = readFileSync(
      new URL('../../lib/services/workspace-monthly-reports.ts', import.meta.url),
      'utf8',
    )
    const start = source.indexOf("from('team_onboarding_participants')")
    const count = source.slice(start, start + 420)

    expect(count).toContain(".eq('owner_rep_id', args.repId)")
    expect(count).not.toContain("eq('rep_id'")
  })
})
