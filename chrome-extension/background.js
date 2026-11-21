importScripts("publisher-client.js", "update-client.js");
const ENVIRONMENT = "production";
const ENDPOINT = "https://www.yoursparklesuite.com/api/live-lineup/publish";
const KEY = ENVIRONMENT === 'smoke' ? 'sparkleSmokePublisherV2' : 'sparklePublisherV2';
const SOURCE = ENVIRONMENT === 'smoke' ? 'sparkleSmokeSourceV2' : 'sparkleSourceV2';
const UPDATE_KEY = ENVIRONMENT === 'smoke' ? 'sparkleSmokeUpdaterV1' : 'sparkleUpdaterV1';
const CONTROL_KEY = UPDATE_KEY + 'ShowControl';
const RELEASE_ENDPOINT = new URL('/api/live-lineup/release', ENDPOINT).href;
const POPUP = chrome.runtime.getURL('popup.html');
const CREDENTIAL = /^(?:sslp_[A-Za-z0-9_-]{43}|[A-Z0-9]{3}-[0-9]{4})$/;
const CODE = /^[A-Z0-9]{3}-[0-9]{4}$/, PARTY = /^[A-Za-z0-9][A-Za-z0-9_-]{0,60}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const safeCodes = new Set(['unauthorized','lease_expired','lease_required','publisher_conflict','revision_conflict','stale_sequence','rate_limited','invalid_payload','show_changed','invalid_scope','configuration_changed','source_not_ready','stale_observation','capacity_exceeded','source_unavailable','source_ambiguous','invalid_receipt','server_update_required','control_conflict','show_control_unavailable']);
const fail = code => Object.assign(new Error(code), {code});
async function withTimeout(promise, ms, code) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(fail(code)), ms);
  });
  try { return await Promise.race([promise, timeout]); }
  finally { clearTimeout(timer); }
}
function checkPull(guard) {
  if (guard?.invalidated) throw fail('configuration_changed');
}
const newPullGuard = () => ({tabId:null,invalidated:false,controllers:new Set()});
let serial = Promise.resolve(), requesting = false, lastRequest = 0, activePull = null, observedDocumentId = null;
let pullStartedAt = 0, pullToken = 0, queueController = new AbortController();
const readerHealAt = new Map(), injectPending = new Set();
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
const ready = baseReady
  .then(() => withTimeout(updater.checkAndInstall({waitMs:4500}),10000,'connection_failed').catch(()=>{}))
  .then(result => { if (result === 'installing') throw fail('updating'); })
  .then(migrate);
