import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  'supabase/migrations/20260827100000_ss_remy_communications_agent_audit.sql',
  'utf8',
)
const replyApprovalService = readFileSync(
  'lib/remy-communications/reply-approvals.ts',
  'utf8',
)
const waitlistMigration = readFileSync('supabase/migrations/20260509142343_ss_prelaunch_waitlist.sql', 'utf8')
const intakeMigration = readFileSync('supabase/migrations/20260509175843_ss_prelaunch_intake.sql', 'utf8')

describe('Remy Communications schema contract', () => {
  it('keeps raw request data out of the audit log and gates sends with one-time approvals', () => {
    expect(migration).toContain('remy_communications_agent_audit_events')
    expect(migration).toContain('request_digest')
    expect(migration).not.toContain('request_body')
    expect(migration).toContain('remy_communications_reply_approvals')
    expect(migration).toContain("'requested', 'approved', 'declined', 'executing', 'executed', 'expired'")
    expect(migration).toContain("now() + interval '15 minutes'")
    expect(replyApprovalService).toContain('clientRequestId: `remy-approved:${approval.id}`')
    expect(replyApprovalService).not.toContain('randomUUID')
  })

  it('keeps classic waitlist and intake private with service-role table grants', () => {
    // The redundant policy proposal was retired in 743d5951. Check the actual
    // executable migrations rather than requiring a deliberately removed policy.
    for (const [sql, table] of [
      [waitlistMigration, 'sparkle_suite_waitlist'],
      [intakeMigration, 'sparkle_suite_intake_submissions'],
    ]) {
      expect(sql).toContain('alter table public.' + table + ' enable row level security')
      expect(sql).toContain('revoke all on table public.' + table + ' from anon, authenticated')
      expect(sql).toContain('grant select, insert, update on table public.' + table + ' to service_role')
      expect(sql).not.toContain('force row level security')
    }
  })
})
