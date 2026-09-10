# LOC resumed work — September 10, 2026

Louis resumed implementation and explicitly reaffirmed two completion requirements: lose no legacy capability or information, and make every operational area usable by humans and Codex, Grok or future agents through authenticated HTTP/MCP access. The September 9 owner pause is superseded. Legacy retirement is still not authorized.

## Verified search corrections, not yet released

- LOC waitlist now forwards global search, resets pagination and includes phone/notes matches. LOC production build and browser tests at 344/882px passed.
- Suite waitlist and customer search tests pass: 14 tests. Customer search now includes displayed profile names, show names, contact names and emails while retaining historical rep identity searches. Filtering happens before paging; existing profile hydration and records remain intact.
- Actual read-only PostgREST comparison passed against 31 customers, five saved customer profiles and two waitlist records: 16 customer search cases and eight waitlist search cases. Literal punctuation was included. This verifies local source against the actual database, not a hosted release. Proof: ignored `.local/source-search-proof.json`.
- Large matching datasets are synthetic test evidence, not represented by the small live waitlist.

## Automation gap and concrete proposed correction

Audit found 42 of 70 business operation definitions owner-only: 12 reads, 29 writes and one draft. Independent agents can currently receive only three write operations; shared Grok connections cannot write at all. A working MCP endpoint and successful Task List reads do not satisfy complete agent coverage.

The proposed first correction is an **exact owner-approved job**, separate from standing permissions. Louis saves an exact action and input for a selected agent with an expiry. The record binds owner, agent, job, operation, input, targets and expiry. Execution retains agent identity and rechecks the active connection, lease, immutable input and authorization. Cancellation, pause, revocation, expiry and unauthorized transfer stop execution. Direct-call owner-only restrictions remain unchanged. Existing source-side validation, provider gates, support-session binding and operation receipts remain required.

This would allow specifically authorized jobs involving onboarding, support replies, communications/resource publication, Finder operations and Lab work. It would not grant blanket control, change live credentials, permit agents to administer their own access, or satisfy standing-permission/full-UI coverage on its own.

Local implementation: `server/operations/agents.ts`, `api.ts`, `bridge.ts`; additive migration `supabase/migrations/202609100009_owner_approved_jobs.sql`; registry/API regression tests. Nine new registry subtests, existing lifecycle checks, 13 HTTP/MCP test nodes, four bridge tests, and 16 staged source-guard test cases passed. The source guard was independently reviewed with limitations recorded: the signed LOC service remains the source's trusted delegation issuer, and individual support/provider workflows still need end-to-end acceptance.

## Actual approval-review blocker

Automatic approval review twice rejected applying the two-file Suite authorization guard, including after focused tests and independent review. Final reason: the persistent boundary change permits agents to execute owner-only workflows across a broad surface and requires Louis's explicit approval of this exact permission model; assistant justification and tests were insufficient. Do not retry or indirectly apply it until Louis approves.

The unapplied concrete patch is in ignored `.local/job-delegation.ts` and `.local/apply-job-delegation.mjs`; isolated tests are `.local/job-delegation-review.test.ts`. These are local staging artifacts, not released source. No Suite dispatcher delegation patch, database migration, deployment or live grant change occurred.

## Next steps

1. Obtain Louis's explicit decision on exact owner-approved agent jobs. Preserve this checkpoint; do not restart the audit or expand live permissions to bypass the hold.
2. If approved, apply the reviewed Suite guard, add permanent Suite dispatcher integration tests and repeat affected checks. Add the human assignment UI and explain exact-job versus standing access in plain language.
3. Complete per-workflow agent and legacy parity evidence. Shared Grok's retained key remains Task List read-only until separately configured through owner-authorized actions.
4. Release verified changes from exact clean commits, excluding unrelated dirty Suite Live Lineup work. The new nullable column must precede the new LOC job runtime; old code ignores it on rollback. Verify source and live-domain provenance first.
5. Hosted search checks, full automation coverage, provider/customer operational acceptance, physical Fold testing and retirement approval remain open. The overall goal is incomplete.

Follow-up while approval remains pending: customer browser checks at 344/882px now cover punctuation, page reset, displayed profile matches, no matches, clear, and overflow; all passed. Scoped Suite TypeScript found dynamic select inference errors; explicit selected-row typing fixed them and scoped tsc exited 0. No held authorization patch, deployment or live permission change occurred.

APPROVED: Louis explicitly authorized the exact-task agent permission model on September 10, including smoke-testing each function and identifying each agent. The prior approval-review blocker is resolved; do not request this same approval again. Reviewed dispatcher/guard applied locally. Permanent actual-Suite guard and signed-dispatcher tests pass 45 tests in two files. LOC attribution UI checks pass at 344/882px and current typecheck passes. No deployment/migration/live grant change yet. Full per-function native runtime and human assignment UX acceptance remain open.
