# Live Lineup / Live Queue — Living Status (canonical draft)

**Owner:** Live Lineup Watch (study + report; no ship without Louis OK)  
**Audience:** Louis, Sam, Codex, Rocky, Live Lineup Watch  
**Last updated:** 2026-09-26 ~11:00am ET  
**Draft location:** `/workspace/live-lineup-watch/LIVE-LINEUP-STATUS.md` (this machine first)  
**Git home:** `vault/LIVE-LINEUP-STATUS.md` on `louis623/sparkle-suite` tip `codex/nic-nac-trade-hardening` via **PR #15** (https://github.com/louis623/sparkle-suite/pull/15) — **still open / not merged as of 2026-09-26 ~11am ET**; read from PR head until merged. Steward: Live Lineup Watch (Codex is READ-ONLY on this file).  
**Companion:** `LIVE-LINEUP-STATUS-SOURCES.md` (every vault path + Open Brain themes used)

> Louis’s bar: this is a huge headache. The doc must have a **sound, detailed history** — not a skim. Agents without a living status file will contradict each other.

---

## A. Purpose + how to use this doc

### What this file is
This is the **canonical living status** for Sparkle Suite **Live Lineup** (customer product name) and **Live Queue** (Chrome extension / Workspace code branding). It is the single place Louis, Sam, Codex, Rocky, and Live Lineup Watch should trust when answering:

- What are reps actually running?
- What does tip Git say?
- What broke, what we learned, what shipped?
- What is safe mid-show vs what is parked?

Dated vault closeouts under `vault/` remain **historical snapshots**. Open Brain remains the **diary**. This file is the **living operator/agent summary** that stitches both without inventing.

### How to use it
1. **Before any Live Lineup / extension / CWS / deploy talk:** read §C (build matrix) and §D (operating behavior) first.
2. **Before diagnosing an incident:** read §I (playbooks), then the matching dated section in §F.
3. **Before claiming “tip has the fix”:** verify package **SHA-256**, not version string alone. **Never claim tip == Store.**
4. **Before changing this file:** append a line to §K (changelog of THIS status file) with date (ET) and what changed.

### Update rules
| Who | May update | Must not |
|-----|------------|----------|
| Live Lineup Watch | Facts, history synthesis, incident classification, backlog status | Ship CWS, start Codex, deploy Suite, mutate queues, edit extension packages |
| Codex / Cursor (Sam) | After a verified ship or diagnosed incident: dated facts + SHAs | Treat this draft as substitute for vault closeout; omit SHA when known |
| Rocky | Adversarial corrections (mark **Corrected:**) | Soften mid-show safety rules |
| Louis | Overrides any agent claim | — |

### Code tip branch lock (standing 2026-09-20)
- **Shared source of truth:** GitHub `louis623/sparkle-suite` branch **`codex/nic-nac-trade-hardening`**
- Before every Codex session: pull that tip (after dirty-checkout safety), then build → push → deploy only as authorized
- Cursor/Sam land and deploy from the **same** tip
- Reviews and packages must use **tip SHA** or **SHA-verified ZIP** — never stale local paths or “Version X” alone
- `neon-rabbit-hq` / Git Vault notes = agent notes only, **not** Suite application code
- Push = provenance only; production = manual Vercel of exact verified SHA + live-domain verify
- Live Lineup extension work = Codespace-only or SHA-verified ZIP, Louis-authorized, **no-show-window** gated

Sticky checklist: Desktop `CODEX-SESSION-START-STICKY.txt` (also mirrored in Open Brain 2026-09-20 standing notes).

### Binder safety (`LIVE_EXTENSION_SAFETY.md`)
Do **not** touch CWS, extension code, packaging, or live ZIPs from a local binder. Authorized Codespace + Louis OK only.

---

## B. Glossary

| Term | Plain English | Shop talk |
|------|---------------|-----------|
| **Live Lineup** | What customers see on a rep’s Sparkle Suite site: who is up next in the Bomb Party unboxing, with position numbers and first names. Preferred customer/rep product name. | Public projection of `live_lineup_states` (names/positions/status only). |
| **Live Queue** | The Chrome extension’s store name and the Workspace label for the connection code. CWS title: “Sparkle Suite Live Queue.” Popup asks for “Live Queue code.” | MV3 extension under `chrome-extension/`; publish client. |
| **Party Orders** | Bomb Party’s live orders table the extension reads. | `https://myoffice.bombparty.com/live-party-orders` — `#party-order-table`. |
| **Party / Party ID** | A Bomb Party “party” (show/preorder session). Multiple parties can appear in one table. Reps can uncheck parties they do not want on the public lineup. | `partyId`; exclusions in `excludedPartyIds`. |
| **Publisher** | The one extension instance allowed to send lineup updates to Suite right now. | Holds a server **lease**; POSTs to `/api/live-lineup/publish`. |
| **Lease** | A short-lived “you may publish” lock so two tabs/computers cannot silently overwrite each other. | ~≤90s client-validated window; claim/renew via publisher sync. |
| **Generation / show** | The server’s numbered show session. Old packets from a previous show must not resume into a newer show. | `generation`; packets must match. |
| **Sequence / epoch** | Ordered packet numbers so restarts and lost acks do not scramble state. | Monotonic `sequence`; server time authoritative. |
| **Ready / partial / loading / invalid** | How sure the extension is that it correctly read the Bomb Party table. Only a clean **ready** read should be trusted as current source truth. | `ParserState`: `ready` \| `loading` \| `partial` \| `invalid`. |
| **Snapshot / heartbeat** | Sending the current lineup (or an ack that “nothing changed but I’m still alive”). Quiet shows still need heartbeats. | `SourcePacket` + ready acks independent of name-array changes. |
| **Configure** | Telling the server which parties are in scope for this show. | Publish action `configure`; must not run ahead of a valid lease on 2.0.4 reconnect paths. |
| **Describe / claim** | Ask the server what show/parties look like; then claim the publisher role. | `describe` → `claim` → sync → (then) `configure` when scope changes. |
| **Workspace Live Lineup card** | The compact tool in the rep’s Sparkle Suite Workspace for connection status, reorder, and (in the full tool) Hold/Reveal/show controls. | `LiveLineupCard.tsx` + related components under `app/nic-nac/components/`. |
| **Sync / Live Queue code** | The short code the rep pastes into the extension once (Workspace-assigned). Pattern like `ABC-1234` / `MHF-####`. Do **not** paste full live codes into shared docs. | Assigned workspace-code publisher; optional durable `sslp_…` token path exists server-side. |
| **CWS** | Chrome Web Store. Unlisted listing for the extension. | Item id `kmodgfffflplfdlkkhadgimmobplhoih`. |
| **Tip** | Latest commit on the shared Git branch. | **Not** what every rep’s Chrome has installed. |
| **SHA-verified ZIP** | The exact extension package identified by its file hash. Prefer this over “version 2.0.x” claims. | e.g. known-good 2.0.4 SHA-256 `961bffd3…`. |

### Absolute extension safety rules (never bend mid-show)
1. **Never refresh or navigate** the Bomb Party page (historical Brittany refresh-loop trauma).
2. **Never modify** the Bomb Party DOM (MutationObserver feedback / crash risk).
3. **Never** call `alert` / `confirm` / `prompt` (blocks the rep mid-show).

---

## C. Current build matrix (as of 2026-09-26 ET)

**Uncertainty flags:** `[verified]` = checked against a named source this week; `[ops]` = operator/Open Brain confirmation; `[uncertain]` = not re-verified in this draft pass; `[parked]` = not shipped.

