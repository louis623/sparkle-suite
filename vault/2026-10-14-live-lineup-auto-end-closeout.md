# Live Lineup automatic show ending — 2026-10-14

- Draft PR: https://github.com/louis623/sparkle-suite/pull/95 on `cursor/live-lineup-auto-end-show-b22f`. Deployed code is `ee5612c7c37499ccad2bfd54de7fc96824b9c601`.
- A ready snapshot archives a show only when it started more than 18 hours ago and the lineup has been idle for 2 hours. A loading packet does not end it. An active show past 18 hours stays open.
- If every visible party is missing from several ready snapshots spanning 10 minutes, the show archives onto the parties that remain. One snapshot is not enough. Hidden parties and a blank table do not count.
- A party missing for that same 10-minute run has its orders parked and restored when the party returns, including a held order such as Brooke. Once 10,000 restorations are stored, further orders stay in the lineup and the packet is still accepted.
- Setup that sees a new party keeps the old parties, the same generation, and every order.
- Extension 2.0.6 resumes the next pull after `show_changed` without a rep reselect. An active show does not take that path.
- Suite Smoke preview: https://sparkle-suite-smoke-o542ed4d0-louis-2849s-projects.vercel.app (`dpl_JVtzceQnxm54Yb2QJPGYfFWKgsiQ`, project `sparkle-suite-smoke`). Homepage returned 200 for that deployment id. The shared Smoke alias stayed on `dpl_4CwkKgDxoyfxAA7tsKgHMcexhEep`. `www.yoursparklesuite.com` and `yoursparklesuite.com` stayed on live `dpl_HdT4V7ccu9MzCwtweXmGWc4sDEWD`. The live database was not written.
- Tests: rollover and service 53 passed; lifecycle, archive, workspace, and model 116 passed; `tsc --noEmit` passed.
- Next: review the draft. Leave the shared Smoke alias and Live where they are until that is a separate approval.
