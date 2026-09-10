# Nic-Nac Calendar Audit and Hardening — September 9, 2026

## Scope

Read-only audit of the disclosed Brittany support session and the Calendar service,
workflow controller, tool contracts, prompts, summary route, and focused tests. The
paused Live Lineup worktree changes were not edited, tested, built, staged, or
released.

## Confirmed causes

1. A new correction could inherit an older `add_show` request because Calendar
   intent detection searched several recent turns for add language before checking
   the latest turn for update language.
2. The update tool discarded `durationMinutes` unless the latest turn literally
   used duration-style wording. Natural end-time corrections such as "end at 5"
   therefore changed the start but silently preserved the old duration.
3. `add_show`, `cancel_show_series`, and `pause_show_series` could return every
   materialized occurrence. An ongoing weekday series can contain 130 rows, which
   made the agent result slow and unnecessarily large.
4. `list_my_shows` returned UTC timestamps without trusted local display fields and
   returned occurrence rows without a compact recurring-series target. This made
   local-time interpretation and series selection error-prone.
5. Calendar workflow readiness treated optional title and duration fields as
   required, causing avoidable follow-up questions.
6. The Calendar summary's history query did not constrain results to past start
   times. Future cancelled occurrences could fill "Recently wrapped" and make a
   replaced series look as though it were still current.
7. The service deliberately rejects `eventTime` combined with `applyToSeries`.
   Nic-Nac therefore cannot atomically shift the start/date-time of the selected
   and future occurrences in one recurring series update.
8. The workspace currently starts a Calendar refresh after each successful tool
   result without a latest-request guard. A cancel-and-recreate turn can produce
   overlapping reads, allowing an older response to temporarily replace the newer
   Calendar state.

## Implemented hardening

- Latest explicit correction/update wording now wins over older add-show language.
- End-time and start-to-end-range wording authorizes the requested duration patch.
- The update tool now exposes its already-supported streaming-destination field.
- Large recurring mutation results are compacted to counts plus first/last event
  evidence, while small results remain inline.
- Workflow finalization understands compact first/last event evidence.
- Calendar reads now include trusted rep-local start/end labels and recurring-series
  summaries with one next-event target per returned series.
- New-show readiness now matches the service contract: platform, explicit time, and
  timezone are required; title and duration remain optional.
- Calendar history now excludes future cancelled/completed occurrences.
- Agent instructions now prohibit fanning a series-wide start-time change into many
  per-occurrence writes or presenting that workaround as seamless.

## Deferred behind protected dirty work

- A direct, atomic recurring-series start/date-time shift needs a database-owned
  transaction/RPC and a dedicated tool/service contract. The pending Live Lineup
  migrations make an unrelated migration unsafe to apply from this shared worktree.
- The latest-request-wins Calendar refresh guard belongs in currently dirty,
  protected workspace components. Do not edit those components until the Live
  Lineup checkpoint is resumed or moved out of this worktree.

## Verification

- Focused Calendar, workflow, summary-route, and prompt suite: 9 files, 127 tests
  passed.
- No production Calendar records were changed during the audit.
