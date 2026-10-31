Application commit: `cd1dc1491bfe33a8a38d02003cb769919a490775`. Branch `codex/ssr-per-rep-allowlist`; PR #169 remains draft. Input tip `b0a3511b` (app `0f42a0c6`). Code and offline tests only.

1. Legacy: guarded theme/layout query passes through the original template-loader request and normal APIs. No extra HTML-path data read, inline-bootstrap optimization, or frozen asset change. The three exact integrity-pinned React/Babel CDN URLs required by frozen legacy HTML are allowed for that cohort; arbitrary provider/CDN URLs stay blocked. Actual runtime theme mismatch fails closed.
2. Gates: every case/profile compares candidate FCP and LCP medians to legacy; candidate CLS must equal zero; any page or hydration error fails. Absolute LCP is strictly <2000ms desktop / <2500ms phone. The only absolute-speed waivers are phone Gilded Autumn home/join and Alpine Opal home/join/trade on MHF; they never waive regression, CLS, errors or taps.
3. Cases: Gilded Autumn and Alpine Opal home/join/trade use MHF, alongside all existing cases (13 total). No other rep themes added.
4. Taps: first interactive loading/hydration and idle phases; fixed selectors/action availability; five samples per control/profile/renderer/phase; median >200ms fails. Local tests use trusted input and preserve real native control behavior. Sound is inapplicable to Lindsey's authored pages; retained Amethyst/Fall Owl cases still require it.
5. Layout: responsive inert copy reserves the requested MHF Home/Join sizes, including Alpine Opal. Chromium and WebKit pre-/post-H1 splits all have zero movement; no paint hold.
6. Hydration: exact server lineup snapshot plus existing server timestamp reach the browser; Join year uses that timestamp. Gilded's existing video is in the hydration tree, starts eagerly without a poster wait, and is not remounted by the motion script. +400-day clock probes pass; removing the snapshot triggers hydration errors in all four negative controls.
7. Amethyst: motion-mode opening-poster image preload restored; reduced-motion still preserved.
8. Checks: 69 CR-normalized hashes refreshed. Typecheck and guarded build pass. Focused 635/0/0. Full isolated run 6106/75/6 versus 6068/75/6 (+38 passes); zero new failing names; the same four pre-existing suite-load errors remain.

Local synthetic MHF fixtures only. Each tap cell is the largest **per-control median** for that engine/phase, in milliseconds (loading / idle). Detailed per-control medians and all samples are in `local-browser-results.json`. C = Chromium native CLS; W = WebKit maximum frame-by-frame displacement in pixels. WebKit does not expose native LayoutShift entries, so no native WebKit CLS is claimed.

| Theme / page | Device | C CLS | W shift px | Hydration errors | Chromium taps L/I ms | WebKit taps L/I ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| gilded_autumn/home | phone | 0 | 0 | 0 | 47.1 / 47.0 | 76.0 / 43.0 |
| gilded_autumn/join | phone | 0 | 0 | 0 | 46.5 / 47.4 | 40.0 / 47.0 |
| gilded_autumn/trade | phone | 0 | 0 | 0 | 47.0 / 46.5 | 37.0 / 29.0 |
| alpine_opal/home | phone | 0 | 0 | 0 | 47.0 / 47.9 | 229.0 / 49.0 |
| alpine_opal/join | phone | 0 | 0 | 0 | 60.5 / 60.3 | 118.0 / 89.0 |
| alpine_opal/trade | phone | 0 | 0 | 0 | 61.3 / 63.0 | 81.0 / 39.0 |
| gilded_autumn/home | desktop | 0 | 0 | 0 | 48.3 / 47.0 | 714.0 / 54.0 |
| gilded_autumn/join | desktop | 0 | 0 | 0 | 49.4 / 46.6 | 77.0 / 89.0 |
| gilded_autumn/trade | desktop | 0 | 0 | 0 | 46.3 / 47.1 | 44.0 / 39.0 |
| alpine_opal/home | desktop | 0 | 0 | 0 | 47.6 / 47.8 | 236.0 / 106.0 |
| alpine_opal/join | desktop | 0 | 0 | 0 | 123.9 / 169.9 | 181.0 / 144.0 |
| alpine_opal/trade | desktop | 0 | 0 | 0 | 63.0 / 79.3 | 205.0 / 70.0 |

72 split-stream samples, 640 trusted tap samples and eight clock probes (four positive / four expected-negative) completed. Every final positive page/hydration check is zero. Tap acceptance is reported without waivers; see failed gates below. The validated 22-stream/203-tap checkpoint was resumed with matching fixture/runtime bytes after an early Pause kept a media load event pending. Loading checks now require DOM completion and verified hydration rather than that media load event. No failed timing sample is waived.

Local transport: 400ms pre-/post-H1 stream gap; a 1200ms trailing-body transport gap (3000ms for remaining Play coverage) exposes the first interactive loading moment. Idle follows load/fonts, active hero playback advancing at least one second, then 300ms. A preliminary 300ms-only idle probe was still in WebKit video startup (native Pause roughly 700ms); that exploratory startup point is not represented as steady idle. The unchanged video/control behavior was retained. This local matrix is not the throttled deployed A/B.

Legacy assets originate at `3f175871674e42dbc62d18419318941ea6a49935` (frozen manifest). No legacy deployment benchmark SHA was selected or measured: Smoke/Live access is outside this session. The deferred harness requires and records the exact verified 40-character legacy deployment SHA and a fixed 12000ms settle time.

Reproduce: `npx vitest run tests/amethyst-ssr-lindsey.test.ts`, then `node scripts/qa/ssr-local-lindsey.cjs /path/to/playwright output.json /path/to/webkit-executable`. For an interrupted fingerprinted result, append `resume`. The WebKit executable used here is the existing local review wrapper at `/workspace/release-ssr-finder-rocky-review/pr169/pw/wk.sh`; no system/browser environment or VM limit was changed.

Local tap gate: **FAIL**. Failed gates: [{"engine": "webkit", "id": "alpine_opal/homepage", "profile": "phone", "phase": "loading", "action": "nav", "medianMs": 229.0000000000001, "pass": false}, {"engine": "webkit", "id": "alpine_opal/homepage", "profile": "phone", "phase": "loading", "action": "cta", "medianMs": 208, "pass": false}, {"engine": "webkit", "id": "gilded_autumn/homepage", "profile": "desktop", "phase": "loading", "action": "pause", "medianMs": 714, "pass": false}, {"engine": "webkit", "id": "alpine_opal/homepage", "profile": "desktop", "phase": "loading", "action": "cta", "medianMs": 236, "pass": false}, {"engine": "webkit", "id": "alpine_opal/trade", "profile": "desktop", "phase": "loading", "action": "cta", "medianMs": 205, "pass": false}]. One 21ms Play observation fell outside the loading window, is retained in `rejectedSamples`, and was replaced with a sample inside the extended fixture window; no timing failure was discarded.

No deployment, alias read/move, Smoke/Live request, external database access, environment/settings change, flyer change, legacy asset edit or VM-limit change. Tests used synthetic local data; existing SQL suites used in-memory PGlite fixtures.

Open Brain capture unavailable: no `capture_thought` tool is exposed after discovery. This vault closeout is saved; no external memory write was made.

Next-session prompt: Resume PR #169 from its current GitHub tip. Review the retained local WebKit tap failures before treating acceptance as passed; Smoke A/B remains a separately authorized run. Read this report first; keep the PR draft and preserve animations. This code-only session grants no deployment or service-access authority.
