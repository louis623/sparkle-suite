import 'server-only'
import { randomUUID, timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createMaintenanceClient } from './swap-maintenance-client'

const SMOKE_PROJECT = 'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ'
const SMOKE_REF = 'pukemqiwlyqmyytxkdmo'
const SMOKE_ORIGIN = 'https://sparkle-suite-smoke.vercel.app'
const LIVE_ORIGIN = 'https://www.yoursparklesuite.com'
const LIVE_REF = 'bqhzfkgkjyuhlsozpylf'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const bucket = 'trade-request-screenshots'
export type SwapMaintenanceScope = { runId: string | null }
type Environment = Record<string, string | undefined>

export function swapMaintenanceScope(requestUrl: string, env: Environment = process.env, requireActivation = true): SwapMaintenanceScope | null {
  const origin = new URL(requestUrl).origin
  const smoke = env.SPARKLE_ENVIRONMENT === 'smoke'
  const expectedOrigin = smoke ? SMOKE_ORIGIN : LIVE_ORIGIN
  const ref = smoke ? SMOKE_REF : LIVE_REF
  const project = smoke ? SMOKE_PROJECT : 'prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3'
  if (!project || env.VERCEL_PROJECT_ID !== project || env.VERCEL_ENV !== (smoke ? 'preview' : 'production') ||
      env.NEXT_PUBLIC_SUPABASE_URL !== 'https://'+ref+'.supabase.co' ||
      env.NEXT_PUBLIC_APP_URL !== expectedOrigin || origin !== expectedOrigin) return null
  try {
    const jwt = JSON.parse(Buffer.from((env.SUPABASE_SERVICE_ROLE_KEY ?? '').split('.')[1], 'base64url').toString())
    if (jwt.ref !== ref || jwt.role !== 'service_role') return null
  } catch { return null }
  if (smoke) {
    if (env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT !== 'smoke' || !UUID.test(env.SPARKLE_SWAP_REVIEW_RUN_ID ?? '') ||
        env.SPARKLE_SWAP_MAINTENANCE_CRON_SECRET) return null
    return { runId: env.SPARKLE_SWAP_REVIEW_RUN_ID! }
  }
  if ((requireActivation && env.SPARKLE_SWAP_MAINTENANCE_ENABLED !== 'true') ||
      env.NEXT_PUBLIC_SPARKLE_ENVIRONMENT === 'smoke' || env.SPARKLE_SWAP_REVIEW_RUN_ID) return null
  return { runId: null }
}

