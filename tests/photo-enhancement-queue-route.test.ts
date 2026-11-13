import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only',()=>({}))
const makeAdmin=vi.hoisted(()=>vi.fn())
const processQueue=vi.hoisted(()=>vi.fn())
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:makeAdmin}))
vi.mock('@/lib/services/swap-maintenance-client',()=>({createMaintenanceClient:makeAdmin}))
vi.mock('@/lib/services/photo-enhancement-queue',()=>({processReadyPhotoEnhancementQueue:processQueue}))

import {GET as daily} from '@/app/api/internal/photo-enhancement/queue/route'
import {POST as maintenance} from '@/app/api/internal/swap-maintenance/route'
import {sweepScreenshots} from '@/lib/services/swap-maintenance'

const run='311f9daf-82f2-47d5-a498-999d7d2936ed'
const rep='600a2219-7d2d-42a5-ac93-3def5045c47b'
const origin='https://sparkle-suite-smoke.vercel.app'
const production='https://www.yoursparklesuite.com'
function env(smoke=true) {
  const ref=smoke?'pukemqiwlyqmyytxkdmo':'bqhzfkgkjyuhlsozpylf'
  vi.stubEnv('VERCEL_ENV',smoke?'preview':'production')
  vi.stubEnv('VERCEL_PROJECT_ID',smoke?'prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ':'prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3')
  vi.stubEnv('SPARKLE_ENVIRONMENT',smoke?'smoke':'production')
  vi.stubEnv('NEXT_PUBLIC_SPARKLE_ENVIRONMENT',smoke?'smoke':'production')
  vi.stubEnv('NEXT_PUBLIC_APP_URL',smoke?origin:production)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://'+ref+'.supabase.co')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test.'+Buffer.from(JSON.stringify({ref,role:'service_role'})).toString('base64url')+'.test')
  vi.stubEnv('SPARKLE_SWAP_REVIEW_RUN_ID',smoke?run:'')
  vi.stubEnv('SPARKLE_SWAP_MAINTENANCE_CRON_SECRET',smoke?'':'test-live-only')
  vi.stubEnv('SPARKLE_SWAP_MAINTENANCE_ENABLED','')
  vi.stubEnv('SPARKLE_SWAP_MAINTENANCE_SMOKE_SECRET','test-smoke-only')
  vi.stubEnv('SPARKLE_SWAP_SMOKE_ALERT_REP_ID',rep)
  vi.stubEnv('SPARKLE_SWAP_OPERATOR_REP_ID',rep)
  vi.stubEnv('SPARKLE_SWAP_POLICY_ALERTS_ENABLED','true')
  vi.stubEnv('CRON_SECRET','test-daily')
}
function direct(secret='test-smoke-only',runId=run,host=origin) {
  return new Request(host+'/api/internal/swap-maintenance',{method:'POST',headers:{authorization:'Bearer '+secret,'x-swap-review-run':runId}})
}
function dailyRequest(host=origin,query='') {
  return new Request(host+'/api/internal/photo-enhancement/queue'+query,{headers:{authorization:'Bearer test-daily','x-swap-review-run':run}})
}
function admin(failure='') {
  const rpc=vi.fn(async(name:string)=>{
    if (name===failure) return {error:{message:'isolated failure'},data:null}
    return {error:null,data:name==='swap_staged_bytes_high'?false:[]}
  })
  const from=vi.fn((table:string)=>{
    const q={select:()=>q,eq:()=>q,not:()=>q,lte:()=>q,order:()=>q,limit:()=>q,in:()=>q,
      single:async()=>({data:{generation:12},error:null}),
      then:(callback:(value:unknown)=>unknown)=>Promise.resolve({data:[],error:table===failure?{message:'isolated failure'}:null}).then(callback)}
    return q
  })
  return {rpc,from,storage:{from:()=>({remove:async()=>({error:null})})}}
}
beforeEach(()=>{vi.clearAllMocks();env();makeAdmin.mockReturnValue(admin());processQueue.mockResolvedValue({processedCount:2})})
afterEach(()=>vi.unstubAllEnvs())

