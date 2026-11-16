/* eslint-disable @typescript-eslint/no-require-imports -- standalone release contract */
const a=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto').webcrypto;
const endpoint='https://www.yoursparklesuite.com/api/live-lineup/publish',code='MHF-9446',rep='11111111-1111-4111-8111-111111111111';
const event=(listeners,key)=>({addListener:f=>listeners[key]=f});
function area(record){return{setAccessLevel:async()=>{},get:async keys=>{if(Array.isArray(keys))return Object.fromEntries(keys.map(k=>[k,structuredClone(record[k])]));return{[keys]:structuredClone(record[keys])}},set:async values=>Object.assign(record,structuredClone(values)),remove:async key=>{delete record[key]}}}
function response(body,status=200){const r=new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});Object.defineProperty(r,'url',{value:endpoint});return r}

(async()=>{
  if (process.argv.includes('--updater-only')) {
    const api=require('../chrome-extension/update-client.js');
    const version='2.0.9',target='2.0.10';
    const initial=Date.parse('2026-11-16T18:00:00.000Z');
    const release={protocol:1,version:target,publishedAt:'2026-11-16T17:00:00.000Z',rolloutEnabled:true};
    function fixture({result={status:'no_update'},failFetch=false}={}){
      let time=initial,checks=0,fetches=0,reloads=0;
      const records={publisher:{token:'NEVER_SEND_THIS',excludedPartyIds:['P2'],claimId:'keep',nextSequence:91}};
      const storage=area(records);
      const deps={storage,key:'updates',version,now:()=>time,fetchRelease:async()=>{fetches++;if(failFetch)throw Error('offline');return structuredClone(release);},requestCheck:async()=>{checks++;return result;},reload:()=>{reloads++;}};
      const client=api.create(deps);
      return {client,records,deps,advance:n=>{time+=n;},setTime:n=>{time=n;},counts:()=>({checks,fetches,reloads}),now:()=>time};
    }
    const context=(overrides={})=>async()=>({tabCount:1,enabled:true,healthy:false,lastReadyAckAt:null,busy:false,pendingActions:0,...overrides});
    async function tenMinutes(f,ctx=context()){
      for(let i=0;i<=20;i++){await f.client.check();await f.client.consider(ctx);if(i<20)f.advance(30000);}
    }
    {
      a.equal(api.compare('2.0.10','2.0.9'),1);a.equal(api.compare('2.0.9.0','2.0.9'),0);
      for(const v of ['2.0.07','2.0.65536','2.x','https://evil.example'])a.equal(api.compare(v,version),null);
      a.ok(api.descriptor({protocol:1,version:'2.0.7',publishedAt:null,rolloutEnabled:false},initial));
      for(const d of [{...release,url:'https://evil.example'},{...release,publishedAt:null},{...release,publishedAt:'2099-01-01T00:00:00Z'},{...release,rolloutEnabled:'true'}])a.equal(api.descriptor(d,initial),null);
      const f=fixture();await f.client.check();await f.client.check();a.deepEqual(f.counts(),{checks:1,fetches:1,reloads:0});
      const restart=api.create(f.deps);await restart.check();a.equal(f.counts().checks,1);
      console.log('PASS updater 1: trusted published descriptor, numeric versions, startup/restart cooldown');
    }
    {
      for(const opts of [{failFetch:true},{result:{status:'throttled'}},{result:{status:'no_update'}},{result:{status:'unexpected'}}]){
        const f=fixture(opts),before=JSON.stringify(f.records.publisher);await f.client.check();f.advance(300000);await f.client.check();
        a.equal(JSON.stringify(f.records.publisher),before);a.equal(f.counts().reloads,0);a.ok(f.counts().checks<=1);
      }
      const f=fixture();await f.client.check();f.advance(3600000);await api.create(f.deps).check();a.equal(f.counts().checks,2);
      console.log('PASS updater 2: offline, throttling and no-update preserve publisher state and persist bounded retry');
    }
    {
      for(const overrides of [{healthy:true},{tabCount:2},{lastReadyAckAt:initial+590000},{pendingActions:1},{busy:true}]){
        const f=fixture();await f.client.noteDownload(target);await tenMinutes(f,context(overrides));a.equal(f.counts().reloads,0);
      }
      const f=fixture();await f.client.noteDownload(target);await f.client.check();await f.client.consider(context());f.advance(600000);await f.client.check();await f.client.consider(context());a.equal(f.counts().reloads,0,'sleep is not continuous failure');
      const changed=fixture();await changed.client.noteDownload(target);await tenMinutes(changed,context({sourceIdentity:'old',pendingActions:1}));await changed.client.consider(context({sourceIdentity:'new'}));a.equal(changed.counts().reloads,0,'new source cannot inherit broken timer');
      console.log('PASS updater 3: healthy, recent-ready, ambiguous tabs, actions, in-flight work and sleep refuse installation');
    }
    {
      const f=fixture();await f.client.noteDownload(target);await tenMinutes(f);a.equal(f.counts().reloads,1);
      a.equal(f.records.updates.attemptVersion,target);a.equal(f.records.publisher.nextSequence,91);
      await f.client.noteDownload(target);await api.create(f.deps).consider(context());a.equal(f.counts().reloads,1,'unchanged version and duplicate event cannot loop');
      const idle=fixture();await idle.client.check();await idle.client.noteDownload(target);await api.create(idle.deps).consider(context({tabCount:0}));a.equal(idle.counts().reloads,1);
      const unannounced=fixture();await unannounced.client.noteDownload('2.0.11');await tenMinutes(unannounced);a.equal(unannounced.counts().reloads,0);
      console.log('PASS updater 4: eligible update installs once, idle installation works, unannounced targets and failed reload loops are blocked');
    }
    {
      const f=fixture();await f.client.check();await f.client.noteDownload(target);
      let reads=0;
      await f.client.consider(async()=>({tabCount:0,enabled:true,healthy:false,busy:false,pendingActions:++reads===3?1:0}));
      a.equal(f.counts().reloads,0);a.equal(f.records.updates.attemptVersion,target,'marker persisted before final guard');
      const text=fs.readFileSync('chrome-extension/background.js','utf8');
      a.ok(text.includes('return exclusive(pull).finally(()=>{requesting=false;scheduleUpdate();})'));
      a.ok(text.includes('updater.check().then(()=>exclusive(()=>updater.consider(updaterContext)))'));
      a.ok(text.includes('if (mutation) {pendingActions++;invalidatePull();}'));
      a.ok(text.includes("previous?.token===credential ? [...(previous.excludedPartyIds || [])] : []"));
      console.log('PASS updater 5: last-moment action cancels installation; serialized worker path preserves same-account exclusions');
    }
    {
      const text=fs.readFileSync('chrome-extension/content.js','utf8');
      for(const bad of [/reload|location\.href|location\.replace/,/document\.createElement|appendChild|innerHTML|insertAdjacentHTML/,/alert\(|confirm\(|prompt\(/,/fetch\(|chrome\.storage/])a.equal(bad.test(text),false);
      const handlers=new Set(),events=new Map(),intervals=new Set(),timers=new Set(),observers=[];let nextId=0,time=initial;
      const table={isConnected:true,contains:()=>true};
      const add=(kind,f)=>{if(!events.has(kind))events.set(kind,new Set());events.get(kind).add(f);};
      const remove=(kind,f)=>events.get(kind)?.delete(f);
      const parser={parseTable:()=>({parserState:'ready',entries:[],revealedIds:[],revealedEntries:[]})};
      const c=vm.createContext({Date:class extends Date{static now(){return time;}},crypto,document:{getElementById:()=>table,addEventListener:add,removeEventListener:remove},window:{addEventListener:add,removeEventListener:remove},chrome:{runtime:{id:'own',sendMessage:()=>Promise.resolve(),onMessage:{addListener:f=>handlers.add(f),removeListener:f=>handlers.delete(f)}}},SparkleQueueParser:parser,MutationObserver:class{constructor(f){this.fn=f;observers.push(this);}observe(target,options){this.target=target;this.options=options;this.active=true;}disconnect(){this.active=false;}},setTimeout:()=>{const id=++nextId;timers.add(id);return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>{const id=++nextId;intervals.add(id);return id;},clearInterval:id=>intervals.delete(id)});
      vm.runInContext(text.replace(/const READER_VERSION = "[^"]+"/,'const READER_VERSION = "2.0.8"'),c);
      a.equal(handlers.size,1);a.equal(intervals.size,2);
      c.SparkleQueueParser={parseTable:()=>{throw Error('wrong parser');}};time+=1000;
      let reply;[...handlers][0]({action:'sparkle-v2-inspect'},{id:'own'},x=>reply=x);a.equal(reply.snapshot.parserState,'ready','reader captures original parser');
      c.SparkleQueueParser=parser;vm.runInContext(text,c);vm.runInContext(text,c);
      a.equal(handlers.size,1);a.equal(intervals.size,2);a.equal(observers.filter(o=>o.active).length,1);
      a.equal(observers.at(-1).target,table);a.ok(observers.at(-1).options.attributeFilter.includes('data-sort-by'));
      time+=1000;[...handlers][0]({action:'sparkle-v2-inspect'},{id:'own'},x=>reply=x);a.equal(reply.readerVersion,version);
      for(const kind of ['change','input','pagehide','pageshow'])a.equal(events.get(kind).size,1);
      vm.runInContext('globalThis.__sparkleLineupReader.stop()',c);a.equal(handlers.size,0);a.equal(intervals.size,0);a.equal(timers.size,0);
      for(const kind of ['change','input','pagehide','pageshow'])a.equal(events.get(kind).size,0);
      c.__sparkleLineupReaderActive=true;vm.runInContext(text,c);a.equal(handlers.size,0,'legacy reader cannot be duplicated');
      console.log('PASS updater 6: versioned reader replacement tears down old observers/listeners and never changes the page');
    }
    return;
  }
  if (process.argv.includes('--reporting-only')) {
    const text=fs.readFileSync('chrome-extension/popup.js','utf8');
    const context=vm.createContext({});
    vm.runInContext(text.slice(0,text.indexOf('(function(){')),context);
    const signal=value=>vm.runInContext('extensionLineupStatus('+JSON.stringify(value)+')',context);
    const base={enabled:true,connected:false,lastReadyAckAt:123,lastError:null};
    for (const extra of [{scopePending:true},{parserReason:'table_settling'},{parserReason:'row_incomplete'},{parserReason:'table_busy'},{parserReason:'reveal_state_missing'},{}]) {
      const result=signal({...base,...extra});a.equal(result.title,'Reconnecting');a.notEqual(result.tone,'good');
    }
    a.equal(signal({...base,connected:true}).tone,'good');
    a.equal(signal({...base,lastReadyAckAt:null}).title,'Connecting');
    a.equal(signal({...base,enabled:false}).title,'Off');
    a.equal(signal({...base,parserReason:'invalid_first_name'}).title,'Needs attention');
    console.log('PASS: 2.0.8 reporting popup never green while disconnected');
    return;
  }
  const manifest=JSON.parse(fs.readFileSync('chrome-extension/manifest.json','utf8'));
  a.equal(manifest.version,'2.0.10');a.deepEqual(manifest.permissions,['storage','alarms','scripting']);
  const popup=fs.readFileSync('chrome-extension/popup.html','utf8'),popupJs=fs.readFileSync('chrome-extension/popup.js','utf8');
  for(const phrase of ['Review / select source','First-time setup','computer name','pairing key','party IDs'])a.equal((popup+popupJs).includes(phrase),false,phrase);
  for(const phrase of ['Connect Live Lineup','Live Queue code','Detected parties'])a.equal(popup.includes(phrase),true,phrase);
  a.equal(popup.includes('id="enabled"'),true);a.equal(popupJs.includes('sparkle-v2-filter'),true);

  const local={},session={},sync={sync_code:code,enabled:true,excluded_party_ids:['p2']},listeners={},requests=[];
  let descriptor={protocol:2,orderScope:'selected-parties',generation:0,scope:null,serverTime:new Date().toISOString()},sequence=-1,observations=0;
  const full={parserState:'ready',entries:[{id:'p1:a',name:'Reviewer One',orderedAt:1},{id:'p2:b',name:'Reviewer Two',orderedAt:2}],revealedIds:[],revealedEntries:[]};
  const chrome={runtime:{id:'test-extension',getURL:p=>'chrome-extension://test-extension/'+p,getManifest:()=>({version:manifest.version}),onMessage:event(listeners,'message')},storage:{local:area(local),session:area(session),sync:area(sync)},alarms:{create:async()=>{},onAlarm:event(listeners,'alarm')},tabs:{query:async()=>[{id:9,active:true,url:'https://myoffice.bombparty.com/live-party-orders'}],sendMessage:async(_id,message)=>({protocol:2,readerVersion:manifest.version,orderScope:'selected-parties',generation:message.generation,source:{documentId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',serial:++observations,settled:true},snapshot:full}),onRemoved:event(listeners,'removed'),onUpdated:event(listeners,'updated'),onActivated:event(listeners,'activated')}};
  const fetcher=async(_u,options)=>{if(_u.endsWith('/release')){const r=new Response(JSON.stringify({protocol:1,version:'2.0.7',publishedAt:null,rolloutEnabled:false}),{headers:{'content-type':'application/json'}});Object.defineProperty(r,'url',{value:_u});return r;}const body=JSON.parse(options.body);requests.push(body);const stamp=new Date().toISOString(),lease=new Date(Date.now()+90000).toISOString();if(body.action==='describe')return response(descriptor);if(body.action==='claim')return response({claimId:body.claimId,capabilities:body.capabilities,generation:descriptor.generation,publisherId:rep,epoch:descriptor.generation+1,revision:1,acceptedSequence:sequence,serverTime:stamp,leaseExpiresAt:lease});if(body.action==='snapshot'){sequence=body.packet.sequence;return response({ok:true,revision:2,acceptedSequence:sequence,serverTime:stamp,leaseExpiresAt:lease,freshForMs:45000})}if(body.action==='configure'){const ids=[...body.partyIds].sort(),excluded=[...body.excludedPartyIds].sort();descriptor={protocol:2,orderScope:'selected-parties',generation:descriptor.generation||1,scope:{partyIds:ids,excludedPartyIds:excluded,carryEntryIds:['p1:a','p2:b'],startedAt:stamp},serverTime:stamp};return response({...descriptor,configured:{applied:true,claimId:body.claimId,epoch:body.epoch,generation:descriptor.generation,partyIds:ids,excludedPartyIds:excluded}})}throw Error('unexpected '+body.action)};
  const context=vm.createContext({chrome,importScripts:()=>{},SparklePublisherClient:require('../chrome-extension/publisher-client.js'),SparkleUpdateClient:require('../chrome-extension/update-client.js'),URL,TextEncoder,TextDecoder,AbortController,crypto,setTimeout:(f,n)=>setTimeout(f,Math.min(n,20)),clearTimeout,fetch:fetcher});
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
  const c=vm.createContext({crypto,document:{getElementById:()=>table,addEventListener:()=>{},removeEventListener:()=>{}},window:{addEventListener:()=>{},removeEventListener:()=>{}},chrome:{runtime:{id:'own',sendMessage:()=>Promise.resolve(),onMessage:{addListener:f=>handler=f,removeListener:()=>{}}}},SparkleQueueParser:{parseTable:(_t,scope)=>({parserState:'ready',entries:scope?[{id:'p1:a',name:'Reviewer',orderedAt:1}]:full.entries,revealedIds:[],revealedEntries:[]})},MutationObserver:class{observe(){}disconnect(){}},setTimeout:f=>{timers.push(f);return timers.length},clearTimeout:()=>{},setInterval:(f,n)=>{intervals.push([f,n]);return intervals.length},clearInterval:()=>{}});
  vm.runInContext(content,c);let reply;handler({action:'sparkle-v2-inspect'},{id:'own'},x=>reply=x);a.equal(reply.protocol,2);a.equal(reply.snapshot.entries.length,2);handler({action:'sparkle-v2-read',generation:1,selection:descriptor.scope},{id:'own'},x=>reply=x);a.equal(reply.generation,1);a.equal(reply.snapshot.entries.length,1);
  console.log('PASS: read-only content adapter supports automatic inspection and scoped publishing without page writes');
})().catch(error=>{console.error(error);process.exitCode=1});
