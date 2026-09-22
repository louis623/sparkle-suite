import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  'supabase/migrations/20260922000200_weekly_birthday_reports.sql',
  'utf8',
)

describe('weekly birthday report migration', () => {
  it('stores only valid month/day pairs and Sunday snapshots', () => {
    expect(sql).toContain('join_team_members_birthday_valid_date')
    expect(sql).toContain('customer_audience_birthday_valid_date')
    expect(sql).toContain('when 2 then 29')
    expect(sql).toContain('extract(dow from week_start) = 0')
    expect(sql).not.toMatch(/birth_?year/i)
  })

  it('adds the private report category and narrow automation sender', () => {
    expect(sql).toContain("'birthday_report'")
    expect(sql).toContain("'birthday_reporter'")
    expect(sql).toContain('workspace_weekly_birthday_reports_own_select')
  })
})
