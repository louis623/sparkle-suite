import { describe, expect, it } from 'vitest'
import {
  buildMonthlyReportBlocks,
  buildMonthlyReportBody,
  getMonthlyReportPeriod,
  isMonthlyReportDue,
} from '@/lib/services/workspace-monthly-reports'

describe('workspace monthly reports', () => {
  it('uses the previous calendar month and current birthday month', () => {
    const period = getMonthlyReportPeriod(
      new Date('2026-08-01T13:00:00.000Z'),
      'America/New_York',
    )

    expect(period.reportMonth).toBe('2026-08-01')
    expect(period.previousMonthLabel).toBe('July 2026')
    expect(period.currentMonthLabel).toBe('August 2026')
    expect(period.birthdayMonth).toBe(8)
    expect(period.periodStart).toBe('2026-07-01T04:00:00.000Z')
    expect(period.periodEnd).toBe('2026-08-01T04:00:00.000Z')
  })

  it('handles year rollover and daylight-saving boundaries', () => {
    const january = getMonthlyReportPeriod(
      new Date('2027-01-01T14:00:00.000Z'),
      'America/New_York',
    )

    expect(january.reportMonth).toBe('2027-01-01')
    expect(january.previousMonthLabel).toBe('December 2026')
    expect(january.periodStart).toBe('2026-12-01T05:00:00.000Z')
    expect(january.periodEnd).toBe('2027-01-01T05:00:00.000Z')
  })

  it('falls back safely from an invalid timezone', () => {
    const period = getMonthlyReportPeriod(
      new Date('2026-08-01T13:00:00.000Z'),
      'not/a-zone',
    )
    expect(period.timeZone).toBe('America/New_York')
  })

  it('renders zeros and unavailable metrics without birthday content', () => {
    const period = getMonthlyReportPeriod(
      new Date('2026-08-01T13:00:00.000Z'),
      'America/New_York',
    )
    const body = buildMonthlyReportBody({
      period,
      metrics: [
        { key: 'new', label: 'Customers added', value: 0, status: 'tracked' },
        {
          key: 'views',
          label: 'Page views',
          value: null,
          status: 'unavailable',
          unavailableReason: 'Not tracked for this month',
        },
      ],
      birthdays: [
        { audienceId: 'customer-1', name: 'Jamie Smoke', month: 8, day: 12 },
      ],
    })

    expect(body).toContain('Customers added: 0')
    expect(body).toContain('Page views: Not tracked for this month')
    expect(body).not.toContain('Jamie Smoke')
    expect(body).not.toContain('Birthday')
    const blocks = buildMonthlyReportBlocks({
      period,
      metrics: [
        { key: 'new', label: 'Customers added', value: 0, status: 'tracked' },
        {
          key: 'views',
          label: 'Page views',
          value: null,
          status: 'unavailable',
          unavailableReason: 'Not tracked for this month',
        },
      ],
      birthdays: [
        { audienceId: 'customer-1', name: 'Jamie Smoke', month: 8, day: 12 },
      ],
    })
    expect(blocks).toContainEqual({
      type: 'metric',
      label: 'Customers added',
      value: 0,
    })
    expect(blocks).toContainEqual({
      type: 'metric',
      label: 'Page views',
      value: 'Not tracked for this month',
    })
    expect(blocks.some((block) => block.type === 'list')).toBe(false)
  })

  it('does not add an empty-birthdays section', () => {
    const period = getMonthlyReportPeriod(
      new Date('2026-08-01T13:00:00.000Z'),
      'America/New_York',
    )
    expect(buildMonthlyReportBody({ period, metrics: [], birthdays: [] })).not.toContain(
      'birthday',
    )
  })

  it('opens a bounded local-time recovery window for the monthly job', () => {
    expect(
      isMonthlyReportDue(
        new Date('2026-08-01T12:30:00.000Z'),
        'America/New_York',
      ),
    ).toBe(true)
    expect(
      isMonthlyReportDue(
        new Date('2026-08-01T11:30:00.000Z'),
        'America/New_York',
      ),
    ).toBe(false)
    expect(
      isMonthlyReportDue(
        new Date('2026-08-04T13:00:00.000Z'),
        'America/New_York',
      ),
    ).toBe(false)
  })
})
