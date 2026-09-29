# Handoff: smart customer cards, Live Lineup and Nic-Nac

**Continue mode — September 29, 2026. Louis paused Codex to conserve usage and transfer to Grokbot/Cursor. This is unfinished work, not a release-ready handoff.**

## Start here

1. Read this packet and the current GitHub instructions. Preserve the dirty Codespace below.
2. Code base: `08ab1e733b55601f712787cb27a6c152b9914d7c` on `codex/nic-nac-trade-hardening` in `louis623/sparkle-suite`. A docs-only checkpoint may sit above it; query GitHub before acting.
3. The implementation draft is already present, uncommitted, in Codespace `opulent-couscous-qvxvwxg6pxqh4xqv`, directory `/workspaces/sparkle-suite-lineup-repair`. Do not reapply the patch there.
4. Portable backup: `sparkle-smart-customer-wip.patch`, 62,802 bytes, SHA-256 `58a304f5b3254c8a65a9a98ad46fc5d2c438b4bea0bf8b1a6b0d17e3726bee97`. It includes all modified/new application, migration and test files, but excludes the new vault notes. If the Codespace is unavailable, apply it to a clean checkout of the base above: first `git apply --check`, then `git apply`. Do not apply to a dirty/historical Windows checkout.
5. No customer-card migration, build, commit of draft code, push of draft code, or deployment has occurred. No Finder, production, CWS or Bomb Party changes occurred during this draft.

## Louis's intended outcome

Finish a connected customer database + Live Lineup + Nic-Nac experience, on **Smoke first**:

- Ready live orders automatically create a minimal customer card when no matching customer exists.
- Reuse the rep's existing unique full-name card. First-name + last-name matching already exists; do not redesign this as requiring a global ID before it works.
- Rep can add birthdays, stones/materials/cuts/collections, notes and a private distinguishing label while working the lineup.
- Two customer records sharing the normalized full name suppress personal details until clarified. Orders stay visible. Show a rep-facing `Which customer?` marker and selection flow.
- Rep can explicitly identify a different person with the same name, create a separate card and confirm it for that order.
- Same person may have multiple orders. Never equate multiple same-name order rows with two different people.
- Confirmed identity is attached to a stable order ID plus name identity, not merely its position; later ambiguous orders require clarification.
- Nic-Nac retrieves/updates the same records, handles ambiguous names, and supports birthday/preference/collection lookups. Successful edits should refresh the lineup/card UI.
- Preserve saved manual lineup ordering through repeated extension snapshots. New order IDs append. Holds remain held. No show-calendar scheduling requirement.
- Do not invent birthdays/preferences, contact details, or messaging consent for automatically generated cards.

## Future ecosystem direction — preserve, do not launch now

Louis sees Finder, rep websites, Suite customer cards, Live Lineup, Nic-Nac and eventual email/SMS audience selection as an interconnected ecosystem. A Finder customer already maintains collections/preferences in their own account. That should become a central customer profile reliably linked automatically to their customer relationships with Suite reps; they should not re-enter preferences for every rep. Rep websites should introduce Finder; Finder should lead customers back to reps. Keep customer-managed shared information distinguishable from rep-private notes. Preserve stable local customer UUIDs, structured fields and provenance/audit history so later linking is additive. Customers without Finder remain supported. Name-only matches are not sufficient proof to merge global accounts.

Actual Finder integration/auth changes, bidirectional discovery links and outbound messages are deferred. Current work only prepares a sound foundation. Future targeting can use birthday/collection/product interests, but channel eligibility and opt-outs remain independent. Open Brain capture of this direction succeeded. Repository note: `vault/2026-09-29-customer-ecosystem-direction.md`.

## Source of truth and release constraints

- GitHub: `https://github.com/louis623/sparkle-suite`, branch `codex/nic-nac-trade-hardening`.
- Current remote AGENTS: GitHub tip is code truth; Codespace/disposable clean clone only. Persistent Windows `C:\Users\louis\sparkle-suite-repo` is intentionally dirty/historical. Never sync, reset, build or release it.
- Read AGENTS, Suite/Finder vault notes and relevant skills on the verified tip. Applicable skills: `sparkle-live-queue`, `sparkle-nic-nac-agent-architecture`, `sparkle-suite-production-smoke`. Current user Smoke-first instruction overrides their generic production/reviewer defaults.
- Manual Git deployments are disabled. A push is not a deployment. Do not deploy this WIP.
- No production release until Smoke works and Louis accepts it. No CWS changes. Do not change, navigate, refresh or modify the Bomb Party page. Do not initiate synthetic source publishes.
- Tests with isolated fixtures are appropriate regression checks, but **Louis requires actual Chrome/Smoke verification with existing real orders** for acceptance. No synthetic orders as the only proof.
- No subagents were used. Do not infer authority to message other tasks or agents.