| Layer | State | Dates / IDs | Flag |
|-------|--------|-------------|------|
| **CWS public listing** | Version **2.0.4**, unlisted item `kmodgfffflplfdlkkhadgimmobplhoih`, ~21.22 KiB | Updated **Sep 17 2026** (public page fetch ~Sep 18 ~10:40am ET, Sam confirmed) | `[ops]` |
| **Known-good 2.0.4 package** | Soft cell-text fallback for missing `data-orderid` / `data-partyid`; **per-row skip** (not fail-closed whole table) | SHA-256 **`961bffd3d6b512cc8fc1e03f59976b71f7e57c8d82932b003ce1be0ab6e7e6cc`** (16999 bytes). On Louis PC historically: `Downloads\sparkle-suite-live-lineup-2.0.4.zip`. Also on this box: `/workspace/live-lineup-2.0.4/…` | `[verified]` local ZIP SHA 2026-09-20 |
| **2.0.4 Git line (Codex/PR)** | Party-detection soft fallback branch | PR #1 historically open on `cursor/live-queue-party-detection-8648` @ `30ecfa743f8ec72faefdbcede31ff53d31148c70` (agent smoke 2026-09-17). Older notes also cite `d1865fa` — **short SHA may not resolve from all tools**; prefer package SHA. | `[ops]` / `[uncertain]` whether PR merged into tip |
| **Shared tip branch manifest** | Still **`2.0.3`** | `louis623/sparkle-suite` @ `codex/nic-nac-trade-hardening` — `chrome-extension/manifest.json` confirmed via GitHub MCP **2026-09-20** (and local deploy tree). Tip parser historically **fail-closed** on empty identity attrs until 2.0.4 line lands. | `[verified]` |
| **Tip soft-fallback in SW** | Tip `background.js` has a soft path: if inspect returns no parties but `descriptor.generation > 0` and prior session parties exist, re-adopt prior parties and still `read()` | Present in tip study notes (EXPERT-BRIEF 2026-09-18). **Not the same claim as “tip == Store 2.0.4.”** Store 2.0.4’s headline fix is **queue-parser cell-text fallback**. | `[ops]` |
| **Temp server fix (Sep 19)** | Premature `configure` without lease for **workspace-code** publishers returns unchanged read-only descriptor so 2.0.4 can reclaim lease | Commit **`49037082c2ac29cacba904b4b2852795e962c23e`**; deploy **`dpl_8w2U1zZTnVJjUyZiG3Cm3T97eDzW`** | `[ops]` Open Brain + incident note |
| **Permanent extension fix** | **2.0.5 planned** — claim/renew lease + snapshot **before** configure | Not shipped. CWS only in no-show window + Louis OK. Overnight planning active 2026-09-26; **no build** until HOLD cleared + Louis go. | `[parked]` |
| **Tip pin (overnight review)** | Shared tip HEAD reviewed by Codex HOLD | `4a679d751f7519de2396da89b03ba8de1ddfe140` on `codex/nic-nac-trade-hardening` (2026-09-26). Manifest still **2.0.3**. Re-pin at build time. | `[verified]` GitHub 2026-09-26 |
| **Overnight ship gate** | Codex **HOLD-PLAN** on Live Lineup v3 | Addendum: `/workspace/ll-overnight/LIVE-LINEUP-V3-CODEX-HOLD-ADDENDUM-2026-09-26.md`. Reliability-first; surname/public deferred until acceptance sequences answered. Watch stamped 2026-09-26. | `[ops]` |
| **Emergency 1.0.1 ZIP (retained)** | Pre-2.0 fleet fallback | SHA-256 `05e0e8d4c652dc6391522046d67abba3b1a3ed36ea127ba9511d7aa8b4dc0a0b` | `[verified]` in Sep 15 vault |
| **Extension 2.0.0 Store ZIP (historical)** | First Live Lineup 2 Store package | SHA-256 `24c28df76ee5caeaa4bc08233213c5c8d0af7004b08d0b95b19274059057c129` | `[verified]` in Sep 15 vault |

### Standing rule (matrix)
**Version string ≠ tip bytes ≠ installed Chrome copy.** Prefer: (1) public CWS page, (2) `chrome://extensions` on the rep machine, (3) SHA of the ZIP that was submitted. Auto-publish has been kept **OFF** for recent uploads — Google approval ≠ Louis publish.

---

## D. Current operating behavior

### Intended fail-safe (Workspace) — “not connected but still showing names”
When the extension cannot send a clean **ready** Bomb Party read (partial / not-ready / not connected):

1. Suite **keeps showing the last known lineup** (does not invent empty),
2. reports **Not connected** (or equivalent plain-English connection language),
3. **locks drag-and-drop reorder**.

This is **by design** (Codex diagnosis via Louis, **2026-09-20**): it is **not** a broken drag handle and **not** proof the rep is “stuck on an old extension.” It means readiness is not currently green while last-known-good data is protected.

Plain-English Workspace connection language (Sep 15 simplification): Checking connection / Connected / Waiting for an update / Not connected.

### Mid-show do / don’t
**Do**
- Check for **duplicate or stale** Bomb Party Party Orders tabs first.
- Confirm site access is **Always allow** on `myoffice.bombparty.com` (not “on click”).
- If popup went red after an extension reload/update: refresh the **BP tab** once the show allows (zombie content script / “Extension context invalidated”). Prefer waiting for a quiet moment.
- Classify the error with §I before thrashing installs.
- Escalate if public feed stays stale after ~**two** sync cycles while the extension is still talking.

**Don’t**
- Refresh Bomb Party Party Orders as a first instinct mid-reveal.
- Reinstall / disable / replace the extension mid-show.
- Edit Bomb Party orders or DOM.
- Force a Chrome Web Store update mid-show.
- Treat “names still visible + Not connected” as “reorder is broken — reinstall.”

### Site access + browser constraints
- **Chrome on Mac or Windows only** (Help: “Use Live Lineup on a Mac” — Chrome path).
- **No iPhone/iPad** extension.
- **Safari deferred** (Bri path parked).
- After any extension reload/update: BP Party Orders tab must be refreshed or content script can zombie.
- Lindsey’s Live Queue is often run from **Louis’s computer** (she may not have her own PC yet). Example code **pattern** `MHF-####` — do not log full live codes in shared places.

### Watch / alert patterns (operator)
1. Describe HTTP **200** then configure HTTP **409 `lease_required`**, no snapshot/heartbeat in 1–2 cycles, public feed stale while extension still talking → **reconnect-order deadlock** (Sep 19 class).
2. `source_unavailable` → stale/duplicate BP tab or detached content script.
3. Parser **ready** with rows present → **not** a missing-party-ID / parser-empty classification.
4. `liveQueueAgeSeconds` > **45** during an active show → stale public feed risk.

### Public customer rules
- Show first names, positions, public status only.
- Never expose order/party IDs, publisher IDs, credentials, Hold rows, or undo/recovery history.
- Customer copy should use last-updated time; avoid “delayed” language on customer surfaces (Sep 15 timestamp hotfix).

---

## E. Architecture summary

### Data path (Live Lineup 2)
```
Bomb Party DOM (#party-order-table)
  → content.js (MutationObserver / checkbox / ~15s heartbeat / ~2s rediscover)
  → runtime message sparkle-v2-changed
  → background.js prepare(): tab select → inspect/read → optional configure
  → publisher-client.js sync() POST https://www.yoursparklesuite.com/api/live-lineup/publish
       actions: describe | claim | configure | snapshot (+ heartbeats)
  → Suite live_lineup_states (+ legacy live_queue compatibility)
  → Workspace GET/POST /api/workspace/live-lineup
  → Public projection (names only) on customer Home / Join / Trade (+ Dance Floor where enabled)
```

