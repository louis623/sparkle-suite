import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { PGlite } from '@electric-sql/pglite'
import { expect, it, vi } from 'vitest'
import { lineupSqlAdapter } from './fixtures/live-lineup-sql-adapter'

// Only identity resolution and the admin-client factory are substituted. Real
// Request/Response handlers, body/origin guards, services, model, exact SQL, and
// public projection/runtime execute together. NOT signed-in or network e2e.
const seams = vi.hoisted(() => ({ admin: vi.fn(), auth: vi.fn(), support: vi.fn(), target: vi.fn(), resolve: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: seams.admin }))
vi.mock('@/lib/nic-nac/auth', () => ({ getPaidNicNacContext: seams.auth, AuthError: class extends Error {} }))
vi.mock('@/lib/operator-support/request-context', () => ({ getOperatorSupportRequestContext: seams.support }))
vi.mock('@/lib/amethyst/request-rep-target', () => ({ resolveAmethystRequestTarget: seams.target }))
vi.mock('@/lib/amethyst/preview-rep', () => ({ resolveAmethystPreviewRep: seams.resolve }))
import * as publishers from '@/app/api/workspace/live-lineup/publishers/route'
import * as publish from '@/app/api/live-lineup/publish/route'
import * as workspace from '@/app/api/workspace/live-lineup/route'
import * as readiness from '@/app/api/workspace/live-lineup/readiness/route'
import * as publicRoute from '@/app/api/amethyst/live-lineup/route'

const origin = 'https://www.yoursparklesuite.com'
const extensionOrigin = 'chrome-extension://kmodgfffflplfdlkkhadgimmobplhoih'
const rep = '11111111-1111-4111-8111-111111111111'
const other = '22222222-2222-4222-8222-222222222222'
function request(path: string, body: unknown, headers: Record<string,string> = {}, method = 'POST') {
  return new Request(origin + path, { method, headers: {origin, 'content-type':'application/json', ...headers}, body: JSON.stringify(body) })
}
async function json(response: Response, status = 200) {
  expect(response.status).toBe(status)
  expect(response.headers.get('cache-control')).toBe('no-store')
  return response.json()
}

