> October 22 follow-up: the Sharp client-bundle failure is fixed and production 5fd172f8 is integrated into the PR. Real Next build, standalone tsc and 757 tests pass. The earlier base-conflict restriction below is historical and superseded by Louis's explicit authorization. See [build/integration closeout](vault/2026-10-22-pr141-build-fix.md), including two unchanged production test failures found in extra checks.

# PR 141: photo-chat repair analysis

Baseline: `b618966dfcb252bc54ec951cdee8a4375dffe42a`, inspected October 22, 2026.
Louis explicitly authorizes edits, tests, commits and pushes on
`cursor/nicnac-photo-hardening` only. No merge, deploy, production branch,
Smoke, Live, real-rep session, migration or provider mutation is authorized.
The primary dirty checkout is preserved. This exception does not change the
GitHub default branch, Vercel production branch or permanent branch policy.

## Actual path

`NicNacChatBody.handleSubmit` builds text/file parts. The AI SDK appends the user
message and the transport in `_client.tsx:817` supplies its ID as
`submittedMessageId`. `POST /api/nic-nac` authenticates/loads canonical history,
persists user rows, ingests the current piece's photos and details, then either
returns a deterministic response or runs the agent. Intake classifies labels,
checks image quality, binds a main-photo ID, and stores confirmed details.
`add-listing.ts` previews the selected upload and requires a later affirmative
turn for that upload before running the listing/database/photo services.
Rollover inserts a new conversation, copies confirmed details without photos,
and links the old conversation. The client loads history and Recent separately.

## Findings and one-item commit plan

1. **Send blocker, confirmed:** `NicNacChatBody.tsx:801` passes a fresh UUID as
   `messageId` through `sendWithParts:719-770`. AI SDK 6.0.168 interprets that
   field as replacement; its `ui/chat.ts:385-391` throws before transport, and
   the catch hides it. Use the new-message `id` field, retain that ID for retries,
   and surface pre-transport failures as well as transport failures. Prove the
   actual SDK reaches an API and retries the same submission.
2. **Duplicate/no/replacement/yes:** the route's deterministic replacement preview
   (`route.ts:905-1087`) and `commitPreviewedAddListing` coexist with the tool's
   independent readiness/confirmation gates (`add-listing.ts:2418-2580`). The
   old tests mock the latter and seed client-supplied previews, so their green
   result cannot prove the full sequence. Confirm the concrete failing state
   through real intake/save/persistence before changing it. Handler prose is
   present in `add-listing.ts:3341`; the output scrubber's short streaming tail
   can emit an instruction prefix before it recognizes the whole phrase.
   Use safe tool messages at their source and guard complete visible output.
3. **History:** baseline rollover handlers now insert destination rows without
   rewriting the source (earlier mutation is no longer present). GET routes
   call `retireSupersededPreviews`; the UI independently overlays the last
   assistant row, even if it is not the last visible row. Verify both rollover
   endpoints and client reads against real stored rows; narrow the overlay to
   the last pending visible confirmation, preserving earlier parts and rows.
4. **Quality:** `mainPhotoPreviewRefusal` checks stored blur/cut-off flags
   (`workflow-photo-roles.ts:462`), but `decideCustomerFacingSave:1466-1476`
   returns immediately for a confirmed ID before that check. The deterministic
   replacement reply can also announce a preview without an eligible bound
   photo. Enforce the same role/quality/refusal gate at preview and save, test
   usable scores carrying defect flags, label pairs, phone/desktop metadata,
   and a refusal followed by insistence.
5. **Original upload:** new-design source processing already has an original
   option. Listing processing still creates crops/enhancements and callers
   choose an original URL afterward, with an unsafe fallback to the selected
   processed URL if original metadata is missing. The suspected known-design
   omission was ruled out: the earlier known-design branch processes its listing
   image before returning. Keep the public listing on the exact original upload.
6. **Replay/time:** `submission-replay.ts` drops distinct IDs with the same long
   text and file count, even when the photos differ; only completed turns are
   recognized by same-ID replay. `insertUserMessage` already uses conflict-ignore
   and server insertion time. Remove content-based dedupe, protect concurrent
   retries, preserve first receive time, and verify no automatic resubmission.
7. **Skip:** wording helpers already distinguish listing existence. The route
   resolves the item after intake may close the piece (`route.ts:877-889`), and
   its helper can prefer an item from the previous assistant over the stored
   one. Verify before/after-save skip through the real route and database,
   keeping deletion under its separate confirmation.