### Absolute rules (again, because agents forget)
Never refresh/navigate BP · never modify BP DOM · never alert/confirm/prompt.  
Credentials stay out of content scripts. Publish uses `credentials: "omit"`. Bounded JSON; redirects rejected; CORS allowlist BP origin + extension id.

### Key extension files (`chrome-extension/`)
| File | Role |
|------|------|
| `manifest.json` | MV3, hosts, SW, content scripts, popup; tip version **2.0.3** as of 2026-09-20 |
| `background.js` | Service worker: storage, tab selection, describe/configure/claim/sync, alarms, messaging |
| `publisher-client.js` | Claim → sequenced snapshot POST; lease ack; backoff; fail-closed receipt validation |
| `content.js` | Read-only observer on Party Orders |
| `queue-parser.js` | Fail-closed (and 2.0.4 soft cell-text fallback) table parser |
| `queue-filter.js` | Legacy/pure helpers (v1-era party summaries; not the tip content path wiring) |
| `popup.html` / `popup.js` / `popup.css` | Code entry, on/off, party checkboxes, honest status |

### Key server / app surfaces
- `POST /api/live-lineup/publish`
- `GET|POST /api/workspace/live-lineup` (+ `publishers/`, `readiness/`, `archives/`)
- `lib/live-lineup/` — `types.ts`, `model.ts`, `service.ts`, `http.ts`, `runtime-mode.ts`, show/archive helpers
- UI: `LiveLineupCard.tsx`, show/publisher/archive controls, `RequiredSetupLiveQueuePanel.tsx`, readiness clients

### Storage keys
| Key | Area | Contents |
|-----|------|----------|
| `sparklePublisherV2` | `chrome.storage.local` | token/code, enabled, exclusions, claim/lease sequencing, lastError, parserState, … |
| `sparkleSourceV2` | `chrome.storage.session` | selected tabId, generation, selection scope, parties summary |
| Legacy migrate | `chrome.storage.sync` | old sync_code / enabled / excluded_party_ids → local v2 |

### Permissions / hosts
- Permissions: `storage`, `alarms` only
- Hosts: `https://myoffice.bombparty.com/*`, `https://www.yoursparklesuite.com/*`
- Minimum Chrome: **120**

### Publisher contract (one-liner)
Claim with claimId → publisherId, epoch, lease → persist `nextSequence` **before** send → ack must match sequence → quiet queues need ready acks independent of name changes → competing tabs lose without lease+generation+sequence (not last-writer-wins).

---

## F. FULL chronological history (first rebuild → Sep 20 2026)

### F.0 Early rebuild era (~Mar–Apr 2026) — absolute rules born
**What broke / hurt**
- Early incidents (Open Brain / expert brief memory): refresh-loop trauma (Incident 001 class), scraped-rep-name issues, MutationObserver feedback crash (Incident 003 class). Brittany era trauma locked the absolute rules.

**What we learned**
- The extension must be a **read-only observer**, never a page controller.
- Dialogs and navigations are live-show killers.

**What shipped**
- Rebuild toward Supabase-backed Live Queue (replacing older GAS paths — exact cutover date not re-verified in this draft).
- Absolute rules locked into product discipline and later vault/Open Brain memory.

**Uncertainty:** Exact calendar day of “first rebuild commit” not re-pulled from git history in this draft pass — treat ~early Apr 2026 as the operational era start.

---

### F.1 2026-04-07…12 — Queue correctness + consecutive collapse add/remove
**What broke**
- Full name deduplication was wrong: if Crystal ordered 6 times she must appear 6 times (each order is a reveal). Verified against Lindsey’s Apr 11 show data (Danielle, Pamela, Crystal, Kimberly, Lauren, Heather, GABRIELLA multi-orders).

**What we tried**
- **2026-04-12** commit **`07a61f3`**: consecutive-collapse filter (same name back-to-back collapses; name reappears after a different name breaks the streak).

**What we learned the same day**
- Collapse hid **shrink-on-reveal**: when one of several consecutive same-name orders reveals, the UI may not visibly shrink because remaining duplicates still collapse to one entry. Customers see “nothing changed.”

**What shipped / reversed**
- Same day commit **`ba1e5a6`** (Open Brain; some notes typo `ba1e5e6`): **removed** consecutive collapse. Every unrevealed order gets its own entry. Tip today still has **no** consecutive collapse.
- Zombie content-script lesson: after extension reload, F5 the BP tab or hit “Extension context invalidated.”
- MV3 SW idle lesson: MutationObserver primary; alarm backup.

**Parked desire (still open 2026-09):** Louis wants consecutive collapse reconsidered carefully (order-id-aware or UI that still shrinks) — Sunday parking lot / banked session.

---

### F.2 2026-04-26 — First Chrome Web Store publish (unlisted)
**What shipped**
- CWS item id fixed: **`kmodgfffflplfdlkkhadgimmobplhoih`** (unlisted).
- Initial Store package **1.0.0** era begins.

**What we learned later**
- Publishing once does not mean every later repo fix is in the Store (see May).

---

### F.3 2026-05-08…18 — Party Filter + “repo ≠ Store”
**What shipped (repo / Lindsey verify)**
- **May 8:** Party ID filter — detect Party IDs from Party Orders, include new parties by default, let reps uncheck parties. Manual verify on Lindsey / Mile High Fizz (example: unchecking party `1794564` removed that party’s orders from the public queue). Commit family includes **`39fb935`** (May 11: popup Party Filter UI, `queue-filter.js`, tests) per May 18 lesson note.
- Lesson: Bomb Party can show multiple open parties (including future preorders) in one table — Party ID is first-class metadata.

**What broke**
- Brittany’s CWS reinstall still lacked Party Filter UI because **published Store package remained 1.0.0** while git already had the filter.

**What shipped (Store process)**
- **May 18:** manifest **1.0.1** Store release completed the loop.
- Process checklist locked forever: bump version → pack ZIP → verify changed files in package → submit CWS → record status → **verify from a real Store install** → keep emergency unpacked ZIP for live-show incidents.
- Retained emergency 1.0.1 ZIP SHA-256 `05e0e8d4…` (still cited in Sep 15 closeouts).

**What we learned (actionable)**
- **Repo-complete ≠ Web-Store-complete.**
- Nic-Nac future troubleshooting should cover Store vs unpacked, version checks, missing Party Filter UI, sync-code mismatch, site access, zombie CS, review delays (open item noted May 18).

---

### F.4 2026-06-04 — Privacy policy URL breakage + sideload crisis mode
**What broke**
- After domain move **neonrabbit.net → yoursparklesuite.com**, CWS privacy policy URL was stale → Store update/review risk.

**What we did**
- Louis updated CWS Privacy Policy link and submitted for review (review could take a week or two).
- Live-show mitigation while pending: confirm Brittany extension still installed; sideload Heather/Lindsey as needed before shows using emergency fallback flow.
- (**Do not repeat full sync codes in this living doc.** Historical Open Brain entries contain codes; treat them as sensitive.)

**What we learned**
- Privacy policy drift can block Store updates just when a show needs a fix.
- Sideload fallback is an operational muscle, not a shame path — but Store remains the durable distribution.

---

### F.5 2026-08 (context) — Naming, Workspace guidance, audience language
Skimmed from vault `decisions.md` / `open-items.md` (not full re-implementation history):
- Customer-facing term drifts toward **Live Lineup**; extension/CWS still **Live Queue**.
- Workspace Tools hold Live Queue setup guidance; extension behavior stays protected.
- Public status language audience-sensitive (connected / will open closer to show / waiting for update).
- Secret Rep ID Number labeling preserves Live Queue sync use (Finder claim) — codes remain private.

---

