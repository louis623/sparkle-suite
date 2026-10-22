# October 22, 2026 — PR 141 Nic-Nac repairs (PR only)

Louis explicitly approved an exception for cursor/nicnac-photo-hardening only:
edit, test, commit and push. No merge, deploy, production branch, Smoke, Live,
extension, real rep session, database migration or provider mutation.

Implementation ran in C:/Users/louis/sparkle-suite-repo/.codex-worktrees/nicnac-pr141.
The dirty primary checkout was preserved. No permanent active-branch config,
GitHub default branch or Vercel production branch was changed.

PR: https://github.com/louis623/sparkle-suite/pull/141
Baseline: b618966dfcb252bc54ec951cdee8a4375dffe42a
Verified product tip: 810bea061a8de73f8ab52a05bf3bae0e34e9b22b

## Seven separately reviewable code commits

- 16ecde65: New chat sends use a stable SDK id; failed sends remain retryable.
- bca91139: Stored history supplies the preview/details; recovery text does not expose handler instructions.
- 4b14b677: Rollover preserves rows, old chats are read-only, only the final pending sentence gets an overlay, and Recent scans distinct chats including cleared ones.
- 355657ec: Quality, role and refusal gates apply before preview and again before save.
- bf5755ee: Listing publication keeps original bytes; no crop/enhancement fallback.
- 50427156: Client IDs and atomic reply claims prevent concurrent replay; first server receive time stays fixed.
- 810bea06: Skip checks the stored piece and actual listing; query errors are not reported as unsaved.

## Evidence

- npm test -- --maxWorkers=2: 47 files, 754 tests passed (October 22, 2026).
- npx tsc --noEmit: passed.
- git diff --check against the supplied baseline: passed.
- Real AI SDK transport reaches real POST and SQL persistence. Six overlapping
  requests for one client ID produce one user and one assistant row. A simulated
  five-minute pending turn is not restarted; lost-response retries preserve IDs.
- Real POST/intake/listing services and the checked-in SQL RPC cover duplicate,
  no, replacement, yes; missing client preview; invented preview; label/refused
  uploads; defect flags after confirmation; original bytes for both an existing
  and a newly created design; skip before/after save; and failed lookups.
- Both rollover endpoints leave source rows exactly unchanged, retain Diamond,
  and reject stale submissions before writes. Recent includes a cleared chat
  behind a 1,001-row current chat; a database failure returns an error.

Tests use isolated PGlite PostgreSQL plus a Supabase-query adapter, with synthetic
identity and controlled model, OCR/pixel, storage and telemetry boundaries.
Hosted RLS, real model/provider output, real camera pixels and signed-in rendered
phone/desktop behavior were not tested. No signed-in Smoke pass is claimed.
The baseline full-history replacement sequence passed locally; the reported
0/8 live failure was not directly reproduced. Confirmed fixes address the SDK
blocker and stale/missing client preview authority.

GitHub reports PR base conflicts. Do not merge or deploy this branch on the
strength of these tests. Louis's PR review/retest and a separately authorized
integration decision remain next. This work is separate from the morning release.

Detailed analysis: ../ANALYSIS.md. This session is mirrored in actual Open Brain
at closeout; repository vault and Open Brain remain separate records.