describe('maintenance scope and scheduling',()=>{
  it('statically pins the interval, dispatch ref, secret, target, response checks and disabled Smoke scheduling',()=>{
    const yaml=readFileSync('.github/workflows/sparkle-swap-maintenance.yml','utf8')
    for(const literal of ['*/15 * * * *','workflow_dispatch','refs/heads/codex/nic-nac-trade-hardening','SPARKLE_SWAP_MAINTENANCE_CRON_SECRET',
      'test -n "$SECRET"','--max-redirs 0','test "$status" = 200','https://www.yoursparklesuite.com/api/internal/swap-maintenance','cancel-in-progress: false'])
      expect(yaml).toContain(literal)
    expect(yaml).not.toMatch(/--location|curl -L|photo-enhancement|sparkle-suite-smoke/)
    expect(JSON.parse(readFileSync('scripts/smoke-environment/vercel.json','utf8')).crons).toEqual([])
    expect(JSON.parse(readFileSync('vercel.json','utf8')).crons.every((x:{schedule:string})=>!x.schedule.includes('*/'))).toBe(true)
  })
  it('rejects missing credentials, wrong secret, scope, target and disabled activation before creating an admin client',async()=>{
    expect((await maintenance(direct('test-daily'))).status).toBe(401)
    expect((await maintenance(direct('test-smoke-only','other'))).status).toBe(401)
    expect((await maintenance(direct('test-smoke-only',run,production))).status).toBe(403)
    vi.stubEnv('SPARKLE_SWAP_MAINTENANCE_SMOKE_SECRET','')
    expect((await maintenance(direct())).status).toBe(401)
    vi.stubEnv('VERCEL_PROJECT_ID','other')
    expect((await maintenance(direct())).status).toBe(403)
    env();vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://unrelated.example')
    expect((await maintenance(direct())).status).toBe(403)
    env(false)
    expect((await maintenance(direct('test-live-only','',production))).status).toBe(403)
    expect(makeAdmin).not.toHaveBeenCalled()
  })
  it('runs only scoped swap work on repeated direct calls and reports a sanitized failure',async()=>{
    const db=admin();makeAdmin.mockReturnValue(db)
    for(let i=0;i<2;i++) expect(await (await maintenance(direct())).json()).toMatchObject({ok:true,job:'swap-maintenance',backlog:false})
    for(const [name] of db.rpc.mock.calls) expect(['claim_swap_upload_sweep','find_swap_orphan_images','prune_swap_upload_ledger','swap_staged_bytes_high']).toContain(name)
    expect(db.rpc).toHaveBeenCalledWith('find_swap_orphan_images',{p_run:run,p_limit:25})
    expect(processQueue).not.toHaveBeenCalled()
    makeAdmin.mockReturnValue(admin('claim_swap_upload_sweep'))
    const failed=await maintenance(direct())
    expect(failed.status).toBe(503)
    expect(await failed.json()).toMatchObject({ok:false,failures:1})
  })
  it('retries immutable storage deletion if bookkeeping fails, with timestamps and unrelated fixture listings preserved',async()=>{
    let cleared=false
    const selected=vi.fn()
    const remove=vi.fn(async()=>({error:null}))
    const ack=vi.fn().mockReturnValueOnce({error:'retry'}).mockReturnValueOnce({error:null})
    const db={storage:{from:()=>({remove})},from:(table:string)=>({
      select:()=>{
        const q={not:()=>q,lte:()=>q,eq:()=>q,limit:()=>q,order:()=>q,
          in:(key:string,ids:string[])=>{selected(key,ids);return Promise.resolve({data:cleared?[]:[{id:'r',reveal_screenshot_path:'a',reveal_screenshot_thumb_path:'b'}]})},
          then:(fn:(v:unknown)=>unknown)=>Promise.resolve({data:table==='trade_swap_review_listings'?[{listing_id:'owned'}]:[]}).then(fn)}
        return q
      },
      update:(fields:Record<string,unknown>)=>{
        expect(fields).not.toHaveProperty('reveal_screenshot_uploaded_at')
        expect(fields).not.toHaveProperty('reveal_screenshot_expires_at')
        const q={eq:()=>q,lte:()=>{const result=ack();cleared=!result.error;return result}};return q
      },
    })}
    await expect(sweepScreenshots(db as never,{runId:run},2,Infinity)).rejects.toBe('retry')
    expect(await sweepScreenshots(db as never,{runId:run},2,Infinity)).toMatchObject({removed:1})
    expect(await sweepScreenshots(db as never,{runId:run},2,Infinity)).toMatchObject({removed:0})
    expect(remove.mock.calls).toHaveLength(2)
    expect(selected).toHaveBeenCalledWith('listing_id',['owned'])
  })
})

describe('daily backup',()=>{
  it('checks secret, limits and Smoke context before doing any maintenance',async()=>{
    expect((await daily(dailyRequest(origin,'?limit=garbage'))).status).toBe(400)
    expect((await daily(new Request(origin+'/api/internal/photo-enhancement/queue'))).status).toBe(401)
    vi.stubEnv('CRON_SECRET','')
    expect((await daily(dailyRequest())).status).toBe(503)
    expect(makeAdmin).not.toHaveBeenCalled()
  })
  it.each(['claim_swap_upload_sweep','trade_requests','queue','deliver_expired_trade_photo_policy'])(
    'daily backup isolates the failure of %s and still attempts the other three steps',async(step)=>{
      env(false)
      const db=admin(step);makeAdmin.mockReturnValue(db)
      if(step==='queue') processQueue.mockRejectedValueOnce(new Error('queue failed'))
      const response=await daily(dailyRequest(production))
      expect(response.status).toBe(503)
      expect(db.rpc).toHaveBeenCalledWith('claim_swap_upload_sweep',expect.objectContaining({p_run:null}))
      expect(db.from).toHaveBeenCalledWith('trade_requests')
      expect(processQueue).toHaveBeenCalledOnce()
      expect(db.rpc).toHaveBeenCalledWith('deliver_expired_trade_photo_policy',{p_rep_id:rep,p_expected_generation:12})
    })
  it('rechecks natural policy expiry on the daily path without shopper traffic, using the same generation and only synthetic sink in Smoke',async()=>{
    const db=admin();makeAdmin.mockReturnValue(db)
    for(let i=0;i<2;i++) expect((await daily(dailyRequest())).status).toBe(200)
    expect(db.rpc.mock.calls.filter(([name])=>name==='deliver_expired_trade_photo_policy')).toHaveLength(2)
    expect(processQueue).not.toHaveBeenCalled()
    expect((await maintenance(direct())).status).toBe(200)
    expect(db.rpc.mock.calls.filter(([name])=>name==='deliver_expired_trade_photo_policy')).toHaveLength(2)
  })
})
