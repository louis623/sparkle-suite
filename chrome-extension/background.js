// Sparkle Suite Live Queue v2. Source-only draft; release requires matching content/popup/manifest.
importScripts("publisher-client.js");
const ENDPOINT = "https://www.yoursparklesuite.com/api/live-lineup/publish";
const KEY = "sparklePublisherV2";
const SOURCE = "sparkleSourceV2";
const POPUP = chrome.runtime.getURL("popup.html");
const CREDENTIAL = /^(?:sslp_[A-Za-z0-9_-]{43}|[A-Z0-9]{3}-[0-9]{4})$/;
const fail = code => Object.assign(new Error(code), {code});
const safeCodes = new Set(["unauthorized", "lease_expired", "publisher_conflict", "revision_conflict", "stale_sequence", "rate_limited", "invalid_payload", "show_changed", "invalid_scope", "configuration_changed"]);
let serial = Promise.resolve(), requesting = false, lastRequest = 0, activePull = null;
function invalidatePull(tabId) {
  if (activePull && (tabId === undefined || activePull.tabId === tabId)) {
    activePull.invalidated = true; for (const controller of activePull.controllers) controller.abort();
  }
}
const ready = Promise.all([
  chrome.storage.local.setAccessLevel({accessLevel: "TRUSTED_CONTEXTS"}),
  chrome.storage.session.setAccessLevel({accessLevel: "TRUSTED_CONTEXTS"})
]);
// Catch initialization failure, but leave ready rejected so all operations fail closed.
ready.catch(() => {});
function exclusive(task) {
  const result = serial.then(() => ready).then(task);
  serial = result.catch(() => {});
  return result;
}
function bpUrl(value) {
  try { const u = new URL(value); return u.origin === "https://myoffice.bombparty.com" && u.pathname === "/live-party-orders"; }
  catch { return false; }
}
const store = {
  async load() { return (await chrome.storage.local.get(KEY))[KEY] || null; },
  async update(version, patch) {
    const state = await this.load();
    if (!state || state.configVersion !== version) return false;
    await chrome.storage.local.set({[KEY]: {...state, ...patch}});
    return true;
  }
};
async function post(token, body, guard = null) {
  if (guard?.invalidated) throw fail("configuration_changed");
  if (!CREDENTIAL.test(token)) throw fail("unauthorized");
  const encoded = JSON.stringify(body);
  if (new TextEncoder().encode(encoded).byteLength > 4194304) throw fail("invalid_payload");
  const responseLimit = body.action === "describe" ? 524288 : 16384;
  const controller = new AbortController();
  guard?.controllers.add(controller);
  let timer, reader;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(fail("connection_failed")); }, 10000); });
  const work = async () => {
    const response = await fetch(ENDPOINT, {method: "POST", redirect: "error", credentials: "omit", cache: "no-store",
      headers: {"Content-Type": "application/json", "Authorization": "Bearer " + token}, body: encoded, signal: controller.signal});
    if (response.redirected || response.url !== ENDPOINT) throw fail("invalid_receipt");
    if ((response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase() !== "application/json" || !response.body) throw fail("invalid_receipt");
    const length = response.headers.get("content-length");
    if (length && (!/^\d+$/.test(length) || Number(length) > responseLimit)) throw fail("invalid_receipt");
    reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8", {fatal: true});
    let count = 0, text = "";
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      count += chunk.value.byteLength;
      if (count > responseLimit) throw fail("invalid_receipt");
      text += decoder.decode(chunk.value, {stream: true});
    }
    text += decoder.decode();
    let value;
    try { value = JSON.parse(text); } catch { throw fail("invalid_receipt"); }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw fail("invalid_receipt");
    if (!response.ok) throw fail(response.status === 401 ? "unauthorized" : safeCodes.has(value.error) ? value.error : "connection_failed");
    if (guard?.invalidated) throw fail("configuration_changed");
    return value;
  };
  try { return await Promise.race([work(), timeout]); }
  catch (error) { if (guard?.invalidated) throw fail("configuration_changed"); throw fail(safeCodes.has(error?.code) || error?.code === "invalid_receipt" ? error.code : "connection_failed"); }
  finally { guard?.controllers.delete(controller); clearTimeout(timer); controller.abort(); if (reader) void reader.cancel().catch(() => {}); }
}
function cleanDescriptor(value) {
  const party = id => typeof id === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,60}$/.test(id);
  if (!value || value.protocol !== 2 || !Number.isSafeInteger(value.generation) || value.generation < 0
    || typeof value.serverTime !== "string" || !Number.isFinite(Date.parse(value.serverTime))) throw fail("invalid_receipt");
  if (value.generation === 0 && value.scope === null) return {protocol: 2, generation: 0, scope: null, serverTime: value.serverTime};
  const s = value.scope;
  if (value.generation === 0 || !s || !Array.isArray(s.partyIds) || !s.partyIds.length || s.partyIds.length > 100
    || !s.partyIds.every(party) || new Set(s.partyIds).size !== s.partyIds.length
    || typeof s.startedAt !== "string" || !Number.isFinite(Date.parse(s.startedAt)) || Date.parse(s.startedAt) < 0
    || new Date(s.startedAt).toISOString() !== s.startedAt || !Array.isArray(s.carryEntryIds) || s.carryEntryIds.length > 2000) throw fail("invalid_receipt");
  const ids = new Set();
  for (const id of s.carryEntryIds) {
    if (typeof id !== "string") throw fail("invalid_receipt");
    const parts = id.split(":");
    if (parts.length !== 2 || !parts.every(party) || !s.partyIds.includes(parts[0]) || ids.has(id)) throw fail("invalid_receipt");
    ids.add(id);
  }
  return {protocol: 2, generation: value.generation, scope: {partyIds: [...s.partyIds], startedAt: s.startedAt, carryEntryIds: [...ids]}, serverTime: value.serverTime};
}
async function describe() {
  const state = await store.load();
  if (!state || !CREDENTIAL.test(state.token)) throw fail("unauthorized");
  return cleanDescriptor(await post(state.token, {action: "describe"}));
}
const publisher = SparklePublisherClient.createPublisherClient({store, post: (token, body) => post(token, body, activePull)});
async function selected() { return (await chrome.storage.session.get(SOURCE))[SOURCE] || null; }
async function clearSource() { await chrome.storage.session.remove(SOURCE); }
async function status() {
  const state = await store.load(), source = await selected();
  return {ok: true, configured: Boolean(state && CREDENTIAL.test(state.token)), enabled: Boolean(state?.enabled),
    selectedTabId: source?.tabId ?? null, partyIds: source?.partyIds ?? [], generation: source?.generation ?? null, needsSelection: Boolean(state?.needsSelection || !source),
    lastAckAt: state?.lastAckAt ?? null, lastReadyAckAt: state?.lastReadyAckAt ?? null,
    parserState: state?.parserState ?? null, lastError: state?.lastError ?? null, needsConnection: Boolean(state?.authFailed)};
}
async function pull() {
  const guard = {tabId: null, invalidated: false, controllers: new Set()};
  activePull = guard;
  let timer;
  try {
    const state = await store.load(), source = await selected();
    if (!state?.enabled || !source || state.needsSelection || state.generation !== source.generation) return {status: "not_configured"};
    guard.tabId = source.tabId;
    let tab;
    try { tab = await chrome.tabs.get(source.tabId); } catch { await clearSource(); return {status: "source_closed"}; }
    if (!bpUrl(tab.url)) { await clearSource(); return {status: "source_changed"}; }
    if (guard.invalidated) return {status: "source_changed"};
    const response = await Promise.race([
      chrome.tabs.sendMessage(source.tabId, {action: "sparkle-v2-read", selection: source.selection, generation: source.generation}, {frameId: 0}),
      new Promise((_, reject) => { timer = setTimeout(() => reject(fail("source_unavailable")), 3000); })
    ]);
    if (guard.invalidated) return {status: "source_changed"};
    if (response?.protocol !== 2 || response.generation !== source.generation) return {status: "source_unavailable"};
    return await publisher.sync(response.snapshot, chrome.runtime.getManifest().version);
  } catch { return {status: guard.invalidated ? "source_changed" : "source_unavailable"}; }
  finally { clearTimeout(timer); if (activePull === guard) activePull = null; }
}
function requestPull() {
  // Drop overlapping triggers; the next 15s content heartbeat / 30s alarm recovers them.
  if (requesting || (Date.now() >= lastRequest && Date.now() - lastRequest < 1000)) return Promise.resolve({status: "busy"});
  requesting = true; lastRequest = Date.now();
  return exclusive(pull).finally(() => { requesting = false; });
}
async function popupMessage(message) {
  if (message.action === "sparkle-v2-status") return status();
  if (message.action === "sparkle-v2-describe") return {ok: true, descriptor: await describe()};
  if (message.action === "sparkle-v2-connect") {
    if (typeof message.credential !== "string" || !/^[A-Z0-9]{3}-[0-9]{4}$/.test(message.credential)) return {ok: false, error: "invalid_token"};
    await clearSource();
    await chrome.storage.local.set({[KEY]: {token: message.credential, enabled: false, configVersion: crypto.randomUUID(),
      claimId: null, nextSequence: 0, needsClaim: true}});
    return status();
  }
  if (message.action === "sparkle-v2-select") {
    const state = await store.load();
    if (!state || !Number.isSafeInteger(message.tabId) || message.tabId < 0 || !Number.isSafeInteger(message.generation) || message.generation < 0) return {ok: false, error: "invalid_source"};
    const descriptor = await describe();
    if (descriptor.generation !== message.generation) return {ok: false, error: "show_changed"};
    const partyIds = descriptor.scope?.partyIds ?? message.partyIds;
    if (!Array.isArray(partyIds) || !partyIds.length || partyIds.length > 100 || new Set(partyIds).size !== partyIds.length
      || partyIds.some(id => typeof id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,60}$/.test(id))) return {ok: false, error: "invalid_source"};
    const tab = await chrome.tabs.get(message.tabId);
    if (!bpUrl(tab.url)) return {ok: false, error: "invalid_source"};
    // One serialized browser publisher may safely replay its own same-show claim.
    const reuseClaim = state.generation === descriptor.generation && typeof state.claimId === "string";
    await clearSource();
    await store.update(state.configVersion, {enabled: false, needsSelection: true});
    await chrome.storage.session.set({[SOURCE]: {tabId: tab.id, partyIds, generation: descriptor.generation, selection: descriptor.scope ?? partyIds}});
    if (!await store.update(state.configVersion, {enabled: true, generation: descriptor.generation, needsSelection: false, authFailed: false,
      configVersion: crypto.randomUUID(), needsClaim: true, ...(reuseClaim ? {} : {claimId: null, epoch: null, publisherId: null, nextSequence: 0}), nextAttemptAt: 0,
      lastError: null, lastAckAt: null, lastReadyAckAt: null, parserState: null})) { await clearSource(); throw fail("configuration_changed"); }
    return status();
  }
  if (message.action === "sparkle-v2-pause") {
    const state = await store.load();
    if (state) await store.update(state.configVersion, {enabled: false});
    return status();
  }
  if (message.action === "sparkle-v2-disconnect") {
    await clearSource(); await chrome.storage.local.remove(KEY);
    return status();
  }
  return {ok: false, error: "invalid_action"};
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || !message || typeof message !== "object") return false;
  if (!sender.tab && sender.url === POPUP) {
    if (["sparkle-v2-connect", "sparkle-v2-select", "sparkle-v2-pause", "sparkle-v2-disconnect"].includes(message.action)) invalidatePull();
    exclusive(() => popupMessage(message)).then(result => {
      respond(result);
      if (message.action === "sparkle-v2-select" && result.ok) { lastRequest = 0; void requestPull().catch(() => {}); }
    }, () => respond({ok: false, error: "operation_failed"}));
    return true;
  }
  if (message.action === "sparkle-v2-changed" && sender.frameId === 0 && sender.tab && bpUrl(sender.url)) {
    // No token, queue, or private persisted state is ever returned to content scripts.
    ready.then(selected).then(source => source?.tabId === sender.tab.id ? requestPull() : {status: "not_selected"})
      .then(() => respond({ok: true}), () => respond({ok: false}));
    return true;
  }
  return false;
});
chrome.alarms.onAlarm.addListener(alarm => { if (alarm.name === "sparkle-sync") void requestPull().catch(() => {}); });
chrome.tabs.onRemoved.addListener(tabId => { invalidatePull(tabId); void exclusive(async () => { if ((await selected())?.tabId === tabId) await clearSource(); }).catch(() => {}); });
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (change.status === "loading" || change.url) { invalidatePull(tabId); void exclusive(async () => { if ((await selected())?.tabId === tabId) await clearSource(); }).catch(() => {}); }
});
// Recreate after worker/browser restart. Minimum supported Chrome version is declared in manifest.
ready.then(() => chrome.alarms.create("sparkle-sync", {periodInMinutes: 0.5})).catch(() => {});
