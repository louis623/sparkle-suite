// Audit characterizations: passing assertions reproduce current defects,
// not acceptance criteria for a repaired system. All I/O is mocked.
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext, createContext, runInContext } from 'node:vm'
import ts from 'typescript'
import { buildLiveQueueSnapshot, normalizeLiveQueue, ensureLiveQueueSyncCodeForRep } from '@/lib/services/live-queue'
import { buildVisibleQueue } from '../../chrome-extension/queue-filter.js'

const source = readFileSync('chrome-extension/content.js', 'utf8')
const flush = async () => { for (let i=0;i<15;i++) await Promise.resolve() }
function harness(responseStatus = 200) {
  const timers: any[] = [], observers: any[] = [], messages: any[] = [], changes: any[] = []
  const storage: any = {}, requests: any[] = []
  const table: any = { isConnected: true, querySelector: (selector: string) => selector === 'thead' ? { querySelectorAll: () => ['FirstName','IsRevealed'].map(value => ({ getAttribute: () => value })) } : null }
  const context = createContext({
    console: {log: vi.fn()}, Date, AbortController,
    document: { getElementById: () => table, body: {} },
    SparkleQueueFilter: {buildPartySummaries: () => [],buildVisibleQueue},
    MutationObserver: class { cb:any; constructor(cb:any){this.cb=cb;observers.push(this)} observe(target:any,options:any){Object.assign(this,{target,options})} disconnect(){} },
    setTimeout: (cb:any,ms:number) => {const timer={cb,ms};timers.push(timer);return timer}, clearTimeout: vi.fn(),setInterval: vi.fn(),clearInterval: vi.fn(),
    fetch: vi.fn(async (_url:any, opts:any) => {requests.push(JSON.parse(opts.body));return {ok:responseStatus===200,status:responseStatus}}),
    chrome: {storage:{sync:{get:(_keys:any,cb:any)=>cb({sync_code:'SYN-0001',enabled:true})},local:{set:(data:any)=>Object.assign(storage,data)},onChanged:{addListener:(cb:any)=>changes.push(cb)}},runtime:{onMessage:{addListener:(cb:any)=>messages.push(cb)}}},
  })
  runInContext(source,context)
  return {context,timers,observers,messages,changes,storage,requests,run:(code:string)=>runInContext(code,context)}
}

