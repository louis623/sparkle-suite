# Live Lineup / Live Queue 2.0.4 — agent-owned smoke readiness

**When:** 2026-09-17 ~4:35pm ET  
**Owner of this gate:** agent (no Louis GUI)  
**PR:** https://github.com/louis623/sparkle-suite/pull/1  
**Branch / SHA:** `cursor/live-queue-party-detection-8648` @ `30ecfa743f8ec72faefdbcede31ff53d31148c70`

## Verdict

**READY for Louis-only next steps** (real Bomb Party Live Party Orders sideload + Chrome Web Store upload/review).  
Agent-owned gates are green. No Store upload and no Sparkle Suite production deploy were performed.

## Package identity

| Field | Value |
|-------|-------|
| Artifact | `dist/sparkle-suite-live-lineup-2.0.4.zip` (also `/workspace/live-lineup-2.0.4/sparkle-suite-live-lineup-2.0.4.zip`) |
| Bytes | 16999 |
| SHA-256 | `961bffd3d6b512cc8fc1e03f59976b71f7e57c8d82932b003ce1be0ab6e7e6cc` |
| Manifest version | `2.0.4` |
| Inventory | 12 allowlisted files (matches `tests/manifests/sparkle-live-lineup-extension-package.txt`) |

Workspace zip SHA matches PR `dist/` zip SHA (byte-identical).

## Agent gates run (this session)

1. **Official ZIP verifier** — `node scripts/verify-live-lineup-extension-package.mjs --archive=dist/sparkle-suite-live-lineup-2.0.4.zip --inventory=tests/manifests/sparkle-live-lineup-extension-package.txt --source-dir=chrome-extension --expected-version=2.0.4` → PASS (bytes match reviewed `chrome-extension/` sources).
2. **Focused Vitest** — `live-lineup-queue-parser`, `live-lineup-extension-package`, `live-queue-party-filter`, `live-lineup-extension-app-e2e` → **4 files / 22 tests PASS**.
3. **Worker contract** — `tests/sparkle-extension-worker-v2.test.cjs` → PASS (incl. last-known party retention on invalid parse).
4. **Content-script safety scan** — no `location.reload`, DOM writes (`innerHTML`/`document.write`/etc.), `eval`, dialogs, or page `fetch`/`XHR` in `content.js` / `queue-parser.js`.
5. **Regression coverage confirmed in tests** — empty/missing `data-orderid`/`data-partyid` + visible cell text; attr preference; per-row skip; mixed attr+cell tables; invalid-not-ready-empty; last-known retention.
6. **Public CWS listing check (read-only)** — Chrome Web Store still serves **2.0.3** for Sparkle Suite Live Queue (`kmodgfffflplfdlkkhadgimmobplhoih`). 2.0.4 is **not** published.

## What this does / does not prove

**Proves (agent-owned):**
- 2.0.4 package is Store-shaped, inventory-clean, and byte-matches reviewed sources.
- Parser restores 1.0.1-style cell-text fallback and per-row skip (the Lindsey “visible Party ID, empty attrs” failure mode).
- Worker keeps last-known parties on invalid parse; extension→app E2E + package/filter gates green.
- Content script remains read-only toward Bomb Party DOM.

**Does not prove (Louis / human GUI still required):**
- Sideload on a **real** Bomb Party Live Party Orders page with a live party table.
- Permanent Live Queue code entry (e.g. Lindsey MHF-9446) on a human Chrome profile.
- Chrome Web Store upload / review / publish (auto-publish must stay OFF unless Louis says otherwise).
- Production Sparkle Suite deploy (out of scope; not claimed).

## Louis-only next checklist (not started)

1. Sideload `sparkle-suite-live-lineup-2.0.4.zip` (or Load unpacked from PR `chrome-extension/`) on a real Live Party Orders tab.
2. Confirm parties visible in BP appear in the popup (not stuck on “Waiting for Party Orders” / “No parties detected yet”).
3. Confirm saved code / on-off / checkboxes unchanged.
4. Only then: CWS upload of this exact SHA package for review.

## Explicit non-actions this session

- No Chrome Web Store upload
- No Sparkle Suite production deploy
- No merge of PR #1
- No Louis GUI / no real Bomb Party session used

"Receipt stamped: 2026-09-17 20:34:21 UTC"
961bffd3d6b512cc8fc1e03f59976b71f7e57c8d82932b003ce1be0ab6e7e6cc  sparkle-suite-live-lineup-2.0.4.zip
Receipt stamped: 2026-09-17 04:35:24 PM ET
