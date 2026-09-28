import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { matchLineupAudience } from '@/lib/services/customer-audience'
import { isLineupAudienceResult, isCurrentLineupAudienceResult, lineupIdentityContext } from '@/lib/live-lineup/audience'
import { canAcceptWorkspaceRefresh, workspaceFreshnessDeadline, workspaceWriteEligible } from '@/app/nic-nac/components/live-lineup-client'
import type { WorkspaceLineupSnapshot } from '@/lib/live-lineup/types'

const T = Date.parse('2026-09-26T12:00:00Z')
const rep = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222'
const entry = {id:'p1:a',name:'Jane',lastName:'Smith',identityEligible:true,sourceIdentityVersion:'2:document:5',held:false,position:1}
const snapshot: WorkspaceLineupSnapshot = {tenantContext:rep,revision:1,connection:'connected',lastReceivedAt:new Date(T).toISOString(),lastChangedAt:null,
  sourceVersion:'2.0.5',authorized:true,canManage:true,canRecover:true,serverTime:new Date(T+40000).toISOString(),freshUntil:new Date(T+45000).toISOString(),freshForMs:5000,
  entries:[entry],heldEntries:[],undoAvailable:false,warning:null,management:{generation:1,partyIds:['p1'],excludedPartyIds:[],candidates:[entry]}}

describe('Workspace evidence budget and private match fences', () => {
  it('subtracts the full round trip and never renews a nearly expired source at receipt', () => {
    expect(workspaceFreshnessDeadline(snapshot,100,3100)).toBe(5100)
    expect(workspaceFreshnessDeadline(snapshot,100,6100)).toBe(6100)
    expect(workspaceFreshnessDeadline({...snapshot,freshForMs:1000},100,500)).toBe(1100)
    expect(workspaceFreshnessDeadline({...snapshot,serverTime:undefined},100,500)).toBe(500)
    expect(workspaceWriteEligible(snapshot,5100,5099,false)).toBe(true)
    expect(workspaceWriteEligible(snapshot,5100,5100,false)).toBe(false)
    expect(workspaceWriteEligible(snapshot,5100,100,true)).toBe(false)
    expect(workspaceWriteEligible({...snapshot,authorized:false},5100,100,false)).toBe(false)
  })
  it('accepts health/permission locking at the same revision while retaining exact identity and arrangement', () => {
    expect(canAcceptWorkspaceRefresh(snapshot,{...snapshot,connection:'delayed',canManage:false,authorized:false,canRecover:false,freshForMs:0})).toBe(true)
    expect(canAcceptWorkspaceRefresh(snapshot,{...snapshot,entries:[{...entry,lastName:'Other'}]})).toBe(false)
    expect(canAcceptWorkspaceRefresh(snapshot,{...snapshot,tenantContext:other})).toBe(false)
  })
  it('fences birthday/preferences to exact tenant, show, order and source identity', () => {
    const match = {id:entry.id,sourceIdentityVersion:entry.sourceIdentityVersion,birthday:'2/29',preferences:['<img onerror=alert(1)>']}
    const result = {tenantContext:rep,generation:1,audienceVersion:'8',matches:[match]}
    expect(isLineupAudienceResult(result,snapshot)).toBe(true)
    const fence = {requestEpoch:1,currentEpoch:1,requestContext:'same',currentContext:'same',minimumVersion:'8'}
    expect(isCurrentLineupAudienceResult(result,snapshot,fence)).toBe(true)
    expect(isCurrentLineupAudienceResult(result,snapshot,{...fence,currentEpoch:2})).toBe(false)
    expect(isCurrentLineupAudienceResult(result,snapshot,{...fence,minimumVersion:'9'})).toBe(false)
    expect(isCurrentLineupAudienceResult(result,snapshot,{...fence,currentContext:'new show'})).toBe(false)
    for (const bad of [{...result,tenantContext:other},{...result,generation:2},{...result,matches:[match,match]},
      {...result,matches:[{...match,sourceIdentityVersion:'old'}]},{...result,matches:[{...match,id:'other'}]},
      {...result,matches:[{...match,preferences:['bad\nline']}] }]) expect(isLineupAudienceResult(bad,snapshot)).toBe(false)
    expect(isLineupAudienceResult(result,{...snapshot,entries:[{...entry,lastName:undefined}]})).toBe(false)
    expect(lineupIdentityContext(snapshot)).not.toBe(lineupIdentityContext({...snapshot,tenantContext:other}))
  })
})

