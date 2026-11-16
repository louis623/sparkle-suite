import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { createLineupState, claimPublisher, applySourcePacket } from '@/lib/live-lineup/model'
import { advanceMonitor, applyExpectedShow, groupChangedStructures, structureSignature, adoptionDue, classifyAdoption, incidentStillSendable, monitorFacts, type MonitorFacts, type MonitorState } from '@/lib/live-lineup/monitor'
import { deliverMonitorJob, incidentPayload, monitorConfiguration, type MonitorDelivery } from '@/lib/live-lineup/monitor-delivery'
import { verifyPublicFeed } from '@/lib/live-lineup/monitor-public'

const at = Date.parse('2026-11-16T18:00:00.000Z'), stamp = (offset: number) => new Date(at + offset).toISOString()
const rep = '11111111-1111-4111-8111-111111111111', incident = '22222222-2222-4222-8222-222222222222'
function facts(offset: number, overrides: Partial<MonitorFacts> = {}): MonitorFacts {
  return {repId: rep, slug: 'synthetic-monitor', health: 'unhealthy', reason: 'columns_changed', revision: offset + 1,
    receivedAt: stamp(offset), lastReadyAt: null, workerVersion: '2.0.8', readerVersion: '2.0.8', structureHash:null,lastGoodStructureHash:null,publicVerification: 'not_checked', ...overrides}
}
const update = (state: MonitorState | null, offset: number, overrides: Partial<MonitorFacts> = {}) => advanceMonitor(state, facts(offset, overrides), at + offset, incident)
function open() {
  let state = update(null, 0).state
  for (const t of [60_000,120_000]) state = update(state,t).state
  return update(state,180_000)
}
afterEach(() => {vi.unstubAllEnvs(); vi.restoreAllMocks()})

