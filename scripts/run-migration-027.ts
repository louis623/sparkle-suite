// One-off: applies supabase/migrations/027_nr_open_items_sort_order.sql
// against the Supabase pooler using DATABASE_URL. Deleted after the run.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Client } from 'pg'

const EXPECTED_ORDER: Array<{ rank: number; id: string }> = [
  { rank: 1, id: '0258a20b-a88d-4391-b031-1c57a2c432db' },
  { rank: 2, id: '90bd351a-70ee-4a09-8316-cf141fcceac7' },
  { rank: 3, id: 'e7afa48e-ce57-4336-a040-d636fa30ce2f' },
  { rank: 4, id: '7e44d18f-ef5c-4b9c-b6c7-d247064b65e3' },
  { rank: 5, id: '00ecb70e-0f80-46bb-9304-b1002ad28a61' },
  { rank: 6, id: '48ab88d1-945a-4afa-bd75-d9a7890a3f54' },
  { rank: 7, id: 'ed5531d8-d310-4593-b66c-72f20e038fc1' },
  { rank: 8, id: 'b8c4bdd6-1600-47d7-9fb9-b71f62725466' },
  { rank: 9, id: 'fea1b96f-f505-4da8-95e6-3d550db0aa68' },
]

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }
  const sqlPath = resolve('supabase/migrations/027_nr_open_items_sort_order.sql')
  const sql = readFileSync(sqlPath, 'utf8')
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    console.log('[027] applying migration…')
    await client.query(sql)
    console.log('[027] migration applied OK')

    const { rows } = await client.query<{
      id: string
      title: string
      sort_order: number | null
      is_action_item: boolean
      priority: string
    }>(
      `SELECT id, title, sort_order, is_action_item, priority
         FROM open_items
        WHERE is_action_item = true
        ORDER BY sort_order ASC NULLS LAST`,
    )
    console.log(`[027] verify: ${rows.length} action-item rows`)
    for (const r of rows) {
      console.log(`  - sort_order=${r.sort_order}  ${r.id}  ${r.title}  priority=${r.priority}`)
    }

    let failed = false
    if (rows.length !== EXPECTED_ORDER.length) {
      console.error(`[027] FAIL: expected ${EXPECTED_ORDER.length} rows, got ${rows.length}`)
      failed = true
    }
    for (let i = 0; i < EXPECTED_ORDER.length; i++) {
      const want = EXPECTED_ORDER[i]
      const got = rows[i]
      if (!got) {
        console.error(`[027] FAIL: missing row at position ${i + 1} (expected sort_order=${want.rank}, id=${want.id})`)
        failed = true
        continue
      }
      if (got.sort_order !== want.rank) {
        console.error(`[027] FAIL: row ${i + 1} sort_order=${got.sort_order}, expected ${want.rank}`)
        failed = true
      }
      if (got.id !== want.id) {
        console.error(`[027] FAIL: row ${i + 1} id=${got.id}, expected ${want.id}`)
        failed = true
      }
    }
    if (failed) {
      console.error('[027] ❌ verify FAILED')
      process.exit(1)
    }
    console.log('[027] ✅ verify passed (9 rows, sort_order 1-9 in declared order)')
  } catch (err) {
    console.error('[027] migration FAILED', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
