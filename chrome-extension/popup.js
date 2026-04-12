// Sparkle Suite Live Queue — Popup UI

var setupView = document.getElementById("setup-view");
var activeView = document.getElementById("active-view");
var syncInput = document.getElementById("sync-input");
var setupError = document.getElementById("setup-error");
var saveBtn = document.getElementById("save-btn");
var displayCode = document.getElementById("display-code");
var toggleEnabled = document.getElementById("toggle-enabled");
var statusDot = document.getElementById("status-dot");
var statusText = document.getElementById("status-text");
var resetLink = document.getElementById("reset-link");

var CODE_PATTERN = /^[A-Z]{3}-\d{4}$/;

function showSetup() {
  setupView.classList.remove("hidden");
  activeView.classList.add("hidden");
  syncInput.value = "";
  setupError.textContent = "";
}

function showActive(code) {
  setupView.classList.add("hidden");
  activeView.classList.remove("hidden");
  displayCode.textContent = code;
}

function updateStatus() {
  var isOn = toggleEnabled.checked;
  if (!isOn) {
    statusDot.className = "dot";
    statusText.textContent = "Paused";
    return;
  }
  chrome.storage.local.get(["lastSyncStatus"], function (data) {
    statusDot.className = "dot";
    if (data.lastSyncStatus === "error") {
      statusDot.classList.add("red");
      statusText.textContent = "Error";
    } else {
      statusDot.classList.add("green");
      statusText.textContent = "Connected";
    }
  });
}

// Load initial state
chrome.storage.sync.get(["sync_code", "enabled"], function (data) {
  if (data.sync_code) {
    showActive(data.sync_code);
    toggleEnabled.checked = data.enabled !== false;
    updateStatus();
  } else {
    showSetup();
  }
});

// Save button
saveBtn.addEventListener("click", function () {
  var val = syncInput.value.trim().toUpperCase();
  if (!CODE_PATTERN.test(val)) {
    setupError.textContent = "Format: 3 letters, dash, 4 digits (e.g. MHF-7342)";
    return;
  }
  chrome.storage.sync.set({ sync_code: val, enabled: true }, function () {
    showActive(val);
    toggleEnabled.checked = true;
    updateStatus();
  });
});

// Allow Enter key to save
syncInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") saveBtn.click();
});

// Toggle
toggleEnabled.addEventListener("change", function () {
  chrome.storage.sync.set({ enabled: toggleEnabled.checked });
  updateStatus();
});

// React to sync status changes from content script
chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === "local" && changes.lastSyncStatus) {
    updateStatus();
  }
});

// Reset
resetLink.addEventListener("click", function (e) {
  e.preventDefault();
  chrome.storage.sync.remove(["sync_code", "enabled"]);
  chrome.storage.local.remove(["lastSyncTime", "lastSyncStatus"]);
  showSetup();
});
