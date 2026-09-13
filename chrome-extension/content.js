// Sparkle Suite v2: read-only page adapter. No credentials, storage, network, or page writes.
(function () {
  "use strict";
  let table = null, body = null, observer = null, pending = null, stopped = false;
  function notify() {
    if (stopped || pending !== null) return;
    // Fixed window, not a trailing debounce: continuous table activity cannot starve updates.
    pending = setTimeout(() => {
      pending = null;
      try { chrome.runtime.sendMessage({action: "sparkle-v2-changed"}).catch(() => {}); }
      catch { stop(); }
    }, 250);
  }
  function discover() {
    const next = document.getElementById("party-order-table");
    const nextBody = next?.querySelector("tbody") || null;
    if (next === table && nextBody === body && (!next || next.isConnected)) return;
    observer?.disconnect(); table = next; body = nextBody;
    if (body) {
      observer = new MutationObserver(notify);
      observer.observe(body, {childList: true, subtree: true, characterData: true, attributes: true,
        attributeFilter: ["checked", "data-orderid", "data-partyid", "data-order-utc-ms", "aria-busy"]});
    }
    notify();
  }
  function onInput(event) {
    if (table?.contains(event.target) && event.target?.matches('input[type="checkbox"]')) notify();
  }
  function read(message, sender, respond) {
    if (sender.id !== chrome.runtime.id || message?.action !== "sparkle-v2-read") return false;
    if (!Number.isSafeInteger(message.generation) || message.generation < 0 || !message.selection
      || (message.generation === 0 ? !Array.isArray(message.selection) : Array.isArray(message.selection) || typeof message.selection !== "object")) return false;
    discover();
    let snapshot;
    try { snapshot = SparkleQueueParser.parseTable(table, message.selection); }
    catch { snapshot = {parserState: "invalid", entries: [], revealedIds: []}; }
    respond({protocol: 2, generation: message.generation, snapshot});
    return false;
  }
  function stop() {
    stopped = true; observer?.disconnect(); clearTimeout(pending);
    clearInterval(poll); clearInterval(heartbeat);
    document.removeEventListener("change", onInput, true);
    document.removeEventListener("input", onInput, true);
    chrome.runtime.onMessage.removeListener(read);
  }
  chrome.runtime.onMessage.addListener(read);
  document.addEventListener("change", onInput, true);
  document.addEventListener("input", onInput, true);
  const poll = setInterval(discover, 2000);
  // Unchanged ready data is a heartbeat, never deduplicated away.
  const heartbeat = setInterval(notify, 15000);
  window.addEventListener("pagehide", event => { if (!event.persisted) stop(); });
  discover(); notify();
})();
