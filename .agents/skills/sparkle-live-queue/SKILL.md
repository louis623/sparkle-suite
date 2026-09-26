---
name: sparkle-live-queue
description: "Use this skill whenever working on the Sparkle Suite Live Queue Chrome extension — the Bomb Party dashboard scraper that pushes reveal queue data to Supabase. Triggers include: any work in the /chrome-extension/ directory, any mention of 'live queue', 'live reveal', 'bomb party scraper', 'party orders', 'reveal queue', 'sparkle sync', or 'chrome extension' in the context of Sparkle Suite. Also use when debugging sync issues, modifying the content script, updating the popup UI, changing the Edge Function, or preparing for Chrome Web Store submission. This skill contains the exact HTML structure of the Bomb Party dashboard (confirmed April 2026), architectural decisions, and three absolute safety rules that must never be violated. ALWAYS read this skill before making any change to the extension code."
---

# Sparkle Suite Live Queue — Chrome Extension Skill

## What This Extension Does

Scrapes the Bomb Party "Party Orders" dashboard and pushes the live reveal queue to each rep's Sparkle Suite website via Supabase. Used during live jewelry reveal shows where 300+ customers may be watching.

**Data flow:** Chrome extension (reads BP table) → Supabase Edge Function → live_queue table → Website (Supabase Realtime subscription)

**Repo location:** neon-rabbit-core repo, /chrome-extension/ directory

---

## Three Absolute Rules — NEVER VIOLATE

Every build, every fix, every change MUST comply. Verify after every modification.

1. NEVER refresh the Bomb Party page — no window.location.reload(), no location.href, no location.replace(). The extension only READS.
2. NEVER modify the DOM — no createElement, no appendChild, no innerHTML writes, no style changes, no injected elements.
3. NEVER show alerts or popups — no alert(), confirm(), prompt(). All errors logged silently to console.log.

Mandatory verification after every change to content.js:
grep -n "reload\|location\.reload\|location\.href\|location\.replace" chrome-extension/content.js
grep -n "document\.createElement\|appendChild\|innerHTML\|insertAdjacentHTML" chrome-extension/content.js
grep -n "alert(\|confirm(\|prompt(" chrome-extension/content.js
All must return zero results.

---

## Known Past Incidents

| # | What Happened | Root Cause | Prevention |
|---|--------------|-----------|------------|
| 001 | Browser refresh loop during live show (300+ viewers) | window.location.reload() on 2-min timer | Rule 1 — zero reload calls |
| 002 | Rep name appeared in queue | Wrong data scraped | Scrape First Name column only |
| 003 | MutationObserver infinite loop crashed browser | Observer too broadly scoped | Observer on tbody only + zero DOM mods |
| 004 | Table not found despite table existing | th.textContent included dropdown text | Use data-sort-by attributes |
| 005 | Table not found on initial load | BP renders table via JS after page load | MutationObserver on document.body + polling |

---

## Bomb Party Dashboard HTML Structure

CONFIRMED: April 10, 2026. This is the source of truth.

URL: https://myoffice.bombparty.com/live-party-orders

CRITICAL: Table loads dynamically via JavaScript AFTER initial page render. A spinner appears briefly before the table data renders. Never assume the table exists at document_idle.

### Table Element

The table lives inside a div.table-responsive wrapper:
- Table ID: party-order-table
- Table class: table
- Find by: document.getElementById("party-order-table")

### Header Structure — USE data-sort-by, NOT textContent

Each th contains dropdown menus with "Ascending" / "Descending" text. Using th.textContent returns garbage like "First Name Ascending Descending". Use the data-sort-by attribute instead.

Example th structure:
- th has class "table-header-with-dropdown" and attribute data-sort-by="FirstName"
- Inside: div.header-content containing a span with the column name
- Inside: div.header-dropdown-menu with sort options (this is why textContent fails)

Column detection — match by data-sort-by attribute:
- data-sort-by="FirstName" → SCRAPE THIS (first name of customer)
- data-sort-by="IsRevealed" → CHECK THIS (revealed checkbox)
- data-sort-by="OrderID" → Order ID
- data-sort-by="OrderDate" → Order Date
- data-sort-by="LastName" → Last Name
- data-sort-by="PartyID" → Party ID
- data-sort-by="PartyOrderStatusID" → Status
- data-sort-by="Notes" → Notes

### Data Row Structure

Each order is a tr with classes "product product-row" and attributes data-partyid and data-orderid.

Cells in order:
- td: Order ID (contains an anchor link)
- td.order-date-cell: Order Date with data-order-utc-ms attribute
- td: First Name (plain text, HAS WHITESPACE — must trim)
- td: Last Name (plain text)
- td: Party ID (contains anchor link)
- td: Status (contains span.status-badge)
- td.text-center: Revealed checkbox — input[type="checkbox"].checkbox-small with checked="checked" and id="isrevealed-{ORDERID}"
- td: Notes
- td: Edit/Cancel buttons

