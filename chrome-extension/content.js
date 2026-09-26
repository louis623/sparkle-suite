(function () {
  "use strict";
  let table = null, body = null, observer = null, pending = null, stopped = false;
  let documentId = crypto.randomUUID(), serial = 0;
  function notify() {
    if (stopped || pending !== null) return;
    pending = setTimeout(() => {
      pending = null;
      try { chrome.runtime.sendMessage({ action: "sparkle-v2-changed" }).catch(() => {}); }
      catch { stop(); }
    }, 250);
  }
  function discover() {
    const next = document.getElementById("party-order-table"), nextBody = next?.querySelector("tbody") || null;
    if (next === table && nextBody === body && (!next || next.isConnected)) return;
    observer?.disconnect();
    table = next; body = nextBody;
    // Replacement tables establish a new baseline; they cannot reverse an earlier table's observation.
    documentId = crypto.randomUUID(); serial = 0;
    if (body) {
      observer = new MutationObserver(notify);
      observer.observe(body, { childList: true, subtree: true, characterData: true, attributes: true,
        attributeFilter: ["checked", "disabled", "data-orderid", "data-partyid", "data-order-utc-ms", "aria-busy"] });
    }
    notify();
  }
  function onInput(event) {
    if (table?.contains(event.target) && event.target?.matches('input[type="checkbox"]')) notify();
  }
  function read(message, sender, respond) {
    if (stopped || sender.id !== chrome.runtime.id || !message || !['sparkle-v2-read', 'sparkle-v2-inspect'].includes(message.action)) return false;
    if (message.action === 'sparkle-v2-read' && (!Number.isSafeInteger(message.generation) || message.generation < 1 || !message.selection || Array.isArray(message.selection) || typeof message.selection !== 'object')) return false;
    discover();
    let snapshot;
    try { snapshot = SparkleQueueParser.parseTable(table, message.action === 'sparkle-v2-inspect' ? null : message.selection); }
    catch { snapshot = { parserState: "invalid", entries: [], revealedIds: [], revealedEntries: [] }; }
    if (!Number.isSafeInteger(++serial)) { documentId = crypto.randomUUID(); serial = 1; }
    respond({ protocol: 2, ...(message.action === 'sparkle-v2-read' ? { generation: message.generation } : {}),
      source: { documentId, serial, settled: snapshot.parserState === 'ready' }, snapshot });
    return false;
  }
  function stop() {
    stopped = true; observer?.disconnect(); clearTimeout(pending); clearInterval(poll); clearInterval(heartbeat);
    document.removeEventListener('change', onInput, true); document.removeEventListener('input', onInput, true);
    chrome.runtime.onMessage.removeListener(read);
  }
  chrome.runtime.onMessage.addListener(read);
  document.addEventListener('change', onInput, true); document.addEventListener('input', onInput, true);
  const poll = setInterval(discover, 2000), heartbeat = setInterval(notify, 15000);
  window.addEventListener('pagehide', event => { if (!event.persisted) stop(); });
  window.addEventListener('pageshow', event => { if (event.persisted) { documentId = crypto.randomUUID(); serial = 0; notify(); } });
  discover(); notify();
})();
