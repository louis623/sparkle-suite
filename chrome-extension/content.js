// Sparkle Suite Live Queue — Content Script (read-only DOM scraper)
// Rules: ZERO page refreshes, ZERO DOM writes, ZERO alerts/popups

const EDGE_FUNCTION_URL =
  "https://bqhzfkgkjyuhlsozpylf.supabase.co/functions/v1/live-queue-sync";
const SYNC_KEY = "K7mX9pQrN2vLsT4wHjBdCeF8aYuZgR6n";

const LOG = "[SparkleSync]";
const DEBOUNCE_MS = 3000;
const FETCH_TIMEOUT_MS = 8000;
const TABLE_WAIT_TIMEOUT_MS = 5000;
const TABLE_POLL_MS = 2000;

// ── Cached state ────────────────────────────────────────────────
let cachedTable = null;
let cachedTbody = null;
let firstNameIdx = -1;
let revealedIdx = -1;

let lastQueueHash = "";
let isSyncing = false;
let authFailed = false;
let observer = null;
let debounceTimer = null;
let bodyObserver = null;
let pollTimer = null;

// Settings (cached from storage.sync, updated via onChanged)
let syncCode = "";
let enabled = true;

// ── Helpers ─────────────────────────────────────────────────────

function hashQueue(queue) {
  return JSON.stringify(queue);
}

// ── Table discovery ─────────────────────────────────────────────

function findTargetTable() {
  return document.getElementById("party-order-table");
}

function findColumnIndices(table) {
  var thead = table.querySelector("thead");
  if (!thead) return false;
  var ths = thead.querySelectorAll("th");
  firstNameIdx = -1;
  revealedIdx = -1;
  for (var i = 0; i < ths.length; i++) {
    var sortBy = ths[i].getAttribute("data-sort-by");
    if (sortBy === "FirstName") firstNameIdx = i;
    else if (sortBy === "IsRevealed") revealedIdx = i;
  }
  return firstNameIdx !== -1 && revealedIdx !== -1;
}

// ── Scraper ─────────────────────────────────────────────────────

function scrapeQueue() {
  // Re-validate DOM attachment
  if (!cachedTbody || !cachedTbody.isConnected) {
    cachedTable = findTargetTable();
    if (!cachedTable) return null;
    if (!findColumnIndices(cachedTable)) return null;
    cachedTbody = cachedTable.querySelector("tbody");
    if (observer) observer.disconnect();
    startObserver();
  }

  // Table present but tbody absent — valid empty state
  if (!cachedTbody) return [];

  var rows = cachedTbody.querySelectorAll("tr.product.product-row");
  var names = [];

  for (var i = 0; i < rows.length; i++) {
    var cells = rows[i].querySelectorAll("td");
    if (cells.length <= firstNameIdx || cells.length <= revealedIdx) continue;

    // Check revealed via checkbox
    var checkbox = cells[revealedIdx].querySelector('input[type="checkbox"]');
    if (!checkbox) continue;
    if (checkbox.checked) continue; // already revealed — skip

    var name = cells[firstNameIdx].textContent.trim();
    if (name.length < 2) continue;

    names.push(name);
  }

  // Reverse: oldest unrevealed (currently being unboxed) comes first
  names.reverse();

  return names;
}

// ── Push to edge function ───────────────────────────────────────

