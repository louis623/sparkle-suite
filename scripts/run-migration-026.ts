// One-off: applies supabase/migrations/026_nr_open_items_action_flag.sql
// against the Supabase pooler using DATABASE_URL. Deleted after the run.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Client } from 'pg'

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }
  const sqlPath = resolve('supabase/migrations/026_nr_open_items_action_flag.sql')
  const sql = readFileSync(sqlPath, 'utf8')
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await client.connect()
  try {
    console.log('[026] applying migration…')
    await client.query(sql)
    console.log('[026] migration applied OK')

    const { rows } = await client.query<{
      id: string
      title: string
      is_action_item: boolean
    }>(
      "SELECT id, title, is_action_item FROM open_items WHERE project='va_compensation' AND is_action_item=true ORDER BY title",
    )
    console.log(`[026] verify: ${rows.length} action-item rows for va_compensation`)
    for (const r of rows) {
      console.log(`  - ${r.id}  ${r.title}  is_action_item=${r.is_action_item}`)
    }
    if (rows.length !== 8) {
      console.error(`[026] FAIL: expected 8 rows, got ${rows.length}`)
      process.exit(1)
    }
    console.log('[026] ✅ verify passed (8 rows)')
  } catch (err) {
    console.error('[026] migration FAILED', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