## Last verified deployed state, before this draft

- Smoke application commit: `0528acd4355e2766cfe4e1903c251f5ba23dd2fd`.
- Docs-only branch base after that release: `08ab1e733b55601f712787cb27a6c152b9914d7c`.
- Smoke deployment: `dpl_4gdF5ELMNmde62BCrfgwDq341gyw`.
- Smoke URL: `https://sparkle-suite-smoke.vercel.app`.
- Vercel project: `prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ`, team `team_kvcmZ4RlZB0Hah65NE3280x5`.
- Smoke Supabase project: `pukemqiwlyqmyytxkdmo`.
- Both production Suite domains last confirmed unchanged on `dpl_7UoMdq4hoE3ucbpRejcWMuYT5VBH`. Reverify before any future release.
- Smoke extension installed previously: 2.0.6, ID `bpipafleeajdagfimfnfgmhcdendgkfl`, folder `C:\Users\louis\Desktop\sparkle-suite-live-lineup-smoke-2.0.6-verified`, code TDF-1552.
- Never touch CWS extension `kmodgfffflplfdlkkhadgimmobplhoih`.

Prior completed work removed arrow buttons, added a floating drag card and insertion line, stabilized save feedback, and safely rebased harmless heartbeat conflicts. Actual Chrome move of Denise 1→2 and keyboard restoration 2→1 both showed `Lineup saved`. A discovered JSONB key-order comparison bug was fixed: semantically identical entry objects no longer advance lastChangedAt. A 127-test model/service/client run, TypeScript/build and real Chrome proof passed before this draft. Do not repeat or undo those fixes.

Ordering proof: `tests/live-lineup-model.test.ts` explicitly covers manual moves/holds surviving reversed snapshots, with newly arriving IDs appended even when their order timestamp is older. Existing order IDs preserve their relative order; intentional reveals/removals/reset are separate operations.

## Existing Smoke customer data

Six fictional customer profiles were created through the real Smoke UI with Louis's authorization, matching actual lineup names. Tags `smoke-demo, lineup-link-test`; notes identify fictional test data. No contact details or consent added:

| Name | Birthday | Stone | Material | Cut | Collection |
|---|---|---|---|---|---|
| Denise Parini | 02-14 | Amethyst | Silver | Oval | Birthday |
| Virginia Quintana | 07-09 | Ruby | Rose gold | Cushion | Luxe Layers |
| Gloria Gunter | 05-21 | Emerald | Yellow gold | Emerald cut | Simply Studs |
| Trina Biasini | 09-12 | Sapphire | Rhodium | Princess | Sterling |
| Crystal Holden | 10-18 | Opal | Silver | Pear | Halloween Stacks |
| Pamela Klingler | 03-06 | Aquamarine | Rose gold | Round | Originals |

All six linked visibly; Virginia and Crystal had multiple order rows. Retained synthetic `Smoke One` and `A` predate this work and were not created or removed here. Prior visible order: Denise, Virginia, Gloria, Smoke One, Trina, Virginia, A, Crystal, Crystal, Pamela, Christina, Heidi, Nichole, Rebecca. Do not treat that ordering as immutable if Louis has since changed it.

## Draft implementation inventory

### Database and matching

New `supabase/migrations/20260929000100_live_lineup_customer_cards.sql`:
- Adds `identity_label` (max 80), `profile_version`, and `live_lineup` record_source.
- Rep-scoped advisory lock trigger serializes contact creation/writes; update increments profile version. Does not impose unique names.
- New service-role-only `live_lineup_customer_links` stores confirmed order/name-key→customer UUID mappings with same-tenant FK.
- New service-role-only `live_lineup_customer_cards` RPC validates current lineup generation and source identity against stored state, checks visible active/held IDs, and uses a freshness check before auto-creating or resolving.
- Read/inspect creates minimal missing full-name cards only when fresh; repeated full-name orders reuse the same card. Creation sets all consent false and source `live_lineup`, with creation audit.
- Ambiguous names return no birthday/preferences, unless that order has a confirmed valid link. Inspect returns minimal candidates (ID/name/label/created time); no contact details.
- Separate-person creation uses a client-generated UUID for idempotent retry. Resolves only the selected order. Matching changes bump the existing audience realtime version.

