const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const {parseTable} = require('../chrome-extension/queue-parser.js');
const {cleanSnapshot,createPublisherClient} = require('../chrome-extension/publisher-client.js');
const updateClient = require('../chrome-extension/update-client.js');
const documentId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const rep='11111111-1111-4111-8111-111111111111';
function table(rows, columns=['OrderID','OrderDate','FirstName','LastName','PartyID','IsRevealed']) {
  const header={querySelectorAll:()=>columns.map(key=>({getAttribute:n=>n==='data-sort-by'?key:null,querySelector:()=>null}))};
  const body={querySelectorAll:()=>rows.map(r=>({getAttribute:n=>n==='data-orderid'?(r.attributeOrder??r.id??''):n==='data-partyid'?(r.attributeParty??r.party??''):null,
    querySelectorAll:()=>{if(r.boom)throw new Error('row boom');return columns.map(key=>({textContent:key==='OrderID'?(r.orderText??r.id??''):key==='PartyID'?(r.partyText??r.party??''):key==='FirstName'?(r.name??'April'):key==='LastName'?(r.lastName??'Smith'):'',
      getAttribute:n=>key==='OrderDate'&&n==='data-order-utc-ms'?String(r.date??100):null,
      querySelector:()=>{const text=key==='OrderID'?r.orderLink:key==='PartyID'?r.partyLink:undefined;return text===undefined?null:{textContent:text};},querySelectorAll:()=>key==='IsRevealed'?[{checked:r.checked??false,indeterminate:false,disabled:r.busy??false}]:[]}))}}))};
  return {isConnected:true,getAttribute:()=>null,querySelector:s=>s==='thead'?header:s==='tbody'?body:null};
}
test('header-identified cell fallback preserves exact IDs and optional surnames through transport',()=>{
  const parsed=parseTable(table([{id:'',party:'',attributeOrder:'',attributeParty:'',orderText:'00017',partyText:'P9',lastName:'  Smith  '}],['LastName','PartyID','FirstName','IsRevealed','OrderDate','OrderID']));
  assert.equal(parsed.parserState,'ready');assert.equal(parsed.entries[0].id,'P9:00017');
  assert.equal(cleanSnapshot(parsed).entries[0].lastName,'Smith');
  const labelled=parseTable(table([{id:'00017',party:'P9',orderText:'Order 00017'}]));
  assert.notEqual(labelled.parserState,'ready');
  assert.equal(labelled.rowReport.skippedByReason.missing_order_identity,1);
});
test('conflicts, ambiguous identity, duplicates and pending checkbox states cannot claim ready',()=>{
  // Visible cell "17" wins over a differing attribute and stays ready.
  const preferred=parseTable(table([{id:'0017',party:'P9',orderText:'17'}]));
  assert.equal(preferred.parserState,'ready');assert.equal(preferred.entries[0].id,'P9:17');
  // An unreadable single row still cannot claim ready, so the server keeps the last good list.
  for(const rows of [[{party:'P9',orderText:'Order 12 or 13'}],[{id:'a',party:'P9',busy:true}]])assert.notEqual(parseTable(table(rows)).parserState,'ready');
  const deduped=parseTable(table([{id:'a',party:'P9'},{id:'a',party:'P9'}]));
  assert.equal(deduped.parserState,'ready');assert.deepEqual(deduped.entries.map(x=>x.id),['P9:a']);
  assert.equal(deduped.rowReport.skippedRowCount,1);assert.equal(deduped.rowReport.skippedByReason.duplicate_order_identity,1);
  assert.equal(parseTable(table([{id:'a',party:'P9',lastName:'x'.repeat(101)}])).parserState,'ready');
  assert.equal(parseTable(table([{id:'a',party:'P9',lastName:'x'.repeat(101)}])).entries[0].lastName,undefined);
});
test('trusted attributes never override ambiguous known identity cells or malformed identity links',()=>{
  // Unreadable visible cells are skipped rather than falling back to a differing attribute.
  for(const row of [
    {id:'00017',party:'P9',orderText:'Order 00017 or 18'},
    {id:'00017',party:'P9',partyText:'Party P9 or P10'},
  ]) assert.notEqual(parseTable(table([row])).parserState,'ready');
  // A usable visible cell wins; odd or disagreeing links are ignored.
  for(const row of [
    {id:'00017',party:'P9',orderLink:'Order 18'},
    {id:'00017',party:'P9',orderLink:'Order 00017 or 18'},
    {id:'00017',party:'P9',partyLink:'Party P10'},
    {id:'00017',party:'P9',partyLink:'Party P9 / P10'},
  ]) {
    const parsed=parseTable(table([row]));
    assert.equal(parsed.parserState,'ready');assert.equal(parsed.entries[0].id,'P9:00017');
  }
  assert.notEqual(parseTable(table([{id:'00017',party:'P9',orderText:'Order 00017',partyText:'Party P9',orderLink:'Order 00017',partyLink:'Party P9'}])).parserState,'ready');
  // Blank/missing recognized fields fall back to the attribute.
  assert.equal(parseTable(table([{id:'00017',party:'P9',orderText:'',partyText:''}])).parserState,'ready');
  assert.equal(parseTable(table([{id:'00017',party:'P9'}],['FirstName','IsRevealed'])).parserState,'ready');
});
test('documented Revealed label and compact labelled IDs preserve identity and checkbox validation',()=>{
  function withHeaders(row, headers) {
    const fixture=table([row]); const original=fixture.querySelector;
    fixture.querySelector=key=>key==='thead'?{querySelectorAll:()=>headers.map(([sort,label])=>({getAttribute:()=>sort,querySelector:()=>({textContent:label})}))}:original(key);
    return parseTable(fixture);
  }
  const headers=[['OrderID'],['OrderDate'],['firstName'],['LastName'],['PartyID'],[null,'Revealed']];
  const row={id:'00017',party:'P9',orderText:'00017',partyText:'P9'};
  assert.equal(withHeaders(row,headers).entries[0].id,'P9:00017');
  assert.notEqual(withHeaders({...row,orderText:'Order #17'},headers).parserState,'ready');
  assert.equal(withHeaders({...row,busy:true},headers).parserState,'partial');
  const explicit = [...headers.slice(0,5), ['IsRevealed']];
  assert.equal(withHeaders(row, [...explicit, [null,'Revealed']]).entries[0].id, 'P9:00017');
  assert.equal(withHeaders(row, [...explicit.slice(0,3), [null,'Revealed'], ...explicit.slice(4)]).parserState, 'ready');
  assert.equal(withHeaders(row, [...headers, ['IsRevealed']]).reason, 'row_incomplete');
  assert.equal(withHeaders(row, [...explicit, ['IsRevealed']]).reason, 'duplicate_columns');
  assert.equal(withHeaders(row, [...headers, [null,'Revealed']]).reason, 'duplicate_columns');
  assert.equal(withHeaders(row,headers.map(([key,label])=>[key,label==='Revealed'?'Status':label])).reason,'columns_changed');
});
test('unrecognized rows cannot publish a healthy empty lineup', () => {
  const fixture = table([]);
  assert.equal(parseTable(fixture).parserState, 'ready');
  const original = fixture.querySelector;
  fixture.querySelector = selector => selector === 'tbody'
    ? {querySelectorAll: query => query === 'tr' ? [{}] : []}
    : original(selector);
  const snapshot = parseTable(fixture);
  assert.equal(snapshot.parserState, 'partial');
  assert.equal(snapshot.reason, 'table_incomplete');
});

