# Live Lineup always-on repair — September 28, 2026

## Approved behavior
Live Lineup connects whenever its extension is enabled with a valid assigned code and the Bomb Party Live Party Orders page is available. No scheduled show, show-start action, date cutoff, or carry-forward choice is required. Explicit party inclusion and reveal checkboxes still control eligible orders. An empty settled table is a valid connected source.

## Proven failure on Louis's Smoke installation
At 2026-09-28 21:27:50 UTC the read-only describe response returned generation 1, parties 1846280 and 1848082, cutoff 2026-09-27T21:19:05.646Z, and no carry IDs. The existing page had 50 valid timestamped product rows (24 + 26). Every timestamp preceded that cutoff; the latest was 2026-09-27T20:47:51Z. Exact installed parser 2.0.5.2 discarded all rows and returned partial / selected_party_not_visible.

The installed extension's existing diagnostic journal independently recorded partial snapshots, successful repeated claims, no ready acknowledgement, and lease_expired errors. Server party selection already matched, so configure was not needed. Accepted non-ready snapshots cleared lastError while scopePending stayed true, causing the unexplained Applying party selection display.

Available Vercel logs did not correlate each 409 with a publisher or response body. They do not prove publisher_conflict. The diagnostic journal proves lease_expired occurred in this publisher, without attributing every logged 409 to it.

## Repair
- Remove order-age filtering in both parser and server; return epoch legacy metadata so compatible older parsers also stop filtering by a saved show cutoff.
- Advertise selected-parties capability. Extension 2.0.6 detects an older server before any claim or publish.
- Preserve lease ownership, generation fencing, observation age, monotonic local health, and explicit reveal reconciliation.
- Recover automatically from a closed/reopened single source tab, ordinary Chrome missing-receiver errors, and a changed stored generation. Read again after each new claim/configuration.
- Preserve lease_required and local parser reason diagnostics; translate those reasons in the popup. Log sanitized server action and error code without credentials or order data.
- Ignore proven excluded-party rows before checking their reveal controls. Adopt externally changed party exclusions when no local filter change is pending.
- Accept a settled empty table through extension, shared freshness, setup verification, and public status.
- Remove the lineup show-start UI and obsolete setup instructions. Preserve party visibility, manual order, private Hold/Return, identity chips, and grouped public presentation.

## Source and environment provenance
Implementation is in a new clean Codespace checkout on codex/nic-nac-trade-hardening, based on 229ecd38b348aad3e8587ccd9f8d6a1992af75f6 from louis623/sparkle-suite. Original v5.2 feature source 0fb5cdd033b48571c7a2843afb61a874a6035371 was integrated while preserving current application/skin changes and current branch policy. The old Smoke deployment's recorded commit 3485cef3700811c661d12240520661f463711bb1 remains unavailable; it is not claimed to match this source.

Smoke and live share implementation. The Smoke packager changes only reviewed identity, endpoint, host permissions, storage environment, and warning text. Smoke project prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ and Supabase pukemqiwlyqmyytxkdmo are verified by the guarded deployment runner. CWS extension kmodgfffflplfdlkkhadgimmobplhoih and Louis's removed installation are not modified by source work.

## Verification before deployment
18 extension regressions pass, including the 50-order cutoff fixture, lease-before-read receipt flow, configure no-op rejection, empty source, old-server refusal, diagnostic preservation, tab reopening, receiver healing and generation recovery. Legacy worker migration/filter/toggle checks pass. The real route/SQL/public-runtime integration passes. 148 affected readiness, model, Workspace and public-route checks pass after the final empty-state fix.

The 902-test release inventory exposed five unrelated failures reproduced on an untouched copy of the same base: two stale branch-policy expected strings, one branding text expectation, and two reviewer Trade UI expectations. One optional concurrency test was skipped. Do not describe the whole repository suite as green.

Synthetic deployed-Smoke results, package hash, source SHA and deployment ID will be added after verification. Installation alone will not be reported as Connected. No real orders are used for test publishing; Louis's assigned code is not changed.
