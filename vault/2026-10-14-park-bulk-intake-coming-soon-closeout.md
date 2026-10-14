# October 14, 2026 — Park Bulk Collection Intake as Coming Soon

- UI only. The Dance Floor card keeps the Bulk Collection Intake title and blurb. The Open button is a Coming Soon label. `?section=collection-intake` renders the standard Coming Soon panel.
- `CollectionIntakeTool.tsx` stays in the repo, unused, and off the Tools list.
- Product commit `df87a038` on `codex/park-bulk-intake-coming-soon`, from `codex/nic-nac-trade-hardening` at `e295364c`. This puts the already-deployed Smoke UI from local commit `ccc1273c` into git.
- No DB, API, or migration change. No Vercel deploy. No Live DB write.
- Typecheck passed. Dashboard and collection-intake tests passed. The same three pre-existing failures remain in `reviewer-smoke-ui` and `prelaunch-root-route`.
