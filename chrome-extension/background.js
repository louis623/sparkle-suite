importScripts("publisher-client.js");
const ENVIRONMENT = "production";
const ENDPOINT = "https://www.yoursparklesuite.com/api/live-lineup/publish";
const KEY = ENVIRONMENT === 'smoke' ? 'sparkleSmokePublisherV2' : 'sparklePublisherV2';
const SOURCE = ENVIRONMENT === 'smoke' ? 'sparkleSmokeSourceV2' : 'sparkleSourceV2';
const POPUP = chrome.runtime.getURL('popup.html');
const CREDENTIAL = /^(?:sslp_[A-Za-z0-9_-]{43}|[A-Z0-9]{3}-[0-9]{4})$/;
const CODE = /^[A-Z0-9]{3}-[0-9]{4}$/, PARTY = /^[A-Za-z0-9][A-Za-z0-9_-]{0,60}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const safeCodes = new Set(['unauthorized','lease_expired','lease_required','publisher_conflict','revision_conflict','stale_sequence','rate_limited','invalid_payload','show_changed','invalid_scope','configuration_changed','source_not_ready','stale_observation','capacity_exceeded','source_unavailable','source_ambiguous','invalid_receipt']);
const fail = code => Object.assign(new Error(code), {code});
let serial = Promise.resolve(), requesting = false, lastRequest = 0, activePull = null;
// A persisted wall-clock deadline alone cannot prove freshness after worker restart
// or a clock correction. Only an acknowledgment in this worker earns local health.
const monotonicNow = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
let localReadyDeadline = 0, localReadyAck = null;
function invalidatePull(tabId) {
  if (activePull && (tabId === undefined || activePull.tabId === tabId)) {
    activePull.invalidated = true;
    for (const controller of activePull.controllers) controller.abort();
  }
}
const baseReady = Promise.all([chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}), chrome.storage.session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'})]);
async function migrate() {
  const current = (await chrome.storage.local.get(KEY))[KEY] || null;
  let legacy = {};
  // Smoke never imports an installed live extension's code, parties, or health.
  if (ENVIRONMENT !== 'smoke') try { legacy = await chrome.storage.sync.get(['sync_code','enabled','excluded_party_ids']); } catch {}
  if (!current && CODE.test(legacy.sync_code || '')) {
    await chrome.storage.local.set({[KEY]:{token:legacy.sync_code,enabled:legacy.enabled !== false,
      excludedPartyIds:Array.isArray(legacy.excluded_party_ids) ? legacy.excluded_party_ids.filter(x=>PARTY.test(x)).slice(0,100) : [],
      workflowVersion:4,configVersion:crypto.randomUUID(),claimId:null,nextSequence:0,needsClaim:true,nextAttemptAt:0}});
    return;
  }
  if (current && current.workflowVersion !== 4) {
    await chrome.storage.local.set({[KEY]:{...current,workflowVersion:4,configVersion:crypto.randomUUID(),
      claimId:null,epoch:null,publisherId:null,nextSequence:0,needsClaim:true,needsSelection:false,nextAttemptAt:0,
      readyDeadline:0,lastReadyAckAt:null,parserState:'loading',excludedPartyIds:current.excludedPartyIds || []}});
  }
}
const ready = baseReady.then(migrate); ready.catch(()=>{});
function exclusive(task) { const result = serial.then(()=>ready).then(task); serial = result.catch(()=>{}); return result; }
function bpUrl(value) { try { const u = new URL(value); return u.origin === 'https://myoffice.bombparty.com' && u.pathname === '/live-party-orders'; } catch { return false; } }
const store = {
  async load() { return (await chrome.storage.local.get(KEY))[KEY] || null; },
  async update(version, patch) {
    const state = await this.load(); if (!state || state.configVersion !== version) return false;
    if (Object.hasOwn(patch,'readyDeadline')) {
      localReadyDeadline = patch.readyDeadline > 0 && Number.isFinite(patch.lastAckAt)
        ? monotonicNow() + Math.max(0,Math.min(45000,patch.readyDeadline - patch.lastAckAt)) : 0;
      localReadyAck = Number.isFinite(patch.lastAckAt) ? patch.lastAckAt : null;
    }
    await chrome.storage.local.set({[KEY]:{...state,...patch}}); return true;
  },
};
async function post(token, body, guard = null) {
  if (guard?.invalidated) throw fail('configuration_changed');
  if (!CREDENTIAL.test(token)) throw fail('unauthorized');
  const encoded = JSON.stringify(body);
  if (new TextEncoder().encode(encoded).byteLength > 4194304) throw fail('invalid_payload');
  const limit = ['describe','configure'].includes(body.action) ? 524288 : 16384;
  const controller = new AbortController(); guard?.controllers.add(controller);
  let timer, reader;
  const timeout = new Promise((_, reject) => { timer = setTimeout(()=>{controller.abort();reject(fail('connection_failed'));},10000); });
  const work = async () => {
    const response = await fetch(ENDPOINT,{method:'POST',redirect:'error',credentials:'omit',cache:'no-store',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:encoded,signal:controller.signal});
    if (response.redirected || response.url !== ENDPOINT || (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase() !== 'application/json' || !response.body) throw fail('invalid_receipt');
    reader = response.body.getReader(); const decoder = new TextDecoder('utf-8',{fatal:true});
    let count = 0, text = '';
    for (;;) { const chunk = await reader.read(); if (chunk.done) break; count += chunk.value.byteLength;
      if (count > limit) throw fail('invalid_receipt'); text += decoder.decode(chunk.value,{stream:true}); }
    text += decoder.decode(); let value; try { value = JSON.parse(text); } catch { throw fail('invalid_receipt'); }
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw fail('invalid_receipt');
    if (!response.ok) throw fail(response.status === 401 ? 'unauthorized' : safeCodes.has(value.error) ? value.error : 'connection_failed');
    if (guard?.invalidated) throw fail('configuration_changed'); return value;
  };
  try { return await Promise.race([work(),timeout]); }
  catch (error) { if (guard?.invalidated) throw fail('configuration_changed'); throw fail(safeCodes.has(error?.code) ? error.code : 'connection_failed'); }
  finally { guard?.controllers.delete(controller); clearTimeout(timer); controller.abort(); if (reader) void reader.cancel().catch(()=>{}); }
}
function cleanDescriptor(value) {
  if (!value || value.protocol !== 2 || !Number.isSafeInteger(value.generation) || value.generation < 0 || typeof value.serverTime !== 'string' || !Number.isFinite(Date.parse(value.serverTime))) throw fail('invalid_receipt');
  if (value.generation === 0 && value.scope === null) return {protocol:2,generation:0,scope:null,serverTime:value.serverTime};
  const s = value.scope;
  if (value.generation === 0 || !s || !Array.isArray(s.partyIds) || !s.partyIds.length || s.partyIds.length > 100 || !s.partyIds.every(x=>PARTY.test(x)) || new Set(s.partyIds).size !== s.partyIds.length
    || !Array.isArray(s.excludedPartyIds) || s.excludedPartyIds.some(x=>!s.partyIds.includes(x)) || new Set(s.excludedPartyIds).size !== s.excludedPartyIds.length
    || typeof s.startedAt !== 'string' || !Number.isFinite(Date.parse(s.startedAt)) || !Array.isArray(s.carryEntryIds) || s.carryEntryIds.length > 2000) throw fail('invalid_receipt');
  return {protocol:2,generation:value.generation,scope:{partyIds:[...s.partyIds],excludedPartyIds:[...s.excludedPartyIds],startedAt:s.startedAt,carryEntryIds:[...s.carryEntryIds]},serverTime:value.serverTime};
}
async function describe(state) { state = state || await store.load(); if (!state || !CREDENTIAL.test(state.token)) throw fail('unauthorized'); return cleanDescriptor(await post(state.token,{action:'describe'},activePull)); }
const publisher = SparklePublisherClient.createPublisherClient({store,post:(token,body)=>post(token,body,activePull)});
async function selected() { return (await chrome.storage.session.get(SOURCE))[SOURCE] || null; }
async function clearSource() { await chrome.storage.session.remove(SOURCE); }
function summarize(snapshot) {
  const map = new Map();
  const add = (id, open) => { if (typeof id !== 'string') return; const parts = id.split(':'); if (parts.length !== 2 || !PARTY.test(parts[0])) return;
    const row = map.get(parts[0]) || {id:parts[0],orderCount:0,unrevealedCount:0}; row.orderCount++; if (open) row.unrevealedCount++; map.set(parts[0],row); };
  for (const entry of snapshot?.entries || []) add(entry.id,true); for (const id of snapshot?.revealedIds || []) add(id,false);
  return [...map.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
async function tabs() { return (await chrome.tabs.query({url:'https://myoffice.bombparty.com/live-party-orders*'})).filter(t=>Number.isSafeInteger(t.id) && bpUrl(t.url)); }
async function messageTab(tabId, message) {
  let timer; const guard = activePull;
  const result = await Promise.race([chrome.tabs.sendMessage(tabId,message,{frameId:0}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(fail('source_unavailable')),3000);})]).finally(()=>clearTimeout(timer));
  if (guard?.invalidated || guard && guard.tabId !== tabId) throw fail('configuration_changed');
  return result;
}
async function sourceRead(tabId, descriptor, inspectOnly = false) {
  const started = Date.now();
  const response = await messageTab(tabId, inspectOnly || descriptor.generation === 0 ? {action:'sparkle-v2-inspect'} : {action:'sparkle-v2-read',selection:descriptor.scope,generation:descriptor.generation});
  if (Date.now() < started || Date.now() - started > 5000 || response?.protocol !== 2
    || !inspectOnly && descriptor.generation > 0 && response.generation !== descriptor.generation
    || !UUID.test(response.source?.documentId || '') || !Number.isSafeInteger(response.source?.serial) || response.source.serial < 0
    || typeof response.source.settled !== 'boolean') throw fail('source_unavailable');
  return {...response.snapshot,observation:{...response.source,serverTime:descriptor.serverTime}};
}
async function adopt(state, descriptor, source, parties, configured = false) {
  const changed = state.generation !== descriptor.generation;
  if (Number.isSafeInteger(state.generation) && changed && !configured && !state.allowGenerationAdopt) throw fail('show_changed');
  const nextVersion = crypto.randomUUID();
  await chrome.storage.session.set({[SOURCE]:{tabId:source.tabId,generation:descriptor.generation,selection:descriptor.scope,parties}});
  if (!await store.update(state.configVersion,{configVersion:nextVersion,generation:descriptor.generation,needsSelection:false,
    allowGenerationAdopt:false,authFailed:false,workflowVersion:4,...(changed ? {claimId:null,epoch:null,publisherId:null,nextSequence:0,needsClaim:true,nextAttemptAt:0,readyDeadline:0} : {})})) throw fail('configuration_changed');
  return await store.load();
}
const sameSet = (a,b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
async function configure(state, descriptor, parties) {
  const detected = parties.map(x=>x.id).sort(), excluded = (state.excludedPartyIds || []).filter(x=>detected.includes(x)).sort();
  if (!UUID.test(state.claimId || '') || !Number.isSafeInteger(state.epoch) || !state.publisherId) throw fail('lease_required');
  await store.update(state.configVersion,{scopePending:true,readyDeadline:0});
  const receipt = await post(state.token,{action:'configure',generation:descriptor.generation,partyIds:detected,excludedPartyIds:excluded,
    claimId:state.claimId,epoch:state.epoch,publisherId:state.publisherId,capabilities:'lineup-2.0.5'},activePull);
  const next = cleanDescriptor(receipt), proof = receipt.configured;
  if (!proof || proof.applied !== true || proof.claimId !== state.claimId || proof.epoch !== state.epoch || proof.generation !== next.generation
    || !Array.isArray(proof.partyIds) || !Array.isArray(proof.excludedPartyIds) || !sameSet(proof.partyIds,detected) || !sameSet(proof.excludedPartyIds,excluded)
    || next.generation !== (descriptor.generation || 1) || !next.scope || detected.some(id=>!next.scope.partyIds.includes(id))
    || !sameSet(next.scope.excludedPartyIds.filter(id=>detected.includes(id)),excluded)) throw fail('invalid_receipt');
  return next;
}
function needsConfigure(state, descriptor, parties) {
  if (!parties.length) return false;
  if (!descriptor.scope) return true;
  const detected = parties.map(x=>x.id), desired = (state.excludedPartyIds || []).filter(x=>detected.includes(x));
  return detected.some(id=>!descriptor.scope.partyIds.includes(id)) || !sameSet(desired,descriptor.scope.excludedPartyIds.filter(id=>detected.includes(id)));
}
async function prepare() {
  let state = await store.load(); if (!state?.enabled) return null;
  const descriptor = await describe(state), source = await selected(), choices = await tabs();
  if (!choices.length) throw fail('source_unavailable');
  // A closed/navigated authority is never silently replaced by another open tab.
  const tab = source ? choices.find(x=>x.id === source.tabId) : choices.length === 1 ? choices[0] : null;
  if (!tab) throw fail(source ? 'source_unavailable' : 'source_ambiguous');
  activePull.tabId = tab.id;
  const full = await sourceRead(tab.id,descriptor,true), discovered = summarize(full);
  const parties = discovered.length ? discovered : source?.parties || (descriptor.scope?.partyIds || []).map(id=>({id,orderCount:0,unrevealedCount:0}));
  state = await adopt(state,descriptor,{tabId:tab.id},parties);
  // A scoped read can be healthy even if unrelated ancient history is malformed.
  const hint = descriptor.generation === 0 ? full : await sourceRead(tab.id,descriptor);
  return {state,descriptor,parties,tabId:tab.id,readyHint:hint.parserState === 'ready'};
}
async function freshSnapshot(prepared) {
  const state = await store.load(), descriptor = await describe(state);
  if (descriptor.generation !== prepared.descriptor.generation || !sameSet(descriptor.scope?.partyIds || [],prepared.descriptor.scope?.partyIds || [])
    || !sameSet(descriptor.scope?.excludedPartyIds || [],prepared.descriptor.scope?.excludedPartyIds || [])
    || descriptor.scope?.startedAt !== prepared.descriptor.scope?.startedAt) throw fail('show_changed');
  return sourceRead(prepared.tabId,descriptor);
}
async function status() {
  const state = await store.load(), source = await selected(), now = Date.now();
  return {ok:true,environment:ENVIRONMENT,configured:Boolean(state && CREDENTIAL.test(state.token)),enabled:Boolean(state?.enabled),
    code:CODE.test(state?.token || '') ? state.token : '',parties:Array.isArray(source?.parties) ? source.parties : [],excludedPartyIds:state?.excludedPartyIds || [],scopePending:Boolean(state?.scopePending),
    connected:Boolean(state?.enabled && state.generation > 0 && source && state.parserState === 'ready' && !state.scopePending && !state.lastError
      && localReadyAck === state.lastAckAt && monotonicNow() < localReadyDeadline
      && Number.isFinite(state.lastAckAt) && now >= state.lastAckAt && now < (state.readyDeadline || 0)),
    lastAckAt:state?.lastAckAt ?? null,lastReadyAckAt:state?.lastReadyAckAt ?? null,lastError:state?.lastError ?? null,needsConnection:Boolean(state?.authFailed)};
}
async function pull() {
  const guard = {tabId:null,invalidated:false,controllers:new Set()}; activePull = guard;
  try {
    let prepared = await prepare(); if (!prepared) return {status:'waiting'};
    let result = await publisher.sync(()=>freshSnapshot(prepared),chrome.runtime.getManifest().version,{readyHint:prepared.readyHint});
    if (!['confirmed','source_not_ready'].includes(result?.status)) return result;
    let state = await store.load();
    if (needsConfigure(state,prepared.descriptor,prepared.parties)) {
      const descriptor = await configure(state,prepared.descriptor,prepared.parties);
      state = await adopt(await store.load(),descriptor,{tabId:prepared.tabId},prepared.parties,true);
      prepared = {...prepared,state,descriptor};
      // An existing-scope observation is never evidence for the newly configured scope.
      await new Promise(resolve => setTimeout(resolve,550));
      if (guard.invalidated) throw fail('configuration_changed');
      result = await publisher.sync(()=>freshSnapshot(prepared),chrome.runtime.getManifest().version,{readyHint:prepared.readyHint});
    }
    state = await store.load();
    if (result?.status === 'confirmed' && prepared.descriptor.generation > 0) await store.update(state.configVersion,{scopePending:false});
    return result;
  } catch (error) {
    const state = await store.load();
    if (state) await store.update(state.configVersion,{lastError:error?.code || 'source_unavailable',readyDeadline:0,
      ...(error?.code === 'unauthorized' ? {authFailed:true} : {}),...(error?.code === 'show_changed' ? {needsSelection:true} : {})});
    return {status:guard.invalidated ? 'source_changed' : error?.code || 'source_unavailable'};
  } finally { if (activePull === guard) activePull = null; }
}
function requestPull() {
  if (requesting || Date.now() >= lastRequest && Date.now() - lastRequest < 700) return Promise.resolve({status:'busy'});
  requesting = true; lastRequest = Date.now(); return exclusive(pull).finally(()=>{requesting=false;});
}
async function popupMessage(message) {
  if (message.action === 'sparkle-v2-status') return status();
  if (message.action === 'sparkle-v2-connect') {
    const credential = typeof message.credential === 'string' ? message.credential.toUpperCase() : '';
    if (!CODE.test(credential)) return {ok:false,error:'invalid_token'};
    const previous = await store.load(), candidate = {token:credential,enabled:true,excludedPartyIds:[],workflowVersion:4,configVersion:crypto.randomUUID(),claimId:null,nextSequence:0,needsClaim:true,nextAttemptAt:0,authFailed:false,scopePending:true};
    await chrome.storage.local.set({[KEY]:candidate});
    try { await describe(candidate); }
    catch (error) { if (previous) await chrome.storage.local.set({[KEY]:previous}); else await chrome.storage.local.remove(KEY); return {ok:false,error:error?.code || 'connection_failed'}; }
    await clearSource(); return status();
  }
  if (message.action === 'sparkle-v2-toggle') {
    const state = await store.load(); if (!state || typeof message.enabled !== 'boolean') return {ok:false,error:'invalid_action'};
    if (!await store.update(state.configVersion,{enabled:message.enabled,nextAttemptAt:0,lastError:null,readyDeadline:0,
      allowGenerationAdopt:message.enabled && state.enabled === false})) throw fail('configuration_changed');
    return status();
  }
  if (message.action === 'sparkle-v2-filter') {
    const state = await store.load(), source = await selected();
    if (!state || !source || !PARTY.test(message.partyId) || typeof message.included !== 'boolean' || !source.parties?.some(x=>x.id === message.partyId)) return {ok:false,error:'invalid_action'};
    const excluded = new Set(state.excludedPartyIds || []); message.included ? excluded.delete(message.partyId) : excluded.add(message.partyId);
    if (!await store.update(state.configVersion,{excludedPartyIds:[...excluded].sort(),nextAttemptAt:0,scopePending:true,readyDeadline:0})) throw fail('configuration_changed');
    // The serialized pull performs claim -> genuine observation -> configure -> reread.
    return status();
  }
  return {ok:false,error:'invalid_action'};
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if (sender.id !== chrome.runtime.id || !message || typeof message !== 'object') return false;
  if (!sender.tab && sender.url === POPUP) {
    if (['sparkle-v2-connect','sparkle-v2-toggle','sparkle-v2-filter'].includes(message.action)) invalidatePull();
    exclusive(()=>popupMessage(message)).then(result=>{respond(result);if(result.ok && ['sparkle-v2-connect','sparkle-v2-toggle','sparkle-v2-filter'].includes(message.action)){lastRequest=0;void requestPull().catch(()=>{});}},()=>respond({ok:false,error:'operation_failed'})); return true;
  }
  if (message.action === 'sparkle-v2-changed' && sender.frameId === 0 && sender.tab && bpUrl(sender.url)) {
    ready.then(()=>requestPull()).then(()=>respond({ok:true}),()=>respond({ok:false})); return true;
  }
  return false;
});
chrome.alarms.onAlarm.addListener(a=>{if(a.name === 'sparkle-sync') void requestPull().catch(()=>{});});
chrome.tabs.onRemoved.addListener(tabId=>{invalidatePull(tabId);void requestPull().catch(()=>{});});
chrome.tabs.onUpdated.addListener((tabId,change)=>{if(change.status === 'loading' || change.url) invalidatePull(tabId);if(change.status === 'complete' || change.url){lastRequest=0;void requestPull().catch(()=>{});}});
chrome.tabs.onActivated?.addListener(()=>{lastRequest=0;void requestPull().catch(()=>{});});
ready.then(()=>chrome.alarms.create('sparkle-sync',{periodInMinutes:.5})).then(()=>requestPull()).catch(()=>{});
