const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const parser=require('../chrome-extension/queue-parser.js');
const {createPublisherClient}=require('../chrome-extension/publisher-client.js');
const updateClient=require('../chrome-extension/update-client.js');
const VERSION=JSON.parse(fs.readFileSync('chrome-extension/manifest.json','utf8')).version;
const DOC='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PUB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const COLS=['OrderID','OrderDate','FirstName','PartyID','IsRevealed'];
function table(rows){
  const result={isConnected:true,getAttribute:()=>null,contains:()=>true};
  const head={rows:[{}],querySelectorAll:()=>COLS.map(key=>({getAttribute:n=>n==='data-sort-by'?key:null,querySelector:()=>null}))};
  const body={parentElement:result};
  body.children=rows.map(data=>{
    const cells=COLS.map(key=>({tagName:'TD',textContent:key==='OrderID'?(data.orderText??data.id):key==='PartyID'?(data.partyText??data.party):key==='FirstName'?(data.name??'Fixture'):'',
      getAttribute:n=>key==='OrderDate'&&n==='data-order-utc-ms'?String(data.date??100):null,
      querySelector:()=>null,querySelectorAll:()=>key==='IsRevealed'?[{checked:data.checked??false,disabled:false,indeterminate:false,getAttribute:()=>null}]:[]}));
    return {tagName:'TR',parentElement:body,children:cells,getAttribute:n=>n==='data-orderid'?data.id:n==='data-partyid'?data.party:null,
      querySelectorAll:s=>s==='td'?cells:[],querySelector:()=>null};
  });
  body.querySelectorAll=()=>body.children;
  result.tHead=head;result.tBodies=[body];result.querySelector=s=>s==='thead'?head:s==='tbody'?body:null;
  return result;
}
function worker(initialRows,{afterClaim=null,bootstrap=false,allExcluded=false}={}){
  let rows=initialRows,clock=Date.parse('2026-11-16T18:00:00Z'),observations=0,epoch=0,sequence=-1;
  const requests=[],local={},session={},listeners={};
  let descriptor={protocol:2,orderScope:'selected-parties',generation:bootstrap?0:1,
    scope:bootstrap?null:{partyIds:['P9','P10','P12'],excludedPartyIds:allExcluded?['P9','P10','P12']:['P10','P12'],carryEntryIds:[],startedAt:new Date(clock-10000).toISOString()}};
  const area=record=>({setAccessLevel:async()=>{},get:async key=>Array.isArray(key)?Object.fromEntries(key.map(k=>[k,record[k]])):{[key]:structuredClone(record[key])},
    set:async value=>Object.assign(record,structuredClone(value)),remove:async key=>{delete record[key];}});
  const event=name=>({addListener:fn=>{listeners[name]=fn;}});
  class Clock extends Date{static now(){return clock;}}
  const chrome={runtime:{id:'fixture',getManifest:()=>({version:VERSION}),getURL:p=>'chrome-extension://fixture/'+p,onMessage:event('message')},
    storage:{local:area(local),session:area(session),sync:area({sync_code:'TST-0001',enabled:true,excluded_party_ids:[]})},
    alarms:{create:async()=>{},onAlarm:event('alarm')},tabs:{query:async()=>[{id:1,url:'https://myoffice.bombparty.com/live-party-orders'}],
      sendMessage:async(_id,message)=>{
        const fixture=table(rows),discovery=parser.parseDiscovery(fixture,message.excludedPartyIds??[]);
        const snapshot=message.action==='sparkle-v2-inspect'?discovery:parser.parseTable(fixture,message.selection);
        return{protocol:2,readerVersion:VERSION,generation:message.generation,discovery,snapshot,
          source:{documentId:DOC,serial:++observations,settled:snapshot.parserState==='ready'&&discovery.parserState==='ready'}};
      },onRemoved:event('removed'),onUpdated:event('updated'),onActivated:event('activated')}};
  const ENDPOINT='https://www.yoursparklesuite.com/api/live-lineup/publish';
  const context=vm.createContext({chrome,crypto:webcrypto,URL,TextEncoder,TextDecoder,AbortController,Date:Clock,performance:{now:()=>clock},
    importScripts:()=>{},SparklePublisherClient:{createPublisherClient:args=>createPublisherClient({...args,now:()=>clock})},SparkleUpdateClient:{...updateClient,create:args=>updateClient.create({...args,now:()=>clock})},
    setTimeout:(fn,ms)=>setTimeout(fn,ms===550?1:ms),clearTimeout,
    fetch:async(url,options)=>{
      if(url.endsWith('/release')){
        const response=new Response(JSON.stringify({protocol:1,version:'2.0.7',publishedAt:null,rolloutEnabled:false}),{headers:{'content-type':'application/json'}});
        Object.defineProperty(response,'url',{value:url});return response;
      }
      clock+=10;const body=JSON.parse(options.body);requests.push(body);let value;
      const stamp=new Date(clock).toISOString(),lease=new Date(clock+90000).toISOString();
      if(body.action==='describe')value={...descriptor,serverTime:stamp};
      else if(body.action==='claim'){
        epoch++;sequence=-1;if(afterClaim){rows=afterClaim;afterClaim=null;}
        value={claimId:body.claimId,capabilities:'lineup-2.0.5',generation:descriptor.generation,publisherId:PUB,epoch,revision:requests.length,acceptedSequence:sequence,serverTime:stamp,leaseExpiresAt:lease};
      }else if(body.action==='snapshot'){
        sequence=body.packet.sequence;value={ok:true,revision:requests.length,acceptedSequence:sequence,serverTime:stamp,leaseExpiresAt:lease,freshForMs:body.packet.parserState==='ready'?45000:0};
      }else if(body.action==='configure'){
        if(descriptor.generation===0)assert.ok(requests.some(r=>r.packet?.parserState==='ready'&&r.packet.generation===0),'bootstrap must establish a real ready baseline');
        descriptor={...descriptor,generation:descriptor.generation||1,scope:{partyIds:body.partyIds,excludedPartyIds:body.excludedPartyIds,carryEntryIds:[],startedAt:descriptor.scope?.startedAt??stamp}};
        value={...descriptor,serverTime:stamp,configured:{applied:true,claimId:body.claimId,epoch:body.epoch,generation:descriptor.generation,partyIds:body.partyIds,excludedPartyIds:body.excludedPartyIds}};
      }
      const response=new Response(JSON.stringify(value),{headers:{'content-type':'application/json'}});Object.defineProperty(response,'url',{value:ENDPOINT});return response;
    }});
  vm.runInContext(fs.readFileSync('chrome-extension/background.js','utf8'),context);
  return{requests,local,session,run:code=>vm.runInContext(code,context),setRows(next){rows=next;},advance(ms){clock+=ms;},
    async settle(){await vm.runInContext('ready',context);await new Promise(resolve=>setImmediate(resolve));await vm.runInContext('serial',context);if(await vm.runInContext('updaterTask',context))await vm.runInContext('updaterTask',context);await vm.runInContext('serial',context);}};
}
test('discovery ignores only proven exclusions while ambiguous or included bad rows remain failures',()=>{
  const good={id:'one',party:'P9'},excluded={id:'old',party:'P10',name:''};
  assert.equal(parser.parseDiscovery(table([good,excluded]),['P10']).parserState,'ready');
  assert.deepEqual(parser.parseDiscovery(table([good,excluded]),['P10']).entries.map(row=>row.id),['P9:one']);
  // An unreadable included or new-party row is skipped; the good row still publishes.
  for(const bad of [{...excluded,party:'P11'},{...excluded,party:'P9'}]){
    const result=parser.parseDiscovery(table([good,bad]),['P10']);
    assert.equal(result.parserState,'ready');assert.deepEqual(result.entries.map(row=>row.id),['P9:one']);
    assert.equal(result.rowReport.skippedByReason.invalid_first_name,1);
  }
  const preferred=parser.parseDiscovery(table([good,{...excluded,orderText:'different'}]),['P10']);
  assert.equal(preferred.parserState,'ready');assert.deepEqual(preferred.entries.map(row=>row.id),['P9:one']);
  assert.equal(parser.parseDiscovery(table([good]),['P10','P10']).reason,'invalid_scope');
});
test('fresh discovery configures new parties before healthy scoped packets and preserves absent exclusions',async()=>{
  const rows=[{id:'old',party:'P9'},{id:'excluded',party:'P10',name:''},{id:'new',party:'P11'}];
  const w=worker(rows);await w.settle();
  const configureIndex=w.requests.findIndex(r=>r.action==='configure');assert.ok(configureIndex>0);
  const config=w.requests[configureIndex];assert.deepEqual(config.partyIds,['P10','P11','P12','P9']);assert.deepEqual(config.excludedPartyIds,['P10','P12']);
  const before=w.requests.slice(0,configureIndex).filter(r=>r.packet);assert.ok(before.length);assert.ok(before.every(r=>r.packet.parserState!=='ready'));
  const final=w.requests.filter(r=>r.packet).at(-1).packet;assert.equal(final.parserState,'ready');assert.deepEqual(final.entries.map(row=>row.id).sort(),['P11:new','P9:old']);
  assert.equal(Object.hasOwn(final,'discovery'),false);assert.equal((await w.run('status()')).connected,true);
  const scoped=await w.run("knownParties({generation:0,parties:[{id:'OLD',orderCount:1,unrevealedCount:1}]},{generation:1,scope:{partyIds:['P9'],excludedPartyIds:[]}},null,[])");
  assert.deepEqual(Array.from(scoped,item=>item.id),['P9']);
  const bootstrap=worker([{id:'first',party:'P9'}],{bootstrap:true});await bootstrap.settle();
  assert.ok(bootstrap.requests.some(r=>r.action==='configure'));assert.equal((await bootstrap.run('status()')).connected,true);
});
test('an invalid new-party row after the claim cannot reuse a healthy earlier inspect',async()=>{
  const w=worker([{id:'old',party:'P9'}],{afterClaim:[{id:'old',party:'P9'},{id:'new',party:'P11',name:''}]});await w.settle();
  const packets=w.requests.filter(r=>r.packet).map(r=>r.packet);assert.ok(packets.length);
  // The unreadable new party is skipped; the earlier healthy party still publishes.
  assert.ok(packets.some(packet=>packet.parserState==='ready'&&packet.entries.map(row=>row.id).join()==='P9:old'));
  assert.equal((await w.run('status()')).connected,true);
  w.setRows([{id:'old',party:'P9'},{id:'new',party:'P11'}]);w.advance(121000);await w.run('exclusive(pull)');
  assert.equal((await w.run('status()')).connected,true);
  assert.deepEqual(w.requests.filter(r=>r.packet).at(-1).packet.entries.map(row=>row.id).sort(),['P11:new','P9:old']);
});
test('reader returns same-turn discovery alongside scoped data and never touches the page',()=>{
  const source=fs.readFileSync('chrome-extension/content.js','utf8');
  for(const forbidden of [/reload|location\.href|location\.replace/,/document\.createElement|appendChild|innerHTML|insertAdjacentHTML/,/alert\(|confirm\(|prompt\(/])assert.equal(forbidden.test(source),false);
  let handler,clock=1000,current=table([{id:'old',party:'P9'}]);
  class Clock extends Date{static now(){return clock;}}
  const context=vm.createContext({Date:Clock,crypto:webcrypto,SparkleQueueParser:parser,
    document:{getElementById:()=>current,addEventListener:()=>{},removeEventListener:()=>{}},window:{addEventListener:()=>{},removeEventListener:()=>{}},
    chrome:{runtime:{id:'fixture',sendMessage:()=>Promise.resolve(),onMessage:{addListener:fn=>{handler=fn;},removeListener:()=>{}}}},
    MutationObserver:class{observe(){}disconnect(){}},setTimeout:()=>1,clearTimeout:()=>{},setInterval:()=>1,clearInterval:()=>{}});
  vm.runInContext(source,context);clock+=600;
  let initial;handler({action:'sparkle-v2-inspect',excludedPartyIds:[]},{id:'fixture'},value=>{initial=value;});assert.equal(initial.discovery.parserState,'ready');
  current=table([{id:'old',party:'P9'},{id:'bad',party:'P11',name:''}]);
  const selection={partyIds:['P9'],excludedPartyIds:[],carryEntryIds:[],startedAt:new Date(0).toISOString()};
  let fresh;handler({action:'sparkle-v2-read',generation:1,selection,excludedPartyIds:[]},{id:'fixture'},value=>{fresh=value;});clock+=600;
  handler({action:'sparkle-v2-read',generation:1,selection,excludedPartyIds:[]},{id:'fixture'},value=>{fresh=value;});
  assert.equal(fresh.snapshot.parserState,'ready');assert.equal(fresh.discovery.parserState,'ready');assert.deepEqual(fresh.discovery.entries.map(row=>row.id),['P9:old']);assert.equal(fresh.discovery.rowReport.skippedByReason.invalid_first_name,1);
});

test('all validated parties intentionally excluded remain healthy empty without hiding ambiguous identities',async()=>{
  const rows=[{id:'one',party:'P9',name:''},{id:'two',party:'P10',name:''}];
  const discovery=parser.parseDiscovery(table(rows),['P9','P10','P12']);
  assert.equal(discovery.parserState,'ready');assert.deepEqual(discovery.entries,[]);assert.deepEqual(discovery.revealedIds,[]);
  const preferred=parser.parseDiscovery(table([{...rows[0],orderText:'conflicting'}]),['P9']);
  assert.equal(preferred.parserState,'ready');assert.deepEqual(preferred.entries,[]);assert.equal(preferred.rowReport.rows[0].disposition,'outside');
  const w=worker(rows,{allExcluded:true});await w.settle();
  const packets=w.requests.filter(request=>request.packet).map(request=>request.packet);assert.ok(packets.length);
  assert.ok(packets.every(packet=>packet.parserState==='ready'&&packet.observation.settled&&packet.entries.length===0&&packet.revealedIds.length===0));
  assert.equal(w.requests.some(request=>request.action==='configure'),false);
  assert.equal((await w.run('status()')).connected,true);
  assert.deepEqual(w.local.sparklePublisherV2.excludedPartyIds,['P9','P10','P12']);
});
