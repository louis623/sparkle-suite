# LOC service connection

This is an additive native operator interface to the existing Sparkle services. The original Control Center, customer Workspace, customer authentication, Remy MCP, Lane accounting MCP and workers remain available.

## Wire contract

Suite receives `POST /api/internal/loc-control-center` with a JSON object:

```json
{
  "ownerId": "the configured LOC owner UUID",
  "authority": "owner",
  "connectionId": "a trusted LOC connection ID",
  "operation": "tasks.list",
  "input": { "product": "suite", "limit": 50, "offset": 0 }
}
```

`authority` must be injected by the LOC server from the authenticated principal; omission defaults to `agent`. It is never read from a browser-supplied role. `intendedAssignee` is optional audit metadata, not authentication. Writes require a stable UUID `operationId` in the envelope, not inside `input`.

Headers: `x-loc-timestamp` is decimal Unix seconds. `x-loc-signature` is the hex HMAC-SHA256 of `timestamp + '.' + exactRawJsonBody`. Signatures expire after 60 seconds. Maximum body size is 128 KB. There is no browser cookie fallback, caller-selected URL/method or SQL relay.

Successful response: `{ok:true,result,observedAt? ,receipt?}`. Error response: `{ok:false,error:{code,message},receipt?}`. Signed operation `catalog` returns `{version:1,operations:[...]}` under `result`. The catalog records product, area, effect, owner-only boundary, input schema and target keys. The original named handlers remain authoritative for business validation.

## Configuration and rollout

- Suite `LOC_CONTROL_CENTER_SECRET`: independent server-to-server signing key, at least 32 characters.
- Suite `LOC_CONTROL_CENTER_OWNER_ID`: the exact LOC owner UUID.
- Suite `LOC_CONTROL_CENTER_OPERATOR_EMAIL`: a fixed active Suite operator. Every request checks that it is both an internal operator and an owner, and not a site-support or accounting-only identity.
- Suite `LOC_CONTROL_CENTER_OPERATIONS`: comma-separated exact names to enable. If unset, only reads are enabled. Include `receipts.get` when enabling writes. Roll out individually smoke-verified mutations; a catalog entry alone is not live acceptance evidence.
- Apply `20260909000100_loc_control_center_bridge.sql` before write rollout. It adds private durable operation receipts and a task compare-and-set function.
- Apply `20260909000200_loc_support_sessions.sql` before native support-session rollout. It adds only private encrypted mappings to the authoritative existing support sessions.

No secrets or migrations were applied during the delegated implementation. Release, runtime configuration and live reviewer smoke remain separate gates.

## Reconciliation, stale edits and authority

The first write reserves an operation ID, owner, connection, product and canonical input digest. A duplicate successful request returns the saved result without executing again. Reusing the ID with different input is rejected. Running or uncertain operations cannot be replayed. `receipts.get` with `{product,operationId}` reconciles the original connection's receipt. A running receipt older than two minutes is reported uncertain, never silently retried.

Legacy handlers can fail after one of several effects has committed. Those results remain uncertain and require inspection. Credential fields are stripped recursively from durable results; request bodies are not persisted, only their digest. In particular, production-roster passwords are neither receipt input nor receipt output.

Task updates require `expectedUpdatedAt` and use an atomic database predicate. Waitlist updates/deletes require the observed `updatedAt`, including a conditional delete. Setup profiles require `expectedUpdatedAt` as the last-observed timestamp, or explicit `null` for insert-only creation. Their original services retain default behavior for the old UI. A setup-profile change followed by a readiness-service failure is an uncertain partial operation, not a safe automatic retry.

Agent writes currently permit only tasks.create, tasks.update and onboarding.checklist, still subject to LOC's independent area/target grants and Suite's per-operation enablement. All other mutations require signed owner authority. Native support-session actions and private Finder image previews are owner-only even when read-only. Persona or bot names never establish authority.

## Native transparent support

`support.session.start` uses the original start-notice-before-activation protocol. LOC holds its CSRF token encrypted with AES-GCM bound to owner, connection, session and target. Browser and LOC responses never receive the token or cookie. The source support session remains authoritative for expiry, capabilities, operator, target eligibility and notices.

`support.session.inspect`, `support.session.end` and named `support.workspace.*` tools use that exact binding. Workspace calls pass through the existing capability-checked, audited support gateway. Only enumerated methods and paths exist; billing/security/ownership routes are absent. Site-settings updates retain the source service validation and the gateway's durable mutation-attempt protection. An active support session must display its exact customer, expiry and end control in the LOC UI.

End active LOC support sessions before rotating the bridge signing key; key rotation also changes the encryption key. Old support sessions are not silently adopted. Missing notices, invalid targets, expiry, missing audit storage and unknown actions remain errors. Read-only `support.sessions` history does not enqueue completion notices. Check-only conversation reads do not clear unread state; pending-approval reads do not expire rows as a side effect.

## Finder photo evidence

The Suite operation `finder.review.evidence` accepts only `finderSubmissionId` and `finderAssetId` from a current queued Suite ledger record. It calls the fixed Finder domain's additive `/api/internal/finder/control-center-review-evidence` route. Finder uses its own database and authenticates with a separate credential:

- Suite `SPARKLE_FINDER_CONTROL_CENTER_REVIEW_TOKEN`: dedicated bearer.
- Finder `SPARKLE_FINDER_CONTROL_CENTER_REVIEW_TOKEN_SHA256`: SHA-256 digest of that bearer.

Finder verifies its own queued submission, asset ownership, exact private bucket/path, MIME type and size. The returned image URL lasts 120 seconds. The LOC UI needs the actual Finder Supabase storage origin in its image policy and `referrerPolicy="no-referrer"` on private images. Expired photos require a fresh explicit read. No Suite database key is used against Finder.

## Verification recorded during implementation

- 92 passing Suite tests across 19 focused new and existing test files: signed boundary, receipts, owner/agent distinction, pure reads, customer paging and related-row history, stale setup/waitlist changes, encrypted support mapping, existing support notices/HTTP/gateway behavior, accounting and legacy routes.
- 38 passing Finder tests across 3 files: dedicated evidence auth and binding, unsafe metadata and cross-customer denial, existing Studio persistence and usage bridge regression checks.
- Isolated PostgreSQL execution of the new receipt/task migration: successful task update, stale revision denial, and denied anonymous/authenticated receipt/function access.
- Suite and nested Finder production builds passed: optimized Next.js compile, TypeScript, static pages and route generation. The subsequent catalog-only optional-text fix passed 14 bridge tests, including runtime JSON-schema validation of empty/cleared task and onboarding fields and the real required waitlist target for launch drafts. The original draft service requires a start-work-ready waitlist even though its route initially accepts either source ID; intake-only drafts are therefore not advertised.
- Direct trusted service-context read smoke passed all 15 selected source reads, then accounting/Lab/usage availability checks. This exercised real read services without customer mutations; it did not exercise deployed bridge authentication or the LOC UI. Suite provider actual costs remain unavailable with one reported coverage hole; values are not invented.
- Deployed signed transport, secret configuration, migrations and protected reviewer workflow smoke remain release-coordinator gates; local builds and source reads do not establish live parity or completed transition.

## Remaining acceptance boundaries

The adapters do not prove native UI parity by themselves. In particular, audit each remaining support Workspace action and media/file workflow against the approved plan, verify actual Codex/Grok transport, run safe deployed customer/support/publication/onboarding workflows, verify physical Fold behavior, and complete the observation/rollback/acceptance gates before retiring anything. Existing disabled Lab flags, unconnected accounting actuals and missing provider telemetry remain unavailable; no values are invented.
