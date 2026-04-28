// One-off: applies supabase/migrations/029_ss_jewelry_photo_storage.sql
// against the Supabase pooler using DATABASE_URL.
//
// Pattern follows scripts/run-migration-028.ts. Required env: DATABASE_URL.
//
// Safety: parses the URL host and asserts it includes the known project ref
// `bqhzfkgkjyuhlsozpylf` so a stray DATABASE_URL pointed at a different
// Supabase project halts before mutating anything.
//
// In practice this migration is preferred via `supabase db push` (CLI is
// linked to the project). Kept for symmetry with 026/027/028.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Client } from 'pg'

const EXPECTED_PROJECT_REF = 'bqhzfkgkjyuhlsozpylf'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('[029] DATABASE_URL is required')
    process.exit(1)
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    console.error('[029] DATABASE_URL is not a valid URL')
    process.exit(1)
  }
  if (!parsed.hostname.includes(EXPECTED_PROJECT_REF)) {
    console.error(
      `[029] DATABASE_URL host '${parsed.hostname}' does not include expected project ref '${EXPECTED_PROJECT_REF}'. Halting.`
    )
    process.exit(1)
  }

  const sqlPath = resolve('supabase/migrations/029_ss_jewelry_photo_storage.sql')
  const sql = readFileSync(sqlPath, 'utf8')
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    console.log('[029] applying migration…')
    await client.query(sql)
    console.log('[029] migration applied OK')

    let failed = false

    const bucketRes = await client.query<{ id: string; public: boolean }>(
      `SELECT id, public FROM storage.buckets WHERE id = 'jewelry-photos'`
    )
    if (bucketRes.rows.length !== 1) {
      console.error(`[029] FAIL: expected 1 bucket row, got ${bucketRes.rows.length}`)
      failed = true
    } else if (!bucketRes.rows[0].public) {
      console.error(`[029] FAIL: bucket 'jewelry-photos' is not public`)
      failed = true
    } else {
      console.log(`[029] verify bucket: jewelry-photos exists, public=true`)
    }

    const polRes = await client.query<{ policyname: string }>(
      `SELECT policyname FROM pg_policies
       WHERE schemaname = 'storage' AND tablename = 'objects'
         AND policyname IN ('jewelry_photos_public_read','jewelry_photos_rep_insert')
       ORDER BY policyname`
    )
    const seenPolicies = new Set(polRes.rows.map((r) => r.policyname))
    for (const expected of ['jewelry_photos_public_read', 'jewelry_photos_rep_insert']) {
      if (!seenPolicies.has(expected)) {
        console.error(`[029] FAIL: missing policy '${expected}' on storage.objects`)
        failed = true
      }
    }
    console.log(`[029] verify policies: got ${polRes.rows.length}/2 — ${[...seenPolicies].join(', ')}`)

    if (failed) {
      console.error('[029] ❌ verify FAILED')
      process.exit(1)
    }
    console.log('[029] ✅ verify passed (bucket present + public, both policies installed)')
  } catch (err) {
    console.error('[029] migration FAILED', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
