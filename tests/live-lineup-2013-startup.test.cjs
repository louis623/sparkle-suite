const {readFileSync} = require('node:fs');
const {runInNewContext} = require('node:vm');
const {webcrypto} = require('node:crypto');
const assert = require('node:assert/strict');
const test = require('node:test');
const update = require('../chrome-extension/update-client.js');
const source = readFileSync('chrome-extension/background.js','utf8');
const endpoint = 'https://www.yoursparklesuite.com/api/live-lineup/publish';
const fixtureToken = 'TST-0001';

function setup({record = {}, version = '2.0.13', firstCheck, initial} = {}) {
  const callbacks = {}, events = [];
  const updateEvent = name => ({addListener:fn=>{callbacks[name]=fn;}});
  const pending = firstCheck || Promise.withResolvers();
  const store = (data,name) => ({
    get:async key=>({[key]:structuredClone(data[key])}),
    set:async value=>Object.assign(data,structuredClone(value)),
    remove:async key=>{delete data[key];},
    setAccessLevel:async()=>{},
    ...(name === 'legacy' ? {get:async()=>{events.push('migration');return {};}} : {}),
  });
  record.sparklePublisherV2 ||= {token:fixtureToken,enabled:false,workflowVersion:4,configVersion:'fixture'};
  let check = 0, current = initial || {revision:0,mode:'auto',phase:'ended',selection:'unknown',runId:null,deadline:null,actor:'auto',waitingForFirstOrder:false};
  const now = () => new Date().toISOString();
  const chrome = {
    runtime:{
      id:'fixture',getURL:path=>'chrome-extension://fixture/'+path,getManifest:()=>({version}),
      requestUpdateCheck:async()=>{
        events.push('update');
        return ++check === 1 ? pending.promise : {status:'throttled'};
      },
      reload:()=>events.push('reload'),
      onStartup:updateEvent('startup'),onInstalled:updateEvent('installed'),
      onUpdateAvailable:updateEvent('download'),onMessage:updateEvent('message'),
    },
    alarms:{create:async()=>events.push('alarm'),onAlarm:updateEvent('alarmEvent')},
    tabs:{query:async()=>[],onUpdated:updateEvent('tab'),onRemoved:updateEvent('remove')},
    storage:{local:store(record),session:store({}),sync:store({},'legacy')},
  };
  const fetch = async (url, options) => {
    if (url !== endpoint) throw Error('descriptor offline');
    const incoming=JSON.parse(options.body);
    events.push(incoming.action);
    let receipt;
    if (incoming.action === 'show-start' || incoming.action === 'show-stop') {
      assert.equal(incoming.expectedControlRevision,current.revision);
      const starting = incoming.action === 'show-start';
      current = {...current,revision:current.revision+1,mode:starting?'started':'stopped',actor:'extension',
        runId:starting?'11111111-1111-4111-8111-111111111111':null};
      receipt={action:incoming.action,revision:current.revision,runId:current.runId,requestId:incoming.requestId};
    }
    const response = new Response(JSON.stringify({protocol:1,serverTime:now(),showControl:current,
      extensionStatus:{connected:false,ackControlRevision:null},...(receipt ? {receipt} : {})}),
      {headers:{'content-type':'application/json'}});
    Object.defineProperty(response,'url',{value:url});
    return response;
  };
  const context = {chrome,fetch,crypto:webcrypto,URL,TextEncoder,TextDecoder,AbortController,
    SparkleUpdateClient:update,SparklePublisherClient:require('../chrome-extension/publisher-client.js'),importScripts:()=>{},
    setTimeout,clearTimeout};
  runInNewContext(source,context);
  const send = (action,expectedControlRevision) => new Promise(resolve=>{
    callbacks.message({action,expectedControlRevision},{id:'fixture',url:chrome.runtime.getURL('popup.html')},resolve);
  });
  return {events,callbacks,pending,send,record};
}
const waitFor = async predicate => {
  for (let index=0;index<500;index++) {
    if (predicate()) return;
    await new Promise(resolve=>setTimeout(resolve,2));
  }
  assert.fail('Expected worker event did not occur');
};
test('popup Stop and check-in work during startup while migration and alarms wait', async () => {
  const w=setup();
  await waitFor(()=>w.events.includes('control-checkin'));
  assert.equal(w.events.includes('migration'),false);
  assert.equal(w.events.includes('alarm'),false);
  w.callbacks.alarmEvent({name:'sparkle-sync'});
  w.callbacks.installed();
  assert.equal((await w.send('sparkle-v2-stop',0)).ok,true);
  assert.equal(w.events.includes('show-stop'),true);
  assert.equal(w.events.filter(event=>event==='update').length,1);
  w.pending.resolve({status:'no_update'});
  await waitFor(()=>w.events.includes('alarm'));
  assert.ok(w.events.indexOf('migration') > w.events.indexOf('update'));
});

test('a persisted Start remains on disk when Chrome reloads and resumes with the same request', async () => {
  const w = setup();
  w.pending.resolve({status:'no_update'});
  await waitFor(()=>w.events.includes('alarm') && w.events.includes('control-checkin'));
  w.callbacks.download({version:'2.0.12'});
  const running = await w.send('sparkle-v2-status');
  assert.equal(running.workerVersion,'2.0.13');
  // Persist the intent as an earlier worker would, then replace the in-memory worker and session.
  const hash = await webcrypto.subtle.digest('SHA-256',new TextEncoder().encode(fixtureToken));
  const requestId = '55555555-5555-4555-8555-555555555555';
  w.record.sparkleUpdaterV1ShowControl = {pending:{
    binding:Buffer.from(hash).toString('hex'),requestId,expectedControlRevision:0,phase:'start',requestedAt:Date.now(),
  }};
  w.callbacks.download({version:'2.0.14'});
  await waitFor(()=>w.events.includes('reload'));
  assert.equal(w.record.sparkleUpdaterV1ShowControl.pending.requestId,requestId);
  const next = setup({record:w.record,version:'2.0.14'});
  next.pending.resolve({status:'no_update'});
  await waitFor(()=>next.events.includes('show-start') && !w.record.sparkleUpdaterV1ShowControl.pending);
  assert.equal(next.events.filter(event=>event==='show-start').length,1);
  assert.equal((await next.send('sparkle-v2-status')).showControl.mode,'started');
});
