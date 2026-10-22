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
   choose an original URL afterward; a known design with supplied `designName`
   may skip per-listing processing (`add-listing.ts:3288`). Exercise actual save
   services and assert the persisted listing refers to the exact accepted
   upload, including known designs. Avoid deriving a public listing from a crop.
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
