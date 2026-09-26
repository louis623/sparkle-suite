const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const {parseTable} = require('../chrome-extension/queue-parser.js');
const {cleanSnapshot,createPublisherClient} = require('../chrome-extension/publisher-client.js');
const documentId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const rep='11111111-1111-4111-8111-111111111111';
function table(rows, columns=['OrderID','OrderDate','FirstName','LastName','PartyID','IsRevealed']) {
  const header={querySelectorAll:()=>columns.map(key=>({getAttribute:n=>n==='data-sort-by'?key:null,querySelector:()=>null}))};
  const body={querySelectorAll:()=>rows.map(r=>({getAttribute:n=>n==='data-orderid'?(r.attributeOrder??r.id??''):n==='data-partyid'?(r.attributeParty??r.party??''):null,
    querySelectorAll:()=>columns.map(key=>({textContent:key==='OrderID'?(r.orderText??r.id??''):key==='PartyID'?(r.partyText??r.party??''):key==='FirstName'?(r.name??'April'):key==='LastName'?(r.lastName??'Smith'):'',
      getAttribute:n=>key==='OrderDate'&&n==='data-order-utc-ms'?String(r.date??100):null,
      querySelector:()=>{const text=key==='OrderID'?r.orderLink:key==='PartyID'?r.partyLink:undefined;return text===undefined?null:{textContent:text};},querySelectorAll:()=>key==='IsRevealed'?[{checked:r.checked??false,indeterminate:false,disabled:r.busy??false}]:[]}))}))};
  return {isConnected:true,getAttribute:()=>null,querySelector:s=>s==='thead'?header:s==='tbody'?body:null};
}
test('header-identified cell fallback preserves exact IDs and optional surnames through transport',()=>{
  const parsed=parseTable(table([{id:'00017',party:'P9',attributeOrder:'',attributeParty:'',orderText:'Order 00017',partyText:'Party P9',lastName:'  Smith  '}],['LastName','PartyID','FirstName','IsRevealed','OrderDate','OrderID']));
  assert.equal(parsed.parserState,'ready');assert.equal(parsed.entries[0].id,'P9:00017');
  assert.equal(cleanSnapshot(parsed).entries[0].lastName,'Smith');
  const restored=parseTable(table([{id:'00017',party:'P9',orderText:'Order 00017'}]));
  assert.equal(restored.entries[0].id,parsed.entries[0].id);
});
test('conflicts, ambiguous identity, duplicates and pending checkbox states cannot claim ready',()=>{
  for(const rows of [[{id:'0017',party:'P9',orderText:'17'}],[{party:'P9',orderText:'Order 12 or 13'}],[{id:'a',party:'P9'},{id:'a',party:'P9'}],[{id:'a',party:'P9',busy:true}]])assert.notEqual(parseTable(table(rows)).parserState,'ready');
  assert.equal(parseTable(table([{id:'a',party:'P9',lastName:'x'.repeat(101)}])).parserState,'ready');
  assert.equal(parseTable(table([{id:'a',party:'P9',lastName:'x'.repeat(101)}])).entries[0].lastName,undefined);
});
test('trusted attributes never override ambiguous known identity cells or malformed identity links',()=>{
  for(const row of [
    {id:'00017',party:'P9',orderText:'Order 00017 or 18'},
    {id:'00017',party:'P9',partyText:'Party P9 or P10'},
    {id:'00017',party:'P9',orderLink:'Order 18'},
    {id:'00017',party:'P9',orderLink:'Order 00017 or 18'},
    {id:'00017',party:'P9',partyLink:'Party P10'},
    {id:'00017',party:'P9',partyLink:'Party P9 / P10'},
  ]) assert.notEqual(parseTable(table([row])).parserState,'ready');
  assert.equal(parseTable(table([{id:'00017',party:'P9',orderText:'Order 00017',partyText:'Party P9',orderLink:'Order 00017',partyLink:'Party P9'}])).parserState,'ready');
  // Blank/missing recognized fields provide no contradictory identity evidence.
  assert.equal(parseTable(table([{id:'00017',party:'P9',orderText:'',partyText:''}])).parserState,'ready');
  assert.equal(parseTable(table([{id:'00017',party:'P9'}],['FirstName','IsRevealed'])).parserState,'ready');
});
test('only proven irrelevant history is ignored; empty filtered table is never fabricated ready',()=>{
  const selection={partyIds:['P9'],carryEntryIds:[],startedAt:new Date(50).toISOString()};
  const rows=[{id:'',party:'',date:10},{id:'a',party:'P9',date:100}];
  assert.equal(parseTable(table(rows),selection).parserState,'ready');
  rows[0].date=100;assert.notEqual(parseTable(table(rows),selection).parserState,'ready');
  assert.equal(parseTable(table([]),selection).parserState,'partial');
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
function worker({noOp=false,nonready=false,multiple=false,legacyBridge=false}={}) {
  const local={},session={},listeners={},requests=[];let clock=Date.now(),observations=0,epoch=0,seq=-1;
  let descriptor={protocol:2,generation:0,scope:null,serverTime:new Date(clock).toISOString()};
  const area=record=>({setAccessLevel:async()=>{},get:async k=>Array.isArray(k)?Object.fromEntries(k.map(x=>[x,record[x]])):{[k]:structuredClone(record[k])},set:async v=>Object.assign(record,structuredClone(v)),remove:async k=>{delete record[k];}});
  const event=k=>({addListener:f=>{listeners[k]=f;}});
  const full={parserState:nonready?'partial':'ready',entries:nonready?[]:[{id:'P9:a',name:'April',lastName:'Smith',orderedAt:clock}],revealedIds:[],revealedEntries:[]};
  const chrome={runtime:{id:'fixture',getURL:p=>'chrome-extension://fixture/'+p,getManifest:()=>({version:'2.0.5'}),onMessage:event('message')},storage:{local:area(local),session:area(session),sync:area({sync_code:'TST-0001',enabled:true,excluded_party_ids:[]})},alarms:{create:async()=>{},onAlarm:event('alarm')},tabs:{query:async()=>[{id:1,url:'https://myoffice.bombparty.com/live-party-orders'},...(multiple?[{id:2,url:'https://myoffice.bombparty.com/live-party-orders'}]:[])],sendMessage:async(_id,m)=>({protocol:2,generation:m.generation,snapshot:full,...(legacyBridge?{}:{source:{documentId,serial:++observations,settled:!nonready}})}),onRemoved:event('removed'),onUpdated:event('updated'),onActivated:event('activated')}};
  class Clock extends Date {static now(){return clock;}}
  const endpoint='https://www.yoursparklesuite.com/api/live-lineup/publish';
  const context=vm.createContext({chrome,importScripts:()=>{},SparklePublisherClient:{createPublisherClient:args=>createPublisherClient({...args,now:()=>clock})},URL,TextEncoder,TextDecoder,AbortController,crypto:webcrypto,Date:Clock,performance:{now:()=>clock},setTimeout:(f,n)=>setTimeout(f,n===550?1:1000),clearTimeout,
    fetch:async(_url,o)=>{clock+=600;const b=JSON.parse(o.body);requests.push(b);let body;const stamp=new Date(clock).toISOString(),lease=new Date(clock+90000).toISOString();
      if(b.action==='describe')body={...descriptor,serverTime:stamp};
      else if(b.action==='claim'){epoch++;seq=-1;body={claimId:b.claimId,capabilities:b.capabilities,generation:descriptor.generation,publisherId:rep,epoch,revision:requests.length,acceptedSequence:seq,serverTime:stamp,leaseExpiresAt:lease};}
      else if(b.action==='snapshot'){seq=b.packet.sequence;body={ok:true,revision:requests.length,acceptedSequence:seq,serverTime:stamp,leaseExpiresAt:lease,freshForMs:nonready?0:45000};}
      else if(b.action==='configure'){if(!noOp){descriptor={protocol:2,generation:descriptor.generation||1,scope:{partyIds:b.partyIds,excludedPartyIds:b.excludedPartyIds,carryEntryIds:['P9:a'],startedAt:stamp},serverTime:stamp};body={...descriptor,configured:{applied:true,claimId:b.claimId,epoch:b.epoch,generation:descriptor.generation,partyIds:b.partyIds,excludedPartyIds:b.excludedPartyIds}};}else body={...descriptor,serverTime:stamp};}
      const result=new Response(JSON.stringify(body),{headers:{'content-type':'application/json'}});Object.defineProperty(result,'url',{value:endpoint});return result;}});
  vm.runInContext(fs.readFileSync('chrome-extension/background.js','utf8'),context);
  return{requests,local,session,listeners,run:s=>vm.runInContext(s,context),async settle(){await vm.runInContext('ready',context);await new Promise(r=>setImmediate(r));await vm.runInContext('serial',context);}};
}
test('worker bootstrap claims and publishes before configure, then reclaims/rereads final scope',async()=>{
  const w=worker();await w.settle();
  const actions=w.requests.map(x=>x.action).filter(x=>x!=='describe');
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
  assert.equal((await w.run('exclusive(pull)')).status,'source_changed');
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
