// Sparkle Suite v2 popup. Credentials go only to the trusted extension worker.
(function () {
  "use strict";
  const el = id => document.getElementById(id);
  const errors = {unauthorized: "This pairing key expired or was revoked. Create a new key in Workspace.", show_changed: "The show changed. Review the current show again before selecting it.", invalid_scope: "The selected parties do not match this show. Review the source again.", publisher_conflict: "Another publisher still owns the connection. Pause it and wait for its lease to expire before reconnecting.", invalid_source: "Choose an open Bomb Party orders tab and valid party IDs.", invalid_token: "Paste the complete Workspace pairing key.", invalid_receipt: "The server response could not be verified. Nothing was confirmed.", operation_failed: "The operation could not be confirmed. Check status before retrying.", connection_failed: "Could not reach Sparkle Suite. Your existing lineup is retained."};
  let busy = false, refreshing = false, review = null, state = null, readEpoch = 0, focusAfterAction = null;
  function fail(code) { return Object.assign(new Error(code), {code}); }
  async function send(message) {
    let timer;
    try {
      const result = await Promise.race([chrome.runtime.sendMessage(message), new Promise((_, reject) => { timer = setTimeout(() => reject(fail("operation_failed")), 15000); })]);
      if (!result || result.ok !== true) throw fail(result?.error || "operation_failed");
      return result;
    } finally { clearTimeout(timer); }
  }
  function showError(error) { el("error").textContent = errors[error?.code] || "Could not verify this operation. Your existing lineup is retained."; }
  function validState(value) {
    return value && typeof value.configured === "boolean" && typeof value.enabled === "boolean"
      && typeof value.needsSelection === "boolean" && typeof value.needsConnection === "boolean"
      && (value.selectedTabId === null || Number.isSafeInteger(value.selectedTabId) && value.selectedTabId >= 0)
      && (value.generation === null || Number.isSafeInteger(value.generation) && value.generation >= 0)
      && Array.isArray(value.partyIds) && value.partyIds.length <= 100 && value.partyIds.every(x => typeof x === "string" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,60}$/.test(x))
      && [value.lastAckAt,value.lastReadyAckAt].every(x => x === null || Number.isSafeInteger(x) && x >= 0);
  }
  function render(value) {
    if (!validState(value)) throw fail("invalid_receipt");
    state = value;
    el("pairing").hidden = value.configured;
    el("connected").hidden = !value.configured;
    el("pause").disabled = busy || !value.enabled;
    const age = value.lastReadyAckAt === null ? null : Date.now() - value.lastReadyAckAt;
    let label = "Not paired", tone = "neutral";
    if (value.configured) {
      if (value.needsConnection) label = "Pairing needs attention";
      else if (!value.enabled) label = "Paused";
      else if (value.needsSelection || value.selectedTabId === null) label = "Select a source";
      else if (value.lastError) label = "Connection needs attention";
      else if (age !== null && age >= 0 && age <= 45000 && value.parserState === "ready") { label = "Source confirmed"; tone = "good"; }
      else label = age === null ? "Waiting for source confirmation" : "Updates delayed";
    }
    el("health").textContent = label; el("health").dataset.tone = tone;
    el("last-ready").textContent = age !== null && age >= 0 ? "Last ready confirmation: " + Math.floor(age / 1000) + " seconds ago." : "No ready source confirmed in this selection.";
    el("current-source").textContent = value.selectedTabId === null ? "No source tab selected." : "Tab " + value.selectedTabId + " · " + (value.generation ? "Show " + value.generation : "Initial import") + " · Parties " + value.partyIds.join(", ");
    el("source-warning").textContent = value.lastError ? errors[value.lastError] || "The source is not confirmed. Existing customer names are retained." : "";
  }
  async function refresh() {
    if (busy || refreshing) return;
    refreshing = true; const epoch = readEpoch;
    try { const value = await send({action:"sparkle-v2-status"}); if (epoch === readEpoch) render(value); }
    catch (error) { if (epoch !== readEpoch) return; el("health").textContent = "Status unavailable"; el("health").dataset.tone = "neutral"; showError(error); }
    finally { refreshing = false; }
  }
  async function act(task) {
    if (busy) return;
    busy = true; readEpoch++; el("controls").disabled = true; el("error").textContent = "";
    try { await task(); }
    catch (error) { showError(error); }
    finally { busy = false; el("controls").disabled = false; if (state) el("pause").disabled = !state.enabled; if (focusAfterAction) { el(focusAfterAction).focus(); focusAfterAction = null; } }
  }
  function closeReview() { review = null; el("review").hidden = true; el("confirm-source").checked = false; }
  el("pair-form").addEventListener("submit", event => { event.preventDefault(); void act(async () => {
    const token = el("pair-key").value.trim(); el("pair-key").value = "";
    if (!/^sslp_[A-Za-z0-9_-]{43}$/.test(token)) throw fail("invalid_token");
    closeReview(); render(await send({action:"sparkle-v2-connect",token}));
  }); });
  el("review-source").addEventListener("click", () => { void act(async () => {
    closeReview();
    const result = await send({action:"sparkle-v2-describe"}), descriptor = result.descriptor;
    if (!descriptor || descriptor.protocol !== 2 || !Number.isSafeInteger(descriptor.generation) || descriptor.generation < 0
      || (descriptor.generation > 0 && (!descriptor.scope || !Array.isArray(descriptor.scope.partyIds)))) throw fail("invalid_receipt");
    const tabs = await chrome.tabs.query({url:"https://myoffice.bombparty.com/live-party-orders*"});
    const eligible = tabs.filter(tab => { try { const u = new URL(tab.url); return Number.isSafeInteger(tab.id) && tab.id >= 0 && u.origin === "https://myoffice.bombparty.com" && u.pathname === "/live-party-orders"; } catch { return false; } });
    el("source-tab").replaceChildren();
    for (const tab of eligible) { const option = document.createElement("option"); option.value = String(tab.id); option.textContent = "Bomb Party orders · Tab " + tab.id; el("source-tab").appendChild(option); }
    if (!eligible.length) throw fail("invalid_source");
    review = {generation:descriptor.generation,tabIds:eligible.map(tab=>tab.id)};
    el("show-summary").textContent = descriptor.generation ? "Show " + descriptor.generation + " · Parties " + descriptor.scope.partyIds.join(", ") : "Initial import: choose the party IDs to observe. Start later shows in Workspace.";
    el("initial-parties").hidden = descriptor.generation !== 0;
    el("party-ids").value = state?.partyIds.join(", ") || "";
    el("review").hidden = false; focusAfterAction = "source-tab";
  }); });
  el("select-form").addEventListener("submit", event => { event.preventDefault(); void act(async () => {
    if (!review || !el("confirm-source").checked) throw fail("invalid_source");
    const tabId = Number(el("source-tab").value);
    if (!review.tabIds.includes(tabId)) throw fail("invalid_source");
    const partyIds = el("party-ids").value.split(",").map(x=>x.trim()).filter(Boolean);
    if (review.generation === 0 && (!partyIds.length || partyIds.length > 100 || new Set(partyIds).size !== partyIds.length || partyIds.some(id=>!/^[A-Za-z0-9][A-Za-z0-9_-]{0,60}$/.test(id)))) throw fail("invalid_source");
    const value = await send({action:"sparkle-v2-select",generation:review.generation,tabId,partyIds});
    closeReview(); render(value);
  }); });
  el("cancel-review").addEventListener("click", closeReview);
  el("pause").addEventListener("click", () => { void act(async () => { closeReview(); render(await send({action:"sparkle-v2-pause"})); }); });
  el("disconnect").addEventListener("click", () => { void act(async () => {
    if (!el("confirm-disconnect").checked) { el("error").textContent = "Confirm removal of this browser's pairing key first."; return; }
    closeReview(); render(await send({action:"sparkle-v2-disconnect"})); el("confirm-disconnect").checked = false;
  }); });
  void refresh(); const interval = setInterval(() => { void refresh(); }, 2000);
  window.addEventListener("pagehide", () => { clearInterval(interval); el("pair-key").value = ""; });
})();
