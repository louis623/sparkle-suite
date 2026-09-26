/* eslint-disable @typescript-eslint/no-require-imports -- standalone release contract */
const a=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto').webcrypto;
const endpoint='https://www.yoursparklesuite.com/api/live-lineup/publish',code='MHF-9446',rep='11111111-1111-4111-8111-111111111111';
const event=(listeners,key)=>({addListener:f=>listeners[key]=f});
function area(record){return{setAccessLevel:async()=>{},get:async keys=>{if(Array.isArray(keys))return Object.fromEntries(keys.map(k=>[k,structuredClone(record[k])]));return{[keys]:structuredClone(record[keys])}},set:async values=>Object.assign(record,structuredClone(values)),remove:async key=>{delete record[key]}}}
function response(body,status=200){const r=new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});Object.defineProperty(r,'url',{value:endpoint});return r}

(async()=>{
  const manifest=JSON.parse(fs.readFileSync('chrome-extension/manifest.json','utf8'));
  a.equal(manifest.version,'2.0.5');a.deepEqual(manifest.permissions,['storage','alarms']);
  const popup=fs.readFileSync('chrome-extension/popup.html','utf8'),popupJs=fs.readFileSync('chrome-extension/popup.js','utf8');
  for(const phrase of ['Review / select source','First-time setup','computer name','pairing key','party IDs'])a.equal((popup+popupJs).includes(phrase),false,phrase);
  for(const phrase of ['Connect Live Lineup','Live Queue code','Detected parties'])a.equal(popup.includes(phrase),true,phrase);
  a.equal(popup.includes('id="enabled"'),true);a.equal(popupJs.includes('sparkle-v2-filter'),true);

  const local={},session={},sync={sync_code:code,enabled:true,excluded_party_ids:['p2']},listeners={},requests=[];
  let descriptor={protocol:2,generation:0,scope:null,serverTime:new Date().toISOString()},sequence=-1,observations=0;
  const full={parserState:'ready',entries:[{id:'p1:a',name:'Reviewer One',orderedAt:1},{id:'p2:b',name:'Reviewer Two',orderedAt:2}],revealedIds:[],revealedEntries:[]};
  const chrome={runtime:{id:'test-extension',getURL:p=>'chrome-extension://test-extension/'+p,getManifest:()=>({version:'2.0.5'}),onMessage:event(listeners,'message')},storage:{local:area(local),session:area(session),sync:area(sync)},alarms:{create:async()=>{},onAlarm:event(listeners,'alarm')},tabs:{query:async()=>[{id:9,active:true,url:'https://myoffice.bombparty.com/live-party-orders'}],sendMessage:async(_id,message)=>({protocol:2,generation:message.generation,source:{documentId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',serial:++observations,settled:true},snapshot:full}),onRemoved:event(listeners,'removed'),onUpdated:event(listeners,'updated'),onActivated:event(listeners,'activated')}};
  const fetcher=async(_u,options)=>{const body=JSON.parse(options.body);requests.push(body);const stamp=new Date().toISOString(),lease=new Date(Date.now()+90000).toISOString();if(body.action==='describe')return response(descriptor);if(body.action==='claim')return response({claimId:body.claimId,capabilities:body.capabilities,generation:descriptor.generation,publisherId:rep,epoch:descriptor.generation+1,revision:1,acceptedSequence:sequence,serverTime:stamp,leaseExpiresAt:lease});if(body.action==='snapshot'){sequence=body.packet.sequence;return response({ok:true,revision:2,acceptedSequence:sequence,serverTime:stamp,leaseExpiresAt:lease,freshForMs:45000})}if(body.action==='configure'){const ids=[...body.partyIds].sort(),excluded=[...body.excludedPartyIds].sort();descriptor={protocol:2,generation:descriptor.generation||1,scope:{partyIds:ids,excludedPartyIds:excluded,carryEntryIds:['p1:a','p2:b'],startedAt:stamp},serverTime:stamp};return response({...descriptor,configured:{applied:true,claimId:body.claimId,epoch:body.epoch,generation:descriptor.generation,partyIds:ids,excludedPartyIds:excluded}})}throw Error('unexpected '+body.action)};
  const context=vm.createContext({chrome,importScripts:()=>{},SparklePublisherClient:require('../chrome-extension/publisher-client.js'),URL,TextEncoder,TextDecoder,AbortController,crypto,setTimeout:(f,n)=>setTimeout(f,Math.min(n,20)),clearTimeout,fetch:fetcher});
  vm.runInContext(fs.readFileSync('chrome-extension/background.js','utf8'),context);const run=s=>vm.runInContext(s,context);
  await run('ready');await new Promise(r=>setImmediate(r));await run('serial');
  let saved=await run('store.load()');a.equal(saved.token,code);a.equal(saved.workflowVersion,4);a.equal(saved.enabled,true);a.deepEqual(saved.excludedPartyIds,['p2']);
  if(!requests.some(x=>x.action==='configure')){a.equal((await run('exclusive(pull)')).status,'confirmed')}
  saved=await run('store.load()');a.equal(saved.generation,1);a.equal(saved.token,code);a.equal((await run('selected()')).tabId,9);
  let status=await run('exclusive(status)');a.equal(status.code,code);a.equal(status.parties.length,2);a.deepEqual(status.excludedPartyIds,['p2']);
  await run('exclusive(()=>popupMessage({action:"sparkle-v2-toggle",enabled:false}))');a.equal((await run('store.load()')).enabled,false);
  await run('exclusive(()=>popupMessage({action:"sparkle-v2-toggle",enabled:true}))');
  await run('exclusive(()=>popupMessage({action:"sparkle-v2-filter",partyId:"p1",included:false}))');a.deepEqual((await run('store.load()')).excludedPartyIds,['p1','p2']);
  await run('exclusive(pull)');a.deepEqual(requests.filter(x=>x.action==='configure').at(-1).excludedPartyIds,['p1','p2']);
  listeners.updated(9,{status:'loading'});await run('serial');a.equal((await run('selected()')).tabId,9);
  delete session.sparkleSourceV2;a.equal((await run('exclusive(pull)')).status,'confirmed');a.equal((await run('selected()')).tabId,9);
  const before=(await run('store.load()')).token;const originalFetch=context.fetch;context.fetch=async()=>response({error:'unauthorized'},401);
  const rejected=await run('exclusive(()=>popupMessage({action:"sparkle-v2-connect",credential:"BAD-0000"}))');a.equal(rejected.ok,false);a.equal(rejected.error,'unauthorized');a.equal((await run('store.load()')).token,before);context.fetch=originalFetch;
  a.equal(run('bpUrl("https://myoffice.bombparty.com.evil.test/live-party-orders")'),false);
  console.log('PASS: old assigned-code migration, single-tab discovery, automatic parties, filter, toggle, reload and restart recovery');

  const content=fs.readFileSync('chrome-extension/content.js','utf8');
  for(const bad of [/reload|location\.href|location\.replace/,/document\.createElement|appendChild|innerHTML|insertAdjacentHTML/,/alert\(|confirm\(|prompt\(/,/fetch\(|chrome\.storage/])a.equal(bad.test(content),false);
  let handler;const timers=[],intervals=[],body={},table={isConnected:true,querySelector:()=>body,contains:()=>true};
  const c=vm.createContext({crypto,document:{getElementById:()=>table,addEventListener:()=>{},removeEventListener:()=>{}},window:{addEventListener:()=>{}},chrome:{runtime:{id:'own',sendMessage:()=>Promise.resolve(),onMessage:{addListener:f=>handler=f,removeListener:()=>{}}}},SparkleQueueParser:{parseTable:(_t,scope)=>({parserState:'ready',entries:scope?[{id:'p1:a',name:'Reviewer',orderedAt:1}]:full.entries,revealedIds:[],revealedEntries:[]})},MutationObserver:class{observe(){}disconnect(){}},setTimeout:f=>{timers.push(f);return timers.length},clearTimeout:()=>{},setInterval:(f,n)=>{intervals.push([f,n]);return intervals.length},clearInterval:()=>{}});
  vm.runInContext(content,c);let reply;handler({action:'sparkle-v2-inspect'},{id:'own'},x=>reply=x);a.equal(reply.protocol,2);a.equal(reply.snapshot.entries.length,2);handler({action:'sparkle-v2-read',generation:1,selection:descriptor.scope},{id:'own'},x=>reply=x);a.equal(reply.generation,1);a.equal(reply.snapshot.entries.length,1);
  console.log('PASS: read-only content adapter supports automatic inspection and scoped publishing without page writes');
})().catch(error=>{console.error(error);process.exitCode=1});
