# Live Lineup 2.0.9 reliability candidate

## Plain-English release scope

- Reps keep their pairing and party exclusions. The extension reads the existing orders page without refreshing or changing it.
- New code can check for an approved, published update while Chrome remains open. A downloaded update may be installed when no orders tab is open, or after ten continuously observed minutes of a broken lineup with exactly one orders tab and no active rep action/publish. A healthy lineup does not trigger our explicit restart.
- A new page reader replaces a prior modern reader cleanly. An unrecognized/legacy active reader is refused rather than duplicated. The first real Store update from 2.0.7 remains an acceptance check.
- The parser handles multiple table body sections and flags unfamiliar rows rather than silently omitting them. It does not guess customer identities, missing dates, pagination, or unreadable orders.
- Private reports include fixed reason codes, separate worker/reader versions, bounded update status, and structural enums/count buckets. No raw headings, class names, attribute values, customer text, IDs, URLs, or tokens are added to diagnostics.
- Monitoring is a separately gated server feature. It emails Louis only for sustained qualifying incidents, cancels unsent recovered alerts, and verifies recovery. Email is fixed to louis@neonrabbit.net; no rep outreach is automatic.
- Public lineup copy and existing authorization/publisher/retention rules are unchanged. Existing 2.0.6/2.0.7 packets remain supported; no sunset is introduced.

## Release control

The source remains on the registered Preview branch `codex/live-lineup-208-reporting`, PR202, based on the earlier reporting candidate plus production a4a7d5fb. The 2.0.8 artifact is preserved. This broader candidate is 2.0.9.

The Store item is `kmodgfffflplfdlkkhadgimmobplhoih`, existing Sparkle Suite Live Queue listing. Louis authorized its upload and review submission on November 16. No permission expansion, new listing or automatic all-rep publication is part of this package.

Required release sequence: focused checks and independent review; isolated Smoke Preview; Rocky review and Louis demo/Live approval; backward-compatible server support on Live; then Store review submission, with publication held until release gates are satisfied. The explicit server-first requirement from the original task remains. Do not bypass it because Store submission is authorized.

`lib/live-lineup/release.ts` is the only published-release descriptor. It intentionally remains disabled with known published version 2.0.7 and null timestamp until an exact publication is verified. A candidate, ZIP upload, pending review or approval alone is not publication. After actual publication, set version, exact publishedAt, and rolloutEnabled together. The public read-only route `/api/live-lineup/release` exposes only those fixed fields, never a download URL, selector language, or code.

## Update mechanics and limits

- Five-minute persisted release-metadata cooldown; one-hour persisted Chrome-check cooldown. Checks start on activation/bootstrap and continue via existing activity/alarm events, but never block lineup publishing.
- Google controls review and downloadable availability. There is no server command that forces new code into installed 2.0.6/2.0.7 copies.
- An actual browser download signal plus matching enabled release descriptor is required for an explicit installation. Persist the attempt before reload; at most one attempt per version per 24 hours, including unsuccessful unchanged-version attempts.
- The broken-show guard follows tab, document, generation and scope identity. Sleep, source changes, healthy reads, queued user actions or another orders tab prevent a carried-over timer from permitting a restart.
- Our guard governs our `runtime.reload()` call. Chrome may independently perform its standard update when idle.
- Reader replacement changes its observation baseline, so the first read can suppress reveal animation. Existing retained orders remain under server rules.
- Worker/reader mismatch stays nonready. A real Store-installed transition is required to prove that Google's installation invalidates/stops the legacy reader without rep action. VM cleanup is not proof of Store delivery.

## Server monitoring activation

The minute cron is defined in vercel.json and supported by the verified existing Vercel Pro plan. The isolated Preview wrapper has no crons. The route requires CRON_SECRET; production must have LIVE_LINEUP_MONITOR_ENABLED=true to sample and LIVE_LINEUP_ALERT_DELIVERY_ENABLED=true to deliver. Both default off. Preview/Smoke external delivery is blocked.

The current runtime safety cap is 50 active reps, processed in batches of ten. A larger roster returns an explicit capacity error instead of silently omitting reps. Up to four uniquely claimed notification jobs run concurrently, independently of sampling; both tasks are fully awaited, including when one fails. This cap and the 60-second route budget require runtime verification before activation; they are not a promise of 500-rep coverage. Newly queued incidents may wait for the next cron invocation.

Apply only the reviewed service-role monitoring migration to the intended environment after authorization. It creates dedicated private state/incidents/delivery records; existing publisher transactions and customer lineup data are not modified by this migration. Verify RLS, CAS, claim/finish ownership and dedupe before activation.

The required alert hook is Vercel's authenticated minute cron calling `/api/internal/live-lineup/monitor`. It evaluates incidents and sends owner email using the existing verified RESEND_API_KEY and RESEND_FROM_EMAIL; Supabase records incident timing, ownership, deduplication and delivery receipts. No external Watch receiver is required for this email path. The configuration `ready` flag means production delivery and email settings are enabled; it is not evidence of a received email or a working scheduler.

An external Watch wakeup is an optional, independent integration using LIVE_LINEUP_ALERT_WEBHOOK_URL and LIVE_LINEUP_ALERT_WEBHOOK_SECRET. Without those settings, optional webhook jobs are canceled without sending, retrying, or exhausting delivery attempts; email remains independent. `externalWatchHookStatus` explicitly reports `not_configured`, `disabled`, or `configured_unverified`. If a receiver is added, it must verify HMAC SHA256 of timestamp + '.' + exact body using X-Sparkle-Timestamp and X-Sparkle-Signature, reject stale/replayed events, and deduplicate eventId. Do not expose secrets in browser code, reports or links. Never claim Watch was awakened without verifying the receiving integration.