New `lib/live-lineup/customer-cards.ts` wraps RPC. Existing `app/api/workspace/live-lineup/audience/route.ts` now uses it and includes held entries. New `app/api/workspace/live-lineup/customers/route.ts` supports inspect/resolve/create with authenticated same-origin tenant context and stored identity checks, then retrieves the matched card.

**Scope detail:** current draft auto-creation runs through Workspace enrichment/inspect requests. It is NOT wired into the extension publish path when no Workspace is open. Decide whether this satisfies the intended full automatic behavior; do not claim closed-Workspace ingestion coverage.

### Profile service, UI and Nic-Nac

- `lib/services/types.ts`, `lib/services/customer-audience.ts`: label/version fields, optional expected-version CAS update, name/ID/label/contact query and collection/cut/birthday-month filters before row limiting. Keeps existing consent/opt-out behavior.
- `app/api/nic-nac/customer-audience/route.ts`: exact customer retrieval, query and label/version patch support.
- `lib/nic-nac/tools/get-customer-audience.ts`: filters and ambiguity instructions.
- `lib/nic-nac/tools/manage-customer-contact.ts`: label input and required `expectedVersion` for updates; retains existing product approval gate. Existing capability catalog already exposes audience tools; no brittle prompt routing added.
- `lib/nic-nac/workspace-refresh-events.ts`, `NicNacChatBody.tsx`: successful customer mutations emit audience refresh.
- New `LineupCustomerEditor.tsx` + CSS: modal editor opened from lineup, birthday/stone/material/cut/collection/private notes/label, minimal changed-field patch, stale-edit guard, candidate selection, separate-person creation, optional `Ask Nic-Nac` handoff.
- `LiveLineupCard.tsx` + CSS: customer card/amber clarification button and editor; preserve drag code. `use-lineup-audience.ts`, `lib/live-lineup/audience.ts`: held entries and richer private receipt validation.
- `DashboardPlaceholder.tsx`: roster label field/search, expected version in roster edits, home-lineup Nic-Nac callback. Expanded lineup callback/held-card affordances still need review.

## Verification at stopping point

Final **`npx tsc --noEmit` passed (exit 0)** after the last edits. No full Next build or lint yet.

Focused Vitest run: **46 passed, 4 failed, 50 total** across 7 files. All **6 new PGlite database tests passed**:
1. Repeat/multiple order creation is idempotent; preferences survive; consent remains false.
2. Duplicate names suppress details; confirmation applies only to selected order and survives refresh.
3. Cross-tenant selection and changed source identity rejected with transaction rollback.
4. Stale/hidden orders cannot create/resolve cards.
5. Separate-person retry creates one card/audit entry and never renames/merges others.
6. Unprivileged RPC execution denied.

Four failures remain:
- `tests/services/customer-audience.test.ts`: exact result assertion now receives `identityLabel:null` and `profileVersion:0`. Update expectations while retaining tenant/consent assertions.
- `tests/live-lineup-audience-route.test.ts`: 3 tests still use old audience RPC fixtures. Expected 200/409 now gets 503 because the route calls the new receipt contract. Update realistic fixtures and keep tenant/source-race/timeout assertions; do not weaken tests to accept errors.
- These failures were inspected, not fixed. No claim the entire suite passes.

Passing existing files included customer API (7), old audience matcher (4), workspace refresh (13), Nic-Nac audience tool (4); service passed 9/10 and route 3/6. The final roster/chat edits happened after that suite, so rerun the focused set after fixture updates.

Suggested command:
```sh
npx vitest run tests/live-lineup-customer-cards.test.ts tests/live-lineup-audience.test.ts tests/live-lineup-audience-route.test.ts tests/services/customer-audience.test.ts tests/nic-nac/customer-audience-tool.test.ts tests/nic-nac-customer-audience-route.test.ts tests/nic-nac-workspace-refresh-events.test.ts
```

## Review gaps and risks to finish (not proven failures unless stated)

