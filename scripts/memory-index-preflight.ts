import { config } from 'dotenv'
config({ path: '.env.local' })
import { createAdminClient } from '@/lib/supabase/admin'

const TAG_PREFIXES = [
  'SESSION CLOSE',
  'ACTIVE TASK',
  'DECISION',
  'MILESTONE',
  'CLAUDE LESSON',
  'CLAUDE PATTERN',
  'CLAUDE DRIFT',
  'CLAUDE HEURISTIC',
  'CLAUDE ANTI-PATTERN',
  'CLAUDE ABOUT LOUIS',
  'PERSON NOTE',
  'RULE REVISION',
  'TOOL AWARENESS',
  'FILE SHIPPED',
  'CO-WORK PROMPT',
  'RESEARCH FINDINGS SUMMARY',
]

const CAPTURE_TAG_RE = new RegExp(`^\\s*(${TAG_PREFIXES.join('|')})`, 'i')

async function main() {
  const admin = createAdminClient()

  console.log('\n=== thoughts table existence + row count ===')
  const { count: total, error: cErr } = await admin
    .from('thoughts')
    .select('*', { count: 'exact', head: true })
  if (cErr) throw cErr
  console.log(`Total thoughts rows: ${total}`)

  console.log('\n=== memory_index_pages row count ===')
  const { count: pages, error: pErr } = await admin
    .from('memory_index_pages')
    .select('*', { count: 'exact', head: true })
  if (pErr) throw pErr
  console.log(`memory_index_pages rows: ${pages}`)

  console.log('\n=== Pull newest 1000 captures, apply client-side tag filter ===')
  const { data, error } = await admin
    .from('thoughts')
    .select('id, content, created_at, metadata')
    .order('created_at', { ascending: false })
    .range(0, 999)
  if (error) throw error
  const tagged = (data ?? []).filter((t) =>
    CAPTURE_TAG_RE.test(t.content as string),
  )
  console.log(`Tagged captures (within newest 1000): ${tagged.length}`)

  const byPrefix: Record<string, number> = {}
  for (const t of tagged) {
    const m = (t.content as string).match(/^\s*([A-Z][A-Z -]+)/)
    const key = (m?.[1] ?? 'UNKNOWN').trim()
    byPrefix[key] = (byPrefix[key] ?? 0) + 1
  }
  console.log('By tag prefix:')
  for (const [k, v] of Object.entries(byPrefix).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`)
  }

  console.log('\n=== Sample thought row shape ===')
  if (data && data.length > 0) {
    const sample = data[0]
    console.log({
      id_type: typeof sample.id,
      id_sample: sample.id,
      created_at: sample.created_at,
      metadata_keys: sample.metadata
        ? Object.keys(sample.metadata as Record<string, unknown>)
        : [],
      content_head: (sample.content as string).slice(0, 120),
    })
  }
}

main().catch((e) => {
  console.error('PREFLIGHT FAILED:', e)
  process.exit(1)
})
