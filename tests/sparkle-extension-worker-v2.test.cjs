/* eslint-disable @typescript-eslint/no-require-imports -- standalone release contract */
const a=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),crypto=require('node:crypto').webcrypto;
const endpoint='https://www.yoursparklesuite.com/api/live-lineup/publish',code='MHF-9446',rep='11111111-1111-4111-8111-111111111111';
const event=(listeners,key)=>({addListener:f=>listeners[key]=f});
function area(record){return{setAccessLevel:async()=>{},get:async keys=>{if(Array.isArray(keys))return Object.fromEntries(keys.map(k=>[k,structuredClone(record[k])]));return{[keys]:structuredClone(record[keys])}},set:async values=>Object.assign(record,structuredClone(values)),remove:async key=>{delete record[key]}}}
function response(body,status=200){const r=new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});Object.defineProperty(r,'url',{value:endpoint});return r}

function deferred() {
  return Promise.withResolvers();
}
const flush = () => new Promise(resolve => setImmediate(resolve));

async function reconnectFixture(version) {
  let time = Date.parse('2026-11-19T18:00:00Z');
  let timerId = 0, serial = 0, probes = 0, injects = 0, installs = 0, stops = 0;
  const timers = new Map(), hooks = {}, writes = [], posts = [], listeners = {};
  const page = vm.createContext({});
  const descriptor = {
    protocol:2, orderScope:'selected-parties', generation:1,
    scope:{partyIds:['p1'],excludedPartyIds:[],startedAt:new Date(time).toISOString(),carryEntryIds:[]},
  };
  const snapshot = {
    parserState:'ready', entries:[{id:'p1:1',name:'Synthetic Order',orderedAt:1}],
    revealedIds:[], revealedEntries:[],
  };
  const local = {}, session = {};
  function watchedArea(name, record) {
    const storage = area(record);
    return {...storage,
      get:async key => {
        const current = await storage.get(key);
        return hooks[name + 'Get'] ? hooks[name + 'Get'](current) : current;
      },
      set:async values => {
        writes.push(name);
        await storage.set(values);
      },
    };
  }
  function install(readerVersion = version) {
    const current = page.__sparkleLineupReader;
    if (current?.version === readerVersion && !current.stopped) return;
    if (current && !current.stopped) current.stop();
    const lifecycle = {version:readerVersion,stopped:false,stop() {
      stops++;
      this.stopped = true;
      page.__sparkleLineupReaderActive = false;
    }};
    page.__sparkleLineupReader = lifecycle;
    page.__sparkleLineupReaderActive = true;
    installs++;
  }
  const tab = {id:9,url:'https://myoffice.bombparty.com/live-party-orders'};
  const chrome = {
    runtime:{id:'fake',getManifest:()=>({version}),getURL:path=>'chrome-extension://fake/'+path,onMessage:event(listeners,'message')},
    alarms:{create:async()=>{},onAlarm:event(listeners,'alarm')},
    storage:{local:watchedArea('local',local),session:watchedArea('session',session),sync:area({})},
    tabs:{
      query:async()=>hooks.query ? hooks.query(tab) : [tab],
      sendMessage:async(_id,message)=>{
        const reader = page.__sparkleLineupReader;
        if (!reader || reader.stopped) throw Error('Receiving end does not exist');
        if (message.action === 'sparkle-v2-probe') return {readerVersion:reader.version};
        hooks.read?.(message);
        return {protocol:2,readerVersion:reader.version,generation:message.generation,
          discovery:snapshot,snapshot,source:{documentId:rep,serial:++serial,settled:true}};
      },
      onRemoved:event(listeners,'removed'),
      onUpdated:event(listeners,'updated'),
    },
    scripting:{executeScript:async request=>{
      if (request.func) {
        probes++;
        const runProbe = () => {
          page.probeArgs = request.args;
          return [{result:vm.runInContext('('+request.func.toString()+')(...probeArgs)',page)}];
        };
        return hooks.probe ? hooks.probe(runProbe) : runProbe();
      }
      injects++;
      const runInject = () => { install(); return []; };
      return hooks.inject ? hooks.inject(runInject) : runInject();
    }},
  };
  const fetch = async (_url,options) => {
    const body = JSON.parse(options.body);
    posts.push(body);
    const serverTime = new Date(time).toISOString(), leaseExpiresAt = new Date(time+90000).toISOString();
    if (body.action === 'control-checkin') return response({error:'invalid_payload'},400);
    if (body.action === 'describe') return response({...descriptor,serverTime});
    if (body.action === 'claim') return response({
      claimId:body.claimId,capabilities:body.capabilities,publisherId:rep,generation:1,
      epoch:7,acceptedSequence:3,revision:1,serverTime,leaseExpiresAt,
    });
    if (body.action === 'snapshot') return response({
      ok:true,acceptedSequence:body.packet.sequence,revision:2,serverTime,leaseExpiresAt,freshForMs:45000,
    });
    throw Error('Unexpected fake POST action');
  };
  const context = vm.createContext({
    chrome, URL, TextEncoder, TextDecoder, AbortController, fetch, importScripts:()=>{},
    crypto:{randomUUID:()=>crypto.randomUUID(),subtle:{digest:async()=>new Uint8Array(32).buffer}},
    Date:class extends Date { static now() { return time; } },
    SparkleUpdateClient:{compare:()=>1,create:()=>({
      checkAndInstall:async()=>{},refreshMetadata:async()=>{},getStatus:async()=>({updateState:await hooks.updateState?.() ?? null}),
    })},
    setTimeout:(fn,ms)=>{
      const id = ++timerId;
      timers.set(id,{fn,deadline:time+ms});
      return id;
    },
    clearTimeout:id=>timers.delete(id),
  });
  const run = text => vm.runInContext(text,context);
  run(fs.readFileSync('chrome-extension/publisher-client.js','utf8'));
  run(fs.readFileSync('chrome-extension/background.js','utf8'));
  await run('ready');
  await flush();
  await run('serial');
  local.sparklePublisherV2 = {
    token:'TST-0001',enabled:true,workflowVersion:4,configVersion:'test',generation:1,excludedPartyIds:[],
    claimId:rep,epoch:7,publisherId:rep,nextSequence:4,needsClaim:false,nextAttemptAt:0,
  };
  run('lastRequest=0');
  install();
  return {
    hooks, page, posts, writes, install, listeners,
    state:local.sparklePublisherV2,
    counts:()=>({probes,injects,installs,stops}),
    request:()=>run('requestPull()'),
    requesting:()=>run('requesting'),
    async advance(ms) {
      time += ms;
      for (const [id,timer] of timers) {
        if (timer.deadline > time) continue;
        timers.delete(id);
        timer.fn();
      }
      await flush();
    },
  };
}
function expectRecovery(fixture, sequence = 4) {
  const snapshots = fixture.posts.filter(body=>body.action === 'snapshot');
  a.deepEqual(snapshots.map(({packet})=>[packet.epoch,packet.sequence]),
    Array.from({length:sequence-3},(_,index)=>[7,4+index]));
}
async function verifyReconnect(version) {
  const first=Number(process.env.LIVE_LINEUP_FIRST_RECONNECT_CASE || 1);
  if (first <= 1) {
    const f = await reconnectFixture(version);
    f.install('2.0.11');
    const stalled = deferred();
    f.hooks.probe = () => stalled.promise;
    const first = f.request();
    await flush();
    a.equal(f.counts().probes,1);
    await f.advance(3999);
    a.equal(f.requesting(),true);
    await f.advance(1);
    a.equal((await first).status,'source_unavailable');
    f.hooks.probe = undefined;
    a.equal((await f.request()).status,'confirmed');
    expectRecovery(f);
    console.log('PASS T-W3a: stalled probe times out at 4 seconds and the next cycle posts');
  }
  if (first <= 2) {
    const f = await reconnectFixture(version);
    const stalled = deferred();
    f.hooks.query = () => stalled.promise;
    const first = f.request();
    await flush();
    await f.advance(3999);
    a.equal(f.requesting(),true);
    await f.advance(1);
    a.equal((await first).status,'source_unavailable');
    f.hooks.query = undefined;
    a.equal((await f.request()).status,'confirmed');
    expectRecovery(f);
    console.log('PASS T-W3b: stalled tabs query times out at 4 seconds and the next cycle posts');
  }
  if (first <= 3) {
    for (const elapsed of [60001,-1]) {
      const f = await reconnectFixture(version);
      const old = deferred(), fresh = deferred();
      let hits = 0;
      f.hooks.sessionGet = async value => {
        const stall = ++hits === 1 ? old : fresh;
        await stall.promise;
        return value;
      };
      const first = f.request();
      await flush();
      a.equal(hits,1);
      await f.advance(elapsed);
      const second = f.request(), identity = await flush().then(()=>f.requesting());
      a.equal(identity,true);
      a.equal(hits,2);
      old.resolve();
      a.equal((await first).status,'source_changed');
      a.equal(f.requesting(),true,'stale finalizer cannot clear the replacement cycle');
      fresh.resolve();
      a.equal((await second).status,'confirmed');
      expectRecovery(f);
    }
    console.log('PASS T-W3c: watchdog replaces the queue after 60 seconds or a backward clock jump');
  }
  if (first <= 4) {
    const f = await reconnectFixture(version);
    f.install('2.0.11');
    const stalled = deferred();
    let lateInject;
    f.hooks.inject = perform => { lateInject=perform; return stalled.promise; };
    const first = f.request();
    await flush();
    a.equal(f.counts().probes,1);
    a.equal(f.counts().injects,1);
    a.equal(f.page.__sparkleLineupReader.stopped,true);
    await f.advance(4999);
    a.equal(f.requesting(),true);
    await f.advance(1);
    a.equal((await first).status,'source_unavailable');
    f.hooks.inject = undefined;
    a.equal((await f.request()).status,'confirmed');
    a.equal(f.counts().probes,1,'retry skipped the probe and cooldown');
    a.equal(f.counts().injects,2);
    const installedReader = f.page.__sparkleLineupReader;
    stalled.resolve(lateInject());
    a.equal(f.page.__sparkleLineupReader,installedReader);
    expectRecovery(f);
    console.log('PASS T-W3d: stalled injection times out at 5 seconds and retries without a duplicate reader');
  }
  if (first <= 5) {
    const f = await reconnectFixture(version);
    Object.assign(f.state,{epoch:null,publisherId:null,needsClaim:true});
    const stalled = deferred();
    let scopedRead = false;
    f.hooks.read = message => { if (message.action === 'sparkle-v2-read') scopedRead=true; };
    f.hooks.updateState = () => scopedRead ? stalled.promise : null;
    const first = f.request();
    await flush();
    a.equal(scopedRead,true);
    a.equal(f.posts.filter(body=>body.action==='claim').length,1);
    await f.advance(60001);
    f.hooks.updateState = undefined;
    a.equal((await f.request()).status,'confirmed');
    expectRecovery(f);
    stalled.resolve();
    a.equal((await first).status,'source_changed');
    a.equal(f.posts.filter(body=>body.action==='claim').length,1);
    expectRecovery(f);
    console.log('PASS T-W3e: a cycle stalled inside sync after its claim cannot block the next snapshot');
  }
  if (first <= 6) {
    const f = await reconnectFixture(version);
    const stalled = deferred();
    let intercepted = false;
    f.hooks.read = message => {
      if (message.action !== 'sparkle-v2-read' || intercepted) return;
      f.hooks.localGet = async value => {
        intercepted = true;
        f.hooks.localGet = undefined;
        await stalled.promise;
        return value;
      };
    };
    const first = f.request();
    await flush();
    a.equal(intercepted,true,'old cycle is inside the read-before-write storage update');
    await f.advance(60001);
    a.equal((await f.request()).status,'confirmed');
    expectRecovery(f);
    await flush();
    const before = [f.posts.length,f.writes.length];
    stalled.resolve();
    a.equal((await first).status,'source_changed');
    await flush();
    a.deepEqual([f.posts.length,f.writes.length],before,'late cycle made zero fetches and zero storage writes');
    expectRecovery(f);
    console.log('PASS T-W3f: late completion during a storage update cannot post or write');
  }
  if (first <= 7) {
    const f = await reconnectFixture(version);
    const old = [deferred(),deferred()];
    const first = [];
    for (const stalled of old) {
      f.hooks.sessionGet = async value => { await stalled.promise; return value; };
      first.push(f.request());
      await flush();
      await f.advance(60001);
    }
    f.hooks.sessionGet = undefined;
    a.equal((await f.request()).status,'confirmed');
    expectRecovery(f);
    old.forEach(stalled=>stalled.resolve());
    a.deepEqual((await Promise.all(first)).map(result=>result.status),['source_changed','source_changed']);
    expectRecovery(f);
    console.log('PASS T-W3g: two successive hangs still allow the third cycle to post');
  }
  if (first <= 8) {
    const f = await reconnectFixture(version);
    f.install('2.0.11');
    const stalled = deferred();
    let lateProbe;
    f.hooks.probe = perform => { lateProbe=perform; return stalled.promise; };
    const first = f.request();
    await flush();
    await f.advance(4000);
    a.equal((await first).status,'source_unavailable');
    f.install();
    a.equal((await f.request()).status,'confirmed');
    expectRecovery(f);
    const fresh = f.page.__sparkleLineupReader;
    const stopped = f.counts().stops;
    const result = lateProbe();
    a.equal(result[0].result,'healthy');
    stalled.resolve(result);
    a.equal(f.page.__sparkleLineupReader,fresh);
    a.equal(fresh.stopped,false);
    a.equal(f.counts().stops,stopped);
    await f.advance(700);
    a.equal((await f.request()).status,'confirmed');
    expectRecovery(f,5);
    console.log('PASS T-W3h: a late probe leaves the current reader running and able to post');
  }
}

