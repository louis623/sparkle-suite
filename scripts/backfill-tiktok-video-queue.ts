import { createClient } from '@supabase/supabase-js'

async function main() {
  const args = process.argv.slice(2)
  const slugs: string[] = []
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--rep' && args[index + 1]) slugs.push(args[++index])
    else if (args[index] !== '--apply') throw new Error('Use --rep <slug> [--rep <slug>] [--apply].')
  }
  if (!slugs.length) throw new Error('--rep is required.')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supply the selected environment through protected environment variables.')
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const apply = args.includes('--apply')
  for (const slug of [...new Set(slugs)]) {
    const repResult = await admin.from('reps').select('id,status,public_site_slug').eq('public_site_slug', slug).maybeSingle()
    if (repResult.error) throw repResult.error
    const rep = repResult.data
    if (!rep) { console.info(`${slug}: skipped, rep not present`); continue }
    const enabled = await admin.rpc('tiktok_hosted_video_enabled', { p_rep_id: rep.id })
    if (enabled.error) throw enabled.error
    if (!enabled.data || rep.status !== 'active') { console.info(`${slug}: skipped, inactive or not enabled`); continue }
    if (slug === 'sparkle-reviewer-preview') { console.info('skipped reviewer fixture'); continue }
    if (apply) {
      const sync = await admin.rpc('tiktok_sync_rep', { p_rep_id: rep.id, p_origin: 'backfill' })
      if (sync.error) throw sync.error
      if (slug === 'brittwithbling') {
        const featured = await admin.rpc('tiktok_queue_add_static', { p_rep_id: rep.id, p_url: 'https://www.tiktok.com/embed/7609434971228425486' })
        if (featured.error) throw featured.error
      }
    }
    const [slots, assets, dismissals, pending] = await Promise.all([
      admin.rpc('tiktok_current_slot_ids', { p_rep_id: rep.id }),
      admin.from('public_site_videos').select('tiktok_video_id').eq('rep_id', rep.id).eq('status', 'live'),
      admin.from('tiktok_video_dismissals').select('tiktok_video_id').eq('rep_id', rep.id),
      admin.from('tiktok_video_queue').select('tiktok_video_id,slot_keys').eq('rep_id', rep.id).eq('status', 'pending'),
    ])
    for (const result of [slots, assets, dismissals, pending]) if (result.error) throw result.error
    const completed = new Set([...(assets.data ?? []), ...(dismissals.data ?? [])].map(item => item.tiktok_video_id))
    const wanted = new Map<string, Set<string>>()
    for (const slot of (slots.data ?? []) as Array<{ vid: string; slot_key: string }>) {
      if (completed.has(slot.vid)) continue
      if (!wanted.has(slot.vid)) wanted.set(slot.vid, new Set())
      wanted.get(slot.vid)!.add(slot.slot_key)
    }
    if (slug === 'brittwithbling' && !completed.has('7609434971228425486')) {
      if (!wanted.has('7609434971228425486')) wanted.set('7609434971228425486', new Set())
      wanted.get('7609434971228425486')!.add('featured_reveal')
    }
    const newCount = [...wanted.keys()].filter(id => !(pending.data ?? []).some(item => item.tiktok_video_id === id)).length
    console.info(JSON.stringify({ rep: slug, mode: apply ? 'applied' : 'dry-run', pendingItems: pending.data?.length ?? 0, wouldCreate: newCount, slots: [...wanted.values()].map(keys => [...keys].sort()) }))
  }
  if (!slugs.includes('brittwithbling')) console.info('skipped: brittwithbling not selected')
}
main().catch(() => { console.error('TikTok backfill failed. Verify the selected Smoke configuration.'); process.exitCode = 1 })
