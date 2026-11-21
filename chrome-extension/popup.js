const copy = {invalid_token:"Enter the complete Live Queue code from your Workspace.",unauthorized:"That Live Queue code was not recognized.",connection_failed:"Sparkle Suite could not be reached. Your current lineup is safe.",operation_failed:"That change could not be confirmed. Please try again.",source_unavailable:"Open your Bomb Party Live Party Orders page. Sparkle Suite will reconnect automatically.",source_ambiguous:"Keep one Live Party Orders tab open so Sparkle Suite can select it automatically.",show_changed:"The party selection changed. Sparkle Suite is reading it again.",capacity_exceeded:"The lineup is full. Your existing orders are safe. The supported order limit has been reached.",publisher_conflict:"This Live Lineup is connected in another browser. Turn it off there, then try again."};
const reasons = {table_missing:"Waiting for the Live Party Orders table.",table_busy:"Bomb Party is updating its orders.",table_incomplete:"Waiting for Bomb Party to finish loading the table.",table_settling:"Waiting for the order table to finish changing.",selected_party_not_visible:"The selected parties are not visible in the order table.",reveal_state_missing:"An order's reveal checkbox is unavailable or still updating.",row_incomplete:"An order row has not finished loading.",columns_changed:"The Bomb Party table layout is not recognized.",missing_order_identity:"An order or party ID could not be read safely.",duplicate_order_identity:"Bomb Party returned duplicate order IDs.",invalid_order_time:"An order has an unreadable timestamp.",invalid_first_name:"An order's customer name could not be read safely.",capacity_exceeded:"The supported order limit has been reached.",scan_capacity_exceeded:"The order table is too large to read safely.",invalid_scope:"The party selection could not be validated."};
copy.lease_expired = "The connection lease expired. Sparkle Suite is reconnecting.";
copy.lease_required = copy.lease_expired;
copy.server_update_required = "This site has not received the matching Live Lineup server update yet.";
const RECONNECT_ERRORS = new Set(["lease_expired","lease_required","source_unavailable","connection_failed","show_changed","operation_failed"]);
const ATTENTION_REASONS = new Set(["columns_changed","missing_order_identity","duplicate_order_identity","invalid_order_time","invalid_first_name","capacity_exceeded","scan_capacity_exceeded","invalid_scope","selected_party_not_visible"]);
function hadReadyAck(value){return Number.isFinite(value.lastReadyAckAt)}
/** Popup status words only. Does not change parser, lease, publish, or read behavior. */
function extensionLineupStatus(value){
  if(!value.enabled) return {title:"Off",detail:"Turn Live Lineup on when you are ready.",tone:""};
  if(value.needsConnection || (value.lastError && !RECONNECT_ERRORS.has(value.lastError))) return {title:"Needs attention",detail:copy[value.lastError]||"Your existing lineup is safe while Sparkle Suite reconnects.",tone:"bad"};
  if(value.lastError && RECONNECT_ERRORS.has(value.lastError)) return {title:"Reconnecting",detail:copy[value.lastError],tone:"warn"};
  if(value.parserReason && ATTENTION_REASONS.has(value.parserReason) && !value.connected) return {title:"Needs attention",detail:reasons[value.parserReason]||"The order table could not yet be read safely.",tone:"bad"};
  if(value.connected) return {title:"Connected + Updating",detail:"Live Lineup is keeping up with your orders.",tone:"good"};
  if(value.scopePending && hadReadyAck(value)) return {title:"Reconnecting",detail:"Waiting for a confirmed update of the selected parties.",tone:"warn"};
  if(hadReadyAck(value)) return {title:"Reconnecting",detail:value.parserReason ? (reasons[value.parserReason]||"The order table could not yet be read safely.") : "Sparkle Suite is reconnecting.",tone:"warn"};
  return {title:"Connecting",detail:value.parserReason ? (reasons[value.parserReason]||"The order table could not yet be read safely.") : "Open your Bomb Party Party Orders page.",tone:""};
}
copy.control_conflict = "Your show was changed from another screen.";
copy.show_control_unavailable = "Show controls need a server update.";
const waitingForChrome = "Chrome is delaying the update check. Live Lineup will keep running and install the update as soon as Chrome provides it.";

