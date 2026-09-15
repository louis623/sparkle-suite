# Live Lineup UI session handoff — September 15, 2026

## Objective completed

Refined the Live Lineup across the rep Workspace, customer sites, and operator
support mode so it is simple for nontechnical reps, responsive for customers,
and useful in a tall Workspace rail.

## Released work

1. Workspace UI simplification (`89f8d52e`, deployment
   `dpl_6EdixkzoH3j6qsDJJhvwtGx4ovTH`): compact left-column card, plain-English
   connection language, queue order/reordering, and removal of homepage-only
   engineering clutter.
2. Public responsiveness and support routing (`f1a275db`, deployment
   `dpl_6Nb3n2x7pENJypm4zn1DmzSpL5nL`): all public customers render responsively,
   updated time is last, and selected-rep support reads use the audited read-only
   gateway.
3. Workspace height refinement (`c827df4f`, deployment
   `dpl_CyTUoervEnsJt7V9R1R2zoNKyXSC`): card fills the remaining rail, guarantees
   a 460px minimum region, displays four or more compact rows in the target
   desktop/tablet layout, and scrolls internally for long queues.

The branch tip after documentation closeout is `91d6a827` on
`codex/nic-nac-trade-hardening`. The active production application remains exact
application commit `c827df4f0bd6ef0661e3671051fe95e990b1ccf0` on READY deployment
`dpl_CyTUoervEnsJt7V9R1R2zoNKyXSC`.

## Key decisions

- Homepage Lineup is an operational tool, not a diagnostics screen.
- Customer-facing status never says “delayed”; use the last-updated time.
- Public lineup capacity is responsive rather than capped at four.
- Workspace card uses available height and shows at least four customers before
  relying on internal scrolling.
- Support mode is GET-only and tenant-frozen; no reordering or publishing.
- Do not use personal/customer accounts when safe reviewer mode is unavailable.

## Evidence and lessons

- Focused height tests passed 16/16 and the exact production build passed.
- Vercel confirmed both Suite domains and established customer aliases point to
  the READY deployment.
- Brittany was connected with 20 customers during read-only inspection.
- Bri's Glowtique lacked current v2 publisher state; Safari work was deferred.
- Fixed child height caps and vertically stacked row controls caused the wasted
  rail space. Responsive verification must include parent flex growth, child
  scroller sizing, and real row geometry.

## Remaining work

- Run final authenticated desktop/tablet/mobile visual smoke when the protected
  reviewer token is available.
- Revisit Safari/Bri only in a separately scoped session.
- Preserve the large unrelated dirty workspace and protected local extension
  overlay; never bulk stage, clean, reset, or overwrite them.

## Continue from here

Read this file plus `vault/project-state.md`, `vault/session-log.md`,
`vault/decisions.md`, and `vault/open-items.md`. Confirm the repo, remote,
allowlisted branch, and HEAD. Open `https://www.yoursparklesuite.com/control-center`
inside the Codex desktop app and stand by for Louis's next instruction. Do not
repeat completed work, change production, touch live queue/extension state, or
start the deferred Safari investigation unless Louis asks.