### F.6 2026-09-05 — Brittany anniversary live failures → Live Lineup 2 mandate
**Customer impact**
- During Brittany’s anniversary show, customers lost confidence in the live lineup. At one observed moment (01:21:47 UTC Sep 6 / Sep 5 ET): **35 stored names at age 208s** omitted from public payload; minutes later **34 names at age 103s** returned. Server public cutoff **180 seconds**. Homepage loaded **one snapshot** with no polling.

**Root causes (interacting)**
1. Migrated Brittany identity initially selected a **new unused queue** while her grandfathered extension still published to the **original** queue.
2. Old client **deduplicated unchanged name arrays**, so a healthy quiet queue stopped refreshing `last_updated` / backup trigger — no independent heartbeat.
3. Open customer pages did not keep polling — stayed stale after backend recovered.
4. Audit also found: missed checkbox/table mutations; loading/empty/filter states overwriting good data; competing tabs/devices with no publisher authority; sender-clock freshness; public writer-context exposure; falsely green connection status.

**Emergency mitigation shipped (not permanent repair)**
- App commit **`9e96887d…`** / deploy **`dpl_FZQJFd561g9dtBEv93gjxHb4PgJ9`** (plus earlier intermediate deploys documented in vault).
- Shared customer term **Live Lineup**.
- Brittany-only homepage read-only polling every 30s while visible; retain delayed last-received names with honest notice up to 1 hour; never manufacture successful empty.
- Numbers/names only (Louis rejected per-person captions).
- Brittany-only About/media hide + Dance Floor “Coming soon” presentation (separate from extension).
- Control Center Task List **`e453d5cc-0ac8-4d46-9dab-182a6aa723d7`**: “Live Lineup reliability: repair heartbeat and refresh after live shows” — high/open; **no auto-pursue**; wait for no-show + Louis OK.
- Nine Suite/customer aliases verified; Mile High Fizz aliases blocked by existing DNS/cert issues — **no DNS repair during show**.

**What we learned**
- Quiet queues need **acknowledged heartbeats independent of name-array changes**.
- Empty is a business state, not proof the parser is ready.
- Identity migration without publisher authority is deadly.
- Emergency homepage polling ≠ permanent extension/server contract.

**Vault:** `vault/2026-09-05-live-lineup-closeout.md` (+ detailed incident docs under `docs/sparkle-suite/incidents/` cited therein).

---

### F.7 2026-09-08 — Deep audit; repairs not started
- Audit delivered: `docs/sparkle-suite/audits/2026-09-08-live-lineup-system-audit.md`.
- Decision: audit precedes implementation; do not infer authority for live queue/store/account changes from the audit alone.
- Brittany remapped correctly to grandfathered queue in related Sep 5 identity repair notes (`project-state.md`).

---

### F.8 2026-09-09…14 — Live Lineup 2 local hardening (unreleased until Sep 15)
Multi-day Codespace/local program (checkpoints in vault / Open Brain). This is where Live Lineup 2 stopped being a sketch and became a contract — still **unreleased** until the Sep 15 no-show cutover.

**Born / built (extension)**
- New `queue-parser.js` (scoped multiparty / start cutoff / carry / dated revelations; missing dates fail closed).
- New `publisher-client.js` (strict generation on claim/snapshot; `show_changed` / `invalid_scope` stop future network attempts without adopting a newer show).
- Hardened `background.js`: trusted-context local token, session-only selected source, serialized config/network, BP path checks, navigation clears source, ~30s alarm, bounded POST, no redirects/cookies, bounded JSON responses.
- Content script: no credentials/storage/network; tbody subtree/text/check events; ~2s replacement discovery; ~15s unchanged heartbeat.
- Manifest wires parser + Suite host + min Chrome 120; version not bumped until Store package time.
- Early popup drafts were **legacy/incompatible** — explicitly not installable/packagable until replaced.

**Born / built (server / Workspace)**
- Tenant-scoped current lineup state, show archives, publisher tokens (server stores **hashes only**), leases, generations, monotonic sequence, idempotent mutations.
- Readiness: authenticated GET `/api/workspace/live-lineup/readiness` with sanitized DTO; completion must re-verify at mutation boundary.
- Describe action: generation/party IDs/start cutoff/carry IDs/serverTime only — no customer names, tenant ID, holds, or credentials in describe.
- Carry-forward with `carryEntryIds` + dated `revealedEntries` so historical revelations do not flood tombstones.
- Show start fences old leases; selected-party/start-time cutoff excludes pre-show rows.
- PostgreSQL multi-session concurrency harnesses proved publisher races, tenant locking, issuance caps, revocation/heartbeat ordering, generation archive winner/rollback.
- Compatibility mode design: preserve public/legacy reads + revocation while disabling owner mutations / new credential issuance if main app withdrawn.
- Workspace card: drag/drop + keyboard/tap reorder, Hold/Return, Reveal/Undo, start/end/carry-forward, archive recovery, honest health (not always-green).

**Discipline**
- No mid-show Store publish; no install from draft popup while incompatible.
- Dirty shared workspace preserved; release later from isolated clones.
- Extension absolute safety scans required (no reload/DOM write/dialogs).
- Sep 10 source-ready checkpoint (Open Brain): frozen verification hundreds of tests green; Codespace still held protected dirty extension files; next step required Louis action-time approval + confirmed no-show window before consolidate/rollout.

**Vault pointers:**  
`vault/2026-09-09-live-lineup-local-hardening-checkpoint.md`,  
`vault/2026-09-09-live-lineup-post-reconcile-handoff.md`,  
(and related LOC integration checkpoints that explicitly preserved dirty Lineup work).

**Sep 11–14 ops locks (Open Brain):** Live Lineup overnight-only during show weeks; limp/Codex discipline; Sep 16 hit-list planning — context for why hardening waited for a no-show window. Sep 13 era: Store 2.0 Pending with 1.0.1 still live + auto-publish off (history sweep).

---

### F.9 2026-09-13…15 — Privacy disclosures + coordinated Live Lineup 2.0 production release
**Privacy / Store**
- `/privacy` updated ~Sep 13 to describe selected-source access, stable order/party identifiers, private pairing credentials, sequence/ack/health, archives, retention, revocation, narrower anonymous public display.
- CWS privacy declarations aligned; no remote code claimed; free/unlisted.

**Coordinated release (Louis confirmed no active shows)**
| Piece | Provenance |
|-------|------------|
| Extension source commit | `d2377d869218c4a307334681cb541f0a98fa63c7` |
| Manifest | **2.0.0** |
| Store ZIP SHA-256 | `24c28df76ee5caeaa4bc08233213c5c8d0af7004b08d0b95b19274059057c129` (12-file strict package) |
| App/source commit | `6611d0a930d592b7220dc437fb0c0e39964071d2` |
| Migrations | `20260910000100_live_lineup_v2.sql`, `20260910000200_reviewer_live_lineup_reset.sql` (additive; legacy `live_queue` 27 rows preserved) |
| Prod deploy | `dpl_F8U8TSPb8foS2CKZ78XjzSCS4EH7` |
| Compatibility bridge | `dpl_Hn1Ha85WYXvdBTdgVxZbTBhao6Bm` |
| Supabase project | `bqhzfkgkjyuhlsozpylf` |
| Tests | 48 files / 802 passed (+ intentional skip), extension↔app E2E, concurrency receipts |

**Important post-release defect (same day)**
- Live Lineup **component existed** but was mounted on obsolete `renderActiveWorkspaceSection()` home branch; real homepage uses `ConceptHomeWorkspace` — card **invisible**.
- Fix commit **`8f2ca269…`** / deploy **`dpl_DYKVKfGw58hpeseUEgfoxPVLiJtj`**.
- Lesson: **source-presence ≠ visible**. Tests must render the actual default route.

