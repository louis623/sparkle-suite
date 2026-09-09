# Live Lineup system audit — September 8, 2026 (ET)

## Verdict

The permanent hardening work is warranted across **the extension, ingestion/data model, Workspace, and customer sites**. The September 5 mitigation restored Brittany's display continuity; it did not establish a reliable end-to-end live system. The most important problems are correctness and truthful connection status, not animation or polling frequency alone.

This was an audit, not a repair/release. No extension code, package, store settings, production queue, sync code, account, order, DNS, or application deployment was changed. Local audit tests, a read-only diagnostic script, and documentation were added. Unrelated Control Center/Finder work, `artifacts/`, and `test-results/` were preserved.

## Evidence and provenance

- Repo: `C:/Users/louis/sparkle-suite-repo`; GitHub `louis623/sparkle-suite`.
- Allowlisted branch: `codex/nic-nac-trade-hardening`; local and remote HEAD during audit: `e6235e33419b86007e61a1ef2fb902c53e47a27b`. This is documentation after the current application release, not a reason to roll production backward.
- Live Vercel application: `4cf10ebfa55e2f878bf673aac2e6df417c368182`, Ready deployment `dpl_BESV662NEXSgJnNPCHo4hD7HWs69`, project `prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3`. Vercel's current alias list includes Suite and the existing customer domains. The September 5 Mile High Fizz alias failure is historical evidence, not proof of today's DNS state; no new DNS audit/repair was performed.
- Supabase project `bqhzfkgkjyuhlsozpylf`; deployed `live-queue-sync` version 15, JWT verification disabled. Its downloaded source matches the repository function after line-ending normalization. It was downloaded to a new temporary directory, not over the working tree.
- Public Chrome Web Store listing displays **1.0.1, updated June 13, 2026**. The five functional files checked in both retained distribution ZIPs match repository source after line-ending normalization. This does **not** establish the exact installed package on Brittany's show computer.
- Reviewed actual earlier tasks, notably **SS77**, **SS76**, **Okay, signed in.**, and **Move Britt’s Custom Domain**; actual Open Brain weekend closeout; repository incident/closeout records; current source; safe mocked tests; targeted live reads; desktop public-page visuals.
- Existing live Control Center Task List: `e453d5cc-0ac8-4d46-9dab-182a6aa723d7`, **Live Lineup reliability: repair heartbeat and refresh after live shows**. No duplicate task was created and its state was not changed.

Evidence labels below: **incident** = recorded live observation from the weekend; **live** = current read-only observation; **reproduced** = isolated mocked test of current code; **source** = inspected implementation. Reproductions are not evidence of malicious exploitation or proof of every event on a rep's computer.

## What went wrong that weekend

### 1. The migrated customer identity initially selected the wrong queue

The domain-cutover task found the newly migrated Brittany account attached to a newly generated, unused queue while her extension continued publishing to her grandfathered queue. The original queue held the actual show lineup; the new one had never received a sync. The historical repair linked the original queue to the active rep identity and parked the generated mapping. A subsequent alternate-code trial did not demonstrate sender migration, and Louis requested switching back.

This was **identity/migration mismatch**, not proof that a domain itself broke the scraper. Do not repeat that live-show code-switch experiment. Preserve Brittany's grandfathered mapping.

### 2. Quiet data was treated as a disconnected/empty lineup

On September 5 at **9:21:47 PM ET**, the database held **35 names**, but its last update was **208 seconds old**. The public payload omitted those names because the freshness cutoff was 180 seconds. At **9:23:38 PM ET**, the row held **34 names** at an age of **103 seconds**, and public names returned.

The extension hashes only the names array and skips unchanged uploads. The backup alarm calls the same deduplicated path. Consequently an unchanged, healthy lineup can stop refreshing `last_updated` and cross the display cutoff. This code behavior is reproduced, but Brittany's installed extension and device logs remain unverified.

### 3. An open customer page did not refresh the lineup

The homepage loaded one initial snapshot. Even after the backend recovered, an already-open page could remain wrong until reloaded. This compounded the freshness problem and made the behavior look intermittent across viewers.

### 4. The emergency patch was intentionally narrower than a permanent fix

