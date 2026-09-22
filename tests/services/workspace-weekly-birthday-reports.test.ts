import { describe, expect, it } from 'vitest'
import {
  buildWeeklyBirthdayReportBlocks,
  getWeeklyBirthdayReportPeriod,
  isWeeklyBirthdayReportDue,
  mapWeeklyBirthdayEntries,
} from '@/lib/services/workspace-weekly-birthday-reports'

describe('weekly birthday reports', () => {
  it('uses a Sunday through Saturday Eastern week across a year boundary', () => {
    const period = getWeeklyBirthdayReportPeriod(
      new Date('2027-01-01T17:00:00.000Z'),
    )
    expect(period.weekStart).toBe('2026-12-27')
    expect(period.weekEnd).toBe('2027-01-02')
    expect(period.timeZone).toBe('America/New_York')
  })

  it('treats the report as due on Sunday after the protected early-morning window', () => {
    expect(isWeeklyBirthdayReportDue(new Date('2026-09-20T09:00:00.000Z'))).toBe(true)
    expect(isWeeklyBirthdayReportDue(new Date('2026-09-20T07:59:00.000Z'))).toBe(false)
    expect(isWeeklyBirthdayReportDue(new Date('2026-09-21T09:00:00.000Z'))).toBe(false)
  })

  it('sorts both kinds chronologically, marks Today, and observes leap-day birthdays', () => {
    const period = getWeeklyBirthdayReportPeriod(new Date('2027-02-28T10:00:00.000Z'))
    const entries = mapWeeklyBirthdayEntries(
      [
        { id: 'later', name: 'Zoe', birthday_month: 3, birthday_day: 2 },
        { id: 'leap', name: 'Jamie', birthday_month: 2, birthday_day: 29 },
      ],
      'customer',
      period,
    )
    expect(entries.map((entry) => entry.recordId)).toEqual(['leap', 'later'])
    expect(entries[0]).toMatchObject({ isToday: true, isLeapDayObserved: true })
    expect(entries[0].occurrenceLabel).toContain('February 29 birthday')
  })

  it('builds one message with customer and team-member sections and direct links', () => {
    const period = getWeeklyBirthdayReportPeriod(new Date('2026-09-20T10:00:00.000Z'))
    const customerBirthdays = mapWeeklyBirthdayEntries(
      [{ id: 'customer-1', name: 'Jamie', birthday_month: 9, birthday_day: 20 }],
      'customer',
      period,
    )
    const teamBirthdays = mapWeeklyBirthdayEntries(
      [{ id: 'member-1', display_name: 'Rayna', birthday_month: 9, birthday_day: 23 }],
      'team_member',
      period,
    )
    const blocks = buildWeeklyBirthdayReportBlocks({ period, customerBirthdays, teamBirthdays })
    expect(blocks.filter((block) => block.type === 'heading').map((block) => block.text)).toEqual([
      'Customer birthdays',
      'Team-member birthdays',
    ])
    expect(JSON.stringify(blocks)).toContain('customer=customer-1')
    expect(JSON.stringify(blocks)).toContain('teamMember=member-1')
  })
})
