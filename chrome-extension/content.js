(function () {
  "use strict";
  // Captured package identity, never the updated worker manifest of an older reader.
  const READER_VERSION = "2.0.11";
  const prior=globalThis.__sparkleLineupReader;
  if(prior?.version===READER_VERSION && !prior.stopped)return;
  if(prior && typeof prior.stop==='function')prior.stop();
  else if(globalThis.__sparkleLineupReaderActive)return;
  const parser=SparkleQueueParser;
  const lifecycle={version:READER_VERSION,stopped:false,stop};
  globalThis.__sparkleLineupReader=lifecycle;
  globalThis.__sparkleLineupReaderActive = true;
  let table = null, observer = null, pending = null, stopped = false;
  let documentId = crypto.randomUUID(), serial = 0;
  let lastMutationAt = Date.now();
  function changed() { lastMutationAt = Date.now(); notify(); }
  function notify() {
    if (stopped || pending !== null) return;
    pending = setTimeout(() => {
      pending = null;
      try { chrome.runtime.sendMessage({ action: "sparkle-v2-changed" }).catch(() => {}); }
      catch { stop(); }
    }, 250);
  }
  function discover() {
    const next = document.getElementById("party-order-table");
    if (next === table && (!next || next.isConnected)) return;
    observer?.disconnect();
    table = next;
    // Replacement tables establish a new baseline; they cannot reverse an earlier table's observation.
    documentId = crypto.randomUUID(); serial = 0;
    if (table) {
      observer = new MutationObserver(changed);
      observer.observe(table, { childList: true, subtree: true, characterData: true, attributes: true,
        attributeFilter: ["checked", "disabled", "data-orderid", "data-partyid", "data-order-utc-ms", "aria-busy", "data-sort-by", "class", "colspan", "rowspan"] });
    }
    changed();
  }
  function onInput(event) {
    if (table?.contains(event.target) && event.target?.matches('input[type="checkbox"]')) changed();
  }
  function read(message, sender, respond) {
    if (stopped || sender.id !== chrome.runtime.id || !message || !['sparkle-v2-read', 'sparkle-v2-inspect'].includes(message.action)) return false;
    if (message.action === 'sparkle-v2-read' && (!Number.isSafeInteger(message.generation) || message.generation < 1 || !message.selection || Array.isArray(message.selection) || typeof message.selection !== 'object')) return false;
    discover();
    let snapshot, discovery;
    try {
      // Both parses run synchronously against the same DOM turn. A cached inspect
      // from before a network claim cannot certify discovery for this snapshot.
      discovery = parser.parseDiscovery(table,message.excludedPartyIds ?? []);
      snapshot = message.action === 'sparkle-v2-inspect' ? discovery : parser.parseTable(table,message.selection);
    } catch { snapshot = discovery = { parserState: "invalid", reason: "parser_exception", entries: [], revealedIds: [], revealedEntries: [] }; }
    // A stable empty table is connected; a transient clearing during render is not.
    if (Date.now() < lastMutationAt || Date.now() - lastMutationAt < 500) {
      if (snapshot.parserState === 'ready') snapshot = {...snapshot, parserState:'loading', reason:'table_settling'};
      if (discovery.parserState === 'ready') discovery = {...discovery, parserState:'loading', reason:'table_settling'};
    }
    if (!Number.isSafeInteger(++serial)) { documentId = crypto.randomUUID(); serial = 1; }
    respond({ protocol: 2, readerVersion: READER_VERSION, ...(message.action === 'sparkle-v2-read' ? { generation: message.generation } : {}),
      source: { documentId, serial, settled: snapshot.parserState === 'ready' && discovery.parserState === 'ready' }, snapshot, discovery });
    return false;
  }
  function stop() {
    if(stopped)return;
    stopped = true; lifecycle.stopped=true;
    if(globalThis.__sparkleLineupReader===lifecycle){globalThis.__sparkleLineupReaderActive = false;delete globalThis.__sparkleLineupReader;}
    observer?.disconnect(); clearTimeout(pending); clearInterval(poll); clearInterval(heartbeat);
    document.removeEventListener('change', onInput, true); document.removeEventListener('input', onInput, true);
    try {chrome.runtime.onMessage.removeListener(read);} catch {}
    window.removeEventListener('pagehide',onPageHide);window.removeEventListener('pageshow',onPageShow);
  }
  chrome.runtime.onMessage.addListener(read);
  document.addEventListener('change', onInput, true); document.addEventListener('input', onInput, true);
  const poll = setInterval(discover, 2000), heartbeat = setInterval(notify, 15000);
  function onPageHide(event){if(!event.persisted)stop();}
  function onPageShow(event){if(event.persisted){documentId=crypto.randomUUID();serial=0;notify();}}
  window.addEventListener('pagehide',onPageHide);window.addEventListener('pageshow',onPageShow);
  discover(); notify();
})();