September 5 added Brittany-only homepage polling (30 seconds, visible pages only, eight-second timeout) and retained explicitly delayed names for up to one hour. It removed repetitive per-person captions and used **Live Lineup** on shared customer surfaces. It did not change the extension, enforce writer identity, or give all pages a shared live subscription.

References: `docs/sparkle-suite/incidents/2026-09-05-britt-live-lineup-continuity.md` and `vault/2026-09-05-live-lineup-closeout.md`. Later About/media changes are unrelated and must remain intact.

## Current end-to-end path

```text
Bomb Party rendered/filtered table
  -> each matching Chrome tab independently parses and reverses visible rows
  -> names-array dedupe + shared-key POST + sender timestamp
  -> Edge Function overwrites live_queue by sync_code
  -> rep-to-code lookup + freshness calculation
  -> initial template snapshot
       Brittany Home: read-only poll -> shared context -> strip/modal
       Other Amethyst Home: initial snapshot only
       Targeted Join/Trade: hard-coded empty lineup array
```

Realtime publication exists in the schema, but that is not the same as these current Amethyst pages consuming a Realtime subscription.

## Prioritized findings

P1 means address before calling this dependable for live shows. P2 means material hardening/presentation work in the same program. No P0 outage or malicious compromise was established by this audit.

### F1 — P1: Heartbeat and health are not independent of queue changes

**Incident + reproduced + source.** `chrome-extension/content.js:130–199`, `background.js:4–16`, `lib/services/live-queue.ts:49–72`.

An unchanged alarm produces no request. `last_updated` therefore mixes content-change time with producer health. An empty but healthy queue and a stopped producer are also difficult to distinguish. The popup reports green **Connected** whenever enabled and its last status is not `error`, including unknown/old success; it does not age `lastSyncTime` (`popup.js:33–49`). Workspace's checklist tells reps to trust this green state.

**Repair:** separate server-received heartbeat, last queue change, parser readiness, and connection state. A quiet queue must keep its health fresh. Show Connected only after a recent server acknowledgment from the intended publisher, otherwise Connecting/Delayed/Offline/Error with an actionable reason. Do not use a queue of length zero as a connection test.

### F2 — P1: Reveal checkboxes can miss the fast observation path

**Reproduced + source.** `content.js:210–217` observes `tbody` with `subtree:false` when available. Descendant checkbox attribute changes are not observed; changing the checkbox's live `checked` property need not mutate its attribute. There is no `change`/`input` listener. The minute alarm may eventually discover the change.

Discovery stops its broader observer/poll before header validation completes. Missing headers can postpone recovery until a later backup attempt. Cached column indexes are not reliably recomputed for an in-place header reorder.

The trailing three-second debounce also has no maximum-wait bound: sustained observed mutations can postpone its fast-path sync until activity settles or the backup alarm runs.

**Repair:** use read-only delegated checkbox events plus narrowly scoped observation and periodic reconciliation, with a maximum wait during bursts. Treat discovery as successful only after a valid table contract, and revalidate structure after replacement. No page refresh, DOM writes, alerts, or broad mutation feedback loop.

### F3 — P1: Temporary/misfiltered emptiness can overwrite a real lineup

**Reproduced + source; actual table shape checked read-only.** A table without `tbody` yields `[]`; zero rows or skipped malformed rows can also collapse to empty. The server accepts that as a fresh authoritative replacement. Date/search/party UI filters and partial/paginated data can remove orders before scraping.

The available Bomb Party tab had the expected header attributes, zero rows, a Today date filter, and “There are no matching results.” It was not modified. This was not a Brittany show-computer inspection, nor proof that her queue was genuinely empty.

**Repair:** represent `not_ready`, `loading`, `invalid`, `partial`, `ready_empty`, and `ready_nonempty` separately. Preserve last-known-good data through uncertain parser states. Require stable, valid emptiness before clearing, without making a genuinely cleared lineup persist indefinitely. Surface source filter scope to the rep; never silently change Bomb Party filters or reload its page.

### F4 — P1: Competing tabs and out-of-order requests can publish the wrong lineup

**Reproduced + deployed source.** `background.js` triggers every matching tab. Each has separate dedupe/in-flight state but the same profile code. There is no selected tab/device, publisher lease, session epoch, or ordered sequence. The Edge Function performs unconditional updates. An older request can overwrite a newer one; a second filtered/empty tab can win.