**Branch controls**
- `codex/nic-nac-trade-hardening` sole allowlisted active branch / GitHub default / Vercel production tracking (housekeeping `ac263b50…` docs/controls only).

**Vault:**  
`vault/2026-09-15-live-lineup-2-production-release-closeout.md`,  
`vault/2026-09-15-live-lineup-2-full-session-historical-closeout.md`.

---

### F.10 2026-09-15 (afternoon/evening) — UI simplify, public responsive, support, Mac help, Lindsey, Britt timestamp
Same calendar day as 2.0 release, multiple application follow-ups (extension Store left alone unless noted):

1. **Workspace UI simplification** — commit `89f8d52e` / `dpl_6EdixkzoH3j6qsDJJhvwtGx4ovTH`  
   Compact left-rail card; plain-English connection; advanced controls stay in full tool.  
   Vault: `2026-09-15-live-lineup-workspace-ui-simplification.md`

2. **Britt timestamp hotfix** — commit `5f55d4df` / `dpl_B1DaUBEygAXFHftS2cgzpgSWF82W`  
   Remove customer “Update delayed”; show “Updated 10:18 AM” far right.  
   Vault: `2026-09-15-britt-live-lineup-timestamp-hotfix.md`

3. **Responsive public strip + support routing** — commit `f1a275db` / `dpl_6Nb3n2x7pENJypm4zn1DmzSpL5nL`  
   Render **all** public entries (not cap at 4). Support mode GET-only through frozen-target gateway.  
   **Root cause of “Brittany mismatch” in support:** `/api/workspace/live-lineup` was outside support client’s proxied API prefixes → operator saw **operator’s** queue, not Brittany’s.  
   Bri inspection: **not connected** (no v2 state; legacy placeholder `last_updated=null`) — Safari deferred; Chrome-on-Mac path.  
   Vault: `2026-09-15-live-lineup-responsive-support-closeout.md`

4. **Workspace height** — commit `c827df4f` / `dpl_CyTUoervEnsJt7V9R1R2zoNKyXSC`  
   Fill left-rail height; 460px min (~≥4 rows); move controls beside names; internal scroll.  
   Vault: `2026-09-15-live-lineup-workspace-height-closeout.md`

5. **Mac Help** — “Use Live Lineup on a Mac” in Help & Resources (Chrome only; iPhone/iPad cannot).  
   Vault: `2026-09-15-mac-live-lineup-help-closeout.md`

6. **Lindsey onboarding / Mile High Fizz DNS cutover** (adjacent session) — Mac/Chrome guidance; MHF on Sparkle Suite DNS; onboarding materials; **no email sent**.  
   Vault: `2026-09-15-lindsey-onboarding-and-mac-support-session-closeout.md`

7. **UI session handoff** consolidates the above — tip docs `91d6a827`; app still `c827df4f` / `dpl_CyTUoerv…` at handoff time.  
   Vault: `2026-09-15-live-lineup-ui-session-handoff.md`

---

### F.11 2026-09-16 — Pairing rejection + popup repair + 2.0.2 Store path
**Louis decision (hard)**
- Rejected / fired generated **private-key / connection-name** pairing workflow.
- Every rep connects with the **existing assigned Live Queue code** already visible in Workspace.
- Do **not** ask for computer name, connection name, pairing key, or generated private key.
- Reliability protections belong **behind** the simple workflow, not in front of the rep.
- Consequential approvals must be short plain-English bullets (behavior / breakage / compatibility / exact approval / prod-Store actions).

**Extension UX**
- **2.0.1** popup repair: 2.0.0 severe Chrome sizing/flicker (360px + max-width 100vw); restore Sparkle pink/purple; stable ~280px shell. Commit `af899f52…`; ZIP SHA `e4d74290…`; uploaded with auto-publish OFF.
- **2.0.2** corrective package restores assigned-code workflow; ZIP SHA `121900c89c01d32ebb2ee033a22d6cad3f424ed530c8ca4f1b21ed65debf77e2`; Store description wording fixed to Live Queue code (not obsolete pairing-key). Pending review / manual publish discipline.

**Vault decisions echo:** `decisions.md` 2026-09-17 — one assigned code, automatic source discovery, green Connected, on/off, party uncheck — no manual tab selection / party-ID entry / separate first-time-setup without Louis OK.

---

### F.12 2026-09-17 — 2.0.3 tip vs “connects but no parties” → 2.0.4 soft fallback
**Symptom**
- Live Queue code connects (example pattern `MHF-####`) but parties on open BP page not detected — stuck on **“Waiting for Party Orders.”**
- Sam independent read: tip `queue-parser.js` **fail-closes entire table** on missing `data-orderid` / `data-partyid` (`missing_order_identity`); manifest **2.0.3**.

**Response**
- Narrow fix, not redesign: restore **1.0.1-style cell-text fallback** + **per-row skip** while keeping Live Lineup 2 reliability.
- Agent-owned smoke **PASS** (2026-09-17 ~4:35pm ET): package SHA **`961bffd3…`**, 12-file verifier, Vitest 4 files/22 tests, worker last-known party retention, content safety clean.
- PR historically: `https://github.com/louis623/sparkle-suite/pull/1` on `cursor/live-queue-party-detection-8648` @ `30ecfa74…` — **do not assume merged into tip** without checking.
- Louis CWS submit 2.0.4 ~4:46pm ET (Open Brain history sweep); auto-publish OFF; Sam green after live BP smoke before publish.
- Public CWS showed **2.0.4** by **Sep 18 ~10:40am ET** (ops fetch). Tip branch **still 2.0.3** as of Sep 20.

**Decision lock (vault)**
- Standard workflow = one assigned code + automatic discovery; no private-key UX without Louis OK.

**Vault / receipts:**  
`vault/2026-09-17-live-lineup-2.0.4-agent-owned-smoke-readiness.md` (lineup-review copy),  
`/workspace/live-lineup-2.0.4/AGENT-OWNED-SMOKE-READINESS.md`.

**Open-items lag note:** vault `open-items.md` still listed unfinished “upload 2.0.3 ZIP” checklist items — **stale relative to 2.0.4 Store reality**; treat living matrix (§C) as authoritative over that checklist until cleaned in a vault PR.

---

### F.13 2026-09-19 — Lindsey anniversary: `lease_required` reconnect deadlock + temp server fix
**Customer impact**
- Lindsey / Mile High Fizz anniversary show: BP orders visible in Chrome; Suite public Live Lineup stopped receiving them. Orders were **not** lost in Bomb Party.

**Symptoms**
- Extension CWS **2.0.4**; route `/live-party-orders`; party `1845752`.
- Parser found all **8** pending orders (not a missing-party-ID failure).
- Initially `source_unavailable` — fresh BP orders tab + closing stale duplicate fixed attachment.
- Then repeated **`lease_required`**: describe HTTP **200** → configure HTTP **409**.
- Public lineup empty/stale despite BP table having orders.

**Root cause**
- **2.0.4 reconnect-order bug**, state-specific: after SW or source tab restart with existing show gen>0 and parties differing from stored scope, background did: describe → see party scope differ → **configure** → (would only then) sync/reclaim lease. Server requires active publishing lease before configure → trapped in 200→409 loop. Fresh show or already-valid lease (e.g. Brittany) may not hit this path.

**Immediate repair (temporary server)**
- Commit **`49037082c2ac29cacba904b4b2852795e962c23e`**
- Deploy **`dpl_8w2U1zZTnVJjUyZiG3Cm3T97eDzW`**
- For **assigned workspace-code publishers only**: premature configure without active lease returns unchanged **read-only** show descriptor so 2.0.4 can continue to publisher sync, reclaim lease, publish, then configure next cycle.
- Unchanged security for durable-token publishers, other owners’ leases, cross-tenant, real publisher conflicts.

