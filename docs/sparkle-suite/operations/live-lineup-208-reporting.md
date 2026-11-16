# Live Lineup 2.0.8: reporting and truthful popup

Release 1 only. No update controller, Store checks, automatic reload, parser changes,
new permission, migration, endpoint, public UI change, or Live rollout.

## Rep experience
Connected + Updating (green) requires the existing worker connected predicate:
current reader, fresh acknowledgment in this worker, ready parser, enabled, no
pending scope change or error. Historical readiness cannot make it green.
With a prior good read, disconnected routine updates and pending scope show
Reconnecting (yellow). Without a prior good read: Connecting. Existing error
rules show Needs attention (red); disabled remains Off. Existing detail text stays.

## Private protocol
Both claims and snapshots carry an optional diagnostics object:
- sourceVersion: worker package, reusing existing version terminology.
- readerVersion: package identity captured by content.js; null means unknown.
- updateState: unknown. This release performs no Store check and makes no claim
  about whether Google has downloaded an update.
- parserState and optional parserReason: fixed state-specific code lists only.

Snapshots retain their existing sourceVersion/parserState/parserReason fields.
The server validates agreement with the diagnostic copy and requires matching
reader/worker versions for a diagnostic-bearing ready snapshot.
The worker sends partial/unsettled empty observations for mismatched or unknown
readers. The server retains last-good orders under the unchanged partial policy.
Missing metadata from 2.0.6/2.0.7 remains accepted. This is not an updater.

Private state records diagnostics.receivedAt using server time only when the
normal claim or snapshot is accepted. It is NOT a readiness time. Claim replays
return the original state without rewriting metadata, revision, sequence or lease.
Diagnostics never bypass auth, claim, token, epoch, generation, observation,
sequence or CAS validation; no diagnostics-only write or lease path exists.
Public projection remains unchanged and does not expose this metadata.

## Spec corrections
1. Loading/partial require their own existing reason-code lists, not the invalid
   list. The plan section 6A names the seven distinct non-invalid codes.
2. Persisting claim diagnostics requires small route/service plumbing as well as
   model/types. The state JSON stores them; no schema change is needed.
3. Use unknown update state instead of inventing pending/current status. No
   update event listener or timer is installed in this reporting-only release.
4. Extend existing selected-party server and permission-package version gates to
   2.0.8; unchanged permissions remain storage, alarms, scripting.
5. Register only the requested build branch for the Smoke project's Preview
   environment; default and production branches and all aliases stay unchanged.

## Verification budget
Exactly three extension checks, one focused server case, and one tsc invocation.
Popup passed. Mismatch and recovery passed. Metadata privacy/stale-health passed
after correcting an await syntax error in the new VM test (only failed case
rerun). Server case passed: existing-version acceptance, each reason code, ready
rejection, state persistence, unchanged lease/orders/readiness, replay/conflict.
No full suite, live page loads, customer account access or DB queries.
TypeScript failed on absent shared Codespace dependencies @resvg/resvg-js, jsqr,
qrcode in unrelated card/QR modules. No changed-file errors reported. Not rerun.
Package/Preview receipts and remaining verification are in the build report.

## Release gates / rollback
Server compatibility must reach approved Live first, then 2.0.8 can be submitted
to the existing Store item. Smoke alias movement, Live, Store and PR merges need
Louis's go. PR198 remains open. Rocky review of the final delta and Louis demo
acceptance remain required. No real Bomb Party failure or Store delivery is proven.
Rollback cannot remove the server reason allowlist after 2.0.8 adoption: keep
compatibility for active clients, or ship a forward server correction. A Store
correction needs a higher extension version and Google review.