**Repair:** one explicit active publishing source per rep/show with a server-authorized lease. Use a server-issued epoch and monotonic sequence; reject stale/replayed packets and unauthorized competing writers. A tab-level lock alone does not protect against another computer. Keep only the latest desired snapshot during retry and cancel/retire obsolete publishers safely.

### F5 — P1: Public sync-code exposure and shared extension credential undermine writer isolation

**Live + deployed source.** Anonymous read of the targeted `live_queue` row returned HTTP 200 and exposed its sync code. The migration allows public table SELECT. The extension contains a shared credential and the deployed function relies on that credential plus a sync code, rather than a per-rep/device authorization contract.

This creates a credible cross-tenant queue-write threat if the shipped shared credential is extracted. No production write/exploit was attempted; no key value is included here. Public first names/positions are intentional, but public writer identifiers and unrestricted backing-table access are not a good boundary. An RLS policy alone does not provide column secrecy.

**Repair:** expose a minimal public read model without publisher credentials. Pair each device through authenticated, rep-scoped authorization; use revocable scoped credentials and server-enforced mapping. Add per-credential rate limiting. Plan staged backward compatibility: do not abruptly rotate a global key and disconnect every live rep before the replacement extension is installed.

### F6 — P1: Sender clocks determine freshness and ordering

**Reproduced + deployed source.** `supabase/functions/live-queue-sync/index.ts:78–85` accepts the supplied timestamp as `last_updated`. The service clamps negative age to zero, making a future timestamp fresh. The browser accepts future responses and rejects subsequently older timestamps; equal timestamps can replace a nonempty list with empty data. A bad clock can mislabel stale data or impede recovery.

**Repair:** authoritative server receipt time for health; separately retain optional client observation time for diagnosis. Order writes by publisher epoch/sequence, not wall clocks. Use server age/revision in the public protocol and handle large client-clock skew explicitly.

### F7 — P1: Customer routes do not have feature parity

**Source + live endpoint check.** `homepage.jsx:2454–2455` starts the poll only for the Brittany hybrid. The API explicitly rejects other reps (`app/api/amethyst/live-lineup/route.ts`). A targeted Go For The Bling request returned 404. Other Amethyst homepages still derive initial freshness once and suppress names older than three minutes. Targeted `join.jsx` and `trade.jsx` set their lineup entries to an empty array, not a live source.

**Repair:** one tenant-safe public lineup contract/provider shared by Home, Join, and Trade across supported skins and custom domains. Preserve Brittany's custom presentation and numbers/names-only preference. Verify both already-open pages and fresh navigation. Do not infer that changing shared wording deployed shared behavior.

### F8 — P1: Rep-to-queue mapping is not an enforced invariant

**Incident + live + reproduced.** The schema has unique `sync_code`, but its original migration has neither a unique `rep_id` nor a rep foreign key. Ensure-code is a SELECT-then-INSERT; concurrent calls can create multiple rows. Retrieval chooses the oldest row, hiding ambiguity.

Live read found 25 rows and two duplicate rep groups: the internal `louisfizzfest` workspace and `demosparklestudiod5decc`, each with two empty rows. Brittany currently has exactly one correctly mapped grandfathered row. This does not prove all duplicates were caused by concurrency. Full live constraint introspection was not performed; observed duplicates themselves establish an unenforced one-row invariant for those records.

**Repair:** audit existing mappings first; explicitly preserve grandfathered identities; reconcile duplicates with exact identity guards and an audit trail; then add the intended uniqueness/foreign-key rules and atomic creation. Do not add constraints blindly over placeholder legacy IDs or delete rows to hide the problem.

### F9 — P2: Validation and recovery are too permissive/opaque

**Reproduced + deployed source.** The Edge Function validates only a truthy code and array. Nested values and very long names are accepted; JSON `null` crashes before a structured validation response. No application-level payload/entry limit, rate limit, or accepted revision receipt was found. External gateway limits were not exhaustively audited.

Client 401 sets an auth-failure latch that ordinary alarms do not clear. Changing only the code does not clear dedupe/auth state or force a publish. Other errors rely on later triggers rather than bounded backoff. A successful HTTP status is trusted without checking an acknowledgment body. In-flight requests can outlive settings changes.