ready.catch(()=>{});
function exclusive(task) {
  const signal = queueController.signal;
  const result = new Promise((resolve, reject) => {
    // Pending popup work must still run in the new queue.
    const requeue = () => resolve(Promise.resolve().then(() => exclusive(task)));
    signal.addEventListener('abort', requeue, {once:true});
    serial.then(() => ready).then(() => {
      if (signal.aborted) return;
      signal.removeEventListener('abort', requeue);
      resolve(task());
    }).catch(error => {
      signal.removeEventListener('abort', requeue);
      reject(error);
    });
  });
  serial = result.catch(() => {});
  return result;
}
function bpUrl(value) { try { const u = new URL(value); return u.origin === 'https://myoffice.bombparty.com' && u.pathname === '/live-party-orders'; } catch { return false; } }
const store = {
  async load() { return (await chrome.storage.local.get(KEY))[KEY] || null; },
  async update(version, patch, guard) {
    checkPull(guard);
    const state = await this.load();
    checkPull(guard);
    if (!state || state.configVersion !== version) return false;
    if (Object.hasOwn(patch,'readyDeadline')) {
      localReadyDeadline = patch.readyDeadline > 0 && Number.isFinite(patch.lastAckAt)
        ? monotonicNow() + Math.max(0,Math.min(45000,patch.readyDeadline - patch.lastAckAt)) : 0;
      localReadyAck = Number.isFinite(patch.lastAckAt) ? patch.lastAckAt : null;
    }
    await chrome.storage.local.set({[KEY]:{...state,...patch}});
    checkPull(guard);
    return true;
  },
};
function guardedStore(guard) {
  return {
    load: async () => {
      checkPull(guard);
      const state = await store.load();
      checkPull(guard);
      return state;
    },
    update: (version, patch) => store.update(version, patch, guard),
  };
}
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
  if (SparkleUpdateClient.compare(chrome.runtime.getManifest().version,'2.0.6') >= 0 && value?.orderScope !== 'selected-parties') throw fail('server_update_required');
  if (!value || value.protocol !== 2 || !Number.isSafeInteger(value.generation) || value.generation < 0 || typeof value.serverTime !== 'string' || !Number.isFinite(Date.parse(value.serverTime))) throw fail('invalid_receipt');
  if (value.generation === 0 && value.scope === null) return {protocol:2,generation:0,scope:null,serverTime:value.serverTime};
  const s = value.scope;
  if (value.generation === 0 || !s || !Array.isArray(s.partyIds) || !s.partyIds.length || s.partyIds.length > 100 || !s.partyIds.every(x=>PARTY.test(x)) || new Set(s.partyIds).size !== s.partyIds.length
    || !Array.isArray(s.excludedPartyIds) || s.excludedPartyIds.some(x=>!s.partyIds.includes(x)) || new Set(s.excludedPartyIds).size !== s.excludedPartyIds.length
    || typeof s.startedAt !== 'string' || !Number.isFinite(Date.parse(s.startedAt)) || !Array.isArray(s.carryEntryIds) || s.carryEntryIds.length > 2000) throw fail('invalid_receipt');
  return {protocol:2,generation:value.generation,scope:{partyIds:[...s.partyIds],excludedPartyIds:[...s.excludedPartyIds],startedAt:s.startedAt,carryEntryIds:[...s.carryEntryIds]},serverTime:value.serverTime};
}
async function describe(state, guard) {
  checkPull(guard);
  if (!state || !CREDENTIAL.test(state.token)) throw fail('unauthorized');
  const receipt = await post(state.token,{action:'describe'},guard);
  checkPull(guard);
  return cleanDescriptor(receipt);
}
async function selected() { return (await chrome.storage.session.get(SOURCE))[SOURCE] || null; }
async function clearSource() { await chrome.storage.session.remove(SOURCE); }
function summarize(snapshot) {
  const map = new Map();
  const add = (id, open) => { if (typeof id !== 'string') return; const parts = id.split(':'); if (parts.length !== 2 || !PARTY.test(parts[0])) return;
    const row = map.get(parts[0]) || {id:parts[0],orderCount:0,unrevealedCount:0}; row.orderCount++; if (open) row.unrevealedCount++; map.set(parts[0],row); };
  for (const entry of snapshot?.entries || []) add(entry.id,true); for (const id of snapshot?.revealedIds || []) add(id,false);
  return [...map.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
async function tabs() {
  const choices = await withTimeout(chrome.tabs.query({url:'https://myoffice.bombparty.com/live-party-orders*'}),4000,'source_unavailable');
  return choices.filter(t=>Number.isSafeInteger(t.id) && bpUrl(t.url));
}
async function messageTab(tabId, message, guard) {
  checkPull(guard);
  let result;
  try {
    result = await withTimeout(chrome.tabs.sendMessage(tabId,message,{frameId:0}),3000,'source_unavailable');
  } catch (error) {
    checkPull(guard);
    const missing = /Receiving end does not exist|Could not establish connection|message port closed|No tab with id/i.test(error?.message || '');
    if (missing || error?.code === 'source_unavailable') throw fail('source_unavailable');
    throw error;
  }
  checkPull(guard);
  return result;
}
async function healReader(tabId, guard) {
  checkPull(guard);
  const retry = injectPending.has(tabId);
  if (!retry) {
    const time = Date.now(), previous = readerHealAt.get(tabId);
    if (Number.isFinite(previous) && time >= previous && time - previous < 30000) return false;
    readerHealAt.set(tabId,time);
  }
  const choices = await tabs();
  checkPull(guard);
  if (!choices.some(tab=>tab.id===tabId) || !chrome.scripting?.executeScript) return false;
  const target = {tabId,frameIds:[0]};
  if (!retry) {
    let probe;
    try {
      probe = await withTimeout(chrome.scripting.executeScript({
        target,
        args:[chrome.runtime.getManifest().version],
        // A probe may run after its deadline, after a newer reader has started.
        func: version => {
          const lifecycle = globalThis.__sparkleLineupReader;
          if (lifecycle?.version === version && !lifecycle.stopped) return 'healthy';
          if (lifecycle && typeof lifecycle.stop === 'function') {
            lifecycle.stop();
            return 'inject';
          }
          return globalThis.__sparkleLineupReaderActive === true ? 'blocked' : 'inject';
        },
      }),4000,'source_unavailable');
    } catch (error) {
      checkPull(guard);
      if (error?.code === 'source_unavailable') readerHealAt.delete(tabId);
      throw error;
    }
    checkPull(guard);
    if (probe?.[0]?.result === 'healthy') return true;
    if (probe?.[0]?.result !== 'inject') return false;
    injectPending.add(tabId);
    const remaining = await tabs();
    checkPull(guard);
    if (!remaining.some(tab=>tab.id===tabId)) return false;
  }
  try {
    await withTimeout(chrome.scripting.executeScript({target,files:['queue-parser.js','content.js']}),5000,'source_unavailable');
  } catch {
    checkPull(guard);
    throw fail('source_unavailable');
  }
  checkPull(guard);
  injectPending.delete(tabId);
  return true;
}
async function messageTabWithHeal(tabId, message, guard) {
  checkPull(guard);
  if (injectPending.has(tabId)) {
    const healed = await healReader(tabId,guard);
    checkPull(guard);
    if (!healed) throw fail('source_unavailable');
  }
  try {
    const result = await messageTab(tabId,message,guard);
    checkPull(guard);
    return result;
  } catch (error) {
    checkPull(guard);
    if (error?.code !== 'source_unavailable') throw error;
    const healed = await healReader(tabId,guard);
    checkPull(guard);
    if (!healed) throw error;
    const result = await messageTab(tabId,message,guard);
    checkPull(guard);
    return result;
  }
}
async function sourceRead(tabId, descriptor, inspectOnly, excludedPartyIds, guard) {
  checkPull(guard);
  const started = Date.now();
  const message = inspectOnly || descriptor.generation === 0 ? {action:'sparkle-v2-inspect',excludedPartyIds}
    : {action:'sparkle-v2-read',selection:descriptor.scope,generation:descriptor.generation,excludedPartyIds};
  let response = await messageTabWithHeal(tabId,message,guard);
  checkPull(guard);
  if (response?.readerVersion !== chrome.runtime.getManifest().version) {
    const healed = await healReader(tabId,guard);
    checkPull(guard);
    if (healed) {
      response = await messageTab(tabId,message,guard);
      checkPull(guard);
    }
  }
  if (Date.now() < started || Date.now() - started > 5000 || response?.protocol !== 2
    || !inspectOnly && descriptor.generation > 0 && response.generation !== descriptor.generation
    || !UUID.test(response.source?.documentId || '') || !Number.isSafeInteger(response.source?.serial) || response.source.serial < 0
    || typeof response.source.settled !== 'boolean') throw fail('source_unavailable');
  const {updateState} = await updater.getStatus();
  checkPull(guard);
  observedDocumentId=response.source.documentId;
  const readerVersion = typeof response.readerVersion === 'string' && /^\d{1,5}(?:\.\d{1,5}){0,3}$/.test(response.readerVersion) ? response.readerVersion : null;
  const matched = readerVersion === chrome.runtime.getManifest().version;
  // An old/unknown reader cannot certify the new worker's snapshot. Do not refresh the page.
  const snapshot = matched ? response.snapshot : {parserState:'partial',reason:null,entries:[],revealedIds:[],revealedEntries:[]};
  return {...snapshot,discovery:matched ? response.discovery : null,readerVersion,updateState,observation:{...response.source,settled:matched && response.source.settled,serverTime:descriptor.serverTime}};
}
async function adopt(state, descriptor, source, parties, guard) {
  checkPull(guard);
  const changed = state.generation !== descriptor.generation;
  const nextVersion = crypto.randomUUID();
  await chrome.storage.session.set({[SOURCE]:{tabId:source.tabId,generation:descriptor.generation,selection:descriptor.scope,parties}});
  checkPull(guard);
  if (!await store.update(state.configVersion,{configVersion:nextVersion,generation:descriptor.generation,needsSelection:false,
    allowGenerationAdopt:false,authFailed:false,workflowVersion:4,
    ...(!state.scopePending && descriptor.scope ? {excludedPartyIds:[...descriptor.scope.excludedPartyIds]} : {}),...(changed ? {claimId:null,epoch:null,publisherId:null,nextSequence:0,needsClaim:true,nextAttemptAt:0,readyDeadline:0} : {})},guard)) throw fail('configuration_changed');
  checkPull(guard);
  if (descriptor.scope) {
    await changeControlLocal(async current => {
      if ((await store.load())?.token !== state.token) return {};
      return {selection:{binding:await credentialBinding(state.token),parties:parties.filter(p=>descriptor.scope.partyIds.includes(p.id))}};
    });
  }
  const adopted = await store.load();
  checkPull(guard);
  return adopted;
}
const sameSet = (a,b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
async function configure(state, descriptor, parties, guard) {
  checkPull(guard);
  const detected = parties.map(x=>x.id).sort(), excluded = (state.excludedPartyIds || []).filter(x=>detected.includes(x)).sort();
  if (!UUID.test(state.claimId || '') || !Number.isSafeInteger(state.epoch) || !state.publisherId) throw fail('lease_required');
  if (!await store.update(state.configVersion,{scopePending:true,readyDeadline:0},guard)) throw fail('configuration_changed');
  checkPull(guard);
  const receipt = await post(state.token,{action:'configure',generation:descriptor.generation,partyIds:detected,excludedPartyIds:excluded,
    claimId:state.claimId,epoch:state.epoch,publisherId:state.publisherId,capabilities:'lineup-2.0.5',...controlEnvelope(guard)},guard);
  checkPull(guard);
  const next = cleanDescriptor(receipt), proof = receipt.configured;
  const automatic = proof?.autoExcludedPartyIds ?? [];
  if (!Array.isArray(automatic) || !automatic.every(id=>detected.includes(id) && !excluded.includes(id))
    || new Set(automatic).size !== automatic.length || automatic.length && (!guard || !controlEnvelope(guard).control || descriptor.scope)) throw fail('invalid_receipt');
  const appliedExclusions = [...excluded,...automatic];
  if (!proof || proof.applied !== true || proof.claimId !== state.claimId || proof.epoch !== state.epoch || proof.generation !== next.generation
    || !Array.isArray(proof.partyIds) || !Array.isArray(proof.excludedPartyIds) || !sameSet(proof.partyIds,detected) || !sameSet(proof.excludedPartyIds,appliedExclusions)
    || next.generation !== (descriptor.generation || 1) || !next.scope || detected.some(id=>!next.scope.partyIds.includes(id))
    || !sameSet(next.scope.excludedPartyIds.filter(id=>detected.includes(id)),appliedExclusions)) throw fail('invalid_receipt');
  if (automatic.length && !await store.update(state.configVersion,{excludedPartyIds:next.scope.excludedPartyIds},guard)) throw fail('configuration_changed');
  return next;
}
function needsConfigure(state, descriptor, parties) {
  if (!parties.length) return false;
  if (!descriptor.scope) return true;
  const detected = parties.map(x=>x.id), desired = (state.excludedPartyIds || []).filter(x=>detected.includes(x));
  return detected.some(id=>!descriptor.scope.partyIds.includes(id)) || !sameSet(desired,descriptor.scope.excludedPartyIds.filter(id=>detected.includes(id)));
}
function discoveryExclusions(state, descriptor) {
  if (descriptor.scope && state.generation !== descriptor.generation) return descriptor.scope.excludedPartyIds;
  return state.scopePending ? state.excludedPartyIds || [] : descriptor.scope?.excludedPartyIds || state.excludedPartyIds || [];
}
function knownParties(source, descriptor, full, excludedPartyIds) {
  // Preserve known/absent parties and their exclusions; discovery only adds new
  // proven identities and updates counts. An unreadable/empty view never removes them.
  const map = new Map();
  for (const item of source?.generation === descriptor.generation ? source.parties || [] : [])
    if (PARTY.test(item.id)) map.set(item.id,item);
  for (const id of [...(descriptor.scope?.partyIds || []),...excludedPartyIds])
    if (PARTY.test(id) && !map.has(id)) map.set(id,{id,orderCount:0,unrevealedCount:0});
  if (full?.parserState === 'ready') for (const item of summarize(full)) map.set(item.id,item);
  return [...map.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
async function prepare(guard) {
  checkPull(guard);
  let state = await store.load();
  checkPull(guard);
  if (!state?.enabled) return null;
  const descriptor = await describe(state,guard);
  checkPull(guard);
  const source = await selected() || await confirmedSelection(state);
  checkPull(guard);
  const choices = await tabs();
  checkPull(guard);
  if (!choices.length) throw fail('source_unavailable');
  const tab = choices.find(x=>x.id === source?.tabId) || (choices.length === 1 ? choices[0] : null);
  if (!tab) throw fail('source_ambiguous');
  guard.tabId = tab.id;
  const excluded = discoveryExclusions(state,descriptor);
  const full = await sourceRead(tab.id,descriptor,true,excluded,guard);
  checkPull(guard);
  const parties = knownParties(source,descriptor,full,excluded);
  state = await adopt(state,descriptor,{tabId:tab.id},parties,guard);
  checkPull(guard);
  return {state,descriptor,parties,tabId:tab.id,diagnosticSnapshot:full,
    readyHint:full.parserState === 'ready' && full.observation.settled};
}
async function freshSnapshot(prepared, guard) {
  checkPull(guard);
  const state = await store.load();
  checkPull(guard);
  const descriptor = await describe(state,guard);
  checkPull(guard);
  if (descriptor.generation !== prepared.descriptor.generation || !sameSet(descriptor.scope?.partyIds || [],prepared.descriptor.scope?.partyIds || [])
    || !sameSet(descriptor.scope?.excludedPartyIds || [],prepared.descriptor.scope?.excludedPartyIds || [])
    || descriptor.scope?.startedAt !== prepared.descriptor.scope?.startedAt) throw fail('show_changed');
  const excluded = discoveryExclusions(state,descriptor);
  const snapshot = await sourceRead(prepared.tabId,descriptor,false,excluded,guard);
  checkPull(guard);
  const full = snapshot.discovery;
  if (!full || full.parserState !== 'ready') {
    // Keep exact bounded failure evidence, not a healthy scoped subset which
    // could silently omit a newly opened party.
    const failure = full && ['invalid','partial','loading'].includes(full.parserState) ? full
      : {parserState:'partial',reason:'table_incomplete',entries:[],revealedIds:[],revealedEntries:[]};
    return {...failure,readerVersion:snapshot.readerVersion,updateState:snapshot.updateState,
      observation:{...snapshot.observation,settled:false}};
  }
  prepared.parties = knownParties({generation:descriptor.generation,parties:prepared.parties},descriptor,full,excluded);
  if (descriptor.generation > 0 && snapshot.parserState === 'ready' && needsConfigure(state,descriptor,prepared.parties))
    return {...snapshot,parserState:'partial',reason:'table_incomplete',failure:{version:1,stage:'scope',rowIndex:null,cellCount:null},
      entries:[],revealedIds:[],revealedEntries:[],observation:{...snapshot.observation,settled:false}};
  return snapshot;
}
async function status() {
  const state = await store.load(), source = await selected() || await confirmedSelection(state), now = Date.now();
  const local = await loadControlLocal();
  const browserUpdate = await updater.getStatus();
  const current = controlCache?.token === state?.token ? controlCache.value : null;
  const unsupported = controlUnavailableFor === state?.token;
  return {ok:true,environment:ENVIRONMENT,workerVersion:chrome.runtime.getManifest().version,...browserUpdate,
    showControl:current?.showControl ?? null,extensionStatus:current?.extensionStatus ?? null,showControlsUnavailable:unsupported,controlNotice:local.notice ?? null,
    startPending:Boolean(local.pending && state && local.pending.binding === await credentialBinding(state.token)),
    configured:Boolean(state && CREDENTIAL.test(state.token)),enabled:Boolean(state?.enabled),
    code:CODE.test(state?.token || '') ? state.token : '',parties:Array.isArray(source?.parties) ? source.parties : [],excludedPartyIds:state?.excludedPartyIds || [],scopePending:Boolean(state?.scopePending),
    connected:Boolean(state?.enabled && Number.isSafeInteger(state.generation) && source && state.parserState === 'ready' && !state.scopePending && !state.lastError
      && localReadyAck === state.lastAckAt && monotonicNow() < localReadyDeadline
      && Number.isFinite(state.lastAckAt) && now >= state.lastAckAt && now < (state.readyDeadline || 0)),
    diagnostics:state?.diagnostics ?? null,lastAckAt:state?.lastAckAt ?? null,lastReadyAckAt:state?.lastReadyAckAt ?? null,lastError:state?.lastError ?? null,parserState:state?.parserState ?? 'loading',parserReason:state?.parserReason ?? null,needsConnection:Boolean(state?.authFailed)};
}
async function pull(guard) {
  const pub = SparklePublisherClient.createPublisherClient({
    store: guardedStore(guard),
    post: (token,body) => post(token,body.action === 'snapshot' ? {...body,...controlEnvelope(guard)} : body,guard),
  });
  const publish = prepared => pub.sync(() => freshSnapshot(prepared,guard),chrome.runtime.getManifest().version,{
    readyHint:prepared.readyHint,diagnosticSnapshot:prepared.diagnosticSnapshot,
  });
  try {
    // Status has its own bounded transport. A stalled tab query or check-in
    // must not add another deadline to the existing reconnect/watchdog path.
    void runControlCycle(false);
    checkPull(guard);
    const config = await store.load();
    if (controlCache?.token === config?.token) guard.controlRevision = controlCache?.value.showControl.revision;
    let prepared = await prepare(guard);
    checkPull(guard);
    if (!prepared) return {status:'waiting'};
    let result = await publish(prepared);
    checkPull(guard);
    if (!['confirmed','source_not_ready'].includes(result?.status)) return result;
    let state = await store.load();
    checkPull(guard);
    if (needsConfigure(state,prepared.descriptor,prepared.parties)) {
      const descriptor = await configure(state,prepared.descriptor,prepared.parties,guard);
      checkPull(guard);
      state = await store.load();
      checkPull(guard);
      state = await adopt(state,descriptor,{tabId:prepared.tabId},prepared.parties,guard);
      checkPull(guard);
      prepared = {...prepared,state,descriptor};
      // Configure can change visibility. Fence the subsequent snapshot with the latest revision.
      const latest = await refreshControl(state).catch(()=>null);
      if (latest) guard.controlRevision = latest.showControl.revision;
      // An existing-scope observation is never evidence for the newly configured scope.
      await new Promise(resolve => setTimeout(resolve,550));
      checkPull(guard);
      result = await publish(prepared);
      checkPull(guard);
    }
    state = await store.load();
    checkPull(guard);
    if (result?.status === 'confirmed') {
      await store.update(state.configVersion,{scopePending:false},guard);
      checkPull(guard);
    }
    return result;
  } catch (error) {
    if (guard.invalidated) return {status:'source_changed'};
    try {
      const state = await store.load();
      if (guard.invalidated) return {status:'source_changed'};
      if (state) await store.update(state.configVersion,{lastError:error?.code || 'source_unavailable',readyDeadline:0,
        ...(error?.code === 'unauthorized' ? {authFailed:true} : {}),...(error?.code === 'show_changed' ? {needsSelection:true} : {})},guard);
    } catch (storageError) {
      if (!guard.invalidated) throw storageError;
    }
    return {status:guard.invalidated ? 'source_changed' : error?.code || 'source_unavailable'};
  } finally { if (activePull === guard) activePull = null; }
}
function requestPull() {
  const now = Date.now();
  if (requesting && (now < pullStartedAt || now - pullStartedAt > 60000)) {
    readerHealAt.delete(activePull?.tabId);
    invalidatePull();
    const oldQueue = queueController;
    serial = Promise.resolve();
    queueController = new AbortController();
    oldQueue.abort();
    requesting = false;
  }
  if (requesting || now >= lastRequest && now - lastRequest < 700) return Promise.resolve({status:'busy'});
  requesting = true;
  lastRequest = pullStartedAt = now;
  const token = ++pullToken;
  const guard = newPullGuard();
  activePull = guard;
  return exclusive(() => pull(guard)).finally(() => {
    if (token !== pullToken) return;
    requesting = false;
    if (activePull === guard) activePull = null;
    scheduleMetadata();
  });
}
let controlCache = null, controlUnavailableFor = null, controlUnavailableAt = 0, controlCycle = null, controlWrites = Promise.resolve();
let pendingStartTask, bindingToken, bindingHash;
const controlRevision = value => Number.isSafeInteger(value) && value >= 0;
const dateString = value => typeof value === 'string' && Number.isFinite(Date.parse(value));

function controlEnvelope(guard) {
  return controlRevision(guard?.controlRevision) ? {control:{revision:guard.controlRevision}} : {};
}
async function credentialBinding(token) {
  if (bindingToken === token && bindingHash) return bindingHash;
  const fingerprint = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
  bindingToken = token;
  bindingHash = Array.from(new Uint8Array(fingerprint),byte=>byte.toString(16).padStart(2,'0')).join('');
  return bindingHash;
}
async function loadControlLocal() {
  return (await chrome.storage.local.get(CONTROL_KEY))[CONTROL_KEY] || {};
}
function changeControlLocal(change) {
  const task = controlWrites.then(async()=>{
    const current = await loadControlLocal();
    const next = {...current,...await change(current)};
    await chrome.storage.local.set({[CONTROL_KEY]:next});
    return next;
  });
  controlWrites = task.catch(()=>{});
  return task;
}
async function confirmedSelection(state) {
  if (!CREDENTIAL.test(state?.token || '')) return null;
  const value = (await loadControlLocal()).selection;
  return value && value.binding === await credentialBinding(state.token) ? {parties:value.parties} : null;
}
async function acceptControl(token, value) {
  const current = value?.showControl, extension = value?.extensionStatus;
  if (value?.protocol !== 1 || !dateString(value.serverTime) || !controlRevision(current?.revision)
      || !['started','auto','stopped'].includes(current.mode)
      || !['active','ended'].includes(current.phase)
      || !['none','some','unknown'].includes(current.selection)
      || !['workspace','extension','auto'].includes(current.actor)
      || !(current.runId === null || UUID.test(current.runId))
      || !(current.deadline === null || dateString(current.deadline))
      || typeof current.waitingForFirstOrder !== 'boolean'
      || typeof extension?.connected !== 'boolean'
      || !(extension.ackControlRevision === null || controlRevision(extension.ackControlRevision))) throw fail('invalid_receipt');
  if ((await store.load())?.token !== token) throw fail('configuration_changed');
  const prior = controlCache?.token === token ? controlCache.value : null;
  if (prior && (prior.showControl.revision > current.revision
      || prior.showControl.revision === current.revision && Date.parse(prior.serverTime) > Date.parse(value.serverTime))) return prior;
  controlCache = {token,value};
  controlUnavailableFor = null;
  return value;
}
async function refreshControl(state, ack = null) {
  if (!CREDENTIAL.test(state?.token || '')) return null;
  let tabPresent = false, readerVersion = null;
  try {
    const choices = await tabs();
    const active = choices.length > 1 ? await selected() : null;
    const tab = choices.length === 1 ? choices[0] : choices.find(t=>t.id === active?.tabId);
    tabPresent = Boolean(tab);
    if (tab) {
      const response = await messageTab(tab.id,{action:'sparkle-v2-probe'});
      if (SparkleUpdateClient.compare(response?.readerVersion,'2.0.13') !== null) readerVersion = response.readerVersion;
    }
  } catch {
    // A missing reader is connection evidence only. It never closes a party.
  }
  const workerVersion = chrome.runtime.getManifest().version;
  const sourceStatus = readerVersion === null ? 'unavailable' : ['ready','loading','partial','invalid'].includes(state.parserState) ? state.parserState : 'unknown';
  try {
    const value = await post(state.token,{action:'control-checkin',checkin:{workerVersion,readerVersion,sourceStatus,
      tabPresent,readerResponding:readerVersion !== null,ackControlRevision:ack}});
    return await acceptControl(state.token,value);
  } catch (error) {
    if (['invalid_payload','show_control_unavailable'].includes(error?.code)) {
      controlUnavailableFor = state.token;
      controlUnavailableAt = Date.now();
    }
    if (error?.code === 'unauthorized') await changeControlLocal(async current => ({
      ...(current.pending?.binding === await credentialBinding(state.token) ? {pending:null} : {}),
    }));
    throw error;
  }
}
async function completePending(pending, notice = null) {
  return changeControlLocal(current=>current.pending?.requestId === pending.requestId ? {pending:null,notice} : {});
}
async function sendShowCommand(state, action, requestId, expectedControlRevision) {
  const value = await post(state.token,{action,requestId,expectedControlRevision});
  const receipt = value?.receipt;
  if (receipt?.action !== action || receipt.requestId !== requestId || receipt.revision !== expectedControlRevision + 1
      || receipt.revision > value.showControl?.revision
      || !(receipt.runId === null && action === 'show-stop' || UUID.test(receipt.runId || ''))) throw fail('invalid_receipt');
  return acceptControl(state.token,value);
}
async function resumePendingStart(state, value) {
  const local = await loadControlLocal(), pending = local.pending, show = value?.showControl;
  if (!pending || !show) return;
  const age = Date.now() - pending.requestedAt;
  if (pending.binding !== await credentialBinding(state.token) || age < 0 || age >= 7200000) {
    await completePending(pending);
    return;
  }
  if (pending.phase === 'ack' && (show.revision !== pending.expectedControlRevision || show.mode !== 'started')
    || pending.phase === 'start' && show.revision > pending.expectedControlRevision
      && (show.mode !== 'started' || show.revision !== pending.expectedControlRevision + 1 || show.actor !== 'extension')) {
    await completePending(pending,'control_conflict');
    return;
  }
  const update = await updater.checkAndInstall();
  if (update === 'installing') return;
  const stillPending = (await loadControlLocal()).pending;
  if (stillPending?.requestId !== pending.requestId || (await store.load())?.token !== state.token) return;
  try {
    const confirmed = pending.phase === 'ack' ? await refreshControl(state,show.revision)
      : await sendShowCommand(state,'show-start',pending.requestId,pending.expectedControlRevision);
    if (confirmed) {
      if (pending.phase === 'start' && confirmed.showControl.mode === 'started') {
        await refreshControl(state,confirmed.showControl.revision).catch(()=>{});
      }
      const revision = pending.expectedControlRevision + (pending.phase === 'start' ? 1 : 0);
      await completePending(pending,confirmed.showControl.revision > revision ? 'control_conflict' : null);
    }
  } catch (error) {
    if (error?.code === 'control_conflict' || error?.code === 'unauthorized') await completePending(pending,error.code);
    throw error;
  }
}
function continuePendingStart(state, result) {
  if (!pendingStartTask) {
    pendingStartTask = resumePendingStart(state,result).finally(()=>{pendingStartTask = null;});
  }
  return pendingStartTask;
}
function runControlCycle(force) {
  if (!controlCycle || force) {
    const work = baseReady.then(async()=>{
      const state = await store.load();
      const sinceUnavailable = Date.now() - controlUnavailableAt;
      if (!force && state?.token && controlUnavailableFor === state.token && sinceUnavailable >= 0 && sinceUnavailable < 30000) return;
      const prior = controlCache?.token === state?.token ? controlCache?.value : null;
      const recent = prior ? Date.now() - Date.parse(prior.serverTime) : Infinity;
      const value = !force && recent >= 0 && recent < 5000 ? prior : await refreshControl(state);
      if (!value) return;
      const show = value.showControl;
      if (show.mode === 'started' && show.actor === 'workspace' && value.extensionStatus.ackControlRevision !== show.revision) {
        const binding = await credentialBinding(state.token);
        await changeControlLocal(current=>{
          if (current.pending) return {};
          invalidatePull();
          return {pending:{binding,requestId:crypto.randomUUID(),
            requestedAt:Date.now(),expectedControlRevision:show.revision,phase:'ack'}};
        });
      }
      void ready.then(()=>continuePendingStart(state,value)).catch(()=>{});
    }).catch(()=>{});
    controlCycle = work;
    void work.finally(()=>{if (controlCycle === work) controlCycle = null;});
  }
  return controlCycle;
}
async function startShow(expected) {
  const state = await store.load();
  const value = controlCache?.token === state?.token ? controlCache?.value : await refreshControl(state);
  if (!value) throw fail('show_control_unavailable');
  if (!controlRevision(expected) || value.showControl.revision !== expected) {
    await refreshControl(state).catch(()=>{});
    throw fail('control_conflict');
  }
  const binding = await credentialBinding(state.token);
  await changeControlLocal(current=>{
    if (current.pending?.phase === 'start' && current.pending.binding === binding
      && current.pending.expectedControlRevision === expected) return {};
    return {notice:null,pending:{binding,requestId:crypto.randomUUID(),requestedAt:Date.now(),expectedControlRevision:expected,phase:'start'}};
  });
  invalidatePull();
  if (pendingStartTask) await pendingStartTask.catch(()=>{});
  await continuePendingStart(state,value);
  return status();
}
async function stopShow(expected) {
  const state = await store.load();
  if (!CREDENTIAL.test(state?.token || '')) throw fail('unauthorized');
  const binding = await credentialBinding(state.token);
  await changeControlLocal(current=>({notice:null,...(current.pending?.binding === binding ? {pending:null} : {})}));
  if (!controlRevision(expected)) {
    await refreshControl(state).catch(()=>{});
    throw fail('control_conflict');
  }
  try {
    await sendShowCommand(state,'show-stop',crypto.randomUUID(),expected);
  } catch (error) {
    if (error?.code === 'control_conflict') await refreshControl(state).catch(()=>{});
    throw error;
  }
  return status();
}
async function popupMessage(message) {
  if (message.action === 'sparkle-v2-status') return status();
  if (message.action === 'sparkle-v2-connect') {
    const credential = typeof message.credential === 'string' ? message.credential.toUpperCase() : '';
    if (!CODE.test(credential)) return {ok:false,error:'invalid_token'};
    const previous = await store.load(), candidate = {token:credential,enabled:true,excludedPartyIds:previous?.token===credential ? [...(previous.excludedPartyIds || [])] : [],workflowVersion:4,configVersion:crypto.randomUUID(),claimId:null,nextSequence:0,needsClaim:true,nextAttemptAt:0,authFailed:false,scopePending:true};
    await chrome.storage.local.set({[KEY]:candidate});
    try { await describe(candidate); }
    catch (error) { if (previous) await chrome.storage.local.set({[KEY]:previous}); else await chrome.storage.local.remove(KEY); return {ok:false,error:error?.code || 'connection_failed'}; }
    await clearSource();
    if (previous?.token !== credential) {
      controlCache = null;
      await changeControlLocal(() => ({pending:null,selection:null,notice:null}));
    }
    void runControlCycle(false);
    return status();
  }
  if (message.action === 'sparkle-v2-toggle') {
    const state = await store.load(); if (!state || typeof message.enabled !== 'boolean') return {ok:false,error:'invalid_action'};
    if (!await store.update(state.configVersion,{enabled:message.enabled,nextAttemptAt:0,lastError:null,readyDeadline:0,
      allowGenerationAdopt:message.enabled && state.enabled === false})) throw fail('configuration_changed');
    return status();
  }
  if (message.action === 'sparkle-v2-filter') {
    const state = await store.load(), source = await selected() || await confirmedSelection(state);
    if (!state || !source || !PARTY.test(message.partyId) || typeof message.included !== 'boolean' || !source.parties?.some(x=>x.id === message.partyId)) return {ok:false,error:'invalid_action'};
    const excluded = new Set(state.excludedPartyIds || []); message.included ? excluded.delete(message.partyId) : excluded.add(message.partyId);
    if (!await store.update(state.configVersion,{excludedPartyIds:[...excluded].sort(),nextAttemptAt:0,scopePending:true,readyDeadline:0})) throw fail('configuration_changed');
    // The serialized pull performs claim -> genuine observation -> configure -> reread.
    return status();
  }
  return {ok:false,error:'invalid_action'};
}
async function fetchRelease() {
  const controller=new AbortController();let reader,timer;
  try {
    const work=(async()=>{
      const response=await fetch(RELEASE_ENDPOINT,{redirect:'error',credentials:'omit',cache:'no-store',signal:controller.signal});
      if(!response.ok || response.redirected || response.url!==RELEASE_ENDPOINT || (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()!=='application/json' || !response.body)throw fail('invalid_receipt');
      reader=response.body.getReader();let text='',size=0;const decoder=new TextDecoder('utf-8',{fatal:true});
      for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>2048)throw fail('invalid_receipt');text+=decoder.decode(part.value,{stream:true});}
      return JSON.parse(text+decoder.decode());
    })();
    return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(fail('connection_failed'));},5000);})]);
  } finally {clearTimeout(timer);controller.abort();if(reader)void reader.cancel().catch(()=>{});}
}
async function boundedUpdateCheck(){
  let timer;
  try {return await Promise.race([chrome.runtime.requestUpdateCheck(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(fail('connection_failed')),5000);})]);}
  finally {clearTimeout(timer);}
}
const updater=SparkleUpdateClient.create({storage:chrome.storage.local,key:UPDATE_KEY,version:chrome.runtime.getManifest().version,
  fetchRelease,requestCheck:boundedUpdateCheck,reload:()=>{invalidatePull();chrome.runtime.reload();}});