Provider acceptance is recorded separately from mailbox delivery. A delivered/bounced event integration and an actual controlled email receipt are separate acceptance evidence. Configured flags alone are not working alerts.

The 24-hour adoption report starts from actual publication. A post-publication matching target-or-newer worker/reader report establishes adoption as of that report even if the browser is later closed. A recently reporting older worker is confirmed older; no evidence or mismatched versions is unknown. Health is a separate measurement. Louis handles targeted follow-up.

## Verification and remaining decisions

Test budget: twenty focused checks maximum, five named test files; no full suite. Four parser, six updater, two contract, six monitoring, one real transport/model/public recovery, one isolated PostgreSQL integration. Record first failures and only rerun cases needing a correction. Production build is a separate compile check.

No tests use rep Bomb Party accounts. Store-installed update delivery, actual rep adoption, exact historical incident trigger, live alert delivery and receiver behavior are not proven by synthetic tests. No complete pagination/virtualized-table support is promised. Partial-order display, missing-date behavior, stale-list cap and public offline wording remain separate product decisions.

Rollback: disable monitored delivery and release rollout controls first if those features misbehave. Keep backward-compatible server diagnostic support after any 2.0.8/2.0.9 adoption; do not roll back to a server that rejects their loading/partial reason codes. Correct a Store package using a higher version and Google's review flow. Never refresh a rep's Bomb Party page as rollback.

## Candidate verification record — November 16, 2026

All twenty focused checks passed: four parser, six worker/updater, two packet-contract, six monitoring, one publisher/model/public-projection recovery sequence, and one isolated PostgreSQL 15 integration with 34 assertions. The database used a private Unix socket and synthetic fixtures only, then stopped; no Live or Smoke database connection was made. The migration digest was `50b4ae6f8284fac87bdc6b155dcf86088b4a3561d92a171ff90f3d77332ed168`.

Initial failures were verification fixtures: an unbalanced test stub, the wrong argument in a monitor fixture, and Python SQL-string percent escaping. Only those checks and the monitoring check affected by its timer correction were retried. No full suites ran.

The one local TypeScript command failed on missing installed dependencies in unchanged card/QR modules (`@resvg/resvg-js`, `jsqr`, `qrcode`); it reported no changed-file diagnostics. A clean isolated Preview build is still required and must be recorded separately.

Independent agent review found no new blocker in the final source. Actual Store-installed upgrade, real Bomb Party markup, live database activation, email receipt, and authenticated hook delivery remain unverified. The optional external Watch receiver has not been identified/configured: its sender implements a documented HMAC contract, not a proven adapter to Watch's webhook routine. This does not block the required Vercel cron and owner-email path. Shared incidents are grouped internally but still send individual rep emails.

Calendar silence policy approved by Louis: alert only within a currently scheduled show with prior publisher contact during that show. Wording says “Feed stopped; show status unverified.” Silence first passes the 90-second freshness deadline, then the three-minute confirmation window; minute sampling can add delay. Unknown or missed monitoring intervals reset the confirmation timer.

## Spec corrections I made

- Kept the original reporting-only 2.0.8 artifact and numbered this broader candidate 2.0.9.
- Release checks run outside the publisher queue; install waits inside it. Persisted updater writes are serialized so concurrent callbacks cannot erase cooldown/attempt state.
- A pending party-scope acknowledgment no longer acts like a permanent active-user-action flag. Actual pending actions/publishes still prevent installation.
- A local config revision changes routinely, so the unhealthy timer follows stable tab/document/show/scope identity instead. Sleep or identity changes reset it.
- Failure-reason changes alone do not reset a continuous incident. Recovery cancels unsent alerts, and each channel gets recovery only after its own incident was accepted.
- Normal order-count changes are excluded from structural change hashes. Version support uses numeric comparisons instead of an exact-version gate.
- Re-pairing with the same credential preserves exclusions; a different credential does not inherit another rep's exclusions.
- Publication time is unknown, so the initial release descriptor is disabled rather than inventing a timestamp or claiming an unpublished candidate is current.

- Louis clarified that the required alert hook should use the existing Vercel/Supabase stack. Removed the external Watch receiver as an email-readiness prerequisite; unconfigured optional hook jobs are canceled and cannot produce retry/exhaustion noise. A targeted recheck of the existing notification test is required for this amendment; the prior verification record applies to the earlier candidate.

- Bounded the monitoring runtime to 50 active reps with ten concurrent samples and four concurrent claimed deliveries. Delivery drains independently of roster sampling, and failures still await both tasks rather than abandoning sends. Actual scheduler/runtime verification remains an activation gate.

## Final server amendment and Smoke ledger evidence

The two affected existing monitoring cases (`disables external delivery|rejects cron requests`) passed after the optional-Watch and runtime corrections. Four unchanged cases were skipped; there is no additional test file or full-suite rerun. The twenty distinct focused checks remain passing.

The first isolated Preview at `4e2c0c52` completed its production build and TypeScript successfully: `dpl_BHCdf5Baq1cLjCNkVsZEUq9w34kr`. Release GET returned the disabled no-store descriptor; monitor GET failed closed with `monitor_not_configured`. A new Preview of this final server amendment is required before release.

Smoke database `pukemqiwlyqmyytxkdmo` now has the exact reviewed private-ledger migration (Supabase history version `20261116205449`, source migration `20261116203706`). Schema inspection verified the three tables and four invoker RPCs: service role only, RLS enabled, no anon/authenticated access. No rep data was inserted or modified. The security advisor's no-policy notices are intentional for these service-role-only tables. Live database access remains prohibited pending the explicit release gate.