**Repair:** strict schema/body/entry limits, safe structured errors, acknowledgment with mapping/revision/server time, jittered bounded retries and latest-payload replacement. Invalidate old state on code/account/lease changes; distinguish bad credentials, invalid parser, unavailable network, and rejected stale writer. A retry must never resurrect an obsolete queue.

### F10 — P2: Source sorting and normalization can misrepresent customers

**Reproduced + source.** `queue-filter.js:22–38` reverses visible DOM order rather than using parsed order time/ID; sorting the BP table differently changes published reveal order. New party IDs are included unless excluded. A one-character first name is dropped. The service silently caps at 200 entries. Duplicates remain per order; that is an intentional historical contract, not a defect to “fix” by collapsing names.

**Repair:** establish the authoritative ordering contract with stable order IDs/timestamps and respect any deliberate rep ordering. Explicitly validate party scope. Support legitimate short/Unicode names, cap name length, and paginate or clearly represent larger lineups rather than silently losing positions. Do not publish additional customer fields merely because the scraper can read them.

### F11 — P2: Workspace cannot prove readiness or diagnose a show

**Source.** `DashboardPlaceholder.tsx:7007–7240` presents a code, install link, and manual checklist, not live receipt age, producer version, source tab/device, parser state, or accepted revision. Required setup trusts confirmation answers rather than an observed round trip. Its “give it up to one minute” advice cannot resolve unchanged dedupe or a latched auth failure.

**Repair:** a read-only health panel and pre-show check: correct tenant, selected source, last acknowledgment, queue count, version, filter scope, public read revision, and clear error/recovery guidance. Add a safe synthetic end-to-end test route; do not require Louis/Brittany credentials, real orders, or live checkout. Use Live Lineup consistently in user-facing copy while retaining internal identifiers where appropriate.

### F12 — P2: Presentation, accessibility, and release documentation need cleanup

**Current desktop visual + source.** The delayed-status notice appears below the sticky strip over unrelated page content on scroll. The same delay message is also mixed into the announcement area. The full lineup uses clean numbered rows, but its container lacks `role=dialog`/`aria-modal`, opening leaves focus on the underlying trigger, and source provides no Escape handler/focus trap/return-focus contract. This is not a completed accessibility conformance audit.

The public store listing still describes old per-person captions and claims real-time behavior more broadly than current routes deliver. Its displayed privacy disclosure says no data collection/use, while the core workflow transmits customer first names; this warrants a careful disclosure review, not an unsupported legal conclusion. The project Live Queue skill also contains stale repository/branch, Realtime, timing, and popup guidance; current AGENTS/safety instructions supersede it.

**Repair:** one stable status area inside each lineup surface, no notice floating over page content, honest last-received labeling, a clear total/full-list control, long-name/mobile checks, accessible dialog and restrained screen-reader update announcements. Preserve number/name-only rows. Update docs/store disclosures as part of the approved release; never equate a Git push or ZIP with a Web Store rollout.

## Latency and capacity

The current observed-change path has a three-second debounce followed by the customer's next 30-second poll: roughly **up to 33 seconds plus request time** in the uncomplicated case. A checkbox missed by observation may wait for the minute alarm and then the next poll: roughly **90 seconds plus request time**, not a hard upper bound. Network failures, backgrounding, or sleep can make it longer. These are architectural estimates, not measured production percentiles.

