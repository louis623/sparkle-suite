/* eslint-disable @typescript-eslint/no-require-imports -- This standalone Node CommonJS fixture runs without a TS loader. */
const a=require('node:assert/strict'), vm=require('node:vm'), fs=require('node:fs');
const endpoint='https://www.yoursparklesuite.com/api/live-lineup/publish', token='sslp_'+'a'.repeat(43);
const data={}, session={}, listeners={}, access=[];
function area(obj){return {setAccessLevel:async x=>access.push(x.accessLevel),get:async k=>({[k]:structuredClone(obj[k])}),set:async x=>Object.assign(obj,structuredClone(x)),remove:async k=>{delete obj[k];}};}
const event=k=>({addListener:f=>listeners[k]=f});
let sent=0, fetcher, requests=[];
const chrome={runtime:{id:'test-extension',getURL:p=>'chrome-extension://test-extension/'+p,getManifest:()=>({version:'2.0.0'}),onMessage:event('message')},storage:{local:area(data),session:area(session)},alarms:{create:async()=>{},onAlarm:event('alarm')},tabs:{get:async id=>({id,url:'https://myoffice.bombparty.com/live-party-orders'}),sendMessage:async()=>{sent++;return {protocol:2,generation:0,snapshot:{parserState:'ready',entries:[],revealedIds:[]}};},onRemoved:event('removed'),onUpdated:event('updated')}};
const context=vm.createContext({chrome,importScripts:()=>{},SparklePublisherClient:require('../chrome-extension/publisher-client.js'),URL,TextEncoder,TextDecoder,AbortController,crypto:require('node:crypto').webcrypto,setTimeout:(f,n)=>setTimeout(f,Math.min(n,30)),clearTimeout,fetch:(u,o)=>{requests.push({u,o});return fetcher(u,o);}});
vm.runInContext(fs.readFileSync('chrome-extension/background.js','utf8'),context);
const run=s=>vm.runInContext(s,context);
function response(body,status=200,headers={'content-type':'application/json'}){const r=new Response(body,{status,headers});Object.defineProperty(r,'url',{value:endpoint});return r;}
(async()=>{
await run('ready');a.deepEqual(access,['TRUSTED_CONTEXTS','TRUSTED_CONTEXTS']);
a.equal(run('bpUrl("https://myoffice.bombparty.com.evil.test/live-party-orders")'),false);
a.equal(run('bpUrl("https://myoffice.bombparty.com/live-party-orders-extra")'),false);
fetcher=async()=>response('{"ok":true}');a.equal((await run('post("'+token+'", {action:"claim"})')).ok,true);
a.equal(requests[0].u,endpoint);a.equal(requests[0].o.redirect,'error');a.equal(requests[0].o.credentials,'omit');
fetcher=async()=>response('{}',200,{'content-type':'text/html'});await a.rejects(run('post("'+token+'", {})'),{code:'invalid_receipt'});
fetcher=async()=>response('x'.repeat(16385));await a.rejects(run('post("'+token+'", {})'),{code:'invalid_receipt'});
fetcher=async()=>response('{"error":"private-provider-message"}',401);await a.rejects(run('post("'+token+'", {})'),{code:'unauthorized'});
fetcher=()=>new Promise(()=>{});await a.rejects(run('post("'+token+'", {})'),{code:'connection_failed'});
await run('exclusive(()=>popupMessage({action:"sparkle-v2-connect",token:"'+token+'"}))');
const state=await run('exclusive(status)');a.equal(state.configured,true);a.equal(state.enabled,false);a.equal(JSON.stringify(state).includes(token),false);
let replied=false;a.equal(listeners.message({action:'sparkle-v2-connect',token},{id:'test-extension',url:'https://evil.test'},()=>{replied=true;}),false);a.equal(replied,false);
a.equal(listeners.message({action:'sparkle-v2-changed'},{id:'test-extension',frameId:1,url:'https://myoffice.bombparty.com/live-party-orders',tab:{id:9}},()=>{}),false);
fetcher=async()=>response(JSON.stringify({protocol:2,generation:0,scope:null,serverTime:new Date().toISOString()}));
await run('exclusive(()=>popupMessage({action:"sparkle-v2-select",tabId:9,generation:0,partyIds:["123","456"]}))');a.equal((await run('exclusive(status)')).selectedTabId,9);
a.equal((await run('store.load()')).generation,0);
const desc=await run('exclusive(()=>popupMessage({action:"sparkle-v2-describe"}))');a.equal(desc.descriptor.generation,0);
fetcher=async()=>response(JSON.stringify({protocol:2,generation:1,scope:{partyIds:['123'],carryEntryIds:[],startedAt:'2026-09-09T12:00:00.000Z'},serverTime:new Date().toISOString()}));
a.equal((await run('exclusive(()=>popupMessage({action:"sparkle-v2-select",tabId:9,generation:0,partyIds:["123"]}))')).error,'show_changed');
a.equal((await run('store.load()')).generation,0);
fetcher=async(_u,o)=>{const b=JSON.parse(o.body), stamp=new Date().toISOString(), lease=new Date(Date.now()+90000).toISOString();return response(JSON.stringify(b.action==='claim'?{generation:0,publisherId:'a1111111-1111-4111-8111-111111111111',epoch:1,revision:1,acceptedSequence:-1,serverTime:stamp,leaseExpiresAt:lease}:{ok:true,revision:2,acceptedSequence:b.packet.sequence,serverTime:stamp,leaseExpiresAt:lease}));};
a.equal((await run('exclusive(pull)')).status,'confirmed');a.ok(sent>0);a.equal((await run('store.load()')).nextSequence,1);
fetcher=async()=>response('{"error":"show_changed"}',409);a.equal((await run('exclusive(pull)')).status,'show_changed');a.equal((await run('store.load()')).needsSelection,true);
const halted=requests.length;await run('exclusive(pull)');a.equal(requests.length,halted);
listeners.updated(9,{status:'loading'});await run('serial');a.equal((await run('exclusive(status)')).selectedTabId,null);
const carry=Array.from({length:2000},(_,i)=>'123:'+('o'+i).padEnd(61,'x'));
const largeDescriptor={protocol:2,generation:2,scope:{partyIds:['123'],startedAt:'2026-09-09T12:00:00.000Z',carryEntryIds:carry},serverTime:new Date().toISOString()};
fetcher=async()=>response(JSON.stringify(largeDescriptor));
a.equal((await run('post("'+token+'", {action:"describe"})')).scope.carryEntryIds.length,2000);
await a.rejects(run('post("'+token+'", {action:"claim"})'),{code:'invalid_receipt'});
a.equal(run('cleanDescriptor('+JSON.stringify(largeDescriptor)+')').scope.carryEntryIds.length,2000);
a.throws(()=>run('cleanDescriptor('+JSON.stringify({...largeDescriptor,generation:0})+')'),{code:'invalid_receipt'});
fetcher=async()=>response('x'.repeat(524289));await a.rejects(run('post("'+token+'", {action:"describe"})'),{code:'invalid_receipt'});
fetcher=async()=>response('{"ok":true}');
const longest=(prefix,i)=>(prefix+String(i).padStart(6,'0')).padEnd(128,'x');
const revealedEntries=Array.from({length:10000},(_,i)=>({id:longest('r',i),orderedAt:8640000000000000}));
const maximum={action:'snapshot',packet:{generation:2,publisherId:'a1111111-1111-4111-8111-111111111111',epoch:1,sequence:0,sourceVersion:'2.0.0',parserState:'ready',entries:Array.from({length:2000},(_,i)=>({id:longest('w',i),name:'李'.repeat(100),orderedAt:8640000000000000})),revealedIds:revealedEntries.map(e=>e.id),revealedEntries}};
a.ok(Buffer.byteLength(JSON.stringify(maximum))>1048576);a.ok(Buffer.byteLength(JSON.stringify(maximum))<4194304);
a.equal((await run('post("'+token+'", '+JSON.stringify(maximum)+')')).ok,true);
await a.rejects(run('post("'+token+'", {padding:"x".repeat(4194304)})'),{code:'invalid_payload'});
// Generation-one scoped worker flow, same-show lease replay and navigation during async work.
let accepted=-1;
const scopedDescriptor={protocol:2,generation:1,scope:{partyIds:['123','456'],carryEntryIds:['123:old'],startedAt:'2026-09-09T12:00:00.000Z'},serverTime:new Date().toISOString()};
const scopedSnapshot={parserState:'ready',entries:[{id:'456:new',name:'Jessica',orderedAt:Date.now()}],revealedIds:['123:old'],revealedEntries:[{id:'123:old',orderedAt:null}]};
const sourceReply={protocol:2,generation:1,snapshot:scopedSnapshot};
chrome.tabs.sendMessage=async(_id,message)=>{a.deepEqual(JSON.parse(JSON.stringify(message.selection)),scopedDescriptor.scope);a.equal(message.generation,1);return sourceReply;};
const healthy=async(_u,o)=>{const b=JSON.parse(o.body);if(b.action==='describe')return response(JSON.stringify(scopedDescriptor));const stamp=new Date().toISOString(),lease=new Date(Date.now()+90000).toISOString();if(b.action==='claim')return response(JSON.stringify({generation:1,publisherId:'a1111111-1111-4111-8111-111111111111',epoch:2,revision:10,acceptedSequence:accepted,serverTime:stamp,leaseExpiresAt:lease}));a.equal(b.packet.generation,1);a.deepEqual(b.packet.revealedEntries,scopedSnapshot.revealedEntries);accepted=b.packet.sequence;return response(JSON.stringify({ok:true,revision:11,acceptedSequence:accepted,serverTime:stamp,leaseExpiresAt:lease}));};
fetcher=healthy;await run('exclusive(()=>popupMessage({action:"sparkle-v2-select",tabId:9,generation:1}))');a.equal((await run('exclusive(pull)')).status,'confirmed');
const previousClaim=(await run('store.load()')).claimId,previousSequence=(await run('store.load()')).nextSequence;
await run('exclusive(()=>popupMessage({action:"sparkle-v2-select",tabId:9,generation:1}))');a.equal((await run('store.load()')).claimId,previousClaim);a.equal((await run('store.load()')).nextSequence,previousSequence);a.equal((await run('exclusive(pull)')).status,'confirmed');a.equal(accepted,previousSequence);
let releaseRead;chrome.tabs.sendMessage=()=>new Promise(resolve=>{releaseRead=resolve;});const beforeNavigation=requests.length,pendingRead=run('exclusive(pull)');await new Promise(resolve=>setImmediate(resolve));a.equal(typeof releaseRead,'function');listeners.updated(9,{status:'loading'});releaseRead(sourceReply);a.equal((await pendingRead).status,'source_changed');await run('serial');a.equal(requests.length,beforeNavigation);a.equal((await run('exclusive(status)')).selectedTabId,null);
chrome.tabs.sendMessage=async()=>sourceReply;fetcher=healthy;await run('exclusive(()=>popupMessage({action:"sparkle-v2-select",tabId:9,generation:1}))');let pendingSignal;
fetcher=(_u,o)=>new Promise((_resolve,reject)=>{pendingSignal=o.signal;o.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});});
const pendingPost=run('exclusive(pull)');await new Promise(resolve=>setImmediate(resolve));a.ok(pendingSignal);listeners.updated(9,{status:'loading'});a.equal(pendingSignal.aborted,true);a.equal((await pendingPost).status,'configuration_changed');await run('serial');a.equal((await run('exclusive(status)')).selectedTabId,null);a.equal((await run('store.load()')).lastReadyAckAt,null);
fetcher=healthy;let selectReply;listeners.message({action:'sparkle-v2-select',tabId:9,generation:1},{id:'test-extension',url:'chrome-extension://test-extension/popup.html'},x=>{selectReply=x;});await new Promise(resolve=>setImmediate(resolve));await run('serial');await new Promise(resolve=>setImmediate(resolve));await run('serial');a.equal(selectReply.ok,true);a.ok((await run('store.load()')).lastReadyAckAt);
console.log('PASS: generation-one roundtrip, claim reuse, pending-read/navigation cancellation, in-flight abort and immediate selection pull');
console.log('PASS: worker selection, scoped publishing, size boundaries and adversarial assertions; no external requests');
})().catch(e=>{console.error(e);process.exitCode=1;});