it('preserves manual ordering through real routes/SQL and exposes only safe public results', async () => {
  const sql = new PGlite()
  try {
    await sql.exec('create role anon; create role authenticated; create role service_role bypassrls; create table reps(id uuid primary key); create table live_queue(rep_id uuid,sync_code text,queue jsonb,last_updated timestamptz); grant select on live_queue to service_role;')
    await sql.query('insert into reps values($1),($2)', [rep, other])
    await sql.exec(readFileSync(new URL('../supabase/migrations/20260910000100_live_lineup_v2.sql', import.meta.url), 'utf8'))
    await sql.exec('set role service_role')
    const fixtureClock=Date.now()
    let elapsed=0
    vi.spyOn(Date,'now').mockImplementation(()=>fixtureClock+elapsed)
    seams.admin.mockReturnValue(lineupSqlAdapter(sql))
    seams.auth.mockResolvedValue({repId:rep})
    seams.support.mockReturnValue(null)
    seams.target.mockReturnValue({targeted:true, publicSiteSlug:'synthetic'})
    seams.resolve.mockResolvedValue({id:rep, public_site_slug:'synthetic'})
    const publicRead = async () => json(await publicRoute.GET(new Request(origin+'/api/amethyst/live-lineup?publicSiteSlug=synthetic')))
    const ownerRead = async () => json(await workspace.GET())
    expect((await json(await readiness.GET())).ready).toBe(false)
    const issued = await json(await publishers.POST(request('/api/workspace/live-lineup/publishers', {label:'Synthetic laptop',repId:other})),201)
    const source = (body:unknown, extra:Record<string,string>={}) => publish.POST(request('/api/live-lineup/publish',body,
      {origin:extensionOrigin,authorization:`Bearer ${issued.token}`,...extra}))
    expect((await json(await readiness.GET())).ready).toBe(false)
    const nonce='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    await json(await source({action:'claim',claimId:nonce,generation:0},{origin:'https://evil.example'}),403)
    const claim=await json(await source({action:'claim',claimId:nonce,generation:0}))
    expect((await json(await source({action:'claim',claimId:nonce,generation:0}))).epoch).toBe(claim.epoch)
    expect((await json(await readiness.GET())).ready).toBe(false)
    const orderedAt=Date.now()-1000
    const entries=[{id:'p1:a',name:'Jessica',orderedAt},{id:'p1:b',name:'Jessica',orderedAt},{id:'p1:c',name:'Casey',orderedAt}]
    const packet={publisherId:issued.publisher.id,epoch:claim.epoch,generation:0,sequence:0,parserState:'ready',sourceVersion:'synthetic',entries,revealedIds:[]}
    await json(await source({action:'snapshot',packet}))
    expect((await json(await readiness.GET())).ready).toBe(true)
    const initialPublic=await publicRead()
    expect(initialPublic.liveQueueState).toBe('live')
    let current=await ownerRead()
    const command=async (value:unknown, expectedRevision=current.revision) => json(await workspace.POST(request('/api/workspace/live-lineup', {expectedRevision,command:value,repId:other})))
    current=await command({type:'hold',entryId:'p1:a'})
    current=await command({type:'move',entryId:'p1:c',beforeEntryId:'p1:b'})
    await json(await workspace.POST(request('/api/workspace/live-lineup',{expectedRevision:current.revision-1,command:{type:'return',entryId:'p1:a'}})),409)
    // A temporarily missing source row must not silently complete that customer.
    const nextPacket={...packet,sequence:1,entries:[entries[0],entries[2],{id:'p1:d',name:'New customer',orderedAt}]}
    await json(await source({action:'snapshot',packet:nextPacket}),429)
    // Move only the synthetic application clock past the real ingestion limit.
    // No sleeps, production limiter changes, or fabricated service responses.
    elapsed=1000
    await json(await source({action:'snapshot',packet:nextPacket}))
    current=await ownerRead()
    expect(current.entries.map((e:{id:string})=>e.id)).toEqual(['p1:c','p1:b','p1:d'])
    expect(current.heldEntries.map((e:{id:string})=>e.id)).toEqual(['p1:a'])
    const arranged=await publicRead()
    expect(arranged.liveQueueEntries.map((e:{name:string})=>e.name)).toEqual(['Casey','Jessica','New customer'])
    for(const privateValue of [issued.token,issued.publisher.id,'p1:a','p1:c','heldEntries','candidates']) expect(JSON.stringify(arranged)).not.toContain(privateValue)
    const context: { SparkleLiveLineup?: {merge:(current:unknown,next:unknown)=>unknown} } = {}
    runInNewContext(readFileSync('public/amethyst/live-lineup.js','utf8'),context)
    expect(context.SparkleLiveLineup!.merge(arranged,initialPublic)).toEqual(arranged)
    current=await command({type:'start-show',confirmed:true,partyIds:['p1'],carryEntryIds:['p1:a','p1:b','p1:c','p1:d']})
    expect(current.management.generation).toBe(1)
    expect((await json(await readiness.GET())).ready).toBe(false)
    await json(await source({action:'snapshot',packet:{...packet,sequence:2}}),409)
    const paused=await publicRead()
    expect(paused.liveQueueState).toBe('delayed')
    expect(paused.liveQueueEntries.map((e:{name:string})=>e.name)).toEqual(['Casey','Jessica','New customer'])
    expect(paused.liveQueueEntries.every((e:{highlight:boolean})=>!e.highlight)).toBe(true)
    seams.auth.mockResolvedValue({repId:other})
    expect((await ownerRead()).entries).toEqual([])
    await json(await publishers.DELETE(request('/api/workspace/live-lineup/publishers',{publisherId:issued.publisher.id},{},'DELETE')),404)
    seams.auth.mockResolvedValue({repId:rep})
    await json(await publishers.DELETE(request('/api/workspace/live-lineup/publishers',{publisherId:issued.publisher.id},{},'DELETE')))
    await json(await source({action:'claim',claimId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',generation:1}),401)
    expect((await json(await readiness.GET())).ready).toBe(false)
    expect((await publicRead()).liveQueueEntries).toEqual(paused.liveQueueEntries)
  } finally { vi.restoreAllMocks(); await sql.close() }
},30_000)
