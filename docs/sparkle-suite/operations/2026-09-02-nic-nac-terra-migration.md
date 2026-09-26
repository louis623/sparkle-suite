# Nic-Nac Terra migration — September 2, 2026

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

## Approved scope

Louis approved a same-day Suite human-default migration to `gpt-5.6-terra`,
keeping medium reasoning. Human-escalated stays GPT-5.5 medium, utility stays
GPT-5.4-mini low, and Lab stays GPT-5.5 high. Finder is not migrated in this
release. Its reporting baseline is separate in
`config/nic-nac-finder-reporting-policy.json`; this is not a Finder runtime
configuration or a policy-at-run-time history.

Louis separately approved a temporary Responses-only restricted Suite test
key with a $3 total synthetic replay cap, then revocation of that key only.
He also approved replacing only the deficient reviewer-smoke token with a
strong secret and using the existing synthetic reviewer account. Both
production environment updates (reviewer token and Suite default model) were
confirmed by Vercel. They become active on the new deployment.

## Implementation and evidence

- OpenAI AI SDK 6 adapter upgraded from 3.0.73 to 3.0.106; AI SDK core unchanged.
- Terra standard short-context estimates include input $2/M, cached read
  $0.20/M, output $12/M, and cache writes at 1.25x input. Historical GPT-5.4
  prices and the explicit model environment override are retained.
- Real synthetic replays exposed implicit Responses strict-mode normalization
  with BOTH models. Inspection showed both old and new adapters omit strict
  when unspecified. The permission-scoped catalog now explicitly preserves
  non-strict generation; app-owned Zod validation and approvals remain active.
  This prevents optional recurrence from being forced into a one-time show.
- Both models sometimes emitted timestamps without offsets. Add/update tool
  schemas now require a timezone-explicit ISO datetime before execution.
  This is input validation, not intent/phrase routing or post-selection rewrite.
- The one-off paid runner substitutes every execute handler, carries a
  persistent conservative integer-cent budget, disables SDK retries, and
  records model, usage, tools, output, latency and failures. It is not scheduled.
- Final corrected Terra calendar case: one valid add, no recurrence, correct
  September 4 7 PM Eastern instant, grounded visible success. Cancellation
  requested approval and did not execute. Raw earlier failures are preserved.
