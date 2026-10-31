# SSR Rocky review fixes — October 31, 2026

Code only, from verified GitHub branch `codex/ssr-per-rep-allowlist` at `6439b09429523bc0621b169a3eabc3c3385a8e3c`, in the requested clean worktree `/workspace/repos/sparkle-suite-ssr`. The commit containing this note is NEW_HEAD; its exact SHA is reported after push and independently read back from GitHub. PR #169 remains draft.

- **Amethyst:** the motion-wanted SSR still and native video poster use `opening-poster.webp`; reduced motion and visitor Pause use `hero-poster.webp`. The picture keeps the original media grid through `display:contents`. Existing still-decode/two-frame startup, autoplay, looping, and visitor intent scheduling are preserved. New tests cover initial preferences and poster transitions.
- **Paint:** the render-blocking expectation link and end-of-tree target are removed entirely. An inert, aria-hidden sizing twin reserves the saved responsive hero copy/actions in the same grid cell, without duplicate accessible headings, IDs or media. Final composition is retained. Original pinned embedded fonts are decoded as buffer-backed FontFaces before the CSS payload; the competing URL faces are removed only after synchronous successful decoding. This prevents WebKit font metric swaps without a page render gate, font-byte duplication or network dependency. Two tests cover successful replacement and the safe fallback.
- **Deferred harness:** [script](../scripts/qa/ssr-smoke-ab.cjs), [pure gates](../scripts/qa/ssr-smoke-ab-metrics.cjs), and [usage](../scripts/qa/ssr-smoke-ab.md). At least five runs per phone/desktop control and cohort; any Pause/Play/sound/nav/CTA median >200ms fails. Alpine Opal Trade LCP must beat/equal legacy; all seven FCP medians must beat/equal the exact 53c43d0b cohort. Missing evidence fails closed. Targets are deduplicated. Vercel alias/deployment reads return strictly selected fields; raw metadata/errors/headers never escape. **The harness was not executed.** Its offline tests make no service calls.
- **Checks:** typecheck, guarded production build, and layout lock pass. Focused **516/0/0**; final full suite **6068/75/6**, versus **6059/75/6**: **+9 passing tests; zero new failing names**. The four existing suite-load errors remain unchanged. The first high-concurrency run had seven additional timing failures; the final two-worker run returned to baseline, with no timeout or flyer-test/code changes. All 69 strict HTML hashes are refreshed.

The local matrix has **336** successful samples: five normal-motion cold contexts and one reduced-motion context per renderer, engine, device and surface. The controlled 250ms response split follows the visible H1. Synthetic content is identical; all 69 gated fixtures were independently regenerated from verified 6439b09 and match after server-clock normalization. These are loopback layout/FCP measurements, not deployed Smoke acceptance. Chromium 156 and Playwright WebKit 26.5 were used because the Browser plugin is unavailable. No page errors occurred. [Structured evidence](2026-10-31-ssr-rocky-review.json).

| Surface | Chromium native CLS | WebKit geometry |
| --- | ---: | --- |
| halloween_pumpkin_cat/homepage | 0 | 0 observed movement* |
| fall_owl_harvest_moon/homepage | 0 | 0 observed movement* |
| midnight_rose/homepage | 0 | 0 observed movement* |
| rose_gold/homepage | 0 | 0 observed movement* |
| pearl_rose/join | 0 | 0 observed movement* |
| midnight_rose/join | 0 | 0 observed movement* |
| alpine_opal/trade | 0 | 0 observed movement* |

*WebKit 26.5 does not expose native layout-shift entries. Zero means no frame-by-frame movement in visible header links, hero/title/card/copy and control rectangles, excluding the inert reservation; it is not a claimed native WebKit CLS reading. Both desktop/phone and normal/reduced preference cases are covered.

FCP median milliseconds, **gated → fixed**, five runs per cell; all 28 matched comparisons improve:

| Surface | Chromium desktop | Chromium phone | WebKit desktop | WebKit phone |
| --- | ---: | ---: | ---: | ---: |
| halloween_pumpkin_cat/homepage | 380 → 132 | 324 → 72 | 385 → 104 | 383 → 118 |
| fall_owl_harvest_moon/homepage | 372 → 136 | 332 → 104 | 351 → 142 | 349 → 129 |
| midnight_rose/homepage | 368 → 132 | 336 → 104 | 351 → 133 | 345 → 132 |
| rose_gold/homepage | 500 → 132 | 408 → 108 | 340 → 161 | 344 → 153 |
| pearl_rose/join | 376 → 128 | 356 → 92 | 315 → 158 | 305 → 147 |
| midnight_rose/join | 376 → 172 | 376 → 104 | 308 → 151 | 313 → 170 |
| alpine_opal/trade | 512 → 164 | 364 → 84 | 300 → 107 | 294 → 104 |

Review/reset: regenerate via the existing Step-1 offline fixture preparer and generator, then open `http://127.0.0.1:4398/review?theme=amethyst&page=homepage&renderer=ssr`. The visible synthetic-review label persists; no forms are submitted. Initial normal motion shows the opening frame and autostarts. Pause shows the final still; Play restores the opening poster and running video. Reduced motion starts on the final still without a video source. When checking WebKit playback after clicking a phone control, scroll the artwork back into view, as its native visibility policy may suspend offscreen media. Fresh contexts/regeneration reset the fixtures; no DB reset is involved. Existing tests continue to prove production review overrides are disabled.

No deployment, Vercel alias/env/project-setting action, Smoke/Live DB access, Live HTTP request, merge, extension edit, frozen/legacy asset edit or flyer code change occurred. The Supabase URL stop was not acted on. The three filed reduced-motion Play issues remain out of scope.

Files changed:

- `lib/amethyst/generated/homepage-styles.json`
- `lib/amethyst/generated/page-runtimes.json`
- `lib/amethyst/hero-motion-config.ts`
- `lib/amethyst/hero-motion-controls.ts`
- `lib/amethyst/page-first-paint.ts`
- `lib/amethyst/utility-page-fonts.ts`
- `lib/amethyst/v2/hero-copy-reservation.jsx`
- `lib/amethyst/v2/hero-motion.jsx`
- `lib/amethyst/v2/homepage.jsx`
- `lib/amethyst/v2/join.jsx`
- `public/amethyst/compiled/homepage.js`
- `public/amethyst/compiled/join.js`
- `public/amethyst/compiled/trade.js`
- `public/amethyst/ssr-hero-motion.css`
- `scripts/qa/ssr-smoke-ab-metrics.cjs`
- `scripts/qa/ssr-smoke-ab.cjs`
- `scripts/qa/ssr-smoke-ab.md`
- `tests/amethyst-ssr-all-themes.test.ts`
- `tests/amethyst-ssr-paint-stability.test.ts`
- `tests/amethyst-ssr-reduced-motion.test.ts`
- `tests/fixtures/amethyst-ssr-non-mhf-sha256.json`
- `tests/ssr-smoke-ab-gates.test.ts`
- `vault/2026-10-31-ssr-rocky-review.json`
- `vault/2026-10-31-ssr-rocky-review.md`

Open Brain write attempt: unavailable; discovery exposed no Open Brain/capture_thought capability. Repo-vault write: this short closeout and its measurement artifact.

Next-session prompt: Resume draft PR #169 from the verified NEW_HEAD on `codex/ssr-per-rep-allowlist`; run the deferred Smoke A/B once on the fixed code using Louis’s separate authorization. Preserve the no-Live boundary and hard tap/LCP/FCP gates.
