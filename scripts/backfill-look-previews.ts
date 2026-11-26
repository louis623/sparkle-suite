/**
 * One-time first Look screenshot for every rep with a public slug.
 *
 * Run only after 20261125120000_site_look_previews is applied, and only on Smoke:
 *   SPARKLE_ENVIRONMENT=smoke npx tsx scripts/backfill-look-previews.ts
 *
 * The script writes preview files and rows. It does not open a browser with a
 * service-role key, and it refuses to run when the table is missing.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { isMissingLookPreviewTable, lookPreviewFingerprint } from '@/lib/look-preview/policy'
import { processLookPreview } from '@/lib/look-preview/queue'

async function main() {
  if (process.env.SPARKLE_ENVIRONMENT !== 'smoke') {
    console.log(JSON.stringify({ shots: 0, skipped: 'not-smoke' }))
    return
  }
  const admin = createAdminClient()
  const probe = await admin.from('site_look_previews').select('rep_id').limit(1)
  if (isMissingLookPreviewTable(probe.error)) {
    console.log(JSON.stringify({ shots: 0, skipped: 'table-missing' }))
    return
  }
  if (probe.error) throw probe.error
  const reps = await admin.from('reps').select('id, public_site_slug').not('public_site_slug', 'is', null)
  if (reps.error) throw reps.error
  let shots = 0
  for (const rep of reps.data ?? []) {
    if (!rep.public_site_slug) continue
    const queued = await admin.from('site_look_previews').upsert({
      rep_id: rep.id,
      status: 'updating',
      content_fingerprint: lookPreviewFingerprint({}),
      queued_at: new Date(Date.now() - 10_000).toISOString(),
      attempt_count: 0,
      updated_at: new Date().toISOString(),
    })
    if (queued.error) continue
    const result = await processLookPreview(rep.id, { flush: true })
    if (result.status === 'ready') shots += 1
  }
  console.log(JSON.stringify({ shots }))
}

main().catch(() => {
  console.log(JSON.stringify({ shots: 0, status: 'failed' }))
  process.exitCode = 1
})