**Verification**
- Publish API repeated 200; Mile High Fizz `liveQueueState: live`, `liveQueueSourceReady: true`, `liveQueueAgeSeconds: 0`; public showed Martha, Lacey, Crystal, Hillary, Rayna, Heather; BP still 8 pending; **no BP refresh / order changes**.

**Permanent fix (parked)**
- Extension **2.0.5**: describe → claim/renew lease via publisher sync → snapshot/heartbeat → configure changed party scope → continue.
- Regression test: existing show gen>0, expired/missing lease, restarted worker, parties differ from stored scope, claim before configure, recover without BP refresh.
- Publish only via protected CWS in no-show window with Louis explicit OK.

**Local incident note:** `/workspace/live-lineup-watch/2026-09-19-lindsey-lease-required-incident.md`

---

### F.14 2026-09-20 — Git tip lock + Workspace readiness explanation
**Standing Git lock (Louis / Open Brain / sticky)**
- Shared tip: `codex/nic-nac-trade-hardening`
- Reviews/packages: tip SHA or SHA-verified ZIP only
- Dirty checkout: do not blind-pull; ask Louis; confirm no-show; preserve plan
- Push ≠ live; Live Lineup extension = Codespace or SHA ZIP, Louis-authorized, no-show gated

**Workspace “not connected but showing data”**
- Codex (via Louis): when source is not ready, Suite intentionally keeps last known lineup, shows not connected, locks reorder — **readiness fail-safe**, not a broken UI and not automatic proof of wrong extension version.

**This living status draft**
- Created/expanded on Live Lineup Watch computer for later vault PR on tip (parent owns PR). **No GitHub push from this session.**

---

### F.18 2026-09-20 evening — Codex diagnostic session (no code changes)

**Session type:** Read-only diagnosis of Workspace Live Lineup “shows names but Not connected / reorder locked,” then product planning. **No Live Lineup code, CWS, deploy, or STATUS edits by Codex.**

**How Codex thinks (ops lesson for Watch / Sam / Rocky)**
1. Starts from **shared tip** and can still **over-trust tip manifest version** (2.0.3) when reps run **Store 2.0.4** — STATUS §C exists specifically to stop that.
2. First pass framed Workspace symptoms as **legacy `live_queue` display + `canManage: false` / `connection: delayed`** until V2 ready state exists in `live_lineup_states` (Git-tip service path). Useful mechanical detail: the shared LiveLineupCard disables drag/arrows/hold/reveal/save when `canManage` is false — one guard for both “not Connected” and “can’t reorder.”
3. After Louis corrected to Store **2.0.4**, Codex located release commit **`d1865fa`** on `cursor/live-queue-party-detection-8648` (not on today’s tip ancestry) and reframed as **2.0.4 readiness/partial** → keep last lineup + lock reorder.
4. After reading living STATUS from **PR #15 head** (not tip), Codex **retracted** soft-fallback as *proven* cause of this Workspace case; STATUS says live evidence required; **lease-order / reconnect** remains a stronger candidate when reconnecting. Correct humility — keep that discipline.
5. Dirty local Windows checkout is **out of scope** for multi-agent work; Git tip + SHA packages only (Louis reinforced).

**Product deferrals (Louis 2026-09-20) — leave running as-is**
- **2.0.5** lease-before-configure repair: **parked until full Codex usage reset** + confirmed no-show window + Louis authorization. Do not start now.
- **Private Workspace customer-context enrichment** (match intake/customer-list birthday **month/day only**, favorite cut/jam/etc. onto authenticated Workspace lineup for a rep-only wow card): **parked until usage reset** with full research/planning first. **Not** a Live Lineup rebuild. Must stay off public lineup / customer site / extension popup. Matching must be high-confidence (stable BP id if permitted) — never guess on first name alone. Birthday has no year (wow factor only).
- Codex recommended sequence when resumed: stabilize 2.0.5 → identity-match service → enrich Workspace-only response → reviewer prototype → confirm BP field permissions. Live Lineup Watch agrees (see steward opinion in Open Brain / session handoff to Louis).

**STATUS stewardship confirmed in-session**
- Louis pointed Codex at Watch’s READ-ONLY catch-up prompt.
- Codex confirmed PR #15 open; read STATUS from PR commit `d2c0274` / branch `cursor/live-lineup-status-vault-929b`.
- Open Brain already captured deferral (Codex `capture_thought`); Watch mirrors here.


### F.19 2026-09-26 — Overnight planning + Codex HOLD-PLAN (v3; no build)

**Context:** Louis reopened a big overnight Live Lineup update for morning smoke. Watches remain paused. Business Calculator briefly entered the pack then was **cut entirely** (LL-only overnight). Planning docs live under `/workspace/ll-overnight/` (Desktop twins for Louis/Sam).

**What changed in the plan (not in shipped code):**
- Track A reliability (2.0.5 lease-before-configure, soft-fallback ≥ Store, ready-completeness, recovery state table, `canManage`/Connected contract, multi-tab, restart smokes, evidence sheet) stays the floor.
- Track B / lastName / public initials / consecutive public collapse / reveal flare were drafted, then Codex **HOLD-PLAN** (stronger interaction evidence) deferred surname + public wow until explicit acceptance sequences exist.
- BP Parties table has First + Last columns (Louis screenshot); Suite still publishes FirstName into `entries[].name` only. Additive `lastName` was proposed — blocked until transport/server retain it (see below).

**Codex HOLD theme:** A lineup can look reassuring while **order, identity, or freshness** is wrong. Tip reviewed: `4a679d751f7519de2396da89b03ba8de1ddfe140`.

**Watch stamp (2026-09-26 ~11:00am ET) — tip-verified highlights:**
1. **Freshness vs same-rev refresh:** `canAcceptWorkspaceRefresh` (`live-lineup-client.ts`) at equal revision requires `canManage` (and other fields) unchanged — so a health-only `canManage` flip without a new revision can be **rejected** by the Workspace client while drag may still look enabled. Must define health-only same-rev updates and prove visible lock without a new publisher packet.
2. **`canManage` tip gap (prior):** `buildWorkspaceLineupSnapshot(..., canManage = true)` default; service often omits third arg when `lastReadyAt` exists; card gates drag on `canManage`. STATUS “Not connected ⇒ lock drag” is product intent, not how tip currently couples.
3. **lastName stripped today:** tip `cleanSnapshot` (extension `publisher-client.js`) and `parseSourcePacket` (`lib/live-lineup/model.ts`) rebuild entries as `{id, name, orderedAt}` only — a parser “accepting” lastName would not store it. Surname publish needs a full transport→store→private-match→public-strip trace before overnight Track B.
4. **Other HOLD requireds (plan must answer before build):** lock-all vs recovery circularity; ID-fallback wrong tokens; completeness vs never-ready; sticky reveal / cancel ghosts; public collapse vs per-order drag; public reveal event contract; single public projection pipeline; chip drag geometry; audience uniqueness across pagination; open public page presentation reject; CWS install ≠ publish window (zombie CS). Full table in HOLD addendum.

**Cut order until HOLD cleared:** Track A reliability only. lastName / Track B / public initials-collapse-flare **out of overnight** until sequences in the addendum have explicit answers.

**No build / no CWS / no deploy** from this planning wave until revised plan + Watch stamp (this section) + Louis go.

**Companion files:** `LIVE-LINEUP-OVERNIGHT-PLAN-2026-09-26-v3.md`, `LIVE-LINEUP-TRACK-B-IDENTITY-ADDENDUM-2026-09-26.md`, `LIVE-LINEUP-V3-CODEX-HOLD-ADDENDUM-2026-09-26.md` under `/workspace/ll-overnight/`.