## Invariants to verify

- Only a real submitted affirmative on the next turn after the exact persisted
  preview can save; never trust invented client assistant history as authority.
- Labels, declined uploads and defective photos cannot become listing images.
- Typed item numbers are sufficient; mismatching labels remain refused.
- Known design/collection/rarity survive replacement and rollover; titles use
  confirmed design details. No unsolicited shared-image replacement.
- Removal uses its own confirmation, never a photo yes.
- Recent errors stay errors with retry; conversation counts and cleared history
  do not collapse to message counts or an empty state.

## Why regressions survived

Several independent paths reconstruct the same state from wording, client
history, stored intake, and tool inputs. Round 9/10 route tests mock both
`getOrCreateTradeBoardIntakeContext` and `commitPreviewedAddListing`, and mock
the persistence helpers; the client SDK was not exercised. Keep authoritative
photo/confirmation state server-owned, avoid new wording patches, and prove
behavior with SDK/real-route/real-persistence/real-save tests backed by an
isolated database. Mock only external identity, model/provider and storage
boundaries; report those limits. Run the full requested npm test manifest and
TypeScript check. No live or signed-in smoke is part of this authorization.

## Implemented outcome and verification scope

The seven item commits are separate; the send fix is first. Subsequent review
corrections were folded into their matching commits before the branch was pushed.

1. New sends use SDK `id`; only retries use `messageId`. Synchronous errors
   produce a retryable failed message. The actual AI SDK calls the actual POST
   handler and SQL persistence in the new client test.
2. Normal user turns merge with canonical server history. A thin client yes
   recovers the stored preview; an invented client preview cannot authorize a
   save. Recovery tool messages contain rep-facing copy. Complete streamed text
   segments are checked before release, including instructions split across
   one-character deltas. This buffers text until its segment ends.
3. Both rollover endpoints preserve source rows. Both history endpoints report
   read-only state; POST refuses a retired chat before writes. The display
   overlay changes only the last pending confirmation sentence. Recent includes
   cleared chats and scans distinct conversation IDs, so a 1,001-row chat cannot
   consume the scan budget and hide an older chat.
4. Role, refusal, blur, cut-off, and inspection quality are rechecked at preview
   and save. A previously confirmed ID cannot override these gates. The bound
   eligible jewelry upload remains authoritative when a model selects a label.
5. Listing image processing explicitly publishes the original and skips crop
   and enhancement work. New-design source publishing also skips cropping.
   Missing original metadata fails rather than silently selecting a processed
   image. Known-design and new-design saves are verified through the real POST,
   real services, and checked-in listing SQL, with exact upload bytes asserted.
6. A stable reply ID and atomic database claim serialize retries of a client ID.
   Pending work is never taken over just because five minutes elapsed. An aborted
   run can be explicitly retried through a conditional claim. User insertion
   preserves the first server receive time; browser times do not reorder incoming
   submissions. Distinct IDs with identical captions stay distinct. Confirmation
   is turn-specific and cannot survive an intervening user message.
7. Skip resolves the stored current piece and checks the rep's listing. Lookup
   failure produces an actionable failure message rather than claiming unsaved.
   Skip after save leaves the database listing untouched.

The baseline duplicate/no/replacement/yes sequence succeeded in the isolated
full-history test. The exact reported 0/8 live failure was not reproduced against
a live model. The verified repair addresses missing/stale client preview state
and the confirmed SDK send blocker; it is not a claim of a signed-in Smoke pass.

The new tests use local PGlite PostgreSQL, a small Supabase-query adapter, the
actual intake schema, actual listing RPC, real routes, persistence, intake,
listing services, and real AI SDK transport. Identity, model output, pixel/OCR
classification, remote storage, and telemetry are controlled test boundaries.
They do not test hosted RLS, provider availability, real phone-camera pixels,
or signed-in rendered phone/desktop behavior. Existing image/service tests and
scenario suites remain part of the full test manifest. No live provider call,
real rep session, migration, merge, deployment, or Live change was performed.

GitHub reports that PR #141 has conflicts with its current base. Resolving those
against the production branch is outside this PR-only pass; the base was not
merged or changed.

## Final checks

On product tip 810bea061a8de73f8ab52a05bf3bae0e34e9b22b: all 754 tests in 47
files passed with npm test -- --maxWorkers=2, npx tsc --noEmit passed, and
git diff --check against b618966d passed. See the vault closeout for commit
identities, boundary details and the separate review/integration next step.
