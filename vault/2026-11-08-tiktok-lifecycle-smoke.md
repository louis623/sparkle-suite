# November 8 — TikTok intermittent playback, Smoke only

- Louis supplied blocked/playing screenshots and four Brittany IDs; same videos intermittently work, fold/unfold affects playback. Width, UA and provider interstitial trigger remain unconfirmed; no broken-video/music attribution.
- Base GitHub tip `210d51629637b45f895c5e13afdaa57b9c09ec45`; disposable `/workspace/codex-runs/suite-tiktok-embed-fix`, PR branch `codex/tiktok-embed-lifecycle-smoke`. One Smoke preview only; no Live, DB/env writes, merge or alias changes.
- Concrete source defect: iframe load/intersection send play before readiness; readiness starts offscreen players; 50% intersection can be unreachable on tall phone cards. Candidate delays navigation until visible/settled, waits for readiness, pauses offscreen, preserves iframe identity and sound on fold. Shared card CSS unchanged. Surgical TikTok-only legacy snapshot change is mirrored in v2/public authoring; manifest updated for that file only.
- One focused invocation: 17 pass, 3 fail, 55 unrelated skipped. Three failures were mutable DOMRect test-double errors; double corrected to snapshot, intentionally not rerun under Louis's once-only cap. TypeScript/layout locks/bundle pass; ESLint zero errors/two pre-existing warnings.
- Smoke readonly content query: no Brittany/Main Gem rows; Heather has four TikToks, same player source. Labeled same-video fixtures compare Brittany with Main Gem layout; they are not actual Main Gem saved-content parity. No fixture persisted.
- Final PR/deploy/load/screenshot evidence will be saved to `/workspace/codex-runs/suite-tiktok-embed-fix.report.md`. Do not call candidate proven or Live-ready.
- Open Brain write unavailable: no capture_thought MCP tool exposed in this session. No alternate memory service used.