function pushQueue(queue) {
  if (isSyncing) return;
  if (!enabled || !syncCode) return;
  if (authFailed) return;

  var qHash = hashQueue(queue);
  if (qHash === lastQueueHash) return;

  isSyncing = true;

  var controller = new AbortController();
  var timeoutId = setTimeout(function () { controller.abort(); }, FETCH_TIMEOUT_MS);

  fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-sync-key": SYNC_KEY,
    },
    body: JSON.stringify({
      sync_code: syncCode,
      queue: queue,
      timestamp: new Date().toISOString(),
    }),
    signal: controller.signal,
  })
    .then(function (response) {
      clearTimeout(timeoutId);
      if (response.ok) {
        lastQueueHash = qHash;
        chrome.storage.local.set({
          lastSyncTime: Date.now(),
          lastSyncStatus: "ok",
        });
        console.log(LOG, "Queue pushed:", queue.length, "items");
      } else if (response.status === 401) {
        authFailed = true;
        chrome.storage.local.set({ lastSyncStatus: "error" });
        console.log(LOG, "Auth failed (401) — syncing paused");
      } else {
        chrome.storage.local.set({ lastSyncStatus: "error" });
        console.log(LOG, "Server error:", response.status);
      }
    })
    .catch(function (err) {
      clearTimeout(timeoutId);
      chrome.storage.local.set({ lastSyncStatus: "error" });
      if (err.name === "AbortError") {
        console.log(LOG, "Request timed out");
      } else {
        console.log(LOG, "Network error:", err.message);
      }
    })
    .finally(function () {
      isSyncing = false;
    });
}

// ── Sync orchestrator ───────────────────────────────────────────

function syncIfNeeded() {
  try {
    var queue = scrapeQueue();
    if (queue === null) return;
    pushQueue(queue);
  } catch (err) {
    console.log(LOG, "Sync error:", err.message);
  }
}

// ── MutationObserver (table rows) ───────────────────────────────

function startObserver() {
  var target = cachedTbody || cachedTable;
  if (!target) return;
  observer = new MutationObserver(function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(syncIfNeeded, DEBOUNCE_MS);
  });
  observer.observe(target, { childList: true, subtree: !cachedTbody, attributes: true, attributeFilter: ["checked"] });
}

// ── Table appearance detection ───────────────────────────────────

function onTableFound(table) {
  // Stop watching for the table
  if (bodyObserver) { bodyObserver.disconnect(); bodyObserver = null; }
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }

  cachedTable = table;
  if (!findColumnIndices(cachedTable)) {
    console.log(LOG, "Table found but required columns (FirstName/IsRevealed) missing");
    return;
  }
  cachedTbody = cachedTable.querySelector("tbody");
  console.log(LOG, "Table found. Column indices — firstName:", firstNameIdx, "revealed:", revealedIdx);
  startObserver();
  syncIfNeeded();
}

function startTableWatcher() {
  // Primary: MutationObserver on document.body
  var timedOut = false;

  bodyObserver = new MutationObserver(function () {
    if (timedOut) return;
    var table = findTargetTable();
    if (table) {
      timedOut = true; // prevent double-trigger
      onTableFound(table);
    }
  });
  bodyObserver.observe(document.body, { childList: true, subtree: true });

  // Fallback: if not detected within 5s, switch to 2s polling
  setTimeout(function () {
    if (cachedTable) return; // already found
    timedOut = true;
    if (bodyObserver) { bodyObserver.disconnect(); bodyObserver = null; }
    console.log(LOG, "MutationObserver timed out — falling back to 2s polling");

    pollTimer = setInterval(function () {
      var table = findTargetTable();
      if (table) {
        onTableFound(table);
      }
    }, TABLE_POLL_MS);
  }, TABLE_WAIT_TIMEOUT_MS);
}

// ── Init ────────────────────────────────────────────────────────

function init() {
  chrome.storage.sync.get(["sync_code", "enabled"], function (data) {
    syncCode = data.sync_code || "";
    enabled = data.enabled !== false;
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === "sync") {
      if (changes.sync_code) syncCode = changes.sync_code.newValue || "";
      if (changes.enabled !== undefined) {
        enabled = changes.enabled.newValue !== false;
        if (enabled) authFailed = false;
      }
    }
  });

  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg && msg.action === "trigger-sync") {
      syncIfNeeded();
    }
  });

  // Check if table is already in the DOM (e.g. fast load or cached page)
  var existing = findTargetTable();
  if (existing) {
    onTableFound(existing);
  } else {
    startTableWatcher();
  }
}

// Entry point
init();
