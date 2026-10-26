# October 25, 2026 — PR #156 second quality pass

Louis explicitly changed the release boundary to **preview only**. Do not deploy to Smoke, promote, unpin Live, or move either Live alias. Suite, Beacon and Rocky review the preview before Smoke. Louis must approve Live by name. Continue the existing PR and branch; do not create another PR.

- PR: https://github.com/louis623/sparkle-suite/pull/156, draft, branch `codex/hero-autoplay-smoke`, base `codex/nic-nac-trade-hardening` at `e78fa626`.
- Application: `fba6acda25a46e64747c01601d23066099f2eb84`.
- Protected preview: https://sparkle-suite-smoke-ku4fukcnv-louis-2849s-projects.vercel.app, deployment `dpl_2PPW1Wcf5kToQ7Pwjdmr9odVEZEY`, target Preview. Project name `sparkle-suite-smoke` does not imply a Smoke release.
- Live remains pinned to `dpl_3KRyLQ47YzNQQwEuaFyW4nRZxs9P`; Smoke remains `dpl_FD4TYQgPLe6UB8cE1zYgqyuJsV4Z`.

The detailed report and reviewable evidence are in [the pass report](../docs/sparkle-suite/operations/2026-10-25-hero-autoplay-preview-pass2.md) and its linked 23-theme table/46 filmstrips. Theme median LCP ranges: 1.162–1.928s phone, 0.567–1.077s desktop; maximum median CLS 0.0357/0.0293. Final preview real `/dudesfizzfest` route: 1.984s phone / 1.024s desktop, CLS 0 / 0.0104. The first cold deployment phone load was 2.776s; do not claim every load passes. The requested five-run median gate passes.

Twenty phone themes retain byte-identical CSS/font delivery measurements from `7d5874c9`; three corrected phone themes and every desktop theme use `4d5459f4`. Subsequent changes only overlap guarded public rep reads and defer rep analytics until first paint. Theme-preview delivery is unchanged. The final real route was remeasured on `fba6acda`. Do not describe all 230 timing samples as newly collected on the final deployment.

Fixed responsive scene delivery, font metric shifts, hydration across timezones, early Neon observer mutation, Sunset poster visibility, first-gesture audio fallback, and rep-route data/analytics waterfalls. All 11 layout locks remain unchanged; an intermediate locked-file optimization failed the build and was replaced with request-layer changes. The protected template was restored exactly.

Final preview: all 46 autoplay/control cases pass, maximum observed control-event duration 104ms on both profiles. UTC/New York/Tokyo hydration retains the server hero with no errors. Deployed compiled homepage, Sunset marketing picture, responsive backgrounds and poster match repository hashes. Final proof JSON and 46 sample-content filmstrips are checked into the report's evidence directory; real rep fixtures remain local.

Real Live public Fizz Festival settings contain saved `heroMotion: still`. Loopback-only fixtures using that existing projection pass all 23 desktop autoplay/control cases; the exact Pumpkin Cat selection also passes slow phone. No account was edited and no rep fixture was published. Preview's actual rep record is older The Dudes Fizzfest / Sunset Beach, so it is not identical to Live Fizz Festival / Pumpkin Cat.

Only Unicorn, Fall Owl and Sunset Beach have soundtracks. They attempt audible autoplay, fall back to muted motion if the browser refuses, and retry sound on the first page tap/Enter/Space unless an explicit control cancels that intent. Existing silent themes stay silent. Legacy Still/none maps to theme autoplay without rewriting saved records; reduced-motion browser preferences remain respected.

Full-suite comparison remains a release blocker: base 5,579 passed / 65 failed / 4 skipped / one unfinished assertion; candidate with focused final rechecks 5,593 passed / 51 failed / 4 skipped, zero new failing assertion identities. Two import failures exist on both. QR/flyer test did not finish in the full runs or a three-minute isolated check; candidate full rerun excluded it. Do not call this a clean suite or production-ready. Final Vercel production build/TypeScript and focused regression checks pass. Existing Fontshare SaaS/font-picker rights need a separate review; proprietary fonts were not redistributed here. Effort/cost of these separate investigations is not estimated.

Standing Neon Rabbit Production Quality Standard: proactively flag non-production quality and its consequences/cost; target main content <=2.5s (desktop <2s, mid-range slow-4G phone <3s unless a stricter task target applies), tap <=200ms, no unstyled flash/layout jumps; preserve all existing workflows; production builds only; approved art/branding; private data and credentials protected; automated tests plus every-theme screenshot/animation checks; PRs state behavior/risks/proof/exact rollback. Release order is Smoke, Louis's Live demo canary, then all reps, with Rocky review and Louis's named Live approval. Recheck Live within 15 minutes and roll back first if anything is wrong. This task adds preview review before Smoke and stricter phone <=2.5s / CLS <=0.05 gates.

Rollback for this pass means stop using its preview. No release alias needs to move. Pre-pass code checkpoint is `459b51f8360e432ec712a6aa9db2f04ae7437e96`; exact reverse commit sequence is in the report. No Live action is authorized.

Dual-memory closeout: the actual Open Brain MCP confirmed capture of this pass and Louis's standing quality standard as an observation. The repository vault and four index files are updated separately. Final alias readback again confirmed both Live domains and Smoke unchanged.