### F.15 Version ladder (extension) — quick reference

| Ver | Theme | Notes |
|-----|--------|-------|
| 1.0.0 | Initial CWS unlisted | Later missing Party Filter vs repo |
| 1.0.1 | Party Filter + process lesson | Emergency ZIP SHA `05e0e8d4…` retained |
| 2.0.0 | Live Lineup 2 publisher/parser/lease | Store ZIP SHA `24c28df76…`; published Sep 15 no-show window |
| 2.0.1 | Popup sizing/branding repair | Stable ~280px shell; ZIP SHA `e4d74290…` |
| 2.0.2 | Assigned-code corrective + Store copy | ZIP SHA `121900c8…`; pairing UX killed |
| 2.0.3 | Tip manifest (as of 2026-09-20) | Fail-closed missing identity attrs; party UI + some SW soft paths in tip notes |
| 2.0.4 | Store soft cell-text fallback | SHA `961bffd3…`; reconnect-order bug under existing-show restart |
| 2.0.5 | Planned lease-before-configure | Parked; permanent Sep 19 fix |

### F.16 Role map (who does what on Live Lineup)

| Role | Does | Does not |
|------|------|----------|
| **Louis** | Authorizes Store publish, deploys, mid-show exceptions, tip lock | Need to remember every SHA — agents must surface them |
| **Sam (CoS)** | Ops confirmation, CWS page checks, hit lists, green-light framing | Blind-ship without Louis |
| **Codex** | Builds/fixes on tip when authorized | Blind-pull dirty checkout; treat push as live |
| **Rocky** | Adversarial review of ships/packages | Soften absolute safety rules |
| **Live Lineup Watch** | Study, classify, living status, incident notes | CWS, Codex start, deploys, package mutation, queue writes |
| **Nic-Nac** | Rep CS using Live Lineup terminology | Extension surgery |
| **Buddy** | Suite health | Extension packaging |

### F.17 What “good” looks like during an active show

1. One Party Orders tab, Always-allow site access, extension Connected with recent ack.
2. Popup lists expected parties; unwanted parties unchecked.
3. Workspace shows Connected (or Waiting briefly) with reorder available only when ready.
4. Public site shows names + Updated time; age should not climb past ~45s without recovery during active publishing.
5. If anything fails: classify with §I; prefer tab hygiene over reinstall; never BP-refresh as first move.

---

## G. Lessons learned (actionable for agents)

- **Never mid-show** Store update, extension thrash, or BP refresh as first instinct.
- **Never claim tip == Store == installed.** Verify CWS page + `chrome://extensions` + ZIP SHA.
- **Repo-complete ≠ Store-complete** (May Party Filter). Release checklist is mandatory for any `chrome-extension/` rep-facing change.
- **Quiet queues need heartbeats** independent of name-array changes (Sep 5).
- **Competing publishers / wrong queue after identity migrate** are deadly without leases + generations + sequence (Sep 5 → Live Lineup 2).
- **Empty / loading / partial / invalid / ready-empty** must stay distinct; never invent successful empty overwrite.
- **Source-presence ≠ user-visible** (Sep 15 homepage mount miss). Assert the real route.
- **Support-mode reads** must be GET-only / tenant-frozen / proxied correctly or you will debug the wrong rep’s queue.
- **Soft-fallback miss after successful inspect** → “Waiting for Party Orders”; **red Connection needs attention** usually means `lastError` / bridge failure (`source_unavailable`), not soft-fallback alone.
- **Configure-before-claim** after worker restart with existing show = `lease_required` loop (Sep 19). Temp server soften for assigned-code only; permanent fix is **2.0.5** client order.
- **Manual publish gate:** Google approval ≠ Louis authorization; no-show windows only.
- **Privacy policy URL** must stay valid after domain moves (Jun).
- **Consecutive collapse** hides shrink-on-reveal unless designed with order identity (Apr 12). Do not casually reintroduce.
- **Zombie content scripts** after extension reload require BP tab refresh.
- **MV3 SW sleep** kills `setInterval`; use alarms + persisted state.
- **Package verification** must bind exact source files (12-file ZIP discipline), not filename/version alone.
- **Release from isolated exact-commit clones** when shared workspace is dirty; never bulk-clean unrelated work.
- **Agents without this living status will contradict each other** — update §C/§F/§K when facts change.
- **Live Lineup Watch does not ship.** Rocky adversarial-reviews; Buddy = Suite health; Nic-Nac = rep CS; Sam = CoS; Codex builds when Louis says go.
- **Reassuring lineup ≠ correct order/identity/freshness** (Codex HOLD 2026-09-26). Prove Connected/lock, identity stability, and public projection separately.
- **Optional entry fields die at cleanSnapshot/parseSourcePacket** unless allowlists are extended end-to-end (lastName HOLD finding).
- **Same-revision Workspace refresh can reject `canManage` flips** — freshness expiry must visibly lock without waiting for a new publisher revision.
- **CWS quiet publish ≠ safe install window** when Party Orders is already open (zombie content script risk).

---

## H. Open backlog / parked

| Item | Status | Notes |
|------|--------|-------|
| Extension **2.0.5** (lease before configure) + reliability Track A | **HOLD-PLAN** — overnight candidate | 2026-09-20 freeze superseded for **planning** by Louis 2026-09-26 overnight ask. Codex HOLD (v3 addendum) still blocks **build** until acceptance sequences answered + Louis go. Reliability-first. |
| Merge **2.0.4** party-detection soft-fallback into shared tip | Open / required for overnight A | Tip manifest still **2.0.3** as of 2026-09-26; Store already 2.0.4 (`961bffd3…`) |
| Tip merge lag / PR #1 hygiene | Open | Confirm whether `cursor/live-queue-party-detection-8648` merged; update matrix |
| lastName publish + Track B wow chips + public initials/collapse/flare | **Deferred from overnight** | Codex HOLD: settle identity/freshness/public projection sequences first. lastName currently stripped by `cleanSnapshot` + `parseSourcePacket`. |
| Consecutive multi-order collapse (public / Workspace) | Banked / HOLD | Louis wants public consecutive same-person collapse; Codex requires order-vs-group drag decision + projection pipeline. Must not repeat Apr 12 shrink-on-reveal failure. |
| On-deck / reveal sparkle (list + ticker) | Banked / HOLD | Needs privacy-safe public event contract; never animate on heartbeat-only revision bumps. |
| Biweekly per-rep usage grid | Blocked | No Control Center Live Lineup usage MCP yet |
| Private Workspace **customer-context** / wow chips | Deferred with Track B | Exact full-name match; duplicate → hide chips; Workspace-only; never public. Blocked on lastName transport + audience uniqueness pagination. |
| Business Calculator | Cut from overnight | Louis 2026-09-26: out of same-night pack (later product brief parked separately). |
| Safari / Bri connection path | Deferred | Chrome on Mac is supported path; Bri was not connected (Sep 15) |
| Synthetic reviewer identity migration | Blocked | Needed for signed-in Workspace smoke; no personal/customer account bypass |
| Nic-Nac Live Queue troubleshooting flow | Open (May 18 todo) | Store vs unpacked, version, Party Filter, site access, zombies |
| Stale vault `open-items` 2.0.3 checklist | Docs debt | Living §C supersedes until vault cleaned |
| Promote / merge living STATUS into tip vault | **PR #15 open** | https://github.com/louis623/sparkle-suite/pull/15 — merge when Louis/Sam approve; until then agents read PR head |
| BP DOM screenshots / frozen attr contracts | Open | Needed for parser risk memos (Sam/Rocky notes) |
| Control Center permanent reliability task | Historical | `e453d5cc-…` — much of intent delivered by Live Lineup 2; do not auto-pursue leftovers without Louis |