1. Fresh RPC preferences are raw DB values, whereas the prior matcher sanitized/truncated them to 80 characters. Existing client receipt accepts at most 100 characters; customer fields can be 120/160. Normalize/sanitize consistently so valid longer preferences do not silently erase all chips. Add a regression.
2. Review SQL lock ordering and genuine concurrent transactions (PGlite proves behavior, not hosted multi-client races). Ensure no duplicate auto cards from competing auto requests and no deadlock with existing manual/signup/import writers. Review p_new_customer_id replay/conflicting labels and relationship audit.
3. Review freshness parity with `lineupFreshness`, missing names, hidden/held rows, source reset/reconnect, identity changes mid-dialog, resolution invalidation on rename/delete, and old response suppression.
4. New profile reads unconditionally select new columns. **Apply the additive migration to Smoke before deploying this application there.** No production schema write is authorized. Review rollback compatibility and required grants/RLS.
5. Add service/tool tests for filter-before-limit (including >1000 customers), duplicate names, birthday-month filtering, exact ID lookup, expected-version conflicts, and only changed fields being updated. Assess performance/pagination and avoid silently treating a truncated result as a unique match.
6. Finish accessible UI/browser QA: focus return/Escape, narrow screens, field errors, retries/lost responses, button positioning, no accidental drag when clicking card, no layout shift during gesture, no draft overwrites on refresh. Native HTML dialog is application UI, not a JS alert/confirm.
7. Ensure distinguishing labels appear in the main Customer List, not merely its editor/search. Confirm roster CAS doesn't reset or erase unsaved edits during realtime refresh. Add consistent refresh event coverage.
8. Verify `Ask Nic-Nac` exact-card lookup from home and expanded lineup; add held-card access if appropriate. Nic-Nac currently has general customer read/edit tools; no dedicated conversational order-link resolver was added. Do not claim full clarification through Nic-Nac until implemented/verified.
9. Existing self-service signup inserts a new customer record; future central-profile merging was intentionally not implemented. Review how an auto card and later signup should connect without misattributing identity or consent. Do not silently merge same-name people.
10. Test actual Nic-Nac retrieval and an approved fictional-preference edit through the deployed Smoke UI, verifying the tool result/database/UI. Model instructions alone are insufficient proof. No outbound sends; default catalog still excludes direct message sends.
11. Run focused tests, relevant lineup regression suite, TypeScript/lint/full Next build, then only a guarded Smoke migration and exact committed deployment. Verify real existing orders and customer cards in Chrome. Preserve original lineup order during tests.
12. Finish short dual memory closeout with exact commit/deploy/evidence and remaining limitations. Do not call this ready before actual workflow verification.

## Browser and local evidence

Before browser-side changes, follow Louis's reliability preflight: load current bundled Chrome runtime, list tabs, claim exact returned target, complete harmless read. If it fails, audit extension/native-host registry/runtime before asking Louis to restart anything. Do not use stale claimed IDs without listing.

Last read-only preflight this draft:
- Current bundled Chrome `latest` resolved to `C:\Users\louis\.codex\plugins\cache\openai-bundled\chrome\26.924.22138`.
- Runtime docs reloaded; listed and claimed Smoke tab `788293864`, Chrome browser ID `2`.
- Smoke URL: `https://sparkle-suite-smoke.vercel.app/nic-nac?conversationId=6566f610-7ff9-4e36-a6b9-362e57859046`.
- AX read succeeded and showed 14 retained entries/customer chips, **Waiting for an update**, movement disabled. This was BEFORE draft deployment (none occurred); do not assume currently Connected. No further connection investigation was done.
- A screenshot read timed out after 5 seconds. No browser mutation followed. Do not misreport screenshot success or blame the website from that alone.
- Bomb Party tab `788293867`, URL `https://myoffice.bombparty.com/live-party-orders`; untouched.

User recording: `C:\Users\louis\Downloads\Recording 2026-09-29 093821.mp4` (21 seconds, 1660×914). Prior completed polish evidence:
`C:\Users\louis\.codex\visualizations\2026\09\28\01a0e9e8-eb5a-7390-aa9e-86b490e4dc8d\lineup-drag-polish\smoke-lineup-verified.png`
and `customer-details-linked.png`, `drag-preview.png`, `recording-contact-sheet.jpg`, `drag-detail.jpg` in that folder. These prove the previous deployed work, not this new draft.

## Credentials and tooling

No secrets are included. Grokbot/Cursor needs its own authorized GitHub/Codespace/Vercel/Supabase access. Existing tracked Smoke helpers: `scripts/smoke-environment/deploy-reviewed.mjs`, `migrate-lineup.mjs`, `guards.mjs`, `verify.mjs`. Read before reuse. `migrate-lineup.mjs` currently hardcodes OLDER September 26 migrations, requires explicit Smoke environment/password and validates three synthetic rep identities; it is not ready to apply this new migration. The old temporary `/tmp/lineup-push.cjs` helper no longer exists. Do not assume other `/tmp` artifacts survive a Codespace restart.

## Continue from here

Preserve the draft, verify provenance, fix the known receipt/test gaps, complete the review checklist and actual Smoke workflow. Do not repeat the completed extension/drag repairs or build Finder integration now. Ask Louis only for genuinely missing information or authority; Smoke-first customer-card work is already authorized. This handoff is a checkpoint, not approval to publish production or the Chrome Web Store.
