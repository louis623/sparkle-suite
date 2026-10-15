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
const classificationSql = readFileSync(
  'supabase/migrations/20260829154000_ss_rep_account_classification.sql',
  'utf8',
)

const inactiveTargets = [
  ['bd45ca25-236a-4621-9952-4d1a8a106c8f', 'demo-prelaunch-waitlist@yoursparklesuite.com'],
  ['5f3fb1f9-8108-427c-8134-8e2e016f6974', 'demo01@neonrabbit.net'],
  ['5dc6c155-f46f-4806-85ba-636a588e653c', 'gatetest@neonrabbit.net'],
  ['db76705d-4229-4be2-ac83-57e06b9ec599', 'janetest@gmail.com'],
  ['623f80cb-238b-4706-a3f3-67ac28bd5786', 'louis+sparkle-beta-demo@neonrabbit.net'],
  ['d0b2f7da-8aa2-4e7d-983a-3263996ad58b', 'louis+sparkle-demo-2@neonrabbit.net'],
  ['7825ac2b-c5be-4d31-87c5-eaca63fe351b', 'louis+sparkle-demo@neonrabbit.net'],
  ['45d02979-b84b-47f7-a89d-f93920d55bc2', 'louis+sparkle-live-smoke-1781197388951@neonrabbit.net'],
  ['65adbb3f-56c6-48f8-90bd-3e6540b2518a', 'louis+sparkle-live-smoke-1781197885226@neonrabbit.net'],
  ['0ae79b13-6c2f-48d0-bfca-5be8f2dce46f', 'louischapman1@gmail.com'],
  ['065854fd-7e32-4251-8206-2d65f4f09e92', 'mila.harper.smoke.20260604@example.com'],
  ['196779da-85df-4b96-a3c7-cce44d7d8ed8', 'smoke.rep.1780593846442@example.com'],
  ['bc61d039-b817-425b-a35b-b5de9482429a', 'smoke.rep.1780598666326@example.com'],
  ['4f9ee538-edd4-42a2-a44a-7d21ce3043a0', 'smoke.rep.1780601179810@example.com'],
  ['1850fb28-68a2-4235-9e36-cc5a4f2d7ab8', 'smoke.rep.20260605001558@example.com'],
  ['d5decc2c-6260-462c-9d59-d34c9b0f0677', 'sparkle-demo-1780753483318@example.test'],
  ['58e5c338-3722-4428-9e32-a2bdc8b3568d', 'sparkle-smoke+1780589740368@neonrabbit.net'],
  ['c78e17af-5286-4300-9567-1f2d7b1a3881', 'spike-b@neonrabbit.test'],
  ['5314c64e-a02d-4eb2-bcee-88797dd0961c', 'testrep@neonrabbit.net'],
] as const

const stephanie = {
  id: 'cf798d57-c2f7-40d7-a862-2fc39ca3a4b1',
  email: 'cookiefountainsdk@gmail.com',
} as const

const protectedReps = [
  ['9a971c05-3631-443e-bcb8-4e9a26e15885', 'blingkitchen19@gmail.com'],
  ['43fc5fb5-205f-40cd-a42e-a36099411f19', 'braxtonsherri33@gmail.com'],
  ['b5404543-b90a-41cf-85f6-4e6d1d576cfa', 'kellyygiselleee@gmail.com'],
  ['1b8be17b-cc4f-458b-8c11-cc097be4fba3', 'ksgoforth64@gmail.com'],
  ['c24a43b7-8669-470f-8088-c2163f1c1de3', 'lane-accounting-viewer@neonrabbit.internal'],
  ['f82734fd-6964-42c7-b67d-c2445528c3b4', 'lindseychapman1188@gmail.com'],
  ['ac3e643a-6ccf-4400-8230-662f63a07f3e', 'louis@neonrabbit.net'],
  ['6e545f46-9449-4a07-a25a-8e859eba383f', 'nic-nac-support@neonrabbit.net'],
  ['ff7b4656-f9ab-431d-b4a4-558e0c8513ca', 'sparkle-reviewer+loc@example.test'],
  ['473cba20-7401-4bd4-af82-9e10e8bfacee', 'sparkle-reviewer+local@neonrabbit.net'],
  ['f2fdba81-4122-4de4-9695-f9caf9c4aba5', 'sparkle-reviewer+preview@neonrabbit.net'],
  ['2b5a27c5-9c05-4014-8d0b-754e19815bf6', 'williams.brianna19@yahoo.com'],
] as const

function uncomment(sql: string) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--.*$/gm, ' ')
}

function statements(sql: string) {
  return uncomment(sql).toLowerCase()
}

function uuidList(sql: string, name: string) {
  const match = sql.match(new RegExp(`${name}[\\s\\S]*?ARRAY\\[([\\s\\S]*?)\\]`))
  if (!match) throw new Error(`missing ${name}`)
  return [...match[1].matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)].map((item) =>
    item[0],
  )
}

