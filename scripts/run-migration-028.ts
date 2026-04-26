// One-off: applies supabase/migrations/028_ss_thumper_guardian_hooks.sql
// against the Supabase pooler using DATABASE_URL.
//
// Pattern follows scripts/run-migration-027.ts. Required env: DATABASE_URL.
//
// Safety: parses the URL host and asserts it includes the known project ref
// `bqhzfkgkjyuhlsozpylf` so a stray DATABASE_URL pointed at a different
// Supabase project halts before mutating anything.
//
// In practice this migration was applied via `supabase db push` (CLI is
// linked to the project), not this runner. Kept for symmetry with 026/027
// and as a self-contained alternate path.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Client } from 'pg'

const EXPECTED_TABLES = [
  'auth_events',
  'sms_email_blast_audit',
  'thumper_incidents',
  'tool_executions',
  'trade_action_audit',
]

const EXPECTED_PROJECT_REF = 'bqhzfkgkjyuhlsozpylf'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('[028] DATABASE_URL is required')
    process.exit(1)
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    console.error('[028] DATABASE_URL is not a valid URL')
    process.exit(1)
  }
  if (!parsed.hostname.includes(EXPECTED_PROJECT_REF)) {
    console.error(
      `[028] DATABASE_URL host '${parsed.hostname}' does not include expected project ref '${EXPECTED_PROJECT_REF}'. Halting.`
    )
    process.exit(1)
  }

  const sqlPath = resolve('supabase/migrations/028_ss_thumper_guardian_hooks.sql')
  const sql = readFileSync(sqlPath, 'utf8')
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    console.log('[028] applying migration…')
    await client.query(sql)
    console.log('[028] migration applied OK')

    const tablesRes = await client.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename IN ('thumper_incidents','tool_executions','auth_events','trade_action_audit','sms_email_blast_audit')
       ORDER BY tablename`
    )
    const gotTables = tablesRes.rows.map((r) => r.tablename)
    console.log(`[028] verify tables: got ${gotTables.length}/5 — ${gotTables.join(', ')}`)
    let failed = false
    if (gotTables.length !== EXPECTED_TABLES.length) {
      console.error(`[028] FAIL: expected 5 tables, got ${gotTables.length}`)
      failed = true
    }

    const rlsRes = await client.query<{ relname: string; relrowsecurity: boolean }>(
      `SELECT c.relname, c.relrowsecurity
       FROM pg_class c
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relname IN ('thumper_incidents','tool_executions','auth_events','trade_action_audit','sms_email_blast_audit')
       ORDER BY c.relname`
    )
    for (const r of rlsRes.rows) {
      if (!r.relrowsecurity) {
        console.error(`[028] FAIL: RLS not enabled on '${r.relname}'`)
        failed = true
      }
    }

    const polRes = await client.query<{ tablename: string; policyname: string; roles: string[] }>(
      `SELECT tablename, policyname, roles FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename IN ('thumper_incidents','tool_executions','auth_events','trade_action_audit','sms_email_blast_audit')`
    )
    const seenTables = new Set<string>()
    for (const r of polRes.rows) {
      seenTables.add(r.tablename)
      const roles = Array.isArray(r.roles) ? r.roles : []
      if (!roles.includes('service_role')) {
        console.error(
          `[028] FAIL: policy '${r.policyname}' on '${r.tablename}' missing service_role grant`
        )
        failed = true
      }
    }
    for (const expected of EXPECTED_TABLES) {
      if (!seenTables.has(expected)) {
        console.error(`[028] FAIL: no policy found for '${expected}'`)
        failed = true
      }
    }

    if (failed) {
      console.error('[028] ❌ verify FAILED')
      process.exit(1)
    }
    console.log('[028] ✅ verify passed (5 tables, RLS enabled, service_role policies present)')
  } catch (err) {
    console.error('[028] migration FAILED', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
