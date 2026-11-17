import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { demoLineupHeartbeat, FIZZ_FESTIVAL_DEMO_REP_ID, FIZZ_FESTIVAL_DEMO_SOURCE, FIZZ_FESTIVAL_DEMO_PUBLISHER } from './demo'

/** Only an authenticated owner viewing this exact internal demo can advance its simulated source.
 * Public reads and support views cannot renew it. CAS preserves concurrent Hold/Reveal/reorder writes.
 * A real publisher replacing the demo marker permanently stops this helper from renewing that state.
 */
export async function refreshFizzFestivalDemo(db: SupabaseClient, repId: string, now: number, authorized: boolean) {
  if (!authorized || repId !== FIZZ_FESTIVAL_DEMO_REP_ID) return
  const rep = await db.from('reps').select('id,email,business_name,status').eq('id', repId).maybeSingle()
  if (rep.error) throw new Error('demo_identity_unavailable')
  if (!rep.data || rep.data.email !== 'louis@neonrabbit.net' || rep.data.business_name !== 'Fizz Festival'
    || rep.data.status !== 'active') return
  const stored = await db.from('live_lineup_states').select('revision,state').eq('rep_id', repId).maybeSingle()
  if (stored.error) throw new Error('demo_lineup_unavailable')
  if (!stored.data || Number(stored.data.revision) !== stored.data.state?.revision) return
  const next = demoLineupHeartbeat(repId, stored.data.state, now)
  if (!next) return
  const saved = await db.from('live_lineup_states').update({revision: next.revision, state: next,
    updated_at: new Date(now).toISOString()}).eq('rep_id', repId).eq('revision', stored.data.revision)
    .eq('state->>sourceVersion', FIZZ_FESTIVAL_DEMO_SOURCE)
    .eq('state->publisher->>id', FIZZ_FESTIVAL_DEMO_PUBLISHER)
  if (saved.error) throw new Error('demo_heartbeat_unavailable')
}