describe('Live Lineup audit — reproducible current behavior', () => {
  it('unchanged alarm does not send a heartbeat',async()=>{
    const h=harness(); await flush(); expect(h.requests).toHaveLength(1)
    h.messages[0]({action:'trigger-sync'});await flush();expect(h.requests).toHaveLength(1)
  })
  it('present table without tbody publishes a fresh empty queue',async()=>{
    const h=harness();await flush();expect(h.requests[0].queue).toEqual([])
  })
  it('tbody observer does not observe descendant checkbox attributes or changes',()=>{
    const h=harness();h.run('cachedTbody = {isConnected:true}; startObserver()')
    expect(h.observers.at(-1).options.subtree).toBe(false)
    expect(source).not.toMatch(/addEventListener\(["'](?:change|input)["']/)
  })
  it('changing only the sync code neither publishes nor invalidates dedupe',async()=>{
    const h=harness();await flush();h.changes[0]({sync_code:{newValue:'SYN-0002'}},'sync')
    h.messages[0]({action:'trigger-sync'});await flush();expect(h.requests).toHaveLength(1)
  })
  it('401 leaves alarm retries latched off',async()=>{
    const h=harness(401);await flush();expect(h.run('authFailed')).toBe(true);h.messages[0]({action:'trigger-sync'});await flush();expect(h.requests).toHaveLength(1)
  })
  it('missing required columns stop discovery before successful validation',()=>{
    const h=harness();h.run('onTableFound({querySelector: () => ({querySelectorAll: () => []})})')
    expect(h.run('cachedTable !== null && firstNameIdx === -1 && pollTimer === null && bodyObserver === null')).toBe(true)
  })
  it('each independent tab publishes without source coordination',async()=>{
    const a=harness(),b=harness();await flush();expect(a.requests).toHaveLength(1);expect(b.requests).toHaveLength(1)
    expect(a.requests[0].sync_code).toBe(b.requests[0].sync_code)
    expect(Object.keys(a.requests[0]).sort()).toEqual(['queue','sync_code','timestamp'])
  })
  it('UI sort order controls queue order rather than recorded order time',()=>{
    const older={firstName:'Older',orderDateMs:10,revealed:false},newer={firstName:'Newer',orderDateMs:20,revealed:false}
    expect(buildVisibleQueue([newer,older],[])).toEqual(['Older','Newer'])
    expect(buildVisibleQueue([older,newer],[])).toEqual(['Newer','Older'])
  })
  it('one-character customer names disappear',()=>expect(buildVisibleQueue([{firstName:'Q',revealed:false}],[])).toEqual([]))
  it('service silently truncates more than 200 names',()=>expect(normalizeLiveQueue(Array.from({length:250},(_,i)=>`Synthetic ${i}`))).toHaveLength(200))
  it('future sender timestamp is classified as fresh',()=>{
    expect(buildLiveQueueSnapshot({sync_code:'SYN-0001',queue:['Example'],last_updated:'2026-09-10T00:00:00Z'},{now:new Date('2026-09-09T00:00:00Z')}).isFresh).toBe(true)
  })
  it('concurrent ensure operations can create two rows for one rep without a rep uniqueness guard',async()=>{
    const rows:any[]=[]
    const db:any={from:(table:string)=>table==='reps'?{select:()=>({eq:()=>({single:async()=>({data:{display_name:'Synthetic'}})})})}:{select:()=>({eq:()=>({order:()=>({limit:()=>({maybeSingle:async()=>({data:null,error:null})})})})}),insert:(row:any)=>({select:()=>({single:async()=>{rows.push(row);return {data:{sync_code:row.sync_code},error:null}}})})}}
    await Promise.all([1,2].map(digit=>ensureLiveQueueSyncCodeForRep(db,{repId:'synthetic',randomDigits:()=>digit})))
    expect(rows).toHaveLength(2)
  })
})

function edgeHarness() {
  let handler:any; const writes:any[]=[]
  const db={from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:'synthetic'},error:null})})}),update:(data:any)=>({eq:async()=>{writes.push(data);return {error:null}}})})}
  const edge=readFileSync('supabase/functions/live-queue-sync/index.ts','utf8').replace(/import \{ createClient \} from [^;]+;/,'')
  runInNewContext(ts.transpileModule(edge,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText,{
    Deno:{serve:(h:any)=>handler=h,env:{get:(name:string)=>name==='LIVE_QUEUE_SYNC_KEY'?'synthetic-key':'synthetic'}},createClient:()=>db,Response,Date,
  })
  return {writes,send:(body:any)=>handler({method:'POST',headers:new Headers({'x-sync-key':'synthetic-key'}),json:async()=>body})}
}
describe('Edge function audit with fake database only',()=>{
  it('accepts arbitrary nested values and unbounded names',async()=>{
    const h=edgeHarness();const response=await h.send({sync_code:'SYN-0001',queue:[{bad:true},'x'.repeat(100000)]});expect(response.status).toBe(200);expect(h.writes).toHaveLength(1)
  })
  it('older snapshots overwrite newer snapshots',async()=>{
    const h=edgeHarness();await h.send({sync_code:'SYN-0001',queue:['New'],timestamp:'2026-09-09T00:01:00Z'});await h.send({sync_code:'SYN-0001',queue:['Old'],timestamp:'2026-09-09T00:00:00Z'})
    expect(h.writes.at(-1).queue).toEqual(['Old'])
  })
  it('future client timestamp is stored without server normalization',async()=>{
    const h=edgeHarness();await h.send({sync_code:'SYN-0001',queue:[],timestamp:'2099-01-01T00:00:00Z'});expect(h.writes[0].last_updated).toBe('2099-01-01T00:00:00Z')
  })
  it('null JSON crashes before a structured validation response',async()=>{await expect(edgeHarness().send(null)).rejects.toThrow()})
})

describe('Public runtime audit',()=>{
  it('equal timestamp payload may replace names with empty',()=>{
    const context:any={};runInNewContext(readFileSync('public/amethyst/live-lineup.js','utf8'),context)
    const first={liveQueueState:'live',liveQueueLastUpdated:'2026-09-09T00:00:00Z',liveQueueEntries:[{name:'Synthetic',position:1}]}
    expect(context.SparkleLiveLineup.merge(first,{...first,liveQueueState:'empty',liveQueueEntries:[]}).liveQueueEntries).toEqual([])
  })
  it('future response is trusted by browser retention',()=>{
    const context:any={};runInNewContext(readFileSync('public/amethyst/live-lineup.js','utf8'),context)
    expect(context.SparkleLiveLineup.unavailable({liveQueueLastUpdated:'2099-01-01T00:00:00Z',liveQueueEntries:[{name:'Synthetic',position:1}]}).liveQueueEntries).toHaveLength(1)
  })
})
