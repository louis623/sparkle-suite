// Sparkle Suite Live Queue — Content Script (read-only DOM scraper)
// Rules: ZERO page refreshes, ZERO DOM writes, ZERO alerts/popups

const EDGE_FUNCTION_URL =
  "https://bqhzfkgkjyuhlsozpylf.supabase.co/functions/v1/live-queue-sync";
const SYNC_KEY = "K7mX9pQrN2vLsT4wHjBdCeF8aYuZgR6n";

const LOG = "[SparkleSync]";
const DEBOUNCE_MS = 3000;
const FETCH_TIMEOUT_MS = 8000;

// ── Cached state ────────────────────────────────────────────────
let cachedTable = null;
let cachedTbody = null;
let firstNameIdx = -1;
let revealedIdx = -1;
let orderDateIdx = -1;
let statusIdx = -1;
let hasOrderDateCol = false;

let lastQueueHash = "";
let isSyncing = false;
let authFailed = false;
let observer = null;
let debounceTimer = null;
let tableRetryTimer = null;

// Settings (cached from storage.sync, updated via onChanged)
let syncCode = "";
let enabled = true;

// ── Helpers ─────────────────────────────────────────────────────

function normalizeHeader(cell) {
  return (cell.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function hashQueue(queue) {
  return JSON.stringify(queue);
}

// ── Table discovery ─────────────────────────────────────────────

function findTargetTable() {
  // Primary: find by known ID
  var byId = document.getElementById("party-order-table");
  if (byId) return byId;

  // Fallback: table inside div.table-responsive
  var container = document.querySelector("div.table-responsive");
  if (container) {
    var nested = container.querySelector("table");
    if (nested) return nested;
  }

  // Last resort: header-text scan
  var tables = document.querySelectorAll("table");
  for (var i = 0; i < tables.length; i++) {
    var thead = tables[i].querySelector("thead");
    if (!thead) continue;
    var ths = thead.querySelectorAll("th");
    var hasFirstName = false;
    var hasRevealed = false;
    for (var j = 0; j < ths.length; j++) {
      var h = normalizeHeader(ths[j]);
      if (h === "first name") hasFirstName = true;
      if (h === "revealed") hasRevealed = true;
    }
    if (hasFirstName && hasRevealed) return tables[i];
  }
  return null;
}

function findColumnIndices(table) {
  var thead = table.querySelector("thead");
  if (!thead) return false;
  var ths = thead.querySelectorAll("th");
  firstNameIdx = -1;
  revealedIdx = -1;
  orderDateIdx = -1;
  statusIdx = -1;
  hasOrderDateCol = false;
  for (var i = 0; i < ths.length; i++) {
    var h = normalizeHeader(ths[i]);
    if (h === "first name") firstNameIdx = i;
    else if (h === "revealed") revealedIdx = i;
    else if (h === "order date") { orderDateIdx = i; hasOrderDateCol = true; }
    else if (h === "order id") {
      if (orderDateIdx === -1) { orderDateIdx = i; hasOrderDateCol = true; }
    }
    else if (h === "status") statusIdx = i;
  }
  return firstNameIdx !== -1 && revealedIdx !== -1;
}

// ── Revealed detection (multi-pattern) ──────────────────────────

function isRevealed(cell) {
  // Pattern 1: native checkbox
  var checkbox = cell.querySelector('input[type="checkbox"]');
  if (checkbox) return checkbox.checked;

  // Pattern 2: ARIA checkbox
  var ariaEl = cell.querySelector('[role="checkbox"]');
  if (ariaEl) return ariaEl.getAttribute("aria-checked") === "true";

  // Pattern 3: checkmark characters
  var text = cell.textContent || "";
  if (/[✓✔☑]/.test(text)) return true;

  // Pattern 4: class-based
  var classes = (cell.className || "") + " ";
  var children = cell.querySelectorAll("*");
  for (var i = 0; i < children.length; i++) {
    classes += (children[i].className || "") + " ";
  }
  classes = classes.toLowerCase();
  if (classes.indexOf("checked") !== -1 || classes.indexOf("revealed") !== -1) return true;

  // Default: not revealed → include in queue (safe default)
  return false;
}

// ── Scraper ─────────────────────────────────────────────────────

function scrapeQueue() {
  // Re-validate DOM attachment
  if (!cachedTbody || !cachedTbody.isConnected) {
    cachedTable = findTargetTable();
    if (!cachedTable) return null;
    if (!findColumnIndices(cachedTable)) return null;
    cachedTbody = cachedTable.querySelector("tbody");
    // Re-attach observer to new tbody (or table if tbody still absent)
    if (observer) observer.disconnect();
    startObserver();
  }

  // Table present but tbody absent — valid empty state
  if (!cachedTbody) return [];

  var rows = cachedTbody.querySelectorAll("tr");
  var entries = [];

  for (var i = 0; i < rows.length; i++) {
    var cells = rows[i].querySelectorAll("td");
    if (cells.length <= firstNameIdx || cells.length <= revealedIdx) continue;

    // Skip revealed items
    if (isRevealed(cells[revealedIdx])) continue;

    // Skip canceled/refunded (if status column exists)
    if (statusIdx !== -1 && cells.length > statusIdx) {
      var st = (cells[statusIdx].textContent || "").trim().toLowerCase();
      if (st === "canceled" || st === "cancelled" || st === "refunded") continue;
    }

    var name = (cells[firstNameIdx].textContent || "").trim();

    // Skip empty or too-short names
    if (name.length < 2) continue;

    var sortKey;
    if (hasOrderDateCol && orderDateIdx !== -1 && cells.length > orderDateIdx) {
      sortKey = (cells[orderDateIdx].textContent || "").trim();
    } else {
      sortKey = String(i).padStart(6, "0");
    }

    entries.push({ name: name, sortKey: sortKey, idx: i });
  }

  // Sort by sortKey ascending (oldest first)
  if (hasOrderDateCol) {
    entries.sort(function (a, b) {
      return a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0;
    });
  } else {
    // No date column — reverse DOM order (assumes newest-first display)
    entries.reverse();
  }

  // Deduplicate by name (keep first occurrence after sort)
  var seen = {};
  var queue = [];
  for (var j = 0; j < entries.length; j++) {
    var n = entries[j].name;
    if (!seen[n]) {
      seen[n] = true;
      queue.push(n);
    }
  }

  return queue;
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

// ── MutationObserver ────────────────────────────────────────────

function startObserver() {
  var target = cachedTbody || cachedTable;
  if (!target) return;
  observer = new MutationObserver(function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(syncIfNeeded, DEBOUNCE_MS);
  });
  // If watching the full table (no tbody yet), use subtree to catch row additions
  observer.observe(target, { childList: true, subtree: !cachedTbody });
}

// ── Init ────────────────────────────────────────────────────────

function init() {
  // Load settings from storage.sync (one-time read, then listen for changes)
  chrome.storage.sync.get(["sync_code", "enabled"], function (data) {
    syncCode = data.sync_code || "";
    enabled = data.enabled !== false; // default true
  });

  // Listen for settings changes from popup
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === "sync") {
      if (changes.sync_code) syncCode = changes.sync_code.newValue || "";
      if (changes.enabled !== undefined) {
        enabled = changes.enabled.newValue !== false;
        // Reset auth failure flag when re-enabled
        if (enabled) authFailed = false;
      }
    }
  });

  // Listen for alarm-triggered sync from background.js
  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg && msg.action === "trigger-sync") {
      syncIfNeeded();
    }
  });

  // Find and attach to the table
  attemptTableDiscovery();
}

function attemptTableDiscovery() {
  cachedTable = findTargetTable();
  if (cachedTable && findColumnIndices(cachedTable)) {
    // tbody may be absent or empty — both are valid; observer covers future rows
    cachedTbody = cachedTable.querySelector("tbody");
    console.log(LOG, "Table found. Columns:", {
      firstName: firstNameIdx,
      revealed: revealedIdx,
      orderDate: orderDateIdx,
      status: statusIdx,
    });
    startObserver();
    syncIfNeeded(); // Initial sync — pushes [] if no rows yet
    return;
  }

  // Table or required columns not ready — keep retrying every 30s indefinitely
  console.log(LOG, "Table not found, retrying in 30s…");
  tableRetryTimer = setTimeout(attemptTableDiscovery, 30000);
}

// Entry point
init();