function updateMessage(value) {
  const worker = value.workerVersion?.split(".").map(Number);
  const latest = value.latestPublishedVersion?.split(".").map(Number);
  const firstDifference = latest?.map((part, index) => part - (worker?.[index] || 0)).find(delta => delta !== 0);
  const releaseIsAhead = Boolean(worker && latest && firstDifference > 0);
  switch (value.updateState) {
    case "checking": return "Checking for updates…";
    case "installing": return "Installing an update…";
    case "throttled":
    case "downloaded": return waitingForChrome;
    case "failed": return "Chrome could not complete the update check. Live Lineup will keep running.";
    case "no_update": return releaseIsAhead ? waitingForChrome : "Chrome found no update.";
    default: return releaseIsAhead ? waitingForChrome : "";
  }
}

(function() {
  "use strict";
  const el = id => document.getElementById(id);
  const errorWithCode = code => Object.assign(new Error(code), {code});
  let state = null, busy = false, startBusy = false, stopBusy = false, checkBusy = false;
  let renderSequence = 0, partiesKey = null;

  async function send(message, timeoutMs = 15000) {
    let timer;
    try {
      const result = await Promise.race([chrome.runtime.sendMessage(message), new Promise((_, reject) => {
        timer = setTimeout(() => reject(errorWithCode("operation_failed")), timeoutMs);
      })]);
      if (!result || result.ok !== true) throw errorWithCode(result?.error || "operation_failed");
      return result;
    } finally {
      clearTimeout(timer);
    }
  }
  function setText(element, text) {
    if (element.textContent !== text) element.textContent = text;
  }
  function optionalText(id, text) {
    const element = el(id);
    setText(element, text);
    element.hidden = !text;
  }
  function showError(error) {
    setText(el("error"), copy[error?.code] || "That change could not be confirmed. Your existing lineup is safe.");
  }
  function partyRow(party, excluded) {
    const label = document.createElement("label");
    label.className = "party";
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = !excluded.includes(party.id);
    box.dataset.partyId = party.id;
    const text = document.createElement("span");
    text.textContent = "Party " + party.id;
    const detail = document.createElement("small");
    detail.textContent = party.orderCount + " order" + (party.orderCount === 1 ? "" : "s");
    text.appendChild(detail);
    label.append(box, text);
    return label;
  }
  function render(value) {
    if (!value || typeof value.configured !== "boolean" || typeof value.enabled !== "boolean"
      || typeof value.needsConnection !== "boolean" || !Array.isArray(value.parties) || !Array.isArray(value.excludedPartyIds)) {
      throw errorWithCode("operation_failed");
    }
    if (state?.code === value.code && (state.showControl?.revision ?? 0) > (value.showControl?.revision ?? 0)) return;
    state = value;
    el("connect-card").hidden = value.configured && !value.needsConnection;
    el("lineup-card").hidden = !value.configured || value.needsConnection;
    setText(el("saved-code"), value.code || "Saved");
    el("enabled").checked = value.enabled;
    el("enabled").disabled = busy;
    const signal = extensionLineupStatus(value);
    setText(el("status-text"), signal.title);
    setText(el("status-detail"), signal.detail);
    el("status-dot").className = "dot " + signal.tone;
    setText(el("running-version"), value.workerVersion ? "Extension " + value.workerVersion : "");
    optionalText("update-status", checkBusy ? "Checking for updates…" : updateMessage(value));
    el("check-update").disabled = checkBusy;
    const show = value.showControl;
    const pending = startBusy || value.startPending;
    const stopping = pending || show?.mode === "started" || show?.phase === "active";
    const action = el("show-action");
    action.hidden = !show;
    action.disabled = stopBusy;
    action.classList.toggle("secondary", stopping);
    action.dataset.command = stopping ? "stop" : "start";
    setText(action, stopping ? "Stop Show" : "Start Show");
    const deadline = show?.phase === "active" && Date.parse(show.deadline) > Date.now()
      ? new Intl.DateTimeFormat(undefined, {hour:"numeric",minute:"2-digit"}).format(new Date(show.deadline)) : "";
    optionalText("show-deadline", deadline ? "Lineup ends at " + deadline : "");
    optionalText("show-waiting", pending ? "Starting show…" : show?.waitingForFirstOrder ? "Show started, waiting for your first order." : "");
    const warnings = [];
    if (value.showControlsUnavailable) warnings.push(copy.show_control_unavailable);
    if (value.controlNotice && copy[value.controlNotice]) warnings.push(copy[value.controlNotice]);
    if (show?.selection === "none") warnings.push("Make sure you have an open party selected in the Live Lineup extension.");
    if (show?.mode === "started" && !value.extensionStatus?.connected) warnings.push("Show started, but your Live Lineup extension isn't connected.");
    optionalText("show-warning", warnings.join(" "));
    const parties = el("parties");
    const nextKey = JSON.stringify([value.parties,value.excludedPartyIds]);
    if (partiesKey !== nextKey) {
      const selectedId = document.activeElement?.dataset.partyId;
      partiesKey = nextKey;
      parties.replaceChildren();
      if (!value.parties.length) {
        const empty = document.createElement("p");
        empty.className = "empty";
        empty.textContent = "No parties detected yet.";
        parties.appendChild(empty);
      } else {
        for (const party of value.parties) parties.appendChild(partyRow(party,value.excludedPartyIds));
        if (selectedId) [...parties.querySelectorAll("input")].find(input=>input.dataset.partyId === selectedId)?.focus();
      }
    }
    for (const box of parties.querySelectorAll("input")) box.disabled = busy;
  }
  async function act(task) {
    if (busy) return;
    busy = true;
    ++renderSequence;
    el("controls").disabled = true;
    setText(el("error"), "");
    try { render(await task()); }
    catch (error) { showError(error); }
    finally {
      busy = false;
      el("controls").disabled = false;
      if (state) render(state);
    }
  }
  function portClosed(error) {
    return /message port closed|receiving end does not exist|channel closed|context invalidated/i.test(error?.message || "");
  }
  el("show-action").addEventListener("click", async event => {
    const command = event.currentTarget.dataset.command;
    if (!state?.showControl || stopBusy || command === "start" && startBusy) return;
    const expectedControlRevision = state.showControl.revision;
    if (command === "stop") stopBusy = true;
    else startBusy = true;
    ++renderSequence;
    setText(el("error"), "");
    render(state);
    try { render(await send({action:"sparkle-v2-" + command,expectedControlRevision},75000)); }
    catch (error) { if (command === "stop" || !portClosed(error)) showError(error); }
    finally {
      if (command === "stop") stopBusy = false;
      else startBusy = false;
      render(state);
      void refresh();
    }
  });
  el("check-update").addEventListener("click", async () => {
    if (checkBusy) return;
    checkBusy = true;
    ++renderSequence;
    if (state) render(state);
    try { render(await send({action:"sparkle-v2-check-update"},75000)); }
    catch (error) { if (!portClosed(error)) showError(error); }
    finally { checkBusy = false; if (state) render(state); }
  });
  el("connect-form").addEventListener("submit", event => {
    event.preventDefault();
    void act(async () => {
      const credential = el("live-code").value.trim().toUpperCase();
      if (!/^[A-Z0-9]{3}-[0-9]{4}$/.test(credential)) throw errorWithCode("invalid_token");
      const result = await send({action:"sparkle-v2-connect",credential});
      el("live-code").value = "";
      return result;
    });
  });
  el("enabled").addEventListener("change", () => {
    const enabled = el("enabled").checked;
    void act(() => send({action:"sparkle-v2-toggle",enabled}));
  });
  el("parties").addEventListener("change", event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.dataset.partyId) return;
    void act(() => send({action:"sparkle-v2-filter",partyId:input.dataset.partyId,included:input.checked}));
  });
  async function refresh() {
    if (busy) return;
    const stamp = ++renderSequence;
    try {
      const value = await send({action:"sparkle-v2-status"});
      if (stamp === renderSequence) render(value);
    } catch (error) {
      if (stamp === renderSequence && !portClosed(error)) showError(error);
    }
  }
  void refresh();
  const interval = setInterval(() => void refresh(), 2000);
  window.addEventListener("pagehide", () => {clearInterval(interval); el("live-code").value = "";});
})();