### Revealed Checkbox

- checked="checked" attribute present → REVEALED → skip this row
- No checked attribute → NOT REVEALED → add to queue
- JavaScript: element.checked === true or element.checked === false

### Queue Building Logic (Inverted List)

1. Table shows newest orders at TOP, oldest at BOTTOM
2. Get all tr.product.product-row from tbody
3. For each row: cells[firstNameIdx].textContent.trim() = name
4. For each row: cells[revealedIdx].querySelector('input[type="checkbox"]').checked = status
5. Collect names where checked === false
6. REVERSE the list — oldest unrevealed first
7. queue[0] = "Currently Unboxing", queue[1] = on deck, etc.

### Empty Table State

When no orders exist: table element exists but tbody has no tr.product rows. Shows "There are no matching results." Push empty array [].

---

## Extension Architecture

### File Structure

/chrome-extension/ contains:
- manifest.json — Manifest V3
- content.js — BP scraper (the critical file)
- popup.html, popup.js, popup.css — Popup UI
- background.js — Service worker (60s alarm)
- icons/ — 16, 48, 128px icons

### content.js Key Patterns

Table discovery: MutationObserver on document.body watches for #party-order-table. Polling fallback every 2 seconds. Never stops retrying.

Column detection: Loop through th elements, match data-sort-by attribute values.

Sync trigger: MutationObserver on tbody with 2-second debounce. Backup: 60-second alarm from service worker.

Data push: POST to Edge Function with { sync_code, queue, timestamp } and x-sync-key header. Silent failure on errors.

Constants at top of content.js: EDGE_FUNCTION_URL and SYNC_KEY.

### Popup UI

First-time: sync code input + save. After setup: sync code display, on/off toggle, last sync time, status dot (green/yellow/red), reset link. State in chrome.storage.sync.

---

## Supabase Components

Project: neon-rabbit-core (ref: bqhzfkgkjyuhlsozpylf)

live_queue table: id (uuid PK), rep_id (uuid), sync_code (text unique), queue (jsonb), last_updated (timestamptz), created_at (timestamptz). RLS: public read, service-role write. Realtime enabled.

Edge Function live-queue-sync: POST with x-sync-key header. Body: { sync_code, queue, timestamp }. Validates key, looks up sync_code, upserts queue + last_updated.

---

## Debugging Checklist

1. Console shows "Table not found" → BP changed HTML. Run: copy(document.getElementById("party-order-table").outerHTML) in console, update detection logic.
2. Console shows fetch errors → Check Edge Function in Supabase dashboard.
3. Green dot but no data in Supabase → Sync code mismatch between popup and live_queue table.
4. Data in Supabase but website not updating → Check Realtime enabled on live_queue table.
5. Wrong names or order → Check column indices and reverse logic.

---

## Rebuild From Scratch

1. Read this entire SKILL.md first
2. Create /chrome-extension/ in neon-rabbit-core repo
3. Build against the BP HTML structure documented above
4. Use data-sort-by attributes — NEVER textContent on th elements
5. Use MutationObserver on document.body for table discovery
6. Verify Three Absolute Rules after build
7. Test on Lindsey's BP dashboard (Louis has access)
8. Codex adversarial review, then Smoke-installed validation before any Store release. Canonical playbook: Core Memory `skills/sparkle-smoke-ship.md`.

---

## Standing Rules

Main branch only. Regenerate CODEBASE_SNAPSHOT.md at end of every session. Commit and push. A push is not a Store publish and not a live Suite promote.

## Chrome Web Store Release Checklist

Repo-complete is not Web-Store-complete. Chrome Web Store publish stays gated. Package and review are fine; auto-publish stays off until Louis says go. Canonical playbook: Core Memory `skills/sparkle-smoke-ship.md`.

1. Bump `chrome-extension/manifest.json` version.
2. Package a new zip from `/chrome-extension/`.
3. Verify the zip contains every changed extension file, including helper scripts such as `queue-filter.js`.
4. Run the Live Queue tests and the three content-script safety scans above.
5. Validate the unpacked or sideloaded build on Smoke (Smoke URLs once they exist). Do not upload to the Store from a merge.
6. Wait for Louis to approve that one Store release. Same-day Store publish only when he explicitly says so.
7. Upload the package to the existing Chrome Web Store item, not a new listing. Submit that one release.
8. Record the submitted version and review status in Open Brain / NR HQ.
9. After approval, verify from a real Web Store-installed copy, not only the repo or an unpacked build.
10. Keep an emergency unpacked-install zip ready for live-show incidents while Chrome Web Store review is pending.

Lesson source: May 18, 2026 Brittany Party Filter incident. The repo had Party Filter support from May 11, but the Web Store package still served the pre-filter `1.0.0` build until the `1.0.1` update was submitted.