Chrome explicitly allows delayed alarms and handles sleep/wake on a best-effort basis. Alarms are a recovery mechanism, not a subsecond live-update SLA. [Chrome alarms documentation](https://developer.chrome.com/docs/extensions/reference/api/alarms).

Proposed healthy-session acceptance targets: source change to public display **p95 <= 5 seconds**, **p99 <= 10 seconds**, with heartbeat freshness independent of changes and recovery visible within 30 seconds after network/source readiness returns. Validate under the supported browser/device conditions; do not promise these across a sleeping device.

Do not only turn polling down. At 300 visible viewers, a 30-second poll is approximately 10 endpoint requests/second; a five-second poll is 60/second before retries. Each current request resolves tenant and queries mapping/snapshot. Prefer a minimal cached public snapshot plus appropriately scoped push updates, with jittered fallback polling, recovery, and explicit revision ordering. Test DB/API load and subscriber authorization before broad rollout. Chrome sync storage also synchronizes settings across signed-in browsers, making device-local publisher selection preferable to an implicitly synchronized active writer. [Chrome storage documentation](https://developer.chrome.com/docs/extensions/reference/api/storage).

## Verification completed and limits

- Six focused suites: **40 tests passed**, including **18 new audit characterizations** and 22 existing tests. New tests reproduce the current problems with mocked I/O; passing does not mean repaired behavior. Command below resets mocks and performs no network/customer mutations.
- Deployed Edge source comparison, live metadata, anonymous read exposure, targeted public API states, row/mapping counts, archive/source comparisons, and public store version were read-only.
- At 8:25 PM ET the first live read showed an older six-entry Brittany snapshot. A later update arrived during the audit without any write from this task. At 8:43/8:47 PM ET the stored five-entry snapshot was timestamped **8:25:24 PM ET**, and the public API/page correctly showed **delayed** with those entries. The sender's timestamp is not independently verified server receipt time. This shows the retention mitigation working; it does not prove an active-show outage or a healthy heartbeat.
- Desktop canonical `/brittwithbling` strip/full-list modal visually inspected; no forms/orders submitted. Fresh mobile/screen-reader/real-installed-extension execution, 300-viewer load, sleep/wake/network chaos, publisher machine logs, and safe signed-in synthetic end-to-end verification remain acceptance work. No personal-account auth workaround or production poisoning test was used.

```powershell
node node_modules/vitest/vitest.mjs run tests/audits/live-lineup-2026-09-08.test.ts tests/live-queue-party-filter.test.ts tests/services/live-queue.test.ts tests/public-live-lineup.test.ts tests/public-live-lineup-runtime.test.ts tests/public-live-lineup-route.test.ts
```

`scripts/audits/live-lineup-readonly-2026-09-08.mjs` requires existing local credentials for the exact allowlisted Supabase project. It only reads, prints counts/times/mapping facts, and does not print keys or customer names. Never copy credentials into the report, vault, or Open Brain.

## Recommended implementation sequence — not executed

1. **Define and test the contract.** Stable tenant/legacy mapping; authoritative server time/revision; parser state versus producer health; one active source; genuine empty and end-of-show behavior. Turn the audit characterizations into repaired-behavior acceptance tests when implementing.
2. **Harden ingestion and identity compatibly.** Scoped pairing/credentials, public read projection, ordered writes, strict validation, observability, atomic mapping. Inventory installed clients and plan credential transition before retiring legacy access. Migration must preserve Brittany's working queue and unrelated reps.
3. **Repair the extension in the authorized GitHub Codespace.** Read-only event detection, validated snapshots, real heartbeat, selected publisher, bounded recovery, meaningful status, version telemetry. Respect all live-show safety rules. Verify the actual updated store-installed build; no local extension edits/packaging from this workspace.
4. **Unify public surfaces and Workspace.** Shared tenant-safe live provider across Home/Join/Trade/skins; efficient push/fallback; age/revision handling; operational health panel; clean accessible presentation.
5. **Prove failure behavior before rollout.** Synthetic fixtures for unchanged 15-minute queues, checkbox property/attribute changes, loading/replacement/empty/malformed tables, sorting/party/date/search scope, two tabs/devices, offline/reconnect, 401/429/5xx/timeouts, old/equal/future packets, code change, >200 entries, Unicode names, duplicate mapping, and cross-tenant access. Run real MV3 lifecycle and 300-viewer tests. Log revision/age/error/count metrics without customer names.
6. **Release in a confirmed no-show window.** Independently verify app, Edge/schema, and extension releases; exact branch provenance and both Suite/custom-domain behavior; staged client compatibility, rollback that preserves newer data, then a monitored synthetic rehearsal. Do not count a Vercel release as an Edge/store release. Obtain explicit direction before production/show-affecting steps.

## Continue from here

Audit complete; hardening not started. Use this report and the existing live Task List item for the next approved implementation phase. Do not repeat the weekend code-switch experiment, alter unrelated Control Center/Finder files, or replay completed Brittany media work. Ask only for genuinely required release/show-window or architecture choices.