// Content adapter behavioral checks: fake DOM only, with no external browser access.
{
const events={}, timers=[], intervals=[], watches=[], messages=[]; let handler, currentBody={}, currentTable;
currentTable={isConnected:true,querySelector:()=>currentBody,contains:()=>true};
const doc={getElementById:()=>currentTable,addEventListener:(n,f)=>events[n]=f,removeEventListener:()=>{}};
const parserCalls=[];
const ctx=vm.createContext({document:doc,window:{addEventListener:(n,f)=>events[n]=f},chrome:{runtime:{id:'own',sendMessage:m=>{messages.push(m);return Promise.resolve();},onMessage:{addListener:f=>handler=f,removeListener:()=>{}}}},SparkleQueueParser:{parseTable:(t,p)=>{parserCalls.push([t,p]);return {parserState:t?'ready':'loading',entries:[],revealedIds:[]};}},MutationObserver:class {constructor(f){this.callback=f;watches.push(this);}observe(t,o){this.target=t;this.options=o;}disconnect(){this.disconnected=true;}},setTimeout:f=>{timers.push(f);return timers.length;},clearTimeout:()=>{},setInterval:(f,n)=>{intervals.push([f,n]);return intervals.length;},clearInterval:()=>{}});
const source=fs.readFileSync('chrome-extension/content.js','utf8');
for(const bad of [/reload|location\.href|location\.replace/,/document\.createElement|appendChild|innerHTML|insertAdjacentHTML/,/alert\(|confirm\(|prompt\(/,/fetch\(|chrome\.storage/]) a.equal(bad.test(source),false);
vm.runInContext(source,ctx);a.equal(timers.length,1);timers.shift()();a.equal(messages.length,1);
for(let i=0;i<100;i++) watches[0].callback();a.equal(timers.length,1);timers.shift()();a.equal(messages.length,2);
a.equal(watches[0].options.subtree,true);a.equal(watches[0].options.characterData,true);
let reply;handler({action:'sparkle-v2-read',generation:0,selection:['123']},{id:'own'},x=>reply=x);a.equal(reply.protocol,2);a.deepEqual(parserCalls[0][1],['123']);
handler({action:'sparkle-v2-read',generation:0,selection:['123']},{id:'other'},()=>a.fail('foreign sender accepted'));
events.change({target:{matches:()=>true}});a.equal(timers.length,1);timers.shift()();
const previous=watches[0];currentBody={};intervals.find(x=>x[1]===2000)[0]();a.equal(previous.disconnected,true);a.equal(watches.length,2);timers.shift()();
intervals.find(x=>x[1]===15000)[0]();a.equal(timers.length,1);timers.shift()();
currentTable=null;handler({action:'sparkle-v2-read',generation:0,selection:['123']},{id:'own'},x=>reply=x);a.equal(reply.snapshot.parserState,'loading');
console.log('PASS: content event, heartbeat, replacement, sender and safety checks');
}

// Scoped parser: synthetic table objects only; never connects to Bomb Party.
{
const {parseTable}=require('../chrome-extension/queue-parser.js');
const cutoff=Date.parse('2026-09-09T12:00:00.000Z');
const scope={partyIds:['123','456'],startedAt:new Date(cutoff).toISOString(),carryEntryIds:['123:carried']};
function row(id,party='123',date=cutoff,revealed=false,name='Jessica') {
  const cells=[{textContent:name},{querySelectorAll:()=>[{checked:revealed,indeterminate:false}]},{getAttribute:()=>date===null?null:String(date)}];
  return {getAttribute:k=>k==='data-orderid'?id:party,querySelectorAll:()=>cells};
}
function table(rows) { return {isConnected:true,getAttribute:()=>null,querySelector:k=>k==='thead'?{querySelectorAll:()=>['FirstName','IsRevealed','OrderDate'].map(x=>({getAttribute:()=>x}))}:{querySelectorAll:()=>rows}}; }
let result=parseTable(table([row('old','123',cutoff-1,true),row('carried','123',null,true),row('a'),row('b','456'),row('foreign','789')]),scope);
a.equal(result.parserState,'ready');a.deepEqual(result.entries.map(x=>x.id),['123:a','456:b']);
a.deepEqual(result.revealedEntries,[{id:'123:carried',orderedAt:null}]);a.deepEqual(result.revealedIds,['123:carried']);
const history=Array.from({length:15000},(_,i)=>row('old'+i,'123',cutoff-1,true));
result=parseTable(table([...history,row('current')]),scope);a.equal(result.parserState,'ready');a.equal(result.entries.length,1);a.equal(result.revealedIds.length,0);
result=parseTable(table(history),scope);a.equal(result.parserState,'ready');a.equal(result.entries.length,0);
a.equal(parseTable(table([]),scope).parserState,'partial');
a.equal(parseTable(table([row('x','789')]),scope).reason,'selected_party_not_visible');
a.equal(parseTable(table([row('x','123',null,true)]),scope).reason,'order_time_missing');
a.equal(parseTable(table([row('x','123',' ')]),scope).reason,'invalid_order_time');
a.equal(parseTable(table([row('x'),row('x')]),scope).reason,'duplicate_order_identity');
a.equal(parseTable(table(Array.from({length:2001},(_,i)=>row('n'+i))),scope).reason,'capacity_exceeded');
a.equal(parseTable(table(Array.from({length:10001},(_,i)=>row('r'+i,'123',cutoff,true))),scope).reason,'capacity_exceeded');
for(const change of [{partyIds:[]},{partyIds:['123','123']},{carryEntryIds:['789:x']},{carryEntryIds:['123:x','123:x']},{startedAt:'invalid'},{partyIds:[123]}]) a.equal(parseTable(table([row('a')]),{...scope,...change}).reason,'invalid_scope');
a.equal(parseTable(table([row('a'),row('b','456')]),'456').entries[0].id,'456:b');
a.equal(parseTable(table([row('a','123',null)])).parserState,'ready');
a.deepEqual(parseTable(table([row('a'),row('b','456')]),['123','456']).entries.map(x=>x.id),['123:a','456:b']);
console.log('PASS: scoped multi-party parser, dated revelations, 15000 historical rows, capacity and fail-closed cases');
}

// Transport protocol assertions with private in-memory storage and fake acknowledgements.
(async()=>{
const {createPublisherClient,cleanSnapshot,validClaim}=require('../chrome-extension/publisher-client.js');
const t=Date.parse('2026-09-09T12:00:00Z'), pid='a1111111-1111-4111-8111-111111111111', cid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const sample={parserState:'ready',entries:[{id:'123:a',name:'Jessica',orderedAt:t}],revealedIds:['123:b'],revealedEntries:[{id:'123:b',orderedAt:t}]};
a.deepEqual(cleanSnapshot(sample),sample);
for(const metadata of [[],[{id:'123:c',orderedAt:t}],[{id:'123:b',orderedAt:'today'}],[{id:'123:b',orderedAt:t},{id:'123:b',orderedAt:t}]]) a.equal(cleanSnapshot({...sample,revealedEntries:metadata}),null);
const receipt={generation:3,publisherId:pid,epoch:2,revision:9,acceptedSequence:-1,serverTime:new Date(t).toISOString(),leaseExpiresAt:new Date(t+90000).toISOString()};
a.equal(validClaim(receipt,3),true);a.equal(validClaim(receipt,2),false);a.equal(validClaim({...receipt,generation:undefined},3),false);
let state={enabled:true,token,configVersion:'test',generation:3,needsClaim:true,nextSequence:0}, posts=[], mode='ok';
const store={load:async()=>structuredClone(state),update:async(v,p)=>{if(v!==state.configVersion)return false;Object.assign(state,p);return true;}};
const post=async(key,body)=>{a.equal(key,token);posts.push(structuredClone(body));if(mode==='changed')throw Object.assign(new Error('changed'),{code:'show_changed'});if(body.action==='claim')return {...receipt,generation:mode==='wrong'?4:3};return {...receipt,ok:true,acceptedSequence:body.packet.sequence};};
let client=createPublisherClient({store,post,now:()=>t,randomId:()=>cid,random:()=>0});
a.equal((await client.sync(sample,'2.0.0')).status,'confirmed');a.equal(posts[0].generation,3);a.equal(posts[1].packet.generation,3);a.deepEqual(posts[1].packet.revealedEntries,sample.revealedEntries);
a.equal(state.nextSequence,1);
client=createPublisherClient({store,post,now:()=>t,randomId:()=>cid,random:()=>0});
a.equal((await client.sync(sample,'2.0.0')).status,'confirmed');a.equal(posts.at(-1).packet.sequence,1);
const count=posts.length;a.equal((await client.sync({...sample,revealedEntries:undefined},'2.0.0')).status,'invalid_source');a.equal(posts.length,count);
mode='changed';a.equal((await client.sync(sample,'2.0.0')).status,'show_changed');a.equal(state.needsSelection,true);const stopped=posts.length;
a.equal((await client.sync(sample,'2.0.0')).status,'needs_selection');a.equal(posts.length,stopped);a.equal(state.generation,3);
state={...state,needsSelection:false,nextAttemptAt:0};mode='wrong';a.equal((await client.sync(sample,'2.0.0')).status,'invalid_receipt');a.equal(posts.at(-1).action,'claim');
state={...state,generation:undefined,nextAttemptAt:0};const missing=posts.length;a.equal((await client.sync(sample,'2.0.0')).status,'needs_selection');a.equal(posts.length,missing);
console.log('PASS: transport generation, dated metadata, restart sequences and stale-show stop; fake network only');
})().catch(e=>{console.error(e);process.exitCode=1;});

// Popup behavior with synthetic controls and a fake extension worker; never opens real tabs.
(async()=>{
const html=fs.readFileSync('chrome-extension/popup.html','utf8'), code=fs.readFileSync('chrome-extension/popup.js','utf8'), css=fs.readFileSync('chrome-extension/popup.css','utf8');
const nodes=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],{value:'',checked:false,hidden:false,disabled:false,textContent:'',dataset:{},handlers:{},children:[],addEventListener(n,f){this.handlers[n]=f;},replaceChildren(){this.children=[];this.value='';},appendChild(x){this.children.push(x);if(!this.value)this.value=x.value;},focus(){this.focused=true;}}]));
for(const match of code.matchAll(/el[(]"([^"]+)"[)]/g)) a.ok(nodes[match[1]],'missing popup control '+match[1]);
a.match(html,/id="pair-key" type="password"/);a.equal((code.includes("chrome.storage") || code.includes("fetch(")),false);
a.match(html,/content="width=280,initial-scale=1"/);
a.match(html,/&#10024;<\/span> Sparkle Suite/);
a.match(css,/html,body\{width:280px;min-width:280px;max-width:280px/);
a.equal(css.includes('max-width:100vw'),false);
a.match(css,/linear-gradient\(135deg,#ec4899,#8b5cf6\)/);
const calls=[], intervals=[], events={};let stale=false;
let s={ok:true,configured:false,enabled:false,selectedTabId:null,partyIds:[],generation:null,needsSelection:true,needsConnection:false,lastAckAt:null,lastReadyAckAt:null,parserState:null,lastError:null};
const worker=async m=>{calls.push(structuredClone(m));if(m.action==='sparkle-v2-connect')s={...s,configured:true};if(m.action==='sparkle-v2-describe')return {ok:true,descriptor:{protocol:2,generation:0,scope:null}};if(m.action==='sparkle-v2-select'){if(stale)return {ok:false,error:'show_changed'};s={...s,enabled:true,selectedTabId:m.tabId,partyIds:m.partyIds,generation:m.generation,needsSelection:false};}if(m.action==='sparkle-v2-pause')s={...s,enabled:false};if(m.action==='sparkle-v2-disconnect')s={...s,configured:false,enabled:false,selectedTabId:null,needsSelection:true};return structuredClone(s);};
vm.runInNewContext(code,{document:{getElementById:id=>nodes[id],createElement:()=>({})},window:{addEventListener:(n,f)=>events[n]=f},chrome:{runtime:{sendMessage:worker},tabs:{query:async()=>[{id:9,url:'https://myoffice.bombparty.com/live-party-orders'},{id:10,url:'https://myoffice.bombparty.com.evil.test/live-party-orders'}]}},URL,Date,setTimeout,clearTimeout,setInterval:f=>{intervals.push(f);return 1;},clearInterval:()=>{}});
const settle=()=>new Promise(resolve=>setImmediate(resolve));const fire=async(id,name='click')=>{nodes[id].handlers[name]({preventDefault(){}});await settle();};await settle();
a.equal(nodes.pairing.hidden,false);a.equal(nodes.health.textContent,'Not paired');
nodes['pair-key'].value=token;await fire('pair-form','submit');a.equal(nodes['pair-key'].value,'');a.equal(nodes.pairing.hidden,true);a.equal(nodes.health.textContent,'Paused');
await fire('review-source');a.equal(nodes.review.hidden,false);a.equal(nodes['source-tab'].children.length,1);a.equal(nodes['source-tab'].value,'9');
nodes['party-ids'].value='123, 456';const before=calls.length;await fire('select-form','submit');a.equal(calls.length,before);
nodes['confirm-source'].checked=true;stale=true;await fire('select-form','submit');a.match(nodes.error.textContent,/show changed/i);a.equal(nodes.review.hidden,false);
stale=false;await fire('select-form','submit');a.equal(nodes.review.hidden,true);a.equal(nodes.health.textContent,'Waiting for source confirmation');a.equal(calls.at(-1).generation,0);a.deepEqual(calls.at(-1).partyIds,['123','456']);
s={...s,lastAckAt:Date.now(),lastReadyAckAt:null,parserState:'loading'};intervals[0]();await settle();a.notEqual(nodes.health.textContent,'Source confirmed');
s={...s,lastReadyAckAt:Date.now(),parserState:'ready'};intervals[0]();await settle();a.equal(nodes.health.textContent,'Source confirmed');
s={...s,lastReadyAckAt:Date.now()-46000};intervals[0]();await settle();a.equal(nodes.health.textContent,'Updates delayed');
await fire('pause');a.equal(nodes.health.textContent,'Paused');
const removal=calls.length;await fire('disconnect');a.equal(calls.length,removal);nodes['confirm-disconnect'].checked=true;await fire('disconnect');a.equal(nodes.pairing.hidden,false);
nodes['pair-key'].value='synthetic';events.pagehide();a.equal(nodes['pair-key'].value,'');
console.log('PASS: popup pairing, source confirmation, stale show, honest freshness, pause and removal; synthetic only');
})().catch(e=>{console.error(e);process.exitCode=1;});


// Packaged extension contract: exact production hosts and every manifest-referenced file must ship.
{
const manifest=JSON.parse(fs.readFileSync('chrome-extension/manifest.json','utf8'));
a.equal(manifest.version,'2.0.1');
a.equal(manifest.name,'Sparkle Suite Live Queue');
a.deepEqual(manifest.permissions,['storage','alarms']);
a.deepEqual(manifest.host_permissions,['https://myoffice.bombparty.com/*','https://www.yoursparklesuite.com/*']);
a.equal(manifest.background.service_worker,'background.js');
a.equal(manifest.content_scripts.length,1);
a.deepEqual(manifest.content_scripts[0].matches,['https://myoffice.bombparty.com/live-party-orders*']);
a.deepEqual(manifest.content_scripts[0].js,['queue-parser.js','content.js']);
const packaged=new Set([manifest.background.service_worker,manifest.action.default_popup,...Object.values(manifest.action.default_icon),...Object.values(manifest.icons),...manifest.content_scripts.flatMap(script=>script.js),'publisher-client.js']);
for(const file of packaged)a.equal(fs.existsSync('chrome-extension/'+file),true,'missing packaged file '+file);
const serialized=JSON.stringify(manifest).toLowerCase();
a.equal(serialized.includes('localhost'),false);
a.equal(serialized.includes('vercel.app'),false);
a.equal(serialized.includes('some dude'),false);
console.log('PASS: exact production manifest scope and packaged worker/helper files');
}