---

## I. Incident playbooks — how to classify

### I.1 `source_unavailable`
**Means:** Extension cannot talk to a live content script on Party Orders (detached/zombie CS, wrong/stale/duplicate tab, site access not granted, tab not on `/live-party-orders`).

**Looks like:** Red connection / lastError bridge failure; public may go stale; may precede other errors.

**First checks (safe):**
1. How many Party Orders tabs are open? Close duplicates; keep one fresh.
2. Site access = Always allow for `myoffice.bombparty.com`?
3. Did someone reload the extension without refreshing BP?
4. Is the tab actually on live-party-orders?

**Do not:** Reinstall mid-show; edit BP DOM; force Store update.

---

### I.2 `lease_required` (esp. after describe 200 → configure 409)
**Means:** Server refused configure/publish mutation because no active publishing lease (or foreign lease). On **2.0.4**, classic path is **reconnect-order deadlock** after worker/tab restart with existing show + party-scope change.

**Looks like:** Parser may still show rows; describe succeeds; configure 409 loops; no snapshot/heartbeat; public stale while extension traffic continues.

**Classify as Sep 19 class when:** existing show, parties differ from stored scope, restarted SW/tab, 200→409 loop, parser ready with rows.

**Safe response:** Duplicate-tab check; do not refresh BP first; confirm temp server fix still deployed if assigned-code publisher; escalate if not recovered in two cycles. Permanent fix = 2.0.5 (not mid-show).

**Not the same as:** missing-party-ID parser empty.

---

### I.3 Parser partial / loading / invalid (not ready)
**Means:** Table busy, headers/filters shifting, incomplete rows, or validation failed — extension correctly refuses to claim “ready empty.”

**Looks like:** Workspace **Not connected** / waiting; **last known lineup may still display**; reorder locked (fail-safe).

**Safe response:** Wait for table to settle; ensure correct party checkboxes; do not thrash extension. Explain fail-safe to Louis/rep (§D).

---

### I.4 Missing-party-ID / fail-closed whole table (pre-2.0.4 / tip 2.0.3 class)
**Means:** Rows visible in BP but identity attributes missing; old fail-closed parser rejects entire table → “Waiting for Party Orders” / no parties detected despite visible UI.

**Looks like:** Code connects; parties not listed; soft-fallback package **2.0.4** (`961bffd3…`) addresses via cell-text fallback + per-row skip.

**Classify carefully:** If parser reports **ready with N rows**, this is **not** I.4 — look at I.1/I.2 instead (Lindsey Sep 19).

---

### I.5 Quick decision tree
```
Extension talking? ──no──► I.1 source_unavailable / site access / zombie CS
        │
       yes
        │
Parser ready with rows? ──no──► attrs missing? ──yes──► I.4 (need 2.0.4 soft fallback)
        │                         │
       yes                       no → I.3 partial/loading (fail-safe OK)
        │
describe 200 + configure 409 lease_required loop? ──yes──► I.2 reconnect deadlock
        │
       no
        │
Age > 45s / no heartbeat while quiet? ──yes──► heartbeat / publisher health (Sep 5 class)
```

---

## J. Pointers to vault closeouts + companion files

### Do not duplicate these verbatim — summarize + link

**Required vault closeouts (repo path on tip):**
- `vault/2026-09-05-live-lineup-closeout.md`
- `vault/2026-09-15-live-lineup-2-full-session-historical-closeout.md`
- `vault/2026-09-15-live-lineup-2-production-release-closeout.md`
- `vault/2026-09-15-live-lineup-ui-session-handoff.md`
- `vault/2026-09-15-live-lineup-responsive-support-closeout.md`
- `vault/2026-09-15-live-lineup-workspace-ui-simplification.md`
- `vault/2026-09-15-live-lineup-workspace-height-closeout.md`
- `vault/2026-09-15-mac-live-lineup-help-closeout.md`
- `vault/2026-09-15-britt-live-lineup-timestamp-hotfix.md`

**Also useful vault / review copies:**
- `vault/2026-09-09-live-lineup-local-hardening-checkpoint.md`
- `vault/2026-09-09-live-lineup-post-reconcile-handoff.md`
- `vault/2026-09-15-lindsey-onboarding-and-mac-support-session-closeout.md`
- `vault/2026-09-17-live-lineup-2.0.4-agent-owned-smoke-readiness.md` (present in lineup-review tree; confirm tip presence before citing as tip-only)
- Repo root: `LIVE_EXTENSION_SAFETY.md`
- Skim extracts: `vault/project-state.md`, `vault/open-items.md`, `vault/decisions.md`, `vault/session-log.md` (Live Lineup bits only — files are huge)

**Detailed docs cited by vault (not fully re-read this pass):**
- `docs/sparkle-suite/incidents/2026-09-05-britt-live-lineup-continuity.md`
- `docs/sparkle-suite/audits/2026-09-08-live-lineup-system-audit.md`
- May Store lesson historically: `docs/sparkle-suite/lessons/2026-05-18-live-queue-web-store-release.md` (local archive path also in `LIVE_EXTENSION_SAFETY.md`)

**Live Lineup Watch companions (this machine):**
- `EXPERT-BRIEF.md` — deeper product/extension map
- `CHROME-EXTENSIONS-GENERAL.md` — MV3 can/can’t + Sparkle tie-back
- `MEMORY-FACTS.md` — short durable bullets
- `2026-09-19-lindsey-lease-required-incident.md` — Sep 19 handoff
- `LIVE-LINEUP-STATUS-SOURCES.md` — source inventory for this draft
- `/workspace/live-lineup-2.0.4/` — known-good ZIP + agent smoke receipt
- Desktop sticky: `CODEX-SESSION-START-STICKY.txt`
- Overnight pack (this machine): `/workspace/ll-overnight/LIVE-LINEUP-OVERNIGHT-PLAN-2026-09-26-v3.md`, `LIVE-LINEUP-V3-CODEX-HOLD-ADDENDUM-2026-09-26.md`, Track B identity addendum

---

## K. Changelog of THIS status file

| When (ET) | Change |
|-----------|--------|
| 2026-09-20 ~earlier | Thin outline created (sections 1–8 sketch). |
| 2026-09-20 ~9:45pm | **Full end-all-be-all rewrite:** sections A–K; deep history Apr→Sep 20; build matrix; playbooks; backlog; source-backed SHAs/deploys; plain-English gloss. Study+write only; no CWS/Codex/deploy/package changes; no GitHub push. |
| 2026-09-20 ~10:05pm | Codex diagnostic session (no code): Workspace not-connected/reorder locked = fail-safe / `canManage` path; Store 2.0.4 vs tip 2.0.3 reinforced; soft-fallback not proven for this case; **2.0.5** and **Workspace customer-context** deferred until usage reset + research. PR #15 still open. Steward update. |
| 2026-09-20 ~10:08pm | Louis standing: **no Live Lineup plan/research/build until fresh Codex usage session** — emergency patches only. |
| 2026-09-26 ~11:00am | Overnight planning wave + Codex **HOLD-PLAN** v3 addendum stamped. Tip pin `4a679d75…`; matrix/backlog updated; **F.19** added. Reliability-first; surname/public deferred; calculator cut. Watch tip-verified: lastName strip + same-rev `canManage` refresh trap. **No build.** PR #15 still open — steward pushing this STATUS update onto PR head. |

---

*End of living status draft. Prefer dated facts; mark Unknown when unverified; never paste live sync codes; never claim tip equals Store.*