(async()=>{
  if (process.argv.includes('--updater-only')) {
    const api=require('../chrome-extension/update-client.js');
    const version='2.0.9',target='2.0.10';
    const initial=Date.parse('2026-11-16T18:00:00.000Z');
    const release={protocol:1,version:target,publishedAt:'2026-11-16T17:00:00.000Z',rolloutEnabled:true};
    a.equal(api.compare('2.0.10','2.0.9'),1);
    a.equal(api.compare('2.0.9.0','2.0.9'),0);
    for (const bad of ['2.0.07','2.0.65536','2.x','https://evil.example']) a.equal(api.compare(bad,version),null);
    for (const bad of [{...release,url:'https://evil.example'},{...release,publishedAt:null},{...release,publishedAt:'2099-01-01T00:00:00Z'},{...release,rolloutEnabled:'true'}]) {
      a.equal(api.descriptor(bad,initial),null);
    }
    const records = {publisher:{excludedPartyIds:['P2'],claimId:'keep',nextSequence:91}};
    const deps = {storage:area(records),key:'updates',version,now:()=>initial,
      fetchRelease:async()=>{throw Error('metadata offline');},
      requestCheck:async()=>({status:'throttled'}),reload:()=>{records.reloaded=true;}};
    const updater=api.create(deps);
    await updater.refreshMetadata();
    a.equal(await updater.checkAndInstall(),'throttled');
    a.equal(await updater.onUpdateAvailable(target),true);
    a.equal(records.publisher.nextSequence,91);
    a.equal(records.reloaded,true);
    a.equal(await api.create(deps).onUpdateAvailable(target),false);
    {
      const text=fs.readFileSync('chrome-extension/content.js','utf8');
      for(const bad of [/reload|location\.href|location\.replace/,/document\.createElement|appendChild|innerHTML|insertAdjacentHTML/,/alert\(|confirm\(|prompt\(/,/fetch\(|chrome\.storage/])a.equal(bad.test(text),false);
      const handlers=new Set(),events=new Map(),intervals=new Set(),timers=new Set(),observers=[];let nextId=0,time=initial;
      const table={isConnected:true,contains:()=>true};
      const add=(kind,f)=>{if(!events.has(kind))events.set(kind,new Set());events.get(kind).add(f);};
      const remove=(kind,f)=>events.get(kind)?.delete(f);
      const parser={parseTable:()=>({parserState:'ready',entries:[],revealedIds:[],revealedEntries:[]})};
      const c=vm.createContext({Date:class extends Date{static now(){return time;}},crypto,document:{getElementById:()=>table,addEventListener:add,removeEventListener:remove},window:{addEventListener:add,removeEventListener:remove},chrome:{runtime:{id:'own',sendMessage:()=>Promise.resolve(),onMessage:{addListener:f=>handlers.add(f),removeListener:f=>handlers.delete(f)}}},SparkleQueueParser:{...parser,parseDiscovery:parser.parseTable},MutationObserver:class{constructor(f){this.fn=f;observers.push(this);}observe(target,options){this.target=target;this.options=options;this.active=true;}disconnect(){this.active=false;}},setTimeout:()=>{const id=++nextId;timers.add(id);return id;},clearTimeout:id=>timers.delete(id),setInterval:()=>{const id=++nextId;intervals.add(id);return id;},clearInterval:id=>intervals.delete(id)});
      vm.runInContext(text.replace(/const READER_VERSION = "[^"]+"/,'const READER_VERSION = "2.0.8"'),c);
      a.equal(handlers.size,1);a.equal(intervals.size,2);
      c.SparkleQueueParser={parseTable:()=>{throw Error('wrong parser');}};time+=1000;
      let reply;[...handlers][0]({action:'sparkle-v2-inspect'},{id:'own'},x=>reply=x);a.equal(reply.snapshot.parserState,'ready','reader captures original parser');
      c.SparkleQueueParser={...parser,parseDiscovery:parser.parseTable};vm.runInContext(text,c);vm.runInContext(text,c);
      a.equal(handlers.size,1);a.equal(intervals.size,2);a.equal(observers.filter(o=>o.active).length,1);
      a.equal(observers.at(-1).target,table);a.ok(observers.at(-1).options.attributeFilter.includes('data-sort-by'));
      time+=1000;[...handlers][0]({action:'sparkle-v2-inspect'},{id:'own'},x=>reply=x);a.equal(reply.readerVersion,JSON.parse(fs.readFileSync('chrome-extension/manifest.json','utf8')).version);
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
    vm.runInContext(text.slice(0,text.indexOf('(function() {')),context);
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
  a.equal(manifest.version,'2.0.13');a.deepEqual(manifest.permissions,['storage','alarms','scripting']);
  const deadline = setTimeout(()=>{console.error('Worker watchdog fixture did not finish');process.exitCode=1;},5000);
  try { await verifyReconnect(manifest.version); }
  finally { clearTimeout(deadline); }
  const popup=fs.readFileSync('chrome-extension/popup.html','utf8'),popupJs=fs.readFileSync('chrome-extension/popup.js','utf8');
  for(const phrase of ['Review / select source','First-time setup','computer name','pairing key','party IDs'])a.equal((popup+popupJs).includes(phrase),false,phrase);
  for(const phrase of ['Connect Live Lineup','Live Queue code','Detected parties'])a.equal(popup.includes(phrase),true,phrase);
  a.equal(popup.includes('id="enabled"'),true);a.equal(popupJs.includes('sparkle-v2-filter'),true);

  const local={},session={},sync={sync_code:code,enabled:true,excluded_party_ids:['p2']},listeners={},requests=[];
  let descriptor={protocol:2,orderScope:'selected-parties',generation:0,scope:null,serverTime:new Date().toISOString()},sequence=-1,observations=0;
  const full={parserState:'ready',entries:[{id:'p1:a',name:'Reviewer One',orderedAt:1},{id:'p2:b',name:'Reviewer Two',orderedAt:2}],revealedIds:[],revealedEntries:[]};
  const chrome={runtime:{id:'test-extension',getURL:p=>'chrome-extension://test-extension/'+p,getManifest:()=>({version:manifest.version}),onMessage:event(listeners,'message')},storage:{local:area(local),session:area(session),sync:area(sync)},alarms:{create:async()=>{},onAlarm:event(listeners,'alarm')},tabs:{query:async()=>[{id:9,active:true,url:'https://myoffice.bombparty.com/live-party-orders'}],sendMessage:async(_id,message)=>({protocol:2,readerVersion:manifest.version,orderScope:'selected-parties',generation:message.generation,source:{documentId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',serial:++observations,settled:true},snapshot:full,discovery:full}),onRemoved:event(listeners,'removed'),onUpdated:event(listeners,'updated'),onActivated:event(listeners,'activated')}};
  const fetcher=async(_u,options)=>{if(_u.endsWith('/release')){const r=new Response(JSON.stringify({protocol:1,version:'2.0.7',publishedAt:null,rolloutEnabled:false}),{headers:{'content-type':'application/json'}});Object.defineProperty(r,'url',{value:_u});return r;}const body=JSON.parse(options.body);requests.push(body);const stamp=new Date().toISOString(),lease=new Date(Date.now()+90000).toISOString();if(body.action==='describe')return response(descriptor);if(body.action==='claim')return response({claimId:body.claimId,capabilities:body.capabilities,generation:descriptor.generation,publisherId:rep,epoch:descriptor.generation+1,revision:1,acceptedSequence:sequence,serverTime:stamp,leaseExpiresAt:lease});if(body.action==='snapshot'){sequence=body.packet.sequence;return response({ok:true,revision:2,acceptedSequence:sequence,serverTime:stamp,leaseExpiresAt:lease,freshForMs:45000})}if(body.action==='configure'){const ids=[...body.partyIds].sort(),excluded=[...body.excludedPartyIds].sort();descriptor={protocol:2,orderScope:'selected-parties',generation:descriptor.generation||1,scope:{partyIds:ids,excludedPartyIds:excluded,carryEntryIds:['p1:a','p2:b'],startedAt:stamp},serverTime:stamp};return response({...descriptor,configured:{applied:true,claimId:body.claimId,epoch:body.epoch,generation:descriptor.generation,partyIds:ids,excludedPartyIds:excluded}})}throw Error('unexpected '+body.action)};
  const context=vm.createContext({chrome,importScripts:()=>{},SparklePublisherClient:require('../chrome-extension/publisher-client.js'),SparkleUpdateClient:require('../chrome-extension/update-client.js'),URL,TextEncoder,TextDecoder,AbortController,crypto,setTimeout:(f,n)=>setTimeout(f,Math.min(n,20)),clearTimeout,fetch:fetcher});
  vm.runInContext(fs.readFileSync('chrome-extension/background.js','utf8'),context);const run=s=>vm.runInContext(s,context);
  await run('ready');await new Promise(r=>setImmediate(r));await run('serial');
  let saved=await run('store.load()');a.equal(saved.token,code);a.equal(saved.workflowVersion,4);a.equal(saved.enabled,true);a.deepEqual(saved.excludedPartyIds,['p2']);
  if(!requests.some(x=>x.action==='configure')){a.equal((await run('lastRequest=0;requestPull()')).status,'confirmed')}
  saved=await run('store.load()');a.equal(saved.generation,1);a.equal(saved.token,code);a.equal((await run('selected()')).tabId,9);
  let status=await run('exclusive(status)');a.equal(status.code,code);a.equal(status.parties.length,2);a.deepEqual(status.excludedPartyIds,['p2']);
  await run('exclusive(()=>popupMessage({action:"sparkle-v2-toggle",enabled:false}))');a.equal((await run('store.load()')).enabled,false);
  await run('exclusive(()=>popupMessage({action:"sparkle-v2-toggle",enabled:true}))');
  await run('exclusive(()=>popupMessage({action:"sparkle-v2-filter",partyId:"p1",included:false}))');a.deepEqual((await run('store.load()')).excludedPartyIds,['p1','p2']);
  await run('lastRequest=0;requestPull()');a.deepEqual(requests.filter(x=>x.action==='configure').at(-1).excludedPartyIds,['p1','p2']);
  listeners.updated(9,{status:'loading'});await run('serial');a.equal((await run('selected()')).tabId,9);
  delete session.sparkleSourceV2;a.equal((await run('lastRequest=0;requestPull()')).status,'confirmed');a.equal((await run('selected()')).tabId,9);
  const before=(await run('store.load()')).token;const originalFetch=context.fetch;context.fetch=async()=>response({error:'unauthorized'},401);
  const rejected=await run('exclusive(()=>popupMessage({action:"sparkle-v2-connect",credential:"BAD-0000"}))');a.equal(rejected.ok,false);a.equal(rejected.error,'unauthorized');a.equal((await run('store.load()')).token,before);context.fetch=originalFetch;
  a.equal(run('bpUrl("https://myoffice.bombparty.com.evil.test/live-party-orders")'),false);
  console.log('PASS: old assigned-code migration, single-tab discovery, automatic parties, filter, toggle, reload and restart recovery');

  const content=fs.readFileSync('chrome-extension/content.js','utf8');
  for(const bad of [/reload|location\.href|location\.replace/,/document\.createElement|appendChild|innerHTML|insertAdjacentHTML/,/alert\(|confirm\(|prompt\(/,/fetch\(|chrome\.storage/])a.equal(bad.test(content),false);
  let handler, registrations=0;const timers=[],intervals=[],body={},table={isConnected:true,querySelector:()=>body,contains:()=>true};
  const c=vm.createContext({crypto,document:{getElementById:()=>table,addEventListener:()=>{},removeEventListener:()=>{}},window:{addEventListener:()=>{},removeEventListener:()=>{}},chrome:{runtime:{id:'own',sendMessage:()=>Promise.resolve(),onMessage:{addListener:f=>{handler=f;registrations++},removeListener:()=>{}}}},SparkleQueueParser:{parseDiscovery:()=>full,parseTable:(_t,scope)=>({parserState:'ready',entries:scope?[{id:'p1:a',name:'Reviewer',orderedAt:1}]:full.entries,revealedIds:[],revealedEntries:[]})},MutationObserver:class{observe(){}disconnect(){}},setTimeout:f=>{timers.push(f);return timers.length},clearTimeout:()=>{},setInterval:(f,n)=>{intervals.push([f,n]);return intervals.length},clearInterval:()=>{}});
  vm.runInContext(content,c);vm.runInContext(content,c);a.equal(registrations,1,'a late identical injection does not register a second reader');let reply;handler({action:'sparkle-v2-inspect'},{id:'own'},x=>reply=x);a.equal(reply.protocol,2);a.equal(reply.snapshot.entries.length,2);handler({action:'sparkle-v2-read',generation:1,selection:descriptor.scope},{id:'own'},x=>reply=x);a.equal(reply.generation,1);a.equal(reply.snapshot.entries.length,1);
  console.log('PASS: read-only content adapter supports automatic inspection and scoped publishing without page writes');
})().catch(error=>{console.error(error);process.exitCode=1});