describe('manual rep deactivation script', () => {
  it('keeps the status enum and the customer classification value', () => {
    expect(schemaSql).toContain(
      "CREATE TYPE rep_status AS ENUM ('onboarding', 'active', 'inactive', 'suspended', 'churned')",
    )
    expect(classificationSql).toContain("CHECK (account_classification IN ('customer', 'demo'))")
    expect(applySql).toContain("e.enumlabel = 'inactive'")
    expect(applySql).toContain("e.enumlabel = 'churned'")
    expect(applySql).toContain("strpos(pg_get_constraintdef(oid), '''customer''') > 0")
  })

  it('targets the verified UUID lists and aborts unless 20 rows match', () => {
    for (const sql of [applySql, undoSql, preflightSql]) {
      expect(sql).toContain('expected_inactive_count: 19')
      expect(sql).toContain('expected_churned_count: 1')
      expect(sql).toContain('expected_match_count: 20')
      expect(uuidList(sql, 'inactive_ids')).toEqual(inactiveTargets.map(([id]) => id))
      expect(uuidList(sql, 'churned_ids')).toEqual([stephanie.id])
      expect(uuidList(sql, 'protected_ids')).toEqual(protectedReps.map(([id]) => id))
      expect(sql).toContain(stephanie.email)
      for (const [, email] of [...inactiveTargets, ...protectedReps]) {
        expect(sql).toContain(email)
      }
    }

    expect(applySql).toContain('expected_inactive constant int := 19')
    expect(applySql).toContain('expected_churned constant int := 1')
    expect(applySql).toContain('expected_total constant int := 20')
    expect(applySql).toContain('expected_match_count mismatch')
    expect(applySql).toContain('a target UUID overlaps the protected list')
    expect(applySql).not.toContain('bqhzfkgkjyuhlsozpylf')
    expect(undoSql).not.toContain('bqhzfkgkjyuhlsozpylf')
    expect(preflightSql).not.toContain('bqhzfkgkjyuhlsozpylf')
  })

  it('does not match by email or LIKE, and sets Stephanie apart from the inactive list', () => {
    for (const sql of [applySql, undoSql, preflightSql]) {
      const body = statements(sql)
      expect(body).not.toMatch(/\blike\b/)
      expect(uncomment(sql)).not.toContain('@')
    }

    const inactiveUpdate = applySql.slice(
      applySql.indexOf("SET status = 'inactive'::public.rep_status"),
      applySql.indexOf("SET status = 'churned'::public.rep_status"),
    )
    expect(inactiveUpdate).toContain('id = ANY (inactive_ids)')
    expect(inactiveUpdate).not.toContain('account_classification')
    expect(applySql).toContain("account_classification = 'customer'")
    expect(applySql).toContain('id = ANY (churned_ids)')
  })

  it('backs up every changed column and restores those values exactly', () => {
    for (const sql of [applySql, undoSql, preflightSql]) {
      const body = statements(sql)
      expect(body).not.toMatch(/\b(delete|drop|truncate)\b/)
    }

    const insertAt = applySql.indexOf('INSERT INTO public.manual_rep_status_backup_20261014')
    const inactiveAt = applySql.indexOf("SET status = 'inactive'::public.rep_status")
    expect(applySql.indexOf('ENABLE ROW LEVEL SECURITY')).toBeGreaterThan(0)
    expect(applySql.indexOf('ENABLE ROW LEVEL SECURITY')).toBeLessThan(insertAt)
    expect(applySql.indexOf('REVOKE ALL ON TABLE public.manual_rep_status_backup_20261014')).toBeLessThan(insertAt)
    expect(insertAt).toBeLessThan(inactiveAt)
    expect(applySql).toContain('previous_status')
    expect(applySql).toContain('previous_account_classification')
    expect(applySql).toContain('previous_updated_at')
    expect(applySql).toContain('ON CONFLICT (rep_id) DO NOTHING')
    expect(applySql).toContain('sparkle.allow_rep_deactivation')
    expect(applySql.match(/^BEGIN;$/gm)).toEqual(['BEGIN;'])
    expect(applySql.match(/^COMMIT;$/gm)).toEqual(['COMMIT;'])

    expect(undoSql).toContain('SET status = b.previous_status')
    expect(undoSql).toContain('account_classification = b.previous_account_classification')
    expect(undoSql).toContain('updated_at = b.previous_updated_at')
    expect(statements(undoSql)).not.toMatch(/\bnow\s*\(\s*\)/)
    expect(undoSql).not.toContain("r.status = 'inactive'::public.rep_status")
    expect(undoSql).toContain('sparkle.allow_rep_deactivation')
    expect(undoSql.match(/^BEGIN;$/gm)).toEqual(['BEGIN;'])
    expect(undoSql.match(/^COMMIT;$/gm)).toEqual(['COMMIT;'])

    expect(statements(preflightSql)).not.toMatch(/\b(insert|update|alter|create|begin|commit)\b/)
  })
})