describe('Live Lineup monitor', () => {
  it('alerts once only after three continuous minutes, resets on good read/silence/scheduler gaps', () => {
    let state = update(null,0).state
    for (const t of [60_000,120_000,179_999]) {
      const next = update(state,t); expect(next.event).toBeNull(); state = next.state
    }
    expect(update(state,180_000).event?.kind).toBe('incident')
    expect(update(state,180_000,{reason:'row_incomplete'}).event?.kind).toBe('incident')
    expect(update(open().state,240_000).event).toBeNull()
    // A good read occurred and failed again between samples: it still interrupts the failure interval.
    expect(update(state,180_000,{lastReadyAt:stamp(175_000)}).state.unhealthySince).toBe(stamp(180_000))
    expect(update(state,180_000,{health:'unknown'}).state.unhealthySince).toBeNull()
    expect(update(state,300_000).event).toBeNull()
    const silent = facts(0,{health:'unknown',reason:'feed_unverified'})
    const window = [{event_time:stamp(-60_000),duration_minutes:10}]
    expect(applyExpectedShow(silent,window,at+90_000).reason).toBe('feed_stopped_show_unverified')
    expect(applyExpectedShow(silent,[],at+90_000).health).toBe('unknown')
    expect(applyExpectedShow(silent,window,at+600_000).health).toBe('unknown')
    expect(applyExpectedShow({...silent,receivedAt:stamp(-120_000)},window,at+90_000).health).toBe('unknown')
    let mismatch = update(null,0,{reason:'public_feed_mismatch',lastReadyAt:stamp(0)}).state
    for (const t of [60_000,120_000]) mismatch = update(mismatch,t,{reason:'public_feed_mismatch',lastReadyAt:stamp(t)}).state
    expect(update(mismatch,180_000,{reason:'public_feed_mismatch',lastReadyAt:stamp(180_000)}).event?.kind).toBe('incident')
  })

  it('requires two distinct fresh healthy receipts; blocks unsent alerts after recovery', () => {
    const broken = open().state
    expect(incidentStillSendable(broken,facts(180_000),incident,at+180_000)).toBe(true)
    const healthy = facts(240_000,{health:'healthy',reason:'ready',lastReadyAt:stamp(240_000)})
    expect(incidentStillSendable(broken,healthy,incident,at+240_000)).toBe(false)
    const first = advanceMonitor(broken,healthy,at+240_000,incident)
    expect(first.event).toBeNull()
    const duplicate = advanceMonitor(first.state,healthy,at+250_000,incident)
    expect(duplicate.event).toBeNull()
    expect(duplicate.state.recoveryStreak).toBe(1)
    const recovered = update(duplicate.state,260_000,{health:'healthy',reason:'ready',lastReadyAt:stamp(260_000)})
    expect(recovered.event).toEqual({kind:'recovery',incidentId:incident})
    expect(recovered.state.incidentId).toBeNull()
  })

  it('projects safe facts, verifies recovery feed metadata, and classifies adoption from fresh matching reports', async () => {
    const claimed = claimPublisher(createLineupState(),rep,0,at,{claimId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'})
    if (!claimed.ok) throw new Error('fixture claim failed')
    const applied = applySourcePacket(claimed.state,{publisherId:rep,claimId:claimed.state.publisher!.claimId,epoch:claimed.state.publisher!.epoch,
      sequence:0,sourceVersion:'2.0.8',parserState:'ready',entries:[{id:'sensitive-id',name:'PRIVATE CUSTOMER',orderedAt:at}],revealedIds:[]},at)
    if (!applied.ok) throw new Error('fixture source failed')
    const safe = monitorFacts(rep,'synthetic-monitor',applied.state,at)
    expect(JSON.stringify(safe)).not.toMatch(/PRIVATE CUSTOMER|sensitive-id|claimId|token/)
    expect(safe.health).toBe('healthy')
    const structure = {version:1,columns:['OrderID','FirstName','IsRevealed'],bodyCount:1,rowCount:'1-10',unmatchedRows:'0',hasOrderIdAttribute:true,hasPartyIdAttribute:true,hasOrderTimeAttribute:true}
    const signature = structureSignature(structure)
    expect(signature).toMatch(/^[a-f0-9]{64}$/)
    expect(structureSignature({...structure,rowCount:'11-100'})).toBe(signature)
    expect(structureSignature({...structure,customer:'PRIVATE CUSTOMER'})).toBeNull()
    expect(groupChangedStructures([facts(0,{structureHash:signature,lastGoodStructureHash:'old'}),facts(0,{repId:incident,structureHash:signature,lastGoodStructureHash:'old'})])).toHaveLength(1)
    expect(groupChangedStructures([facts(0,{structureHash:signature,lastGoodStructureHash:signature})])).toHaveLength(0)
    vi.stubEnv('VERCEL_ENV','production'); vi.stubEnv('SPARKLE_ENVIRONMENT','live')
    const publicResponse = {liveQueueRevision:applied.state.revision,liveQueueSourceReady:true,
      liveQueueState:'live',liveQueueLastUpdated:applied.state.lastReadyAt,liveQueueEntries:[{name:'PRIVATE CUSTOMER'}]}
    const publicFetch = vi.fn(async () => new Response(JSON.stringify(publicResponse)))
    expect(await verifyPublicFeed(rep,applied.state,publicFetch)).toBe('matched')
    expect(await verifyPublicFeed(rep,applied.state,async () => new Response(JSON.stringify({...publicResponse,liveQueueRevision:999})))).toBe('unknown')
    expect(await verifyPublicFeed(rep,applied.state,async () => new Response(JSON.stringify({...publicResponse,liveQueueSourceReady:false})))).toBe('mismatch')
    expect(await verifyPublicFeed(rep,applied.state,async () => {throw new Error('offline')})).toBe('unknown')
    vi.stubEnv('VERCEL_ENV','preview'); publicFetch.mockClear()
    expect(await verifyPublicFeed(rep,applied.state,publicFetch)).toBe('unknown'); expect(publicFetch).not.toHaveBeenCalled()
    expect(monitorFacts(rep,'synthetic-monitor',applied.state,at+90_000).health).toBe('unknown')
    const release = {protocol:1,version:'2.0.8',publishedAt:stamp(-86_400_000),rolloutEnabled:true}
    expect(adoptionDue(release,at)).toBe(true)
    expect(adoptionDue({...release,publishedAt:null},at)).toBe(false)
    expect(classifyAdoption(facts(0),release,at)).toBe('updated')
    expect(classifyAdoption(facts(0,{workerVersion:'2.0.7',readerVersion:null}),release,at)).toBe('older')
    expect(classifyAdoption(facts(-600_000),release,at)).toBe('updated')
    expect(classifyAdoption(facts(-600_000,{workerVersion:'2.0.7',readerVersion:null}),release,at)).toBe('unknown')
    expect(classifyAdoption(facts(0,{readerVersion:'2.0.7'}),release,at)).toBe('unknown')
  })

  it('disables external delivery in Preview/defaults, fixes owner recipient, signs the independent hook and preserves retry identity', async () => {
    const job: MonitorDelivery = {id:incident,incident_id:incident,rep_id:rep,kind:'incident',channel:'email',
      payload:incidentPayload('incident',facts(0),stamp(0),stamp(180_000)),attempt_count:1,created_at:stamp(0)}
    const fetcher = vi.fn(async () => new Response(JSON.stringify({id:'provider-123'}),{status:200}))
    expect(monitorConfiguration({}).delivery).toBe(false)
    vi.stubEnv('LIVE_LINEUP_MONITOR_ENABLED','true'); vi.stubEnv('LIVE_LINEUP_ALERT_DELIVERY_ENABLED','true')
    vi.stubEnv('VERCEL_ENV','preview'); vi.stubEnv('SPARKLE_ENVIRONMENT','smoke')
    await expect(deliverMonitorJob(job,fetcher)).rejects.toThrow('delivery_disabled')
    expect(fetcher).not.toHaveBeenCalled()
    vi.stubEnv('VERCEL_ENV','production'); vi.stubEnv('SPARKLE_ENVIRONMENT','live')
    vi.stubEnv('RESEND_API_KEY','synthetic-only'); vi.stubEnv('RESEND_FROM_EMAIL','Sparkle <no-reply@example.com>')
    vi.stubEnv('LIVE_LINEUP_ALERT_WEBHOOK_URL',''); vi.stubEnv('LIVE_LINEUP_ALERT_WEBHOOK_SECRET','')
    expect(monitorConfiguration()).toMatchObject({ready:true,emailStatus:'configured_unverified',externalWatchHookStatus:'not_configured'})
    const roster = {select(){return this},eq(){return this},order(){return this},async limit(){return {data:[],error:null}}}
    const optionalJobs = Array.from({length:4},(_,index) => ({...job,id:incident.slice(0,-1)+String(index+1),channel:'webhook'}))
    const releaseFinish: Array<() => void> = []
    const db = {from:vi.fn(() => roster),rpc:vi.fn(async (name:string,_args:unknown) => name === 'live_lineup_monitor_claim'
      ? {data:optionalJobs,error:null} : await new Promise<{data:boolean;error:null}>(resolve => releaseFinish.push(() => resolve({data:true,error:null}))))}
    const {runLineupMonitor} = await import('@/lib/live-lineup/monitor-service')
    const monitorRun = runLineupMonitor(db as never,at)
    await Promise.resolve(); await Promise.resolve()
    expect(releaseFinish).toHaveLength(4) // All uniquely claimed jobs start before any finish resolves.
    releaseFinish.forEach(release => release())
    const monitorResult = await monitorRun
    expect(monitorResult.delivery).toMatchObject({accepted:0,deferred:0,skippedOptionalHooks:4})
    expect(db.rpc.mock.calls.filter(([name]) => name === 'live_lineup_monitor_finish').every(([,args]) => (args as {p_outcome:string}).p_outcome === 'canceled')).toBe(true)
    expect(db.from).toHaveBeenCalledTimes(1)
    expect(fetcher).not.toHaveBeenCalled()
    expect(await deliverMonitorJob(job,fetcher)).toBe('provider-123')
    await deliverMonitorJob(job,fetcher)
    const first = fetcher.mock.calls[0] as unknown as [string,RequestInit]
    expect(JSON.parse(first[1].body as string).to).toEqual(['louis@neonrabbit.net'])
    expect(first[1].headers).toMatchObject({'Idempotency-Key':`live-lineup/${incident}`})
    expect((fetcher.mock.calls[1] as unknown as [string,RequestInit])[1].body).toBe(first[1].body)
    vi.stubEnv('LIVE_LINEUP_ALERT_WEBHOOK_URL','https://hooks.example.com/lineup')
    vi.stubEnv('LIVE_LINEUP_ALERT_WEBHOOK_SECRET','synthetic-hook-key')
    expect(monitorConfiguration()).toMatchObject({ready:true,externalWatchHookStatus:'configured_unverified'})
    await deliverMonitorJob({...job,channel:'webhook'},fetcher)
    const hook = (fetcher.mock.calls[2] as unknown as [string,RequestInit])[1]
    const headers = hook.headers as Record<string,string>
    expect(headers['X-Sparkle-Signature']).toBe('sha256='+createHmac('sha256','synthetic-hook-key').update(headers['X-Sparkle-Timestamp']+'.'+hook.body).digest('hex'))
    expect(hook.redirect).toBe('error')
    vi.stubEnv('LIVE_LINEUP_ALERT_WEBHOOK_URL','http://localhost/unsafe')
    await expect(deliverMonitorJob({...job,channel:'webhook'},fetcher)).rejects.toThrow('webhook_not_configured')
  })

  it('rejects cron requests without the secret and returns disabled without touching a database', async () => {
    const {GET} = await import('@/app/api/internal/live-lineup/monitor/route')
    vi.stubEnv('CRON_SECRET','')
    expect((await GET(new Request('https://example.com/api/internal/live-lineup/monitor'))).status).toBe(503)
    vi.stubEnv('CRON_SECRET','synthetic-cron')
    expect((await GET(new Request('https://example.com/api/internal/live-lineup/monitor'))).status).toBe(401)
    vi.stubEnv('LIVE_LINEUP_MONITOR_ENABLED','false')
    const response = await GET(new Request('https://example.com/api/internal/live-lineup/monitor',{headers:{authorization:'Bearer synthetic-cron'}}))
    expect(response.status).toBe(200); expect((await response.json()).status).toBe('disabled')
    vi.stubEnv('LIVE_LINEUP_MONITOR_ENABLED','true'); vi.stubEnv('LIVE_LINEUP_ALERT_DELIVERY_ENABLED','true')
    vi.stubEnv('VERCEL_ENV','production'); vi.stubEnv('SPARKLE_ENVIRONMENT','live')
    let releaseDelivery!: () => void
    const rosterFailure = {select(){return this},eq(){return this},order(){return this},async limit(){throw new Error('synthetic_roster_failure')}}
    const db = {from:vi.fn(() => rosterFailure),rpc:vi.fn(async () => await new Promise(resolve => {releaseDelivery = () => resolve({data:[],error:null})}))}
    const {runLineupMonitor} = await import('@/lib/live-lineup/monitor-service')
    let settled = false
    const outcome = runLineupMonitor(db as never,at).then(() => 'unexpected_success', error => String(error.message)).then(result => {settled = true; return result})
    expect(db.rpc).toHaveBeenCalledWith('live_lineup_monitor_claim',expect.objectContaining({p_limit:4}))
    await Promise.resolve(); await Promise.resolve()
    expect(settled).toBe(false) // Roster failure must not abandon an in-flight delivery pump.
    releaseDelivery()
    expect(await outcome).toBe('synthetic_roster_failure')
    const tooMany = {select(){return this},eq(){return this},order(){return this},async limit(){return {data:Array.from({length:51},() => ({})),error:null}}}
    const capped = {from:() => tooMany,rpc:async () => ({data:[],error:null})}
    await expect(runLineupMonitor(capped as never,at)).rejects.toThrow('monitor_roster_capacity')
  })

  it('keeps durable claim/CAS, recovery-send races and one-per-release ledger boundaries in the migration', () => {
    // Structural guard only; migration must separately execute on isolated SQL before enabling monitoring.
    const migrations = readdirSync('supabase/migrations').filter(name => name.endsWith('_live_lineup_monitor.sql'))
    expect(migrations).toHaveLength(1)
    const sql = readFileSync('supabase/migrations/'+migrations[0],'utf8')
    expect(sql).toMatch(/v_revision <> p_expected_revision/)
    expect(sql).toMatch(/for update skip locked/)
    expect(sql).toMatch(/status = 'processing' and claimed_by = p_worker for update/)
    expect(sql).toMatch(/sent.kind = 'incident' and sent.status = 'accepted'/)
    expect(sql).toMatch(/email_accepted_at is null and status = 'open'/)
    expect(sql).toMatch(/'recoveringIncidentId',v_job.incident_id::text/)
    expect(sql).toMatch(/v_job.kind = 'incident' and v_job.channel = 'email'/)
    expect(sql).toMatch(/select i.id,i.rep_id,'recovery',v_job.channel/)
    expect(sql).toMatch(/unique \(release_version, channel\)/)
    expect(sql).not.toMatch(/security definer/i)
    expect(sql.match(/enable row level security/g)).toHaveLength(3)
    expect(sql.match(/from public,anon,authenticated/g)).toHaveLength(4)
  })
})