- Label and boxed-photo replays were semantically correct. The literal phrase
  detector also flags negated reassurance ("doesn't need to be unboxed or on
  a plain background"). Those runs remain flagged, not silently counted as
  zero-phrase passes. This is a model migration, not certification that every
  Trade Board intake path has been repaired.
- Temporary-key testing: 74 provider requests, 95 cents conservative estimated
  cost, no business writes. Reports stay under ignored
  `.local/terra-verification-2026-09-02/`; do not commit private transcripts.
- Final automated checks: 1,312 passed / one existing skip including Nic-Nac,
  cost dashboard, reviewer config; changed-file lint and full Next production
  build passed. Standalone broad test typecheck has pre-existing test typing
  errors; do not confuse it with the passing production build typecheck.

## Release and reviewer path

Pre-release: branch `codex/nic-nac-trade-hardening`, repository
`louis623/sparkle-suite`, project `sparkle-suite`
(`prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3`). Prior served deployment:
`dpl_3jf6qWNJJKJgibFJZrCbnMgeMzWm` /
`sparkle-suite-h17tgwrni-louis-2849s-projects.vercel.app`.

Deploy the exact verified branch tip with domain assignment held, then assign
only `www.yoursparklesuite.com` and `yoursparklesuite.com`. Customer aliases
remain on their existing deployment. No DNS, Stripe, billing, outbound message,
customer-account, scheduled canary, or unrelated key/project cleanup.

Live verification must use `/start` protected reviewer controls and the
existing synthetic dashboard-unlocked persona, then `/nic-nac`. Read Calendar,
perform a synthetic one-time add if safe, and verify persistence by reopening
Calendar. Inspect the Cost & Capacity dashboard for the actual model/run
evidence and refresh behavior. No token belongs in this document or a handoff
URL. Plain `/start` must not expose production reviewer controls.

Rollback is explicit: the prior deployment remains preserved. Restore only
the two Suite aliases to that exact known-good deployment if necessary, and
restore `NIC_NAC_HUMAN_DEFAULT_MODEL=gpt-5.4` before any later rebuild. Do not
restore a legacy route or automatically replay a turn after a tool may start.

## Sources

- [Terra model](https://developers.openai.com/api/docs/models/gpt-5.6-terra)
- [Responses tool strictness](https://developers.openai.com/api/docs/guides/function-calling)

## Verified release closeout

- Application commit `2a1e5ad10e33de012c96b321081ff72cb15d798f` was pushed and
  manually deployed as Ready `dpl_AvHkaLxN2UAvA91wK6qjDNLjGsZ1` /
  `sparkle-suite-glkw5g8tb-louis-2849s-projects.vercel.app`.
- Direct Vercel inspection of each Suite hostname resolved to this deployment.
  Customer www hostnames remained on `dpl_3jf6qWNJJKJgibFJZrCbnMgeMzWm`.
  The CLI also assigned its standard project alias automatically. Deployment
  alias arrays retained stale names, so direct hostname resolution was used.
- Chrome protected `/start` launcher now works; synthetic Britt Test Rep
  (`f2fdba81-4122-4de4-9695-f9caf9c4aba5`) reached `/nic-nac` without checkout.
  No personal/customer account was used. Plain `/start` still redirects to
  prelaunch without exposing reviewer controls. Apex canonicalizes to www;
  the live landing page remains stable after hydration.
- Live Calendar read run `214b10d0-9dd4-4165-8383-5f45edcd72aa` succeeded on
  Terra medium: 21,251 input / 113 output / 10,445 cached, estimated 4 cents.
- Live read-to-add run `8114f92b-ff0e-42dd-8aab-b68f3062a3f2` succeeded on
  Terra medium: 22,932 input / 196 output / 11,174 cached, estimated 4 cents.
  Calendar confirmed exactly one `Terra Verification Sep 2` show on September
  4 at 7–8 PM Eastern, no recurrence, TEST10 / 10% off, Reviewer Smoke
  Collection. A fresh customer-site load displayed it as the second upcoming
  show in the exact synthetic rep context.
- After Louis separately authorized cancelling only that synthetic show,
  the app requested confirmation and cancellation was approved through its UI.
  Runs `9275729c-1edc-4f72-9fb8-742fb66d83c4` and
  `e69ad45c-3f3f-4fcf-9087-58a6d99b8bc5` succeeded on Terra, 1 cent each.
  A full workspace reload showed the test event cancelled, two seeded shows
  still scheduled, and an intact cancellation history. No deletion/reset was
  used to erase the test evidence.
- Dashboard Refresh visibly updated telemetry/provider fetch timestamps,
  showed the actual Terra runs and unchanged other tiers/Finder baseline.
  Combined verification estimate: 95 cents temporary-key tests + 10 cents
  live tests = $1.05, below the $3 cap. Provider actuals can lag; this is not
  an invoice amount. Temporary key revocation was visibly confirmed.
- Live API/database health remained green with zero recent errors; no error
  logs were found for the new deployment. No billing, DNS, real customer,
  outbound-message or scheduled-canary changes were made.

Known limits: this is a bounded migration smoke, not an exhaustive workflow
certification. Literal negated-photo phrase flags remain available for later
evaluation work. Some read-only turns retain broad catalog-purpose telemetry
labels; these labels alone cannot certify model quality or exact task purpose.
Direct SQL assertions were not used; persistence was checked by reloaded
workspace and separate customer-site reads. Reviewer secrets are not in Git
or Open Brain.