export function validBearer(request: Request, secret: string | undefined) {
  if (!secret?.trim()) return false
  const expected = Buffer.from('Bearer '+secret)
  const received = Buffer.from(request.headers.get('authorization') ?? '')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

export async function sweepTickets(admin: SupabaseClient, scope: SwapMaintenanceScope, limit: number, deadline: number) {
  const lease = randomUUID()
  const result = await admin.rpc('claim_swap_upload_sweep', { p_run:scope.runId, p_lease:lease, p_limit:limit })
  if (result.error) throw result.error
  let removed = 0
  for (const row of result.data ?? []) {
    if (Date.now() >= deadline) break
    const base = row.rep_id+'/trade-request-uploads/'+row.id
    const paths = row.consumed ? [row.raw_path] : [row.raw_path,base+'.jpg',base+'.800.jpg']
    const drop = await admin.storage.from(bucket).remove(paths)
    if (drop.error) throw drop.error
    const ack = await admin.rpc('finish_swap_upload_sweep',{p_id:row.id,p_lease:lease})
    if (ack.error) throw ack.error
    removed++
  }
  return { removed, backlog: (result.data?.length ?? 0) >= limit || removed < (result.data?.length ?? 0) }
}

export async function sweepScreenshots(admin: SupabaseClient, scope: SwapMaintenanceScope, limit: number, deadline: number) {
  let listings: string[] | null = null
  if (scope.runId) {
    const fixtures = await admin.from('trade_swap_review_listings').select('listing_id').eq('run_id',scope.runId).limit(100)
    if (fixtures.error) throw fixtures.error
    listings = (fixtures.data ?? []).map(row=>row.listing_id)
    if (!listings.length) return { removed:0,backlog:false }
  }
  const now = new Date().toISOString()
  let query = admin.from('trade_requests').select('id,reveal_screenshot_path,reveal_screenshot_thumb_path')
    .not('reveal_screenshot_path','is',null).lte('reveal_screenshot_expires_at',now)
    .order('reveal_screenshot_expires_at').order('id').limit(limit)
  if (listings) query = query.in('listing_id',listings)
  const result = await query
  if (result.error) throw result.error
  let removed = 0
  for (const row of result.data ?? []) {
    if (Date.now() >= deadline) break
    const paths = [row.reveal_screenshot_path,row.reveal_screenshot_thumb_path].filter(Boolean)
    // The request owns immutable paths. Garbage collection repeats the same delete after a lost acknowledgement.
    const drop = await admin.storage.from(bucket).remove(paths)
    if (drop.error) throw drop.error
    const ack = await admin.from('trade_requests').update({reveal_screenshot_path:null,reveal_screenshot_thumb_path:null,
      reveal_screenshot_size_bytes:null,reveal_screenshot_content_type:null})
      .eq('id',row.id).eq('reveal_screenshot_path',row.reveal_screenshot_path).lte('reveal_screenshot_expires_at',now)
    if (ack.error) throw ack.error
    removed++
  }
  return {removed,backlog:(result.data?.length ?? 0)>=limit || removed<(result.data?.length ?? 0)}
}

export async function runSwapMaintenance(admin: SupabaseClient, scope: SwapMaintenanceScope) {
  const deadline=Date.now()+20_000
  const [tickets,screenshots,accounting] = await Promise.allSettled([
    sweepTickets(admin,scope,25,deadline), sweepScreenshots(admin,scope,25,deadline),
    (async()=>{
      const orphan = await admin.rpc('find_swap_orphan_images',{p_run:scope.runId,p_limit:25})
      if (orphan.error) throw orphan.error
      const paths = (orphan.data ?? []).map((row: {object_path:string})=>row.object_path)
      if (paths.length) {
        const removal = await admin.storage.from(bucket).remove(paths)
        if (removal.error) throw removal.error
      }
      const pruned=await admin.rpc('prune_swap_upload_ledger',{p_run:scope.runId,p_limit:25})
      if (pruned.error) throw pruned.error
      const high=await admin.rpc('swap_staged_bytes_high',{p_run:scope.runId})
      if (high.error) throw high.error
      return {high:high.data === true,backlog:paths.length === 25}
    })(),
  ])
  const failures = [tickets,screenshots,accounting].filter(x=>x.status==='rejected').length
  return { job:'swap-maintenance', ok:failures===0, failures,
    ticketCount:tickets.status==='fulfilled'?tickets.value.removed:0,
    screenshotCount:screenshots.status==='fulfilled'?screenshots.value.removed:0,
    backlog:(tickets.status==='fulfilled' && tickets.value.backlog)||(screenshots.status==='fulfilled' && screenshots.value.backlog)||
      (accounting.status==='fulfilled' && accounting.value.backlog),
    highStagedCapacity:accounting.status==='fulfilled' && accounting.value.high,
  }
}

export async function opportunisticSweep(url: string) {
  const scope=swapMaintenanceScope(process.env.SPARKLE_ENVIRONMENT === 'smoke' ? url : (process.env.NEXT_PUBLIC_APP_URL || url),process.env,false)
  if (!scope) return
  const deadline = Date.now()+1000
  try { await sweepTickets(createMaintenanceClient(deadline),scope,2,deadline) }
  catch { console.warn('[swap-upload] opportunistic sweep deferred') }
}
