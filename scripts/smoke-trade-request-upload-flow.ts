import { createHash, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { access, readFile, writeFile } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { TEAM, TARGETS, assertEnvironment, assertDeployment, assertCronDisabled } from './smoke-environment/guards.mjs'
import { runBrowserReview, openOldDocument, closeBrowser } from './smoke-environment/swap-browser-review.mjs'
import { getTradeRequestNotificationSummary } from '@/lib/services/trade-requests'
import { notifyRepOfTradeRequest } from '@/lib/nic-nac/trade-request-notifications'

const { project, ref, origin } = TARGETS.suite
function env(name: string) {
  const value = process.env[name]
  if (!value) throw new Error('Missing ' + name)
  return value
}
function check(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message) }
function uuid(name: string) {
  const value=env(name)
  check(/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value),'Invalid UUID: '+name)
  return value
}
const runId=uuid('SPARKLE_SWAP_REVIEW_RUN_ID'), owner=env('SPARKLE_SWAP_RUN_OWNER')
const dir=env('SPARKLE_SWAP_RUN_DIR'), priorId=env('SPARKLE_SWAP_PRIOR_DEPLOYMENT')
const priorSha=env('SPARKLE_SWAP_PRIOR_SHA'), candidate=env('SPARKLE_SWAP_CANDIDATE_SHA')
const appUrl=env('SPARKLE_TRADE_UPLOAD_SMOKE_APP_URL'), dbUrl=env('NEXT_PUBLIC_SUPABASE_URL')
const rep=uuid('SPARKLE_SWAP_SMOKE_ALERT_REP_ID'), other=uuid('SPARKLE_SWAP_OTHER_REP_ID')
const bucket='trade-request-screenshots'
const baseline='0a763690fcc3128aeba9e0e279671ad15d33b54d'
const opts={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}
const short=runId.slice(0,8)
check(/^[a-f0-9]{40}$/.test(candidate)&&/^[a-f0-9]{40}$/.test(priorSha)&&/^dpl_[A-Za-z0-9]+$/.test(priorId),'Invalid deployment provenance')
let admin: SupabaseClient
let locked=false
let shopperPath = ''
const receipts: Record<string,string>={}
const fixtureNames=['primary','alternate','expired','legacy','control','contender'] as const
const designName=(key:string)=>'Review '+short+' '+key
const proof = { runId,owner,priorId,priorSha,candidate,loads:[] as number[], observations:[] as string[], requests:[] as string[], objects:[] as string[], candidateId:'', restoredId:'',cleanup:false }
type Journal = {currentGeneration:number; priorGeneration:number; priorUntil:string|null; priorSink:string|null; sinkSet:boolean}
let journal:Journal
const idFor=(label:string)=>{
  const h=createHash('sha256').update(runId+' '+label).digest('hex')
  return h.slice(0,8)+'-'+h.slice(8,12)+'-4'+h.slice(13,16)+'-8'+h.slice(17,20)+'-'+h.slice(20,32)
}
const listing=(key:string)=>idFor('listing '+key)
async function write(name:string,value:unknown) { await writeFile(join(dir,name),JSON.stringify(value,null,2),'utf8') }
async function data<T>(operation:PromiseLike<{data:T,error:{code?:string}|null}>,label:string):Promise<T> {
  const result=await operation
  check(!result.error,label+' failed ('+(result.error?.code??'request')+')')
  return result.data
}
async function api(path:string,init?:RequestInit) {
  check(path.startsWith('/')&&!path.startsWith('//'),'Expected Smoke-relative API path')
  const url=new URL(path,appUrl)
  check(url.origin===origin,'Wrong API origin')
  return fetch(url,{...init,redirect:'manual',signal:AbortSignal.timeout(25_000)})
}
async function vercel(path:string) {
  const response=await fetch('https://api.vercel.com'+path+'?teamId='+TEAM,{
    headers:{authorization:'Bearer '+env('VERCEL_TOKEN')},redirect:'error',signal:AbortSignal.timeout(15_000)})
  check(response.ok,'Smoke metadata read failed: '+response.status)
  return response.json()
}
async function alias() {
  const a=await vercel('/v4/aliases/'+new URL(origin).hostname)
  const d=await vercel('/v13/deployments/'+(a.deploymentId??a.deployment?.id))
  return d
}
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))
async function waitForCandidate() {
  const until=Date.now()+20*60_000
  while(Date.now()<until) {
    const d=await alias()
    if(d.id!==priorId) {assertDeployment('suite',d,candidate);proof.candidateId=d.id;return}
    await sleep(3000)
  }
  throw new Error('Candidate alias cutover timed out')
}
async function waitForRestore() {
  const until=Date.now()+10*60_000
  while(Date.now()<until) {
    const d=await alias()
    if(d.id===priorId) {
      assertDeployment('suite',d,priorSha)
      const r=await api('/api/amethyst/trade-board?c='+rep)
      check(r.ok&&Array.isArray((await r.json()).listings),'Prior app board read failed after restore')
      proof.restoredId=d.id
      return
    }
    check(d.id===proof.candidateId,'Alias moved to another reviewer; leave it untouched')
    await sleep(3000)
  }
  throw new Error('Alias restoration was not verified')
}
async function preflight() {
  check(isAbsolute(dir)&&appUrl===origin&&dbUrl==='https://'+ref+'.supabase.co','Smoke target mismatch')
  check(env('VERCEL_PROJECT_ID')===project&&rep!==other,'Wrong project or synthetic roles')
  assertEnvironment('suite',process.env)
  check(!process.env.SPARKLE_SWAP_MAINTENANCE_CRON_SECRET,'Production credential present')
  check(/^[a-f0-9]{40}$/.test(candidate)&&/^[a-f0-9]{40}$/.test(priorSha),'Missing comparable SHA')
  await access(dir)
  const d=await alias()
  const resume=process.argv.includes('--cleanup-interrupted')
  if(!resume||d.id===priorId) {assertDeployment('suite',d,priorSha);check(d.id===priorId,'Prior alias changed before review')}
  else {assertDeployment('suite',d,candidate);proof.candidateId=d.id}
  assertCronDisabled('suite',await vercel('/v9/projects/'+project))
  const git=(arg:string)=>execFileSync('git',['rev-parse','--verify',arg],{encoding:'utf8'}).trim()
  check(git('HEAD')===candidate,'Checkout differs from verified candidate')
  for(const path of ['lib/services/trade-request-uploads.ts','app/api/amethyst/trade-requests/uploads/confirm/route.ts']) {
    check(git(priorSha+':'+path)===git(baseline+':'+path),'Prior deployment does not serve the known old writer')
  }
  // Independent operator allocation: verify an actual retired/prior reviewer has
  // released the window before creating this exclusive registration.
  const reservation=JSON.parse(await readFile(join(dir,'exclusive-window.json'),'utf8'))
  check(reservation.runId===runId && reservation.owner===owner && reservation.previousDeployment===priorId &&
    reservation.origin===origin && reservation.exclusive===true && reservation.returnProcedure,
    'Exclusive window or recoverable alias return procedure missing')
  admin=createClient(dbUrl,env('SUPABASE_SERVICE_ROLE_KEY'),opts)
  if(resume){
    const held=await data(admin.from('trade_swap_review_window').select('owner,previous_deployment,candidate_sha,prior_sha')
      .eq('run_id',runId).single(),'verify interrupted window')
    check(held&&held.owner===owner&&held.previous_deployment===priorId&&held.candidate_sha===candidate&&held.prior_sha===priorSha,
      'Interrupted run ownership mismatch')
    const saved=JSON.parse(await readFile(join(dir,'fixture-journal.json'),'utf8'))
    check(saved.runId===runId,'Interrupted journal run mismatch')
    journal=saved;locked=true
    return
  }
  const roles=await data(admin.from('reps').select('id,email,account_classification,public_site_slug').in('id',[rep,other]),'verify synthetic roles')
  check(roles?.length===2&&roles.every(r=>r.account_classification==='demo'&&/(@smoke\.example\.test$|^sparkle-reviewer\+preview@neonrabbit\.net$)/i.test(r.email)),
    'Requires existing verified demo Smoke identities')
  const slug=roles.find(r=>r.id===rep)?.public_site_slug
  check(typeof slug==='string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug),'Synthetic reviewer must have a usable shop slug')
  shopperPath='/'+slug+'/trade'
  const initial=await data(admin.from('trade_request_photo_policy').select('generation,photo_optional_until').eq('singleton',true).single(),'read policy')
  check(initial,'Policy singleton missing')
  const sink=await data(admin.from('trade_photo_policy_sink').select('rep_id').eq('singleton',true).maybeSingle(),'read sink')
  journal={currentGeneration:initial.generation,priorGeneration:initial.generation,priorUntil:initial.photo_optional_until,priorSink:sink?.rep_id??null,sinkSet:false}
  await data(admin.from('trade_swap_review_window').insert({run_id:runId,owner,previous_deployment:priorId,prior_sha:priorSha,candidate_sha:candidate,
    prior_policy_generation:initial.generation,prior_policy_until:initial.photo_optional_until,prior_sink_id:journal.priorSink}),'claim shared window')
  locked=true
  await write('fixture-journal.json',{runId,...journal})
  const recheck=await data(admin.from('trade_request_photo_policy').select('generation').single(),'policy ownership')
  check(recheck&&recheck.generation===initial.generation,'Policy changed during claim')
  check(!initial.photo_optional_until||Date.parse(initial.photo_optional_until)<=Date.now(),'Another optional-photo window is active')
  if(journal.priorSink!==rep) {
    if(journal.priorSink) {
      const changed=await data(admin.from('trade_photo_policy_sink').update({rep_id:rep}).eq('rep_id',journal.priorSink).select('rep_id'),'claim sink')
      check(changed?.length===1,'Sink changed before review')
    } else await data(admin.from('trade_photo_policy_sink').insert({rep_id:rep}),'set synthetic alert sink')
    journal.sinkSet=true;await write('fixture-journal.json',{runId,...journal})
  }
}
async function policy(enabled:boolean, restore=false) {
  const next=await data(admin.rpc('set_trade_request_photo_policy',{
    p_enabled:enabled,p_expected_generation:journal.currentGeneration,
    ...(restore?{p_restore_until:journal.priorUntil}:{}),
  }),'change run-owned policy')
  journal.currentGeneration=next.generation
  await write('fixture-journal.json',{runId,...journal})
}
async function authenticate(repId:string) {
  const r=await data(admin.from('reps').select('email,auth_user_id').eq('id',repId).single(),'resolve synthetic login')
  check(r,'Synthetic rep missing')
  const link=await admin.auth.admin.generateLink({type:'magiclink',email:r.email})
  check(!link.error&&link.data.user?.id===r.auth_user_id,'Synthetic session identity mismatch')
  const client=createClient(dbUrl,env('NEXT_PUBLIC_SUPABASE_ANON_KEY'),opts)
  const {data:verified,error}=await client.auth.verifyOtp({type:'email',token_hash:link.data.properties.hashed_token})
  check(!error&&verified.session&&verified.user?.id===r.auth_user_id,'Synthetic session failed')
  const cookie='base64-'+Buffer.from(JSON.stringify(verified.session)).toString('base64url')
  const name='sb-'+ref+'-auth-token'
  const pieces=cookie.match(/.{1,3100}/g)!
  return {client,cookies:pieces.map((value,i)=>({name:pieces.length===1?name:name+'.'+i,value,url:origin,httpOnly:true,secure:true}))}
}
async function seed() {
  const collection=idFor('collection')
  await data(admin.from('collections').insert({id:collection,name:'Smoke '+short}),'seed synthetic collection')
  for(const key of fixtureNames) {
    const design=idFor('design '+key), listingId=listing(key)
    await data(admin.from('jewelry_designs').insert({id:design,collection_id:collection,item_number:'ER'+short+key,
      design_name:designName(key),type_prefix:'ER',material:'Synthetic',main_stone:'Synthetic',canonical_photo_url:origin+'/amethyst/demo-dancers/marisol-earrings.jpg'}),'seed dancer')
    await data(admin.from('trade_listings').insert({id:listingId,rep_id:rep,design_id:design,listing_source:'catalog',
      manual_collection_family:key==='alternate'?'Birthday':'OG',manual_type_prefix:'ER',status:'available',quantity_available:24,
      listed_at:new Date().toISOString(),uses_canonical_photo:true,rep_notes:'Synthetic '+runId}),'seed listing')
    if(key!=='control') await data(admin.from('trade_swap_review_listings').insert({run_id:runId,listing_id:listingId,rep_id:rep}),'register owned fixture')
  }
  for(const key of ['expired','control','legacy']) {
    const id=idFor('request '+key),path=rep+'/trade-request-uploads/'+id+'.jpg', expired=key!=='legacy'
    if(expired) {
      const file=await readFile('public/amethyst/demo-dancers/marisol-earrings.jpg')
      const uploaded=await admin.storage.from(bucket).upload(path,file,{contentType:'image/jpeg',upsert:false})
      check(!uploaded.error,'Seed expired fixture image')
    }
    await data(admin.from('trade_requests').insert({id,listing_id:listing(key),customer_name:designName(key)+' shopper',
      customer_description:expired?'See photo':'My vintage blue drop earrings',description_is_placeholder:expired,status:'pending',
      ...(expired?{reveal_screenshot_path:path,reveal_screenshot_size_bytes:500,reveal_screenshot_content_type:'image/jpeg',
        reveal_screenshot_uploaded_at:new Date(Date.now()-8*86400000).toISOString(),reveal_screenshot_expires_at:new Date(Date.now()-86400000).toISOString()}:{}),
    }),'seed history')
    proof.requests.push(id)
    if(expired)proof.objects.push(path)
  }
  // Both old raw uploads are eligible now. Only the first listing belongs to
  // the review namespace used by the deployed maintenance handlers.
  for(const key of ['expired','control']) {
    const id=idFor('stale ticket '+key),raw='staging/'+rep+'/'+id+'.jpg'
    const bytes=await readFile('public/amethyst/demo-dancers/marisol-earrings.jpg')
    check(!(await admin.storage.from(bucket).upload(raw,bytes,{contentType:'image/jpeg',upsert:false})).error,'Seed raw control failed')
    await data(admin.from('trade_request_upload_tickets').insert({
      id,listing_id:listing(key),rep_id:rep,submission_id:idFor('stale submit '+key),raw_path:raw,
      request_ip_hash:createHash('sha256').update(runId+' eligible controls').digest('hex'),
      declared_content_type:'image/jpeg',declared_size_bytes:bytes.length,
      created_at:new Date(Date.now()-4*3600_000).toISOString(),signed_until:new Date(Date.now()-3600_000).toISOString()
    }),'seed eligible ticket control')
    proof.objects.push(raw)
  }
}
async function seedFallbackAlerts() {
  for(const key of ['expired','legacy']) {
    const s=await getTradeRequestNotificationSummary(admin,idFor('request '+key))
    check(s,'Missing fallback fixture')
    await notifyRepOfTradeRequest(admin,s)
  }
}
async function receipt(result:{requestId:string;receiptUrl:string},key:string) {
  check(/^[a-f0-9-]{36}$/.test(result.requestId)&&/^\/trade-request\/status\/[a-f\d]{64}$/.test(result.receiptUrl),'Unexpected receipt')
  const response=await api('/api/amethyst/trade-requests/status?token='+result.receiptUrl.split('/').pop())
  const payload=await response.json()
  check(response.ok&&payload.status==='pending' && Object.keys(payload).every(k=>['status','updatedAt','denialExplanation','photoExpired'].includes(k)),'Receipt privacy/status failed')
  receipts[key]=result.requestId;proof.requests.push(result.requestId)
}
async function release(id:string) {
  await data(admin.from('trade_requests').update({status:'cancelled'}).eq('id',id).in('listing_id',fixtureNames.map(listing)),'release synthetic reservation')
}
async function identityProof(clients:Awaited<ReturnType<typeof authenticate>>[],requestId:string) {
  const [own,otherRole]=clients
  const anon=createClient(dbUrl,env('NEXT_PUBLIC_SUPABASE_ANON_KEY'),opts)
  for(const client of [own.client,otherRole.client,anon]) {
    const secret=await client.from('trade_requests').select('request_ip_hash,rep_alerted_at,submission_id,receipt_token_hash').eq('id',requestId)
    check(!!secret.error,'Operational column readable')
    const q=await client.from('trade_requests').select('id,status').eq('id',requestId)
    check(client===own.client?q.data?.length===1:!!q.error||q.data?.length===0,'Wrong rep-visible rows')
    const write=await client.from('trade_requests').update({request_ip_hash:'f'.repeat(64)}).eq('id',requestId).select('id')
    check(!!write.error,'Unexpected operational column write privilege')
  }
  const channel=own.client.channel('swap-proof-'+runId)
  let leaked=false
  const denied=[anon,otherRole.client].map((client,i)=>client.channel('swap-denial-'+runId+'-'+i)
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'trade_requests',filter:'id=eq.'+requestId},()=>{leaked=true}))
  async function subscribe(ch:typeof channel,allowDenial=false) {
    await new Promise<void>((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Realtime subscription timed out')),10_000)
      ch.subscribe(status=>{
        if(status==='SUBSCRIBED'||(allowDenial&&status==='CHANNEL_ERROR')){clearTimeout(timer);resolve()}
        else if(status==='CHANNEL_ERROR'){clearTimeout(timer);reject(new Error('Realtime subscribe failed'))}
      })
    })
  }
  const received=new Promise<Record<string,unknown>>((resolve,reject)=>{
    const deadline=setTimeout(()=>reject(new Error('Realtime positive control timed out')),12_000)
    channel.on('postgres_changes',{event:'UPDATE',schema:'public',table:'trade_requests',filter:'id=eq.'+requestId},e=>{
      clearTimeout(deadline);resolve(e.new as Record<string,unknown>)
    })
  })
  // Install rejection handling before subscription to prevent an unhandled timeout.
  void received.catch(()=>{})
  try {
    await Promise.all([subscribe(channel),...denied.map(ch=>subscribe(ch,true))])
    await data(admin.from('trade_requests').update({updated_at:new Date().toISOString()}).eq('id',requestId),'trigger owned event')
    const row=await received
    check(row.id===requestId&&['request_ip_hash','rep_alerted_at','receipt_token_hash','submission_id'].every(k=>!(k in row)),'Realtime projection failed')
    await sleep(1500)
    check(!leaked,'Unrelated role received a private request event')
  } finally { await Promise.all([own.client.removeChannel(channel),anon.removeChannel(denied[0]),otherRole.client.removeChannel(denied[1])]) }
}
async function maintenance() {
  const call=await api('/api/internal/swap-maintenance',{method:'POST',headers:{authorization:'Bearer '+env('SPARKLE_SWAP_MAINTENANCE_SMOKE_SECRET'),'x-swap-review-run':runId}})
  check(call.ok&&(await call.json()).ok===true,'Run-scoped maintenance refused')
  const state=await data(admin.from('trade_requests').select('id,reveal_screenshot_path').in('id',[idFor('request expired'),idFor('request control')]),'read sweep controls')
  check(state?.find(r=>r.id===idFor('request expired'))?.reveal_screenshot_path===null,'Eligible owned fixture not cleaned')
  const control=state?.find(r=>r.id===idFor('request control'))?.reveal_screenshot_path
  check(control,'Unrelated metadata was changed')
  check(!(await admin.storage.from(bucket).download(control)).error,'Unrelated image was removed')
  const controlPath='staging/'+rep+'/'+idFor('stale ticket control')+'.jpg'
  check(!(await admin.storage.from(bucket).download(controlPath)).error,'Opportunistic or direct sweep removed unrelated raw upload')
}
async function contention() {
  const sharedHash=createHash('sha256').update(runId+' DB contention only').digest('hex')
  const writes=Array.from({length:5},()=>{const id=randomUUID();return admin.rpc('rpc_submit_trade_request_v5',{
    p_listing_id:listing('contender'),p_expected_rep_id:rep,p_customer_name:'Synthetic DB contender',
    p_customer_description:null,p_submission_id:id,p_request_ip_hash:sharedHash,p_receipt_token_hash:createHash('sha256').update(id).digest('hex'),
  })})
  const results=await Promise.all(writes)
  check(results.filter(r=>!r.error).length===3&&results.filter(r=>r.error?.message.includes('TRADE_REQUEST_PENDING_LIMIT')).length===2,
    'Concurrent pending cap failed')
}
async function cleanup() {
  const current=await data(admin.from('trade_request_photo_policy').select('generation,photo_optional_until').single(),'verify policy owner before restore')
  check(current&&current.generation===journal.currentGeneration,'Newer policy change observed; retain journal and leave it in place')
  if(journal.currentGeneration!==journal.priorGeneration && current.photo_optional_until!==journal.priorUntil)
    await policy(Boolean(journal.priorUntil&&Date.parse(journal.priorUntil)>Date.now()),true)
  if(journal.sinkSet) {
    const q=journal.priorSink?admin.from('trade_photo_policy_sink').update({rep_id:journal.priorSink}):admin.from('trade_photo_policy_sink').delete()
    const rows=await data(q.eq('rep_id',rep).select('rep_id'),'restore owned synthetic sink');check(rows?.length===1,'Sink ownership changed')
    journal.sinkSet=false;await write('fixture-journal.json',{runId,...journal})
  }
  const ids=fixtureNames.map(listing)
  const rows=await data(admin.from('trade_requests').select('id,reveal_screenshot_path,reveal_screenshot_thumb_path').in('listing_id',ids),'list owned requests')
  const tickets=await data(admin.from('trade_request_upload_tickets').select('id,raw_path,ready_path,thumb_path').in('listing_id',ids),'list fixture uploads')
  const ledger=await data(admin.from('trade_upload_ledger').select('id,listing_id,raw_path,signed_until').in('listing_id',ids),'verify owned late-write ledger')
  check((tickets??[]).every(t=>ledger?.some(l=>l.id===t.id && l.raw_path===t.raw_path && l.signed_until)),'Still-writable path lacks a durable reservation')
  const paths=new Set([...proof.objects,...(rows??[]).flatMap(r=>[r.reveal_screenshot_path,r.reveal_screenshot_thumb_path]),
    ...(tickets??[]).flatMap(t=>[t.raw_path,t.ready_path,t.thumb_path,rep+'/trade-request-uploads/'+t.id+'.jpg',rep+'/trade-request-uploads/'+t.id+'.800.jpg'])].filter(Boolean))
  if(paths.size)check(!(await admin.storage.from(bucket).remove([...paths])).error,'Fixture storage cleanup failed')
  const requestIds=(rows??[]).map(r=>r.id)
  const messageIds=requestIds.map(id=>'trade-request-'+id)
  for(let g=journal.priorGeneration+1;g<=journal.currentGeneration;g++) messageIds.push('swap-policy-'+g+'-active','swap-policy-'+g+'-expired')
  if(messageIds.length)await data(admin.from('nic_nac_conversations').delete().eq('rep_id',rep).in('message_id',messageIds),'clean owned alert messages')
  if(requestIds.length) {
    for(const table of ['trade_swaps','trade_fulfillment'])await data(admin.from(table).delete().in('request_id',requestIds),'clean '+table)
    await data(admin.from('trade_requests').delete().in('id',requestIds).in('listing_id',ids),'clean owned requests')
  }
  // Listing deletion cascades tickets. The private ledger and run-to-listing
  // manifest survive while a signed path can still be rewritten.
  await data(admin.from('trade_listings').delete().eq('rep_id',rep).in('id',ids),'clean listings')
  await data(admin.from('jewelry_designs').delete().in('id',fixtureNames.map(k=>idFor('design '+k))),'clean designs')
  await data(admin.from('collections').delete().eq('id',idFor('collection')),'clean collection')
  proof.cleanup=true
  await write('teardown.json',{runId,listingIds:ids,requestIds,ticketIds:tickets?.map(t=>t.id),retainedAccounting:true,
    signedDeadlines:ledger?.map(l=>({ticket:l.id,until:l.signed_until})),finalSweepAfter: new Date(Date.now()+3*3600000).toISOString()})
}
async function main() {
  try {
    await preflight()
    if(process.argv.includes('--cleanup-interrupted'))return
    await seed()
    const oldBoard=await api('/api/amethyst/trade-board?c='+rep)
    check(oldBoard.ok,'Prior app cannot resolve the explicit synthetic reviewer')
    const boardData=await oldBoard.json()
    check(Array.isArray(boardData.listings)&&boardData.listings.some((r:{id?:string;listingId?:string})=>
      r.id===listing('primary')||r.listingId===listing('primary')),'Prior board does not expose this run’s pictured fixture')
    const roles=await Promise.all([authenticate(rep),authenticate(other)])
    const context={origin,rep,shopperPath,runId,listing,designName,receipts,proof,policy,receipt,release,contention,maintenance,seedFallbackAlerts,api,
      replay:async(payload:Record<string,unknown>,key:string)=>{
        const id=String(payload.submissionId)
        const before=await data(admin.from('trade_request_hourly_admission').select('admitted_at').eq('submission_id',id).single(),'read admission')
        const replay=await api('/api/amethyst/trade-requests?c='+rep,{method:'POST',headers:{'content-type':'application/json',origin},
          body:JSON.stringify({...payload,intent:'retry'})})
        const result=await replay.json()
        check(replay.ok&&result.requestId===receipts[key]&&result.mutationReplayed===true,'Repeated request identity mismatch')
        const after=await data(admin.from('trade_request_hourly_admission').select('admitted_at').eq('submission_id',id).single(),'verify replay accounting')
        check(before&&after&&before.admitted_at===after.admitted_at,'Replay changed hourly admission')
      },
      roleCookies:roles.map(r=>r.cookies),idFor,confirmOld:async(id:string)=>{
        const t=await data(admin.from('trade_request_upload_tickets').select('id,listing_id,rendition_version,ready_path,thumb_path,ready_at').eq('id',id).single(),'old ticket')
        check(t&&t.listing_id===listing('primary')&&t.rendition_version===1&&t.ready_at&&t.ready_path&&!t.thumb_path,'Old writer did not confirm single JPEG')
      }}
    const old=await openOldDocument(context)
    await write('old-ticket-ready.json',{runId,priorId,priorSha,candidate,loads:proof.loads})
    await waitForCandidate()
    await runBrowserReview(context,old)
    await identityProof(roles,receipts.primary)
  } finally {
    await closeBrowser()
    if(locked){
      try{await cleanup()}finally{
        await write('candidate-finished.json',proof)
        await waitForRestore()
        await write('result.json',proof)
        if(proof.cleanup&&proof.restoredId===priorId)await data(admin.from('trade_swap_review_window').delete().eq('run_id',runId).eq('owner',owner),'release exclusive window')
      }
    }
  }
}
main().catch(e=>{console.error('Swap Smoke stopped:',e instanceof Error?e.message:'guard failed');process.exitCode=1})