test('publisher posts only enumerated invalid reasons and keeps raw text off the wire',async()=>{
  let state={enabled:true,token:'TST-0001',configVersion:'v',generation:1,claimId:documentId,publisherId:rep,epoch:1,nextSequence:0};
  const packets=[];const time=new Date(1000).toISOString();
  const client=createPublisherClient({now:()=>1000,store:{load:async()=>state,update:async(_,p)=>{state={...state,...p};return true;}},post:async(_,body)=>{
    packets.push(body.packet);return {ok:true,revision:2,acceptedSequence:body.packet.sequence,serverTime:time,leaseExpiresAt:new Date(91000).toISOString(),freshForMs:0};
  }});
  for(const reason of ['missing_order_identity','customer_name']){
    const result=await client.sync({parserState:'invalid',reason,entries:[],revealedIds:[],observation:{documentId,serial:1,serverTime:time,settled:false}},'2.0.7');
    assert.equal(result.status,'source_not_ready');
  }
  assert.equal(packets[0].parserReason,'missing_order_identity');
  assert.equal(Object.hasOwn(packets[1],'parserReason'),false);
  assert.ok(packets.every(p=>!Object.hasOwn(p,'reason')));
});
test('selected parties include all order dates and exclude irrelevant rows before health checks',()=>{
  const selection={partyIds:['P9','P10'],excludedPartyIds:['P10'],carryEntryIds:[],startedAt:new Date(5000).toISOString()};
  const rows=[{id:'old',party:'P9',date:10},{id:'excluded',party:'P10',date:10,busy:true}];
  const result=parseTable(table(rows),selection);
  assert.equal(result.parserState,'ready');assert.deepEqual(result.entries.map(x=>x.id),['P9:old']);
  const skipped=parseTable(table([{id:'',party:'',date:10},...rows]),selection);
  assert.equal(skipped.parserState,'ready');assert.deepEqual(skipped.entries.map(x=>x.id),['P9:old']);
  assert.equal(skipped.rowReport.skippedRowCount,1);
  assert.equal(parseTable(table([]),selection).parserState,'ready');
  assert.equal(parseTable(table(rows),{...selection,excludedPartyIds:['P9','P10']}).parserState,'ready');
});
test('Louis shape: 50 orders across two selected parties survive a later retained cutoff',()=>{
  const rows=Array.from({length:50},(_,i)=>({id:String(i+1),party:i<24?'1846280':'1848082',date:Date.parse('2026-09-27T20:47:51Z')}));
  const result=parseTable(table(rows),{partyIds:['1846280','1848082'],excludedPartyIds:[],carryEntryIds:[],startedAt:'2026-09-27T21:19:05.646Z'});
  assert.equal(result.parserState,'ready');assert.equal(result.entries.length,50);
});
test('publisher obtains lease before invoking genuine read; persists sequence before send and subtracts transit',async()=>{
  let clock=1000; const events=[];
  let state={enabled:true,token:'TST-0001',configVersion:'v',generation:1,claimId:null,nextSequence:0};
  const client=createPublisherClient({now:()=>clock,randomId:()=>documentId,store:{load:async()=>state,update:async(v,p)=>{assert.equal(v,'v');state={...state,...p};return true;}},post:async(_token,b)=>{
    events.push(b.action);
    if(b.action==='claim')return{claimId:b.claimId,capabilities:'lineup-2.0.5',generation:1,publisherId:rep,epoch:1,revision:1,acceptedSequence:-1,serverTime:new Date(clock).toISOString(),leaseExpiresAt:new Date(clock+90000).toISOString()};
    assert.equal(state.nextSequence,1);assert.equal(b.packet.claimId,documentId);assert.equal(b.packet.entries[0].lastName,'Smith');
    const serverTime=new Date(clock).toISOString();clock+=7000;
    return{ok:true,revision:2,acceptedSequence:0,serverTime,leaseExpiresAt:new Date(clock+83000).toISOString(),freshForMs:5000};
  }});
  const result=await client.sync(async()=>{events.push('read');return{...parseTable(table([{id:'a',party:'P9'}])),observation:{documentId,serial:1,serverTime:new Date(clock).toISOString(),settled:true}};},'2.0.5',{readyHint:true});
  assert.equal(result.status,'confirmed');assert.deepEqual(events,['claim','read','snapshot']);assert.equal(state.readyDeadline,clock);
});
function worker({noOp=false,nonready=false,multiple=false,legacyBridge=false,empty=false,version='2.0.6',readerVersion=version,oldServer=false,showChangeOnSnapshot=false}={}) {
  const local={},session={},listeners={},requests=[];let clock=Date.now(),observations=0,epoch=0,seq=-1,snapshots=0;
  let descriptor={protocol:2,...(oldServer?{}:{orderScope:'selected-parties'}),generation:0,scope:null,serverTime:new Date(clock).toISOString()};
  const area=record=>({setAccessLevel:async()=>{},get:async k=>Array.isArray(k)?Object.fromEntries(k.map(x=>[x,record[x]])):{[k]:structuredClone(record[k])},set:async v=>Object.assign(record,structuredClone(v)),remove:async k=>{delete record[k];}});
  const event=k=>({addListener:f=>{listeners[k]=f;}});
  const full={reason:nonready?'reveal_state_missing':null,parserState:nonready?'partial':'ready',entries:nonready||empty?[]:[{id:'P9:a',name:'April',lastName:'Smith',orderedAt:clock}],revealedIds:[],revealedEntries:[]};
  const chrome={runtime:{id:'fixture',getURL:p=>'chrome-extension://fixture/'+p,getManifest:()=>({version}),onMessage:event('message')},storage:{local:area(local),session:area(session),sync:area({sync_code:'TST-0001',enabled:true,excluded_party_ids:[]})},alarms:{create:async()=>{},onAlarm:event('alarm')},tabs:{query:async()=>[{id:1,url:'https://myoffice.bombparty.com/live-party-orders'},...(multiple?[{id:2,url:'https://myoffice.bombparty.com/live-party-orders'}]:[])],sendMessage:async(_id,m)=>({protocol:2,readerVersion,generation:m.generation,snapshot:full,discovery:full,...(legacyBridge?{}:{source:{documentId,serial:++observations,settled:!nonready}})}),onRemoved:event('removed'),onUpdated:event('updated'),onActivated:event('activated')}};
  class Clock extends Date {static now(){return clock;}}
  const endpoint='https://www.yoursparklesuite.com/api/live-lineup/publish';
  const context=vm.createContext({chrome,importScripts:()=>{},SparkleUpdateClient:{...updateClient,create:args=>updateClient.create({...args,now:()=>clock})},SparklePublisherClient:{createPublisherClient:args=>createPublisherClient({...args,now:()=>clock})},URL,TextEncoder,TextDecoder,AbortController,crypto:webcrypto,Date:Clock,performance:{now:()=>clock},setTimeout:(f,n)=>setTimeout(f,n===550?1:1000),clearTimeout,
    fetch:async(_url,o)=>{
      if(_url==='https://www.yoursparklesuite.com/api/live-lineup/release'){
        const response=new Response(JSON.stringify({protocol:1,version:'2.0.7',publishedAt:null,rolloutEnabled:false}),{headers:{'content-type':'application/json'}});
        Object.defineProperty(response,'url',{value:_url});return response;
      }
      clock+=600;const b=JSON.parse(o.body);requests.push(b);let body;const stamp=new Date(clock).toISOString(),lease=new Date(clock+90000).toISOString();
      if(b.action==='control-checkin'){
        const result=new Response(JSON.stringify({error:'invalid_payload'}),{status:400,headers:{'content-type':'application/json'}});
        Object.defineProperty(result,'url',{value:endpoint}); return result;
      }
      if(b.action==='describe')body={...descriptor,serverTime:stamp};
      else if(b.action==='claim'){epoch++;seq=-1;body={claimId:b.claimId,capabilities:b.capabilities,generation:descriptor.generation,publisherId:rep,epoch,revision:requests.length,acceptedSequence:seq,serverTime:stamp,leaseExpiresAt:lease};}
      else if(b.action==='snapshot'){
        snapshots+=1;
        if(showChangeOnSnapshot && snapshots===3){
          descriptor={...descriptor,generation:(descriptor.generation||0)+1};
          const denied=new Response(JSON.stringify({error:'show_changed'}),{status:409,headers:{'content-type':'application/json'}});
          Object.defineProperty(denied,'url',{value:endpoint});
          return denied;
        }
        seq=b.packet.sequence;body={ok:true,revision:requests.length,acceptedSequence:seq,serverTime:stamp,leaseExpiresAt:lease,freshForMs:nonready?0:45000};
      }
      else if(b.action==='configure'){if(!noOp){descriptor={protocol:2,orderScope:'selected-parties',generation:descriptor.generation||1,scope:{partyIds:b.partyIds,excludedPartyIds:b.excludedPartyIds,carryEntryIds:['P9:a'],startedAt:stamp},serverTime:stamp};body={...descriptor,configured:{applied:true,claimId:b.claimId,epoch:b.epoch,generation:descriptor.generation,partyIds:b.partyIds,excludedPartyIds:b.excludedPartyIds}};}else body={...descriptor,serverTime:stamp};}
      const result=new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});Object.defineProperty(result,'url',{value:endpoint});return result;}});
  vm.runInContext(fs.readFileSync('chrome-extension/background.js','utf8'),context);
  return{requests,local,session,listeners,advance(ms){clock+=ms;},run:s=>vm.runInContext(s,context),async settle(){await vm.runInContext('ready',context);await new Promise(r=>setImmediate(r));await vm.runInContext('serial',context);}};
}
test('2.0.6 resumes the next pull after show_changed without a rep reselect',async()=>{
  const w=worker({showChangeOnSnapshot:true});await w.settle();
  const paused=await w.run('lastRequest=0;requestPull()');
  assert.equal(paused.status,'show_changed');
  assert.equal(w.local.sparklePublisherV2.needsSelection,true);
  w.advance(60000);
  const resumed=await w.run('lastRequest=0;requestPull()');
  assert.equal(resumed.status,'confirmed');
  assert.equal(w.local.sparklePublisherV2.needsSelection,false);
  assert.equal(w.local.sparklePublisherV2.generation,2);
  assert.ok(w.requests.some(request=>request.action==='claim' && request.generation===2));
});
test('worker bootstrap claims and publishes before configure, then reclaims/rereads final scope',async()=>{
  const w=worker();await w.settle();
  const actions=w.requests.map(x=>x.action).filter(action=>!['describe','control-checkin'].includes(action));
  assert.deepEqual(actions,['claim','snapshot','configure','claim','snapshot']);
  assert.equal((await w.run('status()')).connected,true);
  const cfg=w.requests.find(x=>x.action==='configure');assert.equal(cfg.capabilities,'lineup-2.0.5');assert.ok(cfg.claimId);assert.equal(cfg.epoch,1);
});
test('HTTP 200 configure no-op remains unconfirmed and locked',async()=>{
  const w=worker({noOp:true});await w.settle();const s=await w.run('status()');assert.equal(s.connected,false);assert.equal(s.lastError,'invalid_receipt');assert.equal(s.scopePending,true);
});
test('missing updated content bridge and ambiguous source never claim or publish',async()=>{
  for(const options of [{legacyBridge:true},{multiple:true}]){const w=worker(options);await w.settle();assert.equal(w.requests.some(x=>x.action==='claim'||x.action==='snapshot'),false);assert.equal((await w.run('status()')).connected,false);}
});
test('source closes during a read: late reply cannot publish and authority does not switch',async()=>{
  const w=worker();await w.settle();const before=w.requests.length;
  await w.run(`chrome.tabs.sendMessage=async()=>{invalidatePull(1);return{protocol:2,source:{documentId:'${documentId}',serial:99,settled:true},snapshot:{parserState:'ready',entries:[],revealedIds:[],revealedEntries:[]}}}`);
  assert.equal((await w.run('lastRequest=0;requestPull()')).status,'source_changed');
  assert.equal(w.requests.slice(before).some(x=>x.action==='snapshot'),false);
});
test('content remains read-only and carries a new table/document observation fence',()=>{
  const text=fs.readFileSync('chrome-extension/content.js','utf8');
  for(const forbidden of [/reload|location\.href|location\.replace/,/document\.createElement|appendChild|innerHTML|insertAdjacentHTML/,/alert\(|confirm\(|prompt\(/,/fetch\(|chrome\.storage/])assert.equal(forbidden.test(text),false);
  let handler;const tbody={},sourceTable={isConnected:true,querySelector:()=>tbody,contains:()=>true};let current=sourceTable;
  const c=vm.createContext({crypto:webcrypto,document:{getElementById:()=>current,addEventListener:()=>{},removeEventListener:()=>{}},window:{addEventListener:()=>{}},chrome:{runtime:{id:'fixture',sendMessage:()=>Promise.resolve(),onMessage:{addListener:f=>{handler=f;},removeListener:()=>{}}}},SparkleQueueParser:{parseTable:()=>({parserState:'ready',entries:[],revealedIds:[],revealedEntries:[]})},MutationObserver:class{observe(){}disconnect(){}},setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>1,clearInterval:()=>{}});
  vm.runInContext(text,c);let a,b;handler({action:'sparkle-v2-inspect'},{id:'fixture'},r=>{a=r;});handler({action:'sparkle-v2-inspect'},{id:'fixture'},r=>{b=r;});assert.equal(b.source.documentId,a.source.documentId);assert.ok(b.source.serial>a.source.serial);
  current={...sourceTable};handler({action:'sparkle-v2-inspect'},{id:'fixture'},r=>{b=r;});assert.notEqual(b.source.documentId,a.source.documentId);
});

test('worker health expires monotonically even when the wall clock stops',async()=>{const w=worker();await w.settle();assert.equal((await w.run('status()')).connected,true);w.run('performance.now=()=>Number.MAX_SAFE_INTEGER');assert.equal((await w.run('status()')).connected,false);});

test('empty valid table is Connected without a show or party configuration',async()=>{
 const w=worker({empty:true});await w.settle();assert.equal((await w.run('status()')).connected,true);
 assert.equal(w.requests.some(x=>x.action==='configure'),false);
});
test('new package refuses an old server before claim or publishing',async()=>{
 const w=worker({oldServer:true});await w.settle();assert.equal((await w.run('status()')).lastError,'server_update_required');
 assert.equal(w.requests.some(x=>x.action==='claim'||x.action==='snapshot'),false);
});
test('parser reason survives a successful non-ready receipt and is exposed locally',async()=>{
 const w=worker({nonready:true});await w.settle();const status=await w.run('status()');
 assert.equal(status.parserReason,'reveal_state_missing');assert.equal(status.connected,false);
 assert.equal(w.requests.some(x=>x.packet?.reason),false);
});
test('closed selected tab recovers with the only replacement tab and a fresh observation',async()=>{
 const w=worker();await w.settle();
 await w.run("chrome.tabs.query=async()=>[{id:2,url:'https://myoffice.bombparty.com/live-party-orders'}]");
 await w.run('lastRequest=0;requestPull()');assert.equal((await w.run('selected()')).tabId,2);
 assert.equal((await w.run('status()')).connected,true);
});
test('ordinary Chrome missing-receiver rejection heals by injecting only packaged reader files',async()=>{
 const w=worker();await w.settle();
 await w.run("globalThis.injections=[];const originalSend=chrome.tabs.sendMessage;chrome.tabs.sendMessage=async()=>{throw new Error('Could not establish connection. Receiving end does not exist.')};chrome.scripting={executeScript:async args=>{injections.push(args);if(args.func)return [{result:'inject'}];chrome.tabs.sendMessage=originalSend;}}");
 await w.run('lastRequest=0;requestPull()');assert.equal((await w.run('status()')).connected,true);
 const injections=JSON.parse(JSON.stringify(await w.run('injections')));assert.equal(injections.length,2);
 assert.deepEqual(injections[0].target,{tabId:1,frameIds:[0]});
 assert.deepEqual(injections[1],{target:{tabId:1,frameIds:[0]},files:['queue-parser.js','content.js']});
});
test('a changed generation is adopted only with a new claim and a fresh read',async()=>{
 const w=worker();await w.settle();
 await w.run("(async()=>store.update((await store.load()).configVersion,{generation:0}))()");
 const before=w.requests.length;await w.run('lastRequest=0;requestPull()');
 assert.equal((await w.run('status()')).connected,true);
 assert.deepEqual(w.requests.slice(before).filter(x=>x.action!=='describe').map(x=>x.action),['claim','snapshot']);
});

test('only the exact extension popup may request status, including when opened in its own tab',async()=>{
 const w=worker();await w.settle();
 const response=await new Promise(resolve=>{assert.equal(w.listeners.message({action:'sparkle-v2-status'},{id:'fixture',url:'chrome-extension://fixture/popup.html',tab:{id:9}},resolve),true)});
 assert.equal(response.connected,true);
 for(const sender of [{id:'other',url:'chrome-extension://fixture/popup.html'},{id:'fixture',url:'https://myoffice.bombparty.com/live-party-orders',tab:{id:1}},{id:'fixture',url:'chrome-extension://fixture/other.html'}])
  assert.equal(w.listeners.message({action:'sparkle-v2-status'},sender,()=>{throw Error('Untrusted page received private status')}),false);
});

test('2.0.8 reporting: worker/reader mismatch never certifies ready and recovers on a matching fresh read',async()=>{
  const w=worker({version:'2.0.8',readerVersion:'2.0.7'});await w.settle();
  const packets=w.requests.filter(x=>x.action==='snapshot').map(x=>x.packet);
  assert.ok(packets.length);assert.ok(packets.every(p=>p.parserState==='partial' && p.observation.settled===false));
  assert.equal(packets[0].diagnostics.sourceVersion,'2.0.8');assert.equal(packets[0].diagnostics.readerVersion,'2.0.7');
  assert.equal((await w.run('status()')).connected,false);
  w.run("chrome.tabs.sendMessage=async(_id,m)=>({protocol:2,readerVersion:'2.0.8',generation:m.generation,source:{documentId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',serial:100,settled:true},snapshot:{parserState:'ready',entries:[],revealedIds:[],revealedEntries:[]},discovery:{parserState:'ready',entries:[],revealedIds:[],revealedEntries:[]}})");
  w.advance(121000);assert.equal((await w.run('lastRequest=0;requestPull()')).status,'confirmed');
  assert.equal((await w.run('status()')).connected,true);
  const content=fs.readFileSync('chrome-extension/content.js','utf8');
  const manifest=JSON.parse(fs.readFileSync('chrome-extension/manifest.json','utf8'));
  assert.equal(content.match(/const READER_VERSION = "([^"]+)"/)[1],manifest.version);
  for(const forbidden of [/reload|location\.href|location\.replace/,/document\.createElement|appendChild|innerHTML|insertAdjacentHTML/,/alert\(|confirm\(|prompt\(/,/fetch\(|chrome\.storage/])assert.equal(forbidden.test(content),false);
});
test('2.0.8 reporting: bounded diagnostics use existing packets and cannot earn stale health',async()=>{
  const w=worker({version:'2.0.8',nonready:true});await w.settle();
  const claim=w.requests.find(x=>x.action==='claim'),snapshot=w.requests.find(x=>x.action==='snapshot');
  assert.ok(claim && snapshot);
  for(const d of [claim.diagnostics,snapshot.packet.diagnostics]) {
    assert.deepEqual(Object.keys(d).sort(),['parserReason','parserState','readerVersion','sourceVersion','updateState']);
    assert.equal(d.parserReason,'reveal_state_missing');assert.equal(d.updateState,'failed');
    assert.equal(d.readerVersion,'2.0.8');assert.equal(d.sourceVersion,'2.0.8');
    assert.equal(JSON.stringify(d).includes('TST-0001'),false);
  }
  assert.equal(snapshot.packet.parserReason,'reveal_state_missing');
  await w.run("(async()=>store.update((await store.load()).configVersion,{lastReadyAckAt:Date.now(),lastAckAt:Date.now(),readyDeadline:Date.now()+45000}))()");
  assert.equal((await w.run('status()')).connected,false);
  const healthy=worker({version:'2.0.8'});await healthy.settle();
  assert.equal((await healthy.run('status()')).connected,true);
  healthy.run('localReadyAck=null;localReadyDeadline=0');
  assert.equal((await healthy.run('status()')).connected,false);
  healthy.run('globalThis.reloads=0;chrome.runtime.reload=()=>{reloads++}');
  assert.equal(await healthy.run("updater.onUpdateAvailable('2.0.9')"),true);
  assert.equal(await healthy.run('reloads'),1);
  let state={token:'TST-0001',enabled:true,configVersion:'x',generation:0,claimId:documentId,needsClaim:true,nextSequence:0};
  const outgoing=[];const stamp=new Date().toISOString();
  const client=createPublisherClient({store:{load:async()=>state,update:async(_v,p)=>{state={...state,...p};return true}},post:async(_token,b)=>{
    outgoing.push(b);return b.action==='claim'?{generation:0,publisherId:rep,epoch:1,revision:1,acceptedSequence:-1,serverTime:stamp,leaseExpiresAt:new Date(Date.parse(stamp)+90000).toISOString(),claimId:documentId,capabilities:'lineup-2.0.5'}:
      {ok:true,revision:2,acceptedSequence:0,serverTime:stamp,leaseExpiresAt:new Date(Date.parse(stamp)+15000).toISOString(),freshForMs:0};
  }});
  const bad={parserState:'partial',reason:'Customer name and order 123',readerVersion:'2.0.8',entries:[],revealedIds:[],customer:'private',observation:{documentId,serial:1,serverTime:stamp,settled:false}};
  await client.sync(bad,'2.0.8',{diagnosticSnapshot:bad});
  assert.equal(JSON.stringify(outgoing).includes('Customer name'),false);assert.equal(JSON.stringify(outgoing).includes('private'),false);
  assert.equal(state.readyDeadline,0);
});


// Direct-child fixtures model multiple tbody sections without a browser or real orders.
function resilienceTable(groups, columns=['OrderID','OrderDate','FirstName','LastName','PartyID','IsRevealed']) {
  const result=table([],columns);const head=result.querySelector('thead');
  head.rows=[{}];result.tHead=head;
  result.tBodies=groups.map(group=>{
    const body={parentElement:result,children:[]};
    body.children=group.map(data=>{
      const row=table([data],columns).querySelector('tbody').querySelectorAll('tr')[0];
      const cells=Array.from(row.querySelectorAll('td'));
      cells.forEach(cell=>{cell.tagName='TD';});
      Object.assign(row,{tagName:'TR',parentElement:body,children:cells,recognized:data.recognized!==false,
        querySelector:selector=>selector==='table'&&data.nested?{}:null,
        querySelectorAll:selector=>selector==='td'?cells:[]});
      return row;
    });
    body.querySelectorAll=selector=>selector==='tr.product.product-row'?body.children.filter(row=>row.recognized):body.children;
    return body;
  });
  return result;
}
test('2.0.9 resilience: every direct body contributes once and duplicate identities still fail',()=>{
  const fixture=resilienceTable([[{id:'late',party:'P9',date:200}],[{id:'early',party:'P9',date:100},{id:'done',party:'P9',date:150,checked:true}]]);
  const result=parseTable(fixture);
  assert.equal(result.parserState,'ready');
  assert.deepEqual(result.entries.map(row=>row.id),['P9:early','P9:late']);
  assert.deepEqual(result.revealedIds,['P9:done']);
  assert.equal(result.structure.bodyCount,2);assert.equal(result.structure.unmatchedRows,'0');
  const duplicate=parseTable(resilienceTable([[{id:'same',party:'P9'}],[{id:'same',party:'P9'}]]));
  assert.equal(duplicate.parserState,'ready');assert.deepEqual(duplicate.entries.map(row=>row.id),['P9:same']);
  assert.equal(duplicate.rowReport.skippedByReason.duplicate_order_identity,1);
  assert.equal(parseTable(resilienceTable(Array.from({length:33},()=>[]))).reason,'scan_capacity_exceeded');
});
test('2.0.9 resilience: mixed or nested markup cannot publish an incomplete healthy lineup',()=>{
  for(const groups of [
    [[{id:'ok',party:'P9'},{id:'hidden',party:'P9',recognized:false}]],
    [[{id:'ok',party:'P9'}],[{id:'hidden',party:'P9',recognized:false}]],
    [[{id:'hidden',party:'P9',recognized:false}]],
    [[{id:'nested',party:'P9',nested:true}]],
  ]) {
    const result=parseTable(resilienceTable(groups));
    assert.equal(result.parserState,'partial');assert.equal(result.reason,'table_incomplete');
    assert.deepEqual(result.entries,[]);assert.deepEqual(result.revealedIds,[]);
  }
  assert.equal(parseTable(resilienceTable([[],[]])).parserState,'ready');
  const multipleHeaders=resilienceTable([[{id:'ok',party:'P9'}]]);multipleHeaders.tHead.rows=[{},{}];
  assert.equal(parseTable(multipleHeaders).parserState,'partial');
});
test('2.0.9 resilience: scope and real data validation stay strict across body sections',()=>{
  const selection={partyIds:['P9','P10'],excludedPartyIds:['P10'],carryEntryIds:[],startedAt:new Date(0).toISOString()};
  const valid=parseTable(resilienceTable([[{id:'00017',party:'P9',orderText:'00017',date:50}],[{id:'excluded',party:'P10',busy:true}]]),selection);
  assert.equal(valid.parserState,'ready');assert.deepEqual(valid.entries.map(row=>row.id),['P9:00017']);
  const labelledSkipped=parseTable(resilienceTable([[{id:'old',party:'P9'}],[{id:'00017',party:'P9',orderText:'Order #17'}]]),selection);
  assert.equal(labelledSkipped.parserState,'ready');assert.deepEqual(labelledSkipped.entries.map(row=>row.id),['P9:old']);
  assert.equal(labelledSkipped.rowReport.skippedByReason.missing_order_identity,1);
  for(const [data,reason] of [
    [{id:'date',party:'P9',date:'11/16/2026'},'invalid_order_time'],
    [{id:'name',party:'P9',name:'Bad\nName'},'invalid_first_name'],
    [{id:'busy',party:'P9',busy:true},'reveal_state_missing'],
  ]) {
    const parsed=parseTable(resilienceTable([[{id:'old',party:'P9'}],[data]]),selection);
    assert.equal(parsed.parserState,'ready');assert.deepEqual(parsed.entries.map(row=>row.id),['P9:old']);
    assert.equal(parsed.rowReport.skippedByReason[reason],1);
  }
});
test('2.0.9 resilience: structural report uses bounded enums and no page or customer values',()=>{
  const secret='PRIVATE_customer_123_URL';
  const fixture=resilienceTable([[{id:secret,party:'P9',name:secret}],[{id:'unknown',party:'P9',recognized:false}]]);
  const old=fixture.tHead.querySelectorAll;
  fixture.tHead.querySelectorAll=()=>[...old(),{getAttribute:()=>secret,querySelector:()=>({textContent:secret})}];
  const result=parseTable(fixture);const structure=result.structure;
  assert.deepEqual(Object.keys(structure).sort(),['bodyCount','columns','hasOrderIdAttribute','hasOrderTimeAttribute','hasPartyIdAttribute','rowCount','unmatchedRows','version']);
  assert.equal(structure.version,1);assert.equal(structure.columns.at(-1),'unknown');
  assert.equal(structure.rowCount,'1-10');assert.equal(structure.unmatchedRows,'1-10');
  assert.equal(structure.hasOrderIdAttribute,true);assert.equal(structure.hasPartyIdAttribute,true);assert.equal(structure.hasOrderTimeAttribute,true);
  assert.equal(JSON.stringify(structure).includes(secret),false);
  const missing=parseTable(null);assert.equal(missing.reason,'table_missing');assert.equal(missing.structure.bodyCount,0);assert.equal(missing.structure.rowCount,'0');
  fixture.tHead.querySelectorAll=()=>Array.from({length:100},()=>({getAttribute:()=>secret,querySelector:()=>null}));
  assert.equal(parseTable(fixture).structure.columns.length,32);
});


test('2.0.10 diagnostics: identity absence, disagreement and unsupported format stay distinct',()=>{
  const missing=parseTable(table([{party:'P9'}]));
  assert.equal(missing.reason,'missing_order_identity');assert.equal(missing.failure.order.problem,'missing');assert.equal(missing.failure.party.problem,'none');
  const party=parseTable(table([{id:'00017'}]));assert.equal(party.failure.party.problem,'missing');
  const labelled=parseTable(table([{id:'00017',party:'P9',orderText:'Order #17'}]));
  assert.notEqual(labelled.parserState,'ready');assert.equal(labelled.failure.order.problem,'unsupported_format');
  const linkIgnored=parseTable(table([{id:'00017',party:'P9',orderLink:'PRIVATE/Order!'}]));
  assert.equal(linkIgnored.parserState,'ready');assert.equal(linkIgnored.entries[0].id,'P9:00017');
  const unreadable=parseTable(table([{id:'00017',party:'P9',orderText:'PRIVATE/Order! extra'}]));
  assert.equal(unreadable.parserState,'invalid');assert.equal(unreadable.failure.order.problem,'unsupported_format');
  assert.ok(unreadable.failure.order.cell.characters.includes('slash'));
  for(const result of [missing,party,unreadable]) {assert.equal(result.parserState,'invalid');assert.deepEqual(result.entries,[]);assert.deepEqual(result.revealedIds,[]);}
});
test('2.0.10 diagnostics: blocking row location and scope retain exact safe behavior',()=>{
  const rows=resilienceTable([[{id:'a',party:'P9'}],[{id:'b',party:'P9',orderText:'different'}]]);
  const result=parseTable(rows);
  assert.equal(result.parserState,'ready');assert.deepEqual(result.entries.map(x=>x.id).sort(),['P9:a','P9:different']);
  const selected={partyIds:['P9','P10'],excludedPartyIds:['P10'],carryEntryIds:[],startedAt:new Date(0).toISOString()};
  const healthy=parseTable(table([{id:'a',party:'P9'},{id:'bad',party:'P10',orderText:'unsupported / old'}]),selected);
  assert.equal(healthy.parserState,'ready');assert.equal(healthy.failure,undefined);assert.deepEqual(healthy.entries.map(x=>x.id),['P9:a']);
  const duplicate=parseTable(table([{id:'a',party:'P9'},{id:'a',party:'P9'}]));
  assert.equal(duplicate.parserState,'ready');assert.deepEqual(duplicate.entries.map(x=>x.id),['P9:a']);
  assert.equal(duplicate.rowReport.skippedByReason.duplicate_order_identity,1);
});
test('2.0.10 diagnostics: bounded shapes and failure stages contain no source values',()=>{
  const secret='CUSTOMER_PRIVATE_SECRET_123';
  const result=parseTable(table([{id:'00017',party:'P9',orderText:secret+' /\u200b\n'+ 'x'.repeat(1100),name:secret,lastName:secret}]));
  const evidence=result.failure;assert.equal(evidence.order.cell.length,'1001+');
  for(const flag of ['ascii_letters','digits','whitespace','separator','non_ascii','slash','control'])assert.ok(evidence.order.cell.characters.includes(flag),flag);
  const text=JSON.stringify({failure:evidence,structure:result.structure,rowReport:result.rowReport});
  for(const raw of [secret,'00017','P9','x'.repeat(100)])assert.equal(text.includes(raw),false);
  assert.ok(text.length<2000);assert.equal(evidence.order.cell.characters.length,7);
  assert.equal(parseTable(table([{id:'a',party:'P9',date:'not-a-time'}])).failure.stage,'date');
  assert.equal(parseTable(table([{id:'a',party:'P9',busy:true}])).failure.stage,'reveal');
  assert.equal(parseTable(null).failure.stage,'table');
});
test('2.0.10 diagnostics: transport strips injected text and binds evidence to the current reader',async()=>{
  const parsed=parseTable(table([{id:'00017',party:'P9',orderText:'PRIVATE / leftover'}]));
  const stamp=new Date(1000).toISOString();
  const snapshot={...parsed,readerVersion:'2.0.11',observation:{documentId,serial:1,serverTime:stamp,settled:false}};
  const packets=[];let state={enabled:true,token:'TST-0001',configVersion:'v',generation:1,claimId:documentId,publisherId:rep,epoch:1,nextSequence:0};
  const client=createPublisherClient({now:()=>1000,store:{load:async()=>state,update:async(_,p)=>{state={...state,...p};return true;}},post:async(_,body)=>{
    packets.push(body.packet);return {ok:true,revision:2,acceptedSequence:body.packet.sequence,serverTime:stamp,leaseExpiresAt:new Date(91000).toISOString(),freshForMs:0};
  }});
  await client.sync(snapshot,'2.0.11');assert.deepEqual(packets[0].diagnostics.failure,cleanSnapshot(snapshot).failure);assert.equal(packets[0].failure,undefined);
  assert.equal(cleanSnapshot({...snapshot,failure:{...parsed.failure,customer:'PRIVATE'}}).failure,undefined);
  assert.equal(cleanSnapshot({...snapshot,failure:{...parsed.failure,order:{...parsed.failure.order,cell:{...parsed.failure.order.cell,raw:'PRIVATE'}}}}).failure,undefined);
  assert.equal(cleanSnapshot({...snapshot,parserState:'ready',reason:null,observation:{...snapshot.observation,settled:true}}).failure,undefined);
  const before=packets.length;await client.sync({...snapshot,readerVersion:'2.0.7'},'2.0.11');
  assert.equal(packets.at(-1).diagnostics.failure,undefined);assert.ok(packets.length>before);
});
test('2.0.10 diagnostics: package identity and read-only reader stay aligned',()=>{
  const manifest=JSON.parse(fs.readFileSync('chrome-extension/manifest.json','utf8'));
  const content=fs.readFileSync('chrome-extension/content.js','utf8');
  assert.equal(manifest.version,'2.0.13');assert.ok(content.includes('const READER_VERSION = "'+manifest.version+'"'));
  assert.deepEqual(manifest.permissions,['storage','alarms','scripting']);
  assert.deepEqual(manifest.host_permissions,['https://myoffice.bombparty.com/*','https://www.yoursparklesuite.com/*']);
  for(const bad of [/reload|location\.href|location\.replace/,/document\.createElement|appendChild|innerHTML|insertAdjacentHTML/,/alert\(|confirm\(|prompt\(/,/fetch\(|chrome\.storage/]) assert.equal(bad.test(content),false);
});

test('2.0.11 reader: long opaque attributes with plain digit cells are ignored',()=>{
  const opaque='Z9kQ1v=' + 'AbCdEfGhIjKlMnOpQrStUvWxYz0123456789/.=+_'.repeat(2);
  const rows=[{id:opaque,party:opaque,attributeOrder:opaque,attributeParty:opaque,orderText:'18462801',partyText:'1846280',name:'Kelly'},
    {id:opaque+'2',party:opaque,attributeOrder:opaque+'2',attributeParty:opaque,orderText:'18462802',partyText:'1846280',name:'Kelly',checked:true}];
  const result=parseTable(table(rows));
  assert.equal(result.parserState,'ready');
  assert.deepEqual(result.entries.map(x=>x.id),['1846280:18462801']);
  assert.deepEqual(result.revealedIds,['1846280:18462802']);
  assert.equal(result.rowReport.exactRowCount,2);
  assert.equal(result.rowReport.productRowCount,2);
  assert.equal(result.rowReport.skippedRowCount,0);
  assert.equal(result.rowReport.waitingRowCount,1);
  assert.equal(result.rowReport.revealedRowCount,1);
  assert.deepEqual(result.rowReport.rows.map(x=>x.identity),['new_waiting','already_revealed']);
  const text=JSON.stringify(result.rowReport);
  assert.equal(text.includes(opaque),false);
  const cleaned=cleanSnapshot({...result,readerVersion:'2.0.11'});
  assert.equal(cleaned.parserState,'ready');
  assert.equal(Object.hasOwn(cleaned,'rowReport'),false);
  assert.deepEqual(cleaned.entries.map(x=>x.id),['1846280:18462801']);
});

test('2.0.11 reader: one unreadable row among good rows leaves a ready partial snapshot',()=>{
  const rows=[
    {id:'1001',party:'P9',name:'April'},
    {id:'1002',party:'P9',orderText:'Order 12 or 13',name:'BadRow'},
    {id:'1003',party:'P9',name:'June'},
  ];
  const result=parseTable(table(rows));
  assert.equal(result.parserState,'ready');
  assert.deepEqual(result.entries.map(x=>x.id),['P9:1001','P9:1003']);
  assert.equal(result.rowReport.exactRowCount,3);
  assert.equal(result.rowReport.skippedRowCount,1);
  assert.equal(result.rowReport.skippedByReason.missing_order_identity,1);
  assert.equal(result.rowReport.rows[1].disposition,'skipped');
  assert.equal(result.rowReport.rows[1].checkbox,'waiting');
  assert.equal(result.failure,undefined);
});

test('2.0.11 reader: a repeat customer with two distinct orders is kept once each',()=>{
  const rows=[
    {id:'5501',party:'P9',name:'Kelly',lastName:'Adams',date:100},
    {id:'5502',party:'P9',name:'Kelly',lastName:'Adams',date:200},
  ];
  const result=parseTable(table(rows));
  assert.equal(result.parserState,'ready');
  assert.deepEqual(result.entries.map(x=>x.id),['P9:5501','P9:5502']);
  assert.equal(result.entries[0].name,'Kelly');assert.equal(result.entries[1].name,'Kelly');
  assert.equal(result.rowReport.skippedRowCount,0);
  assert.equal(result.rowReport.waitingRowCount,2);
});

test('2.0.11 diagnostics: slash, dot and equals are classified without storing raw attribute text',()=>{
  const result=parseTable(table([{id:'x',party:'P9',orderText:'opaque/id=value.v2 leftover'}]));
  assert.equal(result.parserState,'invalid');
  const characters=result.failure.order.cell.characters;
  for(const flag of ['slash','dot','equals'])assert.ok(characters.includes(flag),flag);
  const text=JSON.stringify({failure:result.failure,structure:result.structure,rowReport:result.rowReport});
  assert.equal(text.includes('opaque/id=value.v2 leftover'),false);
  const cleaned=cleanSnapshot({...result,readerVersion:'2.0.11',observation:{documentId,serial:1,serverTime:new Date(1000).toISOString(),settled:false}});
  assert.ok(cleaned.failure.order.cell.characters.includes('other'));
  assert.equal(cleaned.failure.order.cell.characters.includes('slash'),false);
});

test('same order ID in two parties is kept as two entries',()=>{
  const result=parseTable(table([
    {id:'5501',party:'P9',name:'Kelly'},
    {id:'5501',party:'P10',name:'Kelly'},
  ]));
  assert.equal(result.parserState,'ready');
  assert.deepEqual(result.entries.map(x=>x.id).sort(),['P10:5501','P9:5501']);
  assert.equal(result.rowReport.skippedRowCount,0);
});

test('same party, two order IDs kept',()=>{
  const result=parseTable(table([
    {id:'5501',party:'P9',name:'Kelly'},
    {id:'5502',party:'P9',name:'Kelly'},
  ]));
  assert.equal(result.parserState,'ready');
  assert.deepEqual(result.entries.map(x=>x.id),['P9:5501','P9:5502']);
});

test('two-party table with one party wholly unreadable returns partial, not ready',()=>{
  const selection={partyIds:['P9','P10'],excludedPartyIds:[],carryEntryIds:[],startedAt:new Date(0).toISOString()};
  const result=parseTable(table([
    {id:'1001',party:'P9',name:'April'},
    {id:'1002',party:'P10',orderText:'Order 12 or 13',name:'June'},
  ]),selection);
  assert.equal(result.parserState,'partial');
  assert.equal(result.reason,'row_incomplete');
  assert.deepEqual(result.entries,[]);
  assert.equal(result.rowReport.skippedByReason.missing_order_identity,1);
  assert.equal(result.rowReport.waitingRowCount,1);
});

test('a throwing row is skipped and the rest stay ready',()=>{
  const result=parseTable(table([
    {id:'1001',party:'P9',name:'April'},
    {id:'1002',party:'P9',name:'Boom',boom:true},
    {id:'1003',party:'P9',name:'June'},
  ]));
  assert.equal(result.parserState,'ready');
  assert.deepEqual(result.entries.map(x=>x.id),['P9:1001','P9:1003']);
  assert.equal(result.rowReport.skippedByReason.row_incomplete,1);
  assert.equal(result.failure,undefined);
});

test('one full-width empty message is ready; mixed, busy, nested and identity-bearing rows are partial', () => {
  const make = (label, width=6, matches=false, descendant=false) => {
    const cell={tagName:'TD',textContent:label,getAttribute:name=>name==='colspan'?String(width):null};
    return {tagName:'TR',cells:[cell],getAttribute:()=>null,matches:()=>matches,querySelector:()=>descendant?{}:null};
  };
  const source = (rows,busy=false,nested=false) => {
    const headers=['OrderID','OrderDate','FirstName','LastName','PartyID','IsRevealed'].map(key=>({getAttribute:()=>key}));
    const body={children:rows,querySelector:()=>nested?{}:null,querySelectorAll:()=>[]};
    const head={rows:[{}],querySelectorAll:()=>headers};
    return {isConnected:true,tHead:head,tBodies:[body],querySelector:()=>nested?{}:null,getAttribute:name=>name==='aria-busy'&&busy?'true':null};
  };
  const good=parseTable(source([make('No orders found.')]));
  assert.equal(good.parserState,'ready');
  assert.equal(good.rowReport.exactRowCount,1);
  assert.equal(good.rowReport.productRowCount,0);
  assert.deepEqual(good.entries,[]);
  assert.equal(parseTable(source([])).parserState,'ready');
  assert.notEqual(parseTable(source([make('Loading orders...')])).parserState,'ready');
  assert.notEqual(parseTable(source([make('No orders',2)])).parserState,'ready');
  assert.notEqual(parseTable(source([make('No orders',6,true)])).parserState,'ready');
  assert.notEqual(parseTable(source([make('No orders',6,false,true)])).parserState,'ready');
  assert.notEqual(parseTable(source([make('No orders'),make('Order row')])).parserState,'ready');
  assert.notEqual(parseTable(source([make('No orders')],true)).parserState,'ready');
});
