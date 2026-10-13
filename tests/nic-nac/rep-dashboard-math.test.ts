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
  birthdayTimingLabel,
  compareGlanceMetrics,
  createEmptyRepDashboard,
  customerListHref,
  customerRecordHref,
  fullCustomerName,
  getShowCountdown,
  glanceRowHref,
  initialsFromDisplayName,
  listUpcomingBirthdays,
  monthStartLabel,
  sharePercent,
  showInDaysLabel,
} from '@/lib/services/rep-dashboard-math'

const TIME_ZONE = 'America/New_York'

describe('rep dashboard birthday window', () => {
  it('keeps birthdays inside the next 30 days and returns full names', () => {
    const birthdays = listUpcomingBirthdays({
      people: [
        { id: 'cust-jane', name: 'Jane Doe', month: 10, day: 12 },
        { id: 'cust-ava', name: 'Ava Stone', month: 11, day: 11 },
        { name: 'Late Guest', month: 11, day: 12 },
        { id: 'cust-email', name: 'jane@example.com', month: 10, day: 18 },
        { id: 'cust-phone', name: '555-010-1212', month: 10, day: 19 },
        { id: 'cust-dana', name: 'Dana Miller', month: 10, day: 18 },
      ],
      now: new Date('2026-10-12T15:00:00.000Z'),
      timeZone: TIME_ZONE,
      windowDays: BIRTHDAY_WINDOW_DAYS,
    })

    expect(birthdays.map((birthday) => birthday.name)).toEqual([
      'Jane Doe',
      '?',
      'Dana Miller',
      '?',
      'Ava Stone',
    ])
    expect(birthdays.map((birthday) => birthday.initials)).toEqual(['JD', '?', 'DM', '?', 'AS'])
    expect(birthdays.map((birthday) => birthday.daysUntil)).toEqual([0, 6, 6, 7, 30])
    expect(birthdays.map((birthday) => birthdayTimingLabel(birthday.daysUntil))).toEqual([
      'Today',
      'in 6 days',
      'in 6 days',
      'in 7 days',
      'in 30 days',
    ])
    expect(birthdays[0]).toMatchObject({
      isToday: true,
      dateLabel: 'Oct 12',
      customerId: 'cust-jane',
      recordHref: '/nic-nac?section=customer-list&customer=cust-jane',
    })
    expect(birthdays[2]).toMatchObject({
      name: 'Dana Miller',
      dateLabel: 'Oct 18',
      customerId: 'cust-dana',
      recordHref: '/nic-nac?section=customer-list&customer=cust-dana',
    })
    expect(birthdays.find((birthday) => birthday.name === 'Late Guest')).toBeUndefined()
    const serialized = JSON.stringify(birthdays)
    expect(serialized).toContain('Jane Doe')
    expect(serialized).toContain('Dana Miller')
    expect(serialized).not.toContain('Dana M.')
    expect(serialized).not.toContain('example.com')
    expect(serialized).not.toContain('555')
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
    expect(wrapped.map((birthday) => [birthday.name, birthday.initials, birthday.dateLabel, birthday.daysUntil])).toEqual([
      ['Sam', 'S', 'Jan 10', 21],
    ])
    expect(wrapped[0]?.recordHref).toBeNull()

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

  it('keeps the full first and last name and links only when a customer id exists', () => {
    expect(fullCustomerName('  Dana   Miller ')).toBe('Dana Miller')
    expect(fullCustomerName('Mary Jane Watson')).toBe('Mary Jane Watson')
    expect(fullCustomerName('Dana Miller')).not.toBe('Dana M.')
    expect(fullCustomerName('Cara Hughes')).not.toBe('CH')
    expect(fullCustomerName('jane@example.com')).toBe('')
    expect(fullCustomerName('555-010-1212')).toBe('')
    expect(customerRecordHref('cust-1')).toBe('/nic-nac?section=customer-list&customer=cust-1')
    expect(customerRecordHref(' id/with space ')).toBe(
      '/nic-nac?section=customer-list&customer=id%2Fwith%20space',
    )
    expect(customerRecordHref('  ')).toBeNull()
    expect(customerRecordHref(null)).toBeNull()
    expect(birthdayTimingLabel(0)).toBe('Today')
    expect(birthdayTimingLabel(1)).toBe('in 1 day')
    expect(birthdayTimingLabel(6)).toBe('in 6 days')
    expect(showInDaysLabel(0)).toBeNull()
    expect(showInDaysLabel(1)).toBe('in 1 day')
    expect(showInDaysLabel(3)).toBe('in 3 days')
    expect(sharePercent(212, 248)).toBe(85)
    expect(sharePercent(0, 0)).toBeNull()
    expect(monthStartLabel(new Date('2026-10-12T15:00:00.000Z'), TIME_ZONE)).toBe('October 1')
    expect(customerListHref()).toBe('/nic-nac?section=customer-list')
    expect(customerListHref('email_reachable')).toBe('/nic-nac?section=customer-list&filter=email_reachable')
    expect(customerListHref('new_this_month', '2026-10-01T04:00:00.000Z')).toBe(
      '/nic-nac?section=customer-list&filter=new_this_month&since=2026-10-01T04%3A00%3A00.000Z',
    )
    expect(glanceRowHref('shows_scheduled')).toBe('/nic-nac?section=show-calendar')
    expect(glanceRowHref('unknown')).toBeNull()
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
    const nextShowAt = html.indexOf('data-testid="next-show"')
    const showCard = html.slice(
      html.lastIndexOf('<a ', nextShowAt),
      html.indexOf('data-testid="birthdays-card"'),
    )

    expect(html).toContain('Your dashboard')
    expect(html).toContain('Last month at a glance')
    expect(html).not.toContain('This month at a glance')
    expect(html).toContain('Your customers')
    expect(html).toContain('Manage ›')
    expect(html).not.toContain('See all customers')
    expect(html).toContain('Able to receive email')
    expect(html).toContain('Able to receive texts')
    expect(html).toContain('Missing contact info')
    expect(html).toContain('New this month')
    expect(html).toContain('How you can reach them')
    expect(html).toContain('How active they are')
    expect(html).toContain('Customers added since October 1.')
    expect(html).toContain('Ordered during a LIVE in the last 90 days')
    expect(html).toContain('Gone quiet')
    expect(html).toContain('This count is from LIVE shows only.')
    expect(html).toContain('Ordered during a LIVE show before, but not in the last 90 days.')
    expect(html).toContain('filter=ordered_during_live_90')
    expect(html).toContain('filter=gone_quiet')
    expect(html).not.toContain('Can email')
    expect(html).not.toContain('Can text')
    expect(html).not.toContain('Bought in last 90 days')
    expect(html).not.toContain('Not available yet')
    expect(html).toContain('href="/nic-nac?section=customer-list"')
    expect(html).toContain('href="/nic-nac?section=show-calendar"')
    expect(html).toContain('href="/nic-nac?section=trade-board"')
    expect(html).toContain('href="/nic-nac?section=messages"')
    expect(showCard).toContain('href="/nic-nac?section=show-calendar"')
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
    expect(html.indexOf('Next show')).toBeLessThan(html.indexOf('Platform mix'))
    expect(html.indexOf('Platform mix')).toBeLessThan(html.indexOf('Birthdays'))
    expect(html.indexOf('Birthdays')).toBeLessThan(html.indexOf('Your customers'))
    expect(html.indexOf('data-testid="dance-floor-insights"')).toBeLessThan(html.indexOf('Unread messages'))
    expect(html.indexOf('Unread messages')).toBeLessThan(html.indexOf('data-testid="site-visitors"'))
    expect(html.indexOf('data-testid="site-visitors"')).toBeLessThan(html.indexOf('Last month at a glance'))
    const showsCard = html.slice(
      html.indexOf('data-testid="shows-card"'),
      html.indexOf('data-testid="birthdays-card"'),
    )
    const danceFloorCard = html.slice(
      html.indexOf('data-testid="dance-floor-insights"'),
      html.indexOf('data-testid="messages-card"'),
    )
    const messagesCard = html.slice(
      html.indexOf('data-testid="messages-card"'),
      html.indexOf('data-testid="site-visitors"'),
    )
    expect(showsCard).toContain('data-testid="next-show"')
    expect(showsCard).toContain('data-testid="platform-mix"')
    expect(showsCard).toContain('Your shows')
    expect(danceFloorCard).toContain('data-testid="dance-floor-card"')
    expect(danceFloorCard).toContain('data-testid="pending-trades"')
    expect(danceFloorCard).toContain('Your Dance Floor')
    expect(danceFloorCard).toContain('No pieces yet')
    expect(messagesCard).toContain('data-testid="unread-messages"')
    expect(messagesCard).toContain('Open Message Center')
    expect(html).not.toContain('Choose a tool')
    expect(html).not.toContain('data-pulse="true"')
    expect(html).not.toContain('Open site ›')
    expect(html).not.toContain('See details ›')
    const monthCard = html.slice(html.indexOf('data-testid="month-at-a-glance"'))
    const heatmap = html.slice(
      html.indexOf('data-testid="visit-heatmap"'),
      html.indexOf('data-testid="qr-visits"'),
    )
    const visitMap = html.slice(
      html.indexOf('data-testid="visit-map"'),
      html.indexOf('data-testid="month-at-a-glance"'),
    )
    const siteVisits = html.slice(
      html.indexOf('data-testid="site-visits"'),
      html.indexOf('data-testid="visit-heatmap"'),
    )
    expect(monthCard).not.toContain('Manage ›')
    expect(heatmap).not.toContain('Manage ›')
    expect(heatmap).not.toContain('Open site ›')
    expect(visitMap).not.toContain('Manage ›')
    expect(visitMap).not.toContain('Open site ›')
    expect(siteVisits).not.toContain('Open site ›')
    expect(siteVisits).not.toContain('Manage ›')
    expect(html.slice(html.indexOf('data-testid="qr-visits"'), html.indexOf('data-testid="visit-map"'))).toContain('Manage ›')
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
    data.customers.total = 248
    data.customers.ableToEmail = 212
    data.customers.ableToText = 164
    data.customers.missingContact = 19
    data.customers.addedThisMonth = 14
    data.customers.liveOrderActivity = {
      available: true,
      orderedDuringLiveLast90Days: 97,
      goneQuiet: 61,
      windowStartIso: '2026-07-14T15:00:00.000Z',
    }
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
        publicSiteHref: 'https://www.yoursparklesuite.com/lindsey',
      }),
    )
    const customersCard = html.slice(
      html.indexOf('data-testid="customers-card"'),
      html.indexOf('data-testid="dance-floor-card"'),
    )

    expect(html).toContain('data-pulse="true"')
    expect(customersCard).toContain('248')
    expect(customersCard).toContain('212')
    expect(customersCard).toContain('85%')
    expect(customersCard).toContain('164')
    expect(customersCard).toContain('66%')
    expect(customersCard).toContain('+14')
    expect(customersCard).toContain('filter=email_reachable')
    expect(customersCard).toContain('filter=sms_reachable')
    expect(customersCard).toContain('filter=missing_contact')
    expect(customersCard).toContain('filter=new_this_month')
    expect(customersCard).toContain('97')
    expect(customersCard).toContain('61')
    expect(customersCard).toContain('Ordered during a LIVE in the last 90 days')
    expect(customersCard).toContain('Gone quiet')
    expect(customersCard).toContain('This count is from LIVE shows only.')
    expect(customersCard).toContain('filter=ordered_during_live_90')
    expect(customersCard).toContain('filter=gone_quiet')
    expect(customersCard).toContain('since=2026-07-14T15')
    expect(customersCard).not.toContain('Bought in last 90 days')
    expect(customersCard).not.toContain('Not available yet')
    expect(customersCard).not.toContain('Dana M.')
    expect(html).toContain('Open site ›')
    const siteVisits = html.slice(
      html.indexOf('data-testid="site-visits"'),
      html.indexOf('data-testid="visit-heatmap"'),
    )
    expect(siteVisits).toContain('Open site ›')
    expect(siteVisits).not.toContain('Manage ›')
    expect(html).toContain('href="https://www.yoursparklesuite.com/lindsey"')
    expect(html).toContain('href="/nic-nac?section=card-qr"')
    expect(html).toContain('Friday Live')
    expect(html).toContain('in 3 days')
    expect(html).toContain('3d 2h 30m')
    expect(html).toContain('Open Dance Floor')
    expect(html).toContain('Open calendar')
    expect(html).not.toContain('Add a show')
    expect(html).not.toContain('Show streak')
    expect(html).not.toContain('No show on the books')
  })

  it('shows full birthday names, dates, timing, and customer record links', () => {
    const now = new Date('2026-10-12T15:00:00.000Z')
    const data = createEmptyRepDashboard(now, TIME_ZONE)
    data.birthdays = listUpcomingBirthdays({
      people: [
        { id: 'cust-jane', name: 'Jane Doe', month: 10, day: 12 },
        { id: 'cust-dana', name: 'Dana Miller', month: 10, day: 18 },
        { id: 'cust-cara', name: 'Cara Hughes', month: 10, day: 13 },
        { name: 'Sam Rivers', month: 10, day: 20 },
        { id: 'cust-7', name: 'Seventh Person', month: 10, day: 21 },
        { id: 'cust-8', name: 'Eighth Person', month: 10, day: 22 },
        { id: 'cust-9', name: 'Ninth Person', month: 10, day: 23 },
        { id: 'cust-10', name: 'Tenth Person', month: 10, day: 24 },
      ],
      now,
      timeZone: TIME_ZONE,
    })
    const html = renderToStaticMarkup(
      createElement(RepDashboard, {
        onOpenSection: () => undefined,
        data,
        now,
      }),
    )
    const birthdaysCard = html.slice(html.indexOf('Birthdays'), html.indexOf('data-testid="customers-card"'))

    expect(birthdaysCard).toContain('Jane Doe')
    expect(birthdaysCard).toContain('Oct 12')
    expect(birthdaysCard).toContain('Today')
    expect(birthdaysCard).toContain('Dana Miller')
    expect(birthdaysCard).toContain('Oct 18')
    expect(birthdaysCard).toContain('in 6 days')
    expect(birthdaysCard).toContain('Cara Hughes')
    expect(birthdaysCard).toContain('in 1 day')
    expect(birthdaysCard).toContain('href="/nic-nac?section=customer-list&amp;customer=cust-jane"')
    expect(birthdaysCard).toContain('href="/nic-nac?section=customer-list&amp;customer=cust-dana"')
    expect(birthdaysCard).toContain('Sam Rivers')
    const unlinkedBirthday = birthdaysCard.slice(
      birthdaysCard.indexOf('Sam Rivers'),
      birthdaysCard.indexOf('Seventh Person'),
    )
    expect(unlinkedBirthday).not.toContain('Manage ›')
    expect(birthdaysCard.slice(birthdaysCard.indexOf('Jane Doe'), birthdaysCard.indexOf('Dana Miller'))).toContain('Manage ›')
    expect(birthdaysCard).toContain('Seventh Person')
    expect(birthdaysCard).not.toContain('Ninth Person')
    expect(birthdaysCard).not.toContain('Tenth Person')
    expect(birthdaysCard).not.toContain('href="/nic-nac?section=customer-list&amp;customer="')
    expect(birthdaysCard.match(/<a /g)).toHaveLength(5)
    expect(birthdaysCard).not.toContain('>JD<')
    expect(birthdaysCard).not.toContain('>CH<')
    expect(birthdaysCard).not.toContain('>DM<')
    expect(birthdaysCard).not.toContain('Dana M.')
    expect(birthdaysCard).toContain('2 more in the next 30 days.')
    expect(birthdaysCard.match(/<li/g)).toHaveLength(6)
  })

  it('keeps the leap-day note and the hour countdown beside the new wording', () => {
    const now = new Date('2027-02-28T17:00:00.000Z')
    const data = createEmptyRepDashboard(now, TIME_ZONE)
    data.birthdays = listUpcomingBirthdays({
      people: [{ id: 'cust-leap', name: 'Leap Day', month: 2, day: 29 }],
      now,
      timeZone: TIME_ZONE,
    })
    data.nextShow = {
      title: 'Tonight Live',
      platform: 'Whatnot',
      eventTime: '2027-02-28T20:30:00.000Z',
      timeZone: TIME_ZONE,
    }
    const html = renderToStaticMarkup(
      createElement(RepDashboard, {
        onOpenSection: () => undefined,
        data,
        now,
      }),
    )
    const birthdaysCard = html.slice(html.indexOf('Birthdays'), html.indexOf('data-testid="customers-card"'))
    const showCard = html.slice(html.indexOf('data-testid="next-show"'), html.indexOf('Birthdays'))

    expect(birthdaysCard).toContain('Leap Day')
    expect(birthdaysCard).toContain('Feb 28')
    expect(birthdaysCard).toContain('Today')
    expect(birthdaysCard).toContain('Feb 29 birthday')
    expect(showCard).toContain('3h 30m')
    expect(showCard).not.toContain('in 0 days')
    expect(showCard).not.toContain('>Now<')
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
    const showsCard = html.slice(
      html.indexOf('data-testid="shows-card"'),
      html.indexOf('data-testid="birthdays-card"'),
    )
    expect(showsCard).toContain('Open Live Lineup')
    expect(showsCard).toContain('Live Lineup shows')
    expect(showsCard).toContain('>4<')
    expect(html).toContain('textAction')
    expect(html).not.toContain('<small>Open Live Lineup</small>')
  })

  it('groups stats under subject cards, with shows first and last month after site visitors', () => {
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
    const danceFloorCard = html.slice(
      html.indexOf('data-testid="dance-floor-insights"'),
      html.indexOf('data-testid="messages-card"'),
    )
    const visitorsCard = html.slice(
      html.indexOf('data-testid="site-visitors"'),
      html.indexOf('data-testid="month-at-a-glance"'),
    )
    expect(danceFloorCard).toContain('Active listings')
    expect(danceFloorCard).toContain('Pending trades')
    expect(danceFloorCard).toContain('Sitting on the floor')
    expect(danceFloorCard).toContain('Floor mix')
    expect(danceFloorCard).toContain('Fast movers vs sitters')
    expect(danceFloorCard).toContain('Days on floor by type')
    expect(danceFloorCard).toContain('Outcomes')
    expect(visitorsCard).toContain('data-testid="site-visits"')
    expect(visitorsCard).toContain('data-testid="visit-heatmap"')
    expect(visitorsCard).toContain('data-testid="qr-visits"')
    expect(visitorsCard).toContain('data-testid="visit-map"')
    expect(visitorsCard).toContain('Top 5 states')
    expect(html.indexOf('data-testid="next-show"')).toBeLessThan(html.indexOf('Platform mix'))
    expect(html.indexOf('Platform mix')).toBeLessThan(html.indexOf('Birthdays'))
    expect(html.indexOf('Birthdays')).toBeLessThan(html.indexOf('Last month at a glance'))
    expect(html.indexOf('data-testid="site-visitors"')).toBeLessThan(html.indexOf('Last month at a glance'))
    expect(html.indexOf('Sitting on the floor')).toBeLessThan(html.indexOf('data-testid="site-visitors"'))
    expect(html.indexOf('Customers')).toBeLessThan(html.indexOf('data-testid="site-visitors"'))
    expect(html.indexOf('Pending trades')).toBeLessThan(html.indexOf('Unread messages'))
    expect(html.indexOf('Unread messages')).toBeLessThan(html.indexOf('data-testid="site-visitors"'))
  })

  it('selects the customer id with each birthday row', () => {
    const source = readFileSync(new URL('../../lib/services/rep-dashboard.ts', import.meta.url), 'utf8')
    expect(source).toContain(".select('id, name, birthday_month, birthday_day')")
    expect(source).toContain('id: row.id')
    expect(source).toContain(".not('email', 'is', null)")
    expect(source).toContain(".eq('email_consent', true)")
    expect(source).toContain(".is('email_opted_out_at', null)")
    expect(source).toContain(".not('phone', 'is', null)")
    expect(source).toContain(".eq('sms_consent', true)")
    expect(source).toContain(".is('sms_opted_out_at', null)")
    expect(source).toContain(".is('stop_keyword_received_at', null)")
    expect(source).toContain('MISSING_CONTACT_FILTER')
    expect(source).toContain('readRepLiveOrderActivity')
  })

  it('shows Not available yet for LIVE order tiles without hiding the rest of the dashboard', () => {
    const now = new Date('2026-10-12T15:00:00.000Z')
    const data = createEmptyRepDashboard(now, TIME_ZONE)
    data.customers.total = 248
    data.customers.liveOrderActivity = {
      available: false,
      orderedDuringLiveLast90Days: null,
      goneQuiet: null,
      windowStartIso: null,
    }
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
    const customersCard = html.slice(
      html.indexOf('data-testid="customers-card"'),
      html.indexOf('data-testid="dance-floor-card"'),
    )

    expect(customersCard).toContain('Not available yet')
    expect(customersCard.match(/Not available yet/g)).toHaveLength(2)
    expect(customersCard).toContain('Ordered during a LIVE in the last 90 days')
    expect(customersCard).toContain('Gone quiet')
    expect(customersCard).toContain('This count is from LIVE shows only.')
    expect(customersCard).toContain('href="/nic-nac?section=customer-list&amp;filter=ordered_during_live_90"')
    expect(customersCard).toContain('href="/nic-nac?section=customer-list&amp;filter=gone_quiet"')
    expect(html).toContain('Friday Live')
    expect(html).toContain('Your site visitors')
    expect(html).toContain('Dance Floor')
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
