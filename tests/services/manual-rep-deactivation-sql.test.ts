import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const applySql = readFileSync(
  'supabase/manual/20261014_deactivate_noncustomer_reps.sql',
  'utf8',
)
const undoSql = readFileSync(
  'supabase/manual/20261014_deactivate_noncustomer_reps_undo.sql',
  'utf8',
)
const preflightSql = readFileSync(
  'supabase/manual/20261014_deactivate_noncustomer_reps_preflight.sql',
  'utf8',
)
const schemaSql = readFileSync('supabase/migrations/006_sparkle_suite_schema.sql', 'utf8')

const deactivateEmails = [
  'louis+sparkle-beta-demo@neonrabbit.net',
  'louis+sparkle-demo-2@neonrabbit.net',
  'louischapman1@gmail.com',
  'testrep@neonrabbit.net',
  'louis+sparkle-demo@neonrabbit.net',
  'demo-prelaunch-waitlist@yoursparklesuite.com',
  'demo01@neonrabbit.net',
  'spike-b@neonrabbit.test',
  'gatetest@neonrabbit.net',
  'janetest@gmail.com',
  'sparkle-smoke+1780589740368@neonrabbit.net',
  'smoke.rep.1780593846442@example.com',
  'smoke.rep.1780598666326@example.com',
  'smoke.rep.1780601179810@example.com',
  'smoke.rep.20260605001558@example.com',
  'mila.harper.smoke.20260604@example.com',
  'sparkle-demo-1780753483318@example.test',
  'cookiefountainsdk@gmail.com',
]

const protectedEmails = [
  'braxtonsherri33@gmail.com',
  'kellyygiselleee@gmail.com',
  'lindseychapman1188@gmail.com',
  'williams.brianna19@yahoo.com',
  'ksgoforth64@gmail.com',
  'blingkitchen19@gmail.com',
  'louis@neonrabbit.net',
  'sparkle-reviewer+preview@neonrabbit.net',
  'sparkle-reviewer+local@neonrabbit.net',
  'sparkle-reviewer+loc@example.test',
  'nic-nac-support@neonrabbit.net',
  'lane-accounting-viewer@neonrabbit.internal',
]

function statements(sql: string) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
    .toLowerCase()
}

describe('manual rep deactivation script', () => {
  it('uses inactive, the reversible off value on rep_status', () => {
    expect(schemaSql).toContain(
      "CREATE TYPE rep_status AS ENUM ('onboarding', 'active', 'inactive', 'suspended', 'churned')",
    )
    expect(applySql).toContain("'inactive'::public.rep_status")
    expect(applySql).toContain('previous_status')
    expect(applySql).toContain('manual_rep_status_backup_20261014')
    expect(applySql).toContain('auth.users')
    expect(applySql).toContain('louis+sparkle-live-smoke-178119%@neonrabbit.net')
  })

  it('names every deactivation target and every protected account', () => {
    for (const email of deactivateEmails) {
      expect(applySql).toContain(email)
      expect(preflightSql).toContain(email)
    }
    for (const email of protectedEmails) {
      expect(applySql).toContain(email)
      expect(undoSql).toContain(email)
      expect(preflightSql).toContain(email)
    }
    expect(applySql).not.toContain('bqhzfkgkjyuhlsozpylf')
    expect(undoSql).not.toContain('bqhzfkgkjyuhlsozpylf')
    expect(preflightSql).not.toContain('bqhzfkgkjyuhlsozpylf')
  })

  it('does not remove rows and restores status from the backup', () => {
    for (const sql of [applySql, undoSql, preflightSql]) {
      const body = statements(sql)
      expect(body).not.toMatch(/\b(delete|drop|truncate)\b/)
    }
    expect(undoSql).toContain('SET status = b.previous_status')
    expect(undoSql).toContain('r.status = \'inactive\'::public.rep_status')
    expect(preflightSql.toLowerCase()).not.toMatch(/\b(insert|update|alter|create)\b/)
  })
})