it('queries tenant-wide unique names and minimal chips from one SQL snapshot, invalidating inserts, edits and deletes', async () => {
  const sql = new PGlite()
  try {
    await sql.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create function auth.uid() returns uuid language sql stable as 'select null::uuid';
      create table reps(id uuid primary key, auth_user_id uuid);
      create table customer_audience(id uuid primary key default gen_random_uuid(),rep_id uuid references reps(id),name text,
        birthday_month integer,birthday_day integer,favorite_gem_or_stone text,favorite_material text,favorite_cut text,favorite_collection text);
    `)
    await sql.query('insert into reps(id) values($1),($2)',[rep,other])
    await sql.exec(readFileSync(new URL('../supabase/migrations/20260926000200_ss_live_lineup_audience_matches.sql',import.meta.url),'utf8'))
    await sql.query(`insert into customer_audience(rep_id,name,birthday_month,birthday_day,favorite_gem_or_stone) values
      ($1,'  Jane   Smith ',2,29,'<script>hi</script>'),($2,'Jane Smith',3,5,'other tenant'),($1,'Jane Smith Jr',1,1,'suffix')`,[rep,other])
    const folding = await sql.query<{key:string}>('select live_lineup_audience_name_key($1) key',["  STRAẞE\u00a0Oﬃce  "])
    expect(folding.rows[0].key).toBe('strasse office')
    const dotless = await sql.query<{same:boolean}>('select live_lineup_audience_name_key($1)=live_lineup_audience_name_key($2) same',['I','ı'])
    expect(dotless.rows[0].same).toBe(false)
    const db = {rpc: (_name: string,args: {p_rep_id:string;p_names:string[]}) => sql.query<{result: unknown}>(
      'select live_lineup_match_audience($1,$2) result',[args.p_rep_id,args.p_names]).then(result=>({data:result.rows[0].result,error:null}))} as unknown as SupabaseClient
    const first = await matchLineupAudience(db,rep,[entry])
    expect(first.matches).toEqual([{id:entry.id,sourceIdentityVersion:entry.sourceIdentityVersion,birthday:'2/29',preferences:['<script>hi</script>']}])
    // A duplicate beyond the ordinary 1000-row API page must still suppress all chips.
    await sql.query(`insert into customer_audience(rep_id,name) select $1,'Other '||generate_series(1,1100)`,[rep])
    const duplicate = await sql.query<{id:string}>('insert into customer_audience(rep_id,name) values($1,$2) returning id',[rep,'JANE SMITH'])
    const duplicateResult = await matchLineupAudience(db,rep,[entry])
    expect(duplicateResult.matches).toEqual([])
    expect(BigInt(duplicateResult.audienceVersion)).toBeGreaterThan(BigInt(first.audienceVersion))
    await sql.query('update customer_audience set name=$1 where id=$2',['Someone Else',duplicate.rows[0].id])
    const renamed = await matchLineupAudience(db,rep,[entry])
    expect(renamed.matches).toHaveLength(1)
    expect(BigInt(renamed.audienceVersion)).toBeGreaterThan(BigInt(duplicateResult.audienceVersion))
    await sql.query('delete from customer_audience where id=$1',[duplicate.rows[0].id])
    expect(BigInt((await matchLineupAudience(db,rep,[entry])).audienceVersion)).toBeGreaterThan(BigInt(renamed.audienceVersion))
    expect((await matchLineupAudience(db,rep,[{...entry,lastName:undefined}])).matches).toEqual([])
    const raw = await sql.query<{result:{matches:{count:number;gem:null}[]}}>('select live_lineup_match_audience($1,$2) result',[rep,['Nobody Matches']])
    expect(raw.rows[0].result.matches[0]).toMatchObject({count:0,gem:null})
    await sql.exec('set role authenticated')
    await expect(sql.query('select live_lineup_match_audience($1,$2)',[other,['Jane Smith']])).rejects.toThrow(/permission denied/)
  } finally { await sql.close() }
},30000)