function scheduleMetadata() {
  void updater.refreshMetadata().catch(()=>{});
}
chrome.runtime.onUpdateAvailable?.addListener(details=>{
  void baseReady.then(()=>updater.onUpdateAvailable(details?.version)).catch(()=>{});
});
chrome.runtime.onStartup?.addListener(()=>{
  void baseReady.then(()=>updater.resetSession()).catch(()=>{});
  wake();
});
chrome.runtime.onInstalled?.addListener(wake);
function wake() {
  void runControlCycle(false);
  lastRequest=0;
  void requestPull().catch(()=>{});
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if (sender.id !== chrome.runtime.id || !message || typeof message !== 'object') return false;
  if (sender.url === POPUP) {
    const action = message.action;
    const mutation = ['sparkle-v2-connect','sparkle-v2-toggle','sparkle-v2-filter'].includes(action);
    if (mutation || action === 'sparkle-v2-stop') invalidatePull();
    const task = action === 'sparkle-v2-status' ? baseReady.then(status)
      : action === 'sparkle-v2-stop' ? baseReady.then(()=>stopShow(message.expectedControlRevision))
      : action === 'sparkle-v2-start' ? ready.then(()=>startShow(message.expectedControlRevision))
      : action === 'sparkle-v2-check-update' ? ready.then(async()=>{
          const result = await updater.checkAndInstall();
          return {...await status(), updateState:result};
        })
      : exclusive(()=>popupMessage(message));
    task.then(result=>{
      respond(result);
      if (result.ok && mutation) wake();
    },error=>respond({ok:false,error:safeCodes.has(error?.code) ? error.code : 'operation_failed'}));
    return true;
  }
  if (message.action === 'sparkle-v2-changed' && sender.frameId === 0 && sender.tab && bpUrl(sender.url)) {
    void runControlCycle(false);
    ready.then(()=>requestPull()).then(()=>respond({ok:true}),()=>respond({ok:false})); return true;
  }
  return false;
});
chrome.alarms.onAlarm.addListener(a=>{if(a.name === 'sparkle-sync') wake();});
chrome.tabs.onRemoved.addListener(tabId=>{readerHealAt.delete(tabId);injectPending.delete(tabId);invalidatePull(tabId);void requestPull().catch(()=>{});});
chrome.tabs.onUpdated.addListener((tabId,change)=>{if(change.status === 'loading' || change.url){injectPending.delete(tabId);invalidatePull(tabId);}if(change.status === 'complete' || change.url){lastRequest=0;void requestPull().catch(()=>{});}});
chrome.tabs.onActivated?.addListener(()=>{lastRequest=0;void requestPull().catch(()=>{});});
baseReady.then(()=>runControlCycle(false)).catch(()=>{});
ready.then(()=>{
  scheduleMetadata();
  return chrome.alarms.create('sparkle-sync',{periodInMinutes:.5});
}).then(wake).catch(()=>{});
