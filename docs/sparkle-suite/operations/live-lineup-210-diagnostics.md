# Live Lineup 2.0.10: automatic failure evidence

Louis authorized automatic, richer diagnostics before Store submission because the existing missing_order_identity reason conflates absent, unsupported and conflicting values. This release changes reporting only; it does not loosen identity validation or claim to repair Britt's unseen page.

## What is collected

- First blocking row's one-based ordinal across recognized table rows, capped cell count, parser stage and existing reason.
- Order and party identities separately: missing / unsupported_format / conflict / none; attribute, cell and link agreement.
- Each identity source's format classification, length bucket and fixed character-class flags (letters, digits, whitespace, separators, non-ASCII, other punctuation, control characters).
- Existing fixed column labels, table-body/count buckets, source attribute-presence flags, worker/reader versions and update state.
- No actual order/party numbers, names, links, page text, HTML, selectors, screenshots, credentials or reversible hashes of values are added to diagnostics. Normal existing lineup publishing is unchanged.

The extension reports automatically during its ordinary authenticated publishing. There is no new user action, permission or remote page-control endpoint. It captures only the first blocking failure, not every bad row; the next failure can become visible once the first is repaired. Unknown formats remain rejected instead of guessed.

## Preservation and access

The private live_lineup_states JSON retains at most12 distinct failure signatures with server first/last-seen times and a capped observation count. Repeated reports coalesce; changing row positions, row counts and updater state do not create new signatures. The latest safe evidence for that signature is kept. Successful reads preserve recent failures. Entries older than14days since last observation are removed on the next accepted receipt. This is an active-state window, not universal deletion: existing private show archives and incident ledgers follow their existing retention policies.

Only accepted publisher packets can append evidence. Claim replays, stale/fenced/rejected snapshots and competing publishers do not add records. Existing tokens, authorization, lease rules, retained orders and public/workspace projections are unchanged. No new database migration or public diagnostic endpoint is needed. Authorized server-side investigation can read state.diagnostics and state.diagnosticHistory; customer responses cannot.

Sustained incident emails include a plain labeled summary from the exact current matching reader receipt, only while contact is under90seconds old. Stale/future/mismatched reports are omitted. Recovery emails do not repeat old failure details. The incident captures a sanitized copy so retry payloads remain stable. Existing three-minute confirmation and duplicate prevention remain in force.

## Verification and release

Eleven focused checks: five parser/transport/package checks, four server history/contract checks, two incident-email checks. One transport fixture initially asserted ready with unsettled observation; fixed the fixture and reran only the failed check. One monitor test was rerun after a freshness guard improvement. No full suites. Existing2.0.9 SQL/retention/updater evidence remains relevant to unchanged behavior; this is not a real Bomb Party markup test or Store-installed upgrade proof.

Build and package only in the authorized Codespace. Preserve2.0.7/2.0.8/2.0.9 archives. Source version and reader version must both be2.0.10. The original2.0.9 ZIP must not be uploaded for this expanded release.

Deploy the compatible server BEFORE uploading/submitting2.0.10. Keep the public release notice disabled at2.0.7/null until actual Store publication is verified. Capture its real publication time before enabling the notice and24-hour adoption report. This package cannot teach already-installed2.0.7 copies new reporting remotely; Google approval/download and first-update bootstrap remain limits.

Rollback after any2.0.10 adoption must retain the failure-aware validator/history support. Do not roll back to3f3702e8 or earlier: those versions can reject new failure diagnostics in incoming packets or stored state. Disable alert delivery via configuration if necessary; repair parser issues with a higher Store version. Never refresh a rep's Bomb Party tab.

## Spec corrections I made

- Numbered expanded package2.0.10 so it cannot be confused with the frozen2.0.9 artifact.
- Kept collection bounded and allowlisted, rather than collecting customer data or whole-page dumps.
- Preserved failure evidence across healthy receipts and recorded server timestamps; current diagnostics alone would be overwritten.
- Bound email details to fresh current-reader receipts, preventing old failure evidence from being attached to a later silence alert.
- Updated the package verifier explicit version list for the unchanged scripting permission after its first check rejected2.0.10; no permissions were added.
- Updated version-dependent test fixtures; marked historical skill architecture/branch guidance as superseded by current v2 code and production branch.
- Documented archive retention separately from active-state expiration and made the rollback compatibility constraint explicit.
