# Hero autoplay and first paint — Smoke only, not Live-ready

Louis requested animation and available sound on arrival, with visitor pause/mute controls. Legacy saved `still`/`none` settings now select the theme's motion default. Browser reduced-motion preferences remain respected. This changes the meaning of the old Still setting; the workspace labels it **Theme default (autoplay)**. No customer records are rewritten.

## Evidence and root cause

- The exact reported route is `/dudesfizzfest`. Its public template returns `heroMotion: "still"`; the Pumpkin Cat controller consequently never assigns the video source or attempts playback.
- Commit `e5e40653a0383f7b8a9232702c08fd65a31c5c76` (August 15, `fix: preserve saved hero motion`) introduced the saved-value override after theme defaults. That behavior predates the October 10 investigation window. Current evidence does **not** establish when the account's setting was saved.
- The preserved October 12 deployment `dpl_BJJXsbpCJNmwHim34hyWFeyTeuxG`, commit `1f74d76951e5026ddf058ce4cc96ce8666226625`, reproduces the exact stopped Fizz Festival hero in a fresh Chrome context. Its Unicorn and Rose Champagne sample heroes autoplay.
- Rolled-back Live is pinned to `dpl_3KRyLQ47YzNQQwEuaFyW4nRZxs9P`, commit `3f175871674e42dbc62d18419318941ea6a49935`. The preserved PR #154 deployment is `dpl_FR1uJtcKBdNkrMZJLEG6nsriufKn`, commit `e78fa626c443124ba11725dc93d32e859985ffa4`. Fresh desktop sample autoplay also works on both. A universal #154 autoplay failure has not been reproduced.
- Unicorn has requested audible autoplay since `a1475999` (October 2), then falls back to muted playback on `NotAllowedError`. Fall Owl (`52fd92ac`, October 17) and Sunset Beach (`f356bd97`, October 24) originally started muted. They now attempt sound first using their existing muted fallback.
- `ffprobe` confirms only Unicorn, Fall Owl, and Sunset Beach have audio tracks. Pumpkin Cat and the other decorative movies are silent; palette/CSS themes do not contain a soundtrack. No new audio is invented.
- The landing preview additionally forced all videos muted in `5365533d` (October 6). That override is removed, and its opaque iframe delegates autoplay permission. It still cannot override the browser's audible-autoplay policy. Parent pause/resume now resumes only videos that the parent paused, preserving visitor pauses.

Sound without a click is possible when Chrome permits the site to autoplay audio (for example, prior engagement or site permission). A clean profile may reject the identical request. Animation must continue muted and the sound button must enable it on a gesture. See [Chrome autoplay policy](https://developer.chrome.com/blog/autoplay).

## Fix and performance scope

This same PR completes #154: production React and precompiled classic scripts, including Unsubscribe; deterministic Windows-safe compilation and content hashes; actual customer homepage HTML and theme variables in the initial response; one shared bootstrap for server and browser so customer identity, calendar, links, and lineup agree. The server renderer bundles production React separately from Next's RSC compiler. Each request receives a separate script context; only trusted repository scripts are cached, never rep data.

Only the selected theme's external CSS/controllers are loaded. Pumpkin Cat uses approved Georgia/Arial fonts and no longer waits for unrelated webfont stylesheets. Initial posters are included for the three scenes that previously created their artwork only after JavaScript.

Selected local styles are included with the initial markup. Real rep pages fetch classic scripts in parallel with ordered `defer` execution; opaque previews retain blocking React dependencies because their application scripts are inline. The final matrix caught that distinction in an intermediate candidate, and the preview path now has an explicit ordering guard.

Sunset Beach uses smaller WebP copies of its approved background (295 KB desktop, 68 KB phone). Its marketing preview uses a 1.03 MB delivery movie with unchanged audio instead of bundling the 4.62 MB rep-site original. The preview's media-download deadline is separate from its frame-startup deadline, preventing a slow connection from canceling autoplay after 12 seconds. All 46 landing posters now use the public Live demo's current Fizz Festival branding; five missing seasonal posters were added. The generic unsubscribe screen no longer shows a fictional rep or sample jewelry, and its existing form is retained.

## Verification

- 436 regression tests pass, including all 23 theme first paints, cross-rep isolation, customer links/lineup identity, production compilation, layout lock, video-controller lifecycles, signup, checkout routing, QR shortlinks, email preview, unsubscribe, and complete poster inventory. Provider actions are mocked; no charges, real signups, emails, or unsubscribe submissions were made.
- Production build and TypeScript passed locally for `b110c19a`; the final preview-order correction `22ba7df60b651e756568bb3a75c0910fcf6a12c5` also passed Vercel's production build. All 11 layout-lock checks remain unchanged.
- Smoke deployment: `dpl_FD4TYQgPLe6UB8cE1zYgqyuJsV4Z`, `sparkle-suite-smoke-ixbgdploy-louis-2849s-projects.vercel.app`. Review only at `https://sparkle-suite-smoke.vercel.app`. PR: https://github.com/louis623/sparkle-suite/pull/156 (draft, targeting `codex/nic-nac-trade-hardening`). The autoplay fix and #154 repair are in this same PR.
- Smoke's `/dudesfizzfest` database record is **The Dudes Fizzfest / Sunset Beach**; pinned Live is **Fizz Festival / Pumpkin Cat**. Neither account was edited. Matching Pumpkin Cat fixtures are measured separately to avoid presenting different themes/data as an apples-to-apples speed comparison.
- Fresh contexts use installed Chrome with its restrictive autoplay policy. Desktop is 1440×900. The phone simulation is 390×844, touch, 4× CPU slowdown, 1.6 Mbps down / 750 Kbps up / 150 ms latency, with cache disabled. Functional desktop/phone workers run concurrently; reported load comparisons run serially without those workers. This is an emulated phone, not a physical-device measurement.

The candidate is not declared ready under the Neon Rabbit Production Quality Standard: Sunset Beach still misses the slow-phone speed gate (3.188 s first content / 7.256 s largest-content paint), audible autoplay remains browser-controlled, and Live canary acceptance/Rocky review have not occurred. No Live approval is requested by this report.

## Risks and rollback

The shared homepage now renders once on the server and again in the classic browser runtime. Risks are mismatched bootstrap data, missing server runtime files, first-paint layout differences, and imperative theme-controller mounting. Tests cover tenant isolation and the deployment trace includes the renderer and its scripts; browser evidence is still required.

Prior Smoke: `dpl_5y9xqRCjg61DaGr88YRvPLF6dx9v` (`sparkle-suite-smoke-kge8utcsk-louis-2849s-projects.vercel.app`). Rollback is to reassign **only** `sparkle-suite-smoke.vercel.app` to that exact deployment. Do not move either Live domain, promote a deployment, or change the Live rollback pin.

Lesson: tests previously preserved an account setting while theme reviews exercised preset defaults. Those are different arrival paths. Compilation checks also missed Unsubscribe and did not measure first themed paint. Keep the exact reported account path, every theme, clean-profile audio rejection, and slow-phone filmstrips in release checks.

## Final Smoke results

All 46 functional cases pass after the two timing-aware phone rechecks. The Unicorn is a ten-second one-shot; Pumpkin Cat rests four seconds between five-second bursts. The harness observes those intended behaviors rather than treating a normal ending/rest as a failed resume. CSS pause/resume states were also checked. Maximum recorded control-event duration was 88 ms on both profiles. No unstyled public-index flash, browser exception, Babel request, or React development build was observed in the final matrix.

The saved-Still problem can affect any preset; Pumpkin Cat on the exact Live account is the confirmed account-level reproduction. The table lists every supported theme verified after the fix, not a claim that all 23 had independently reported failures.

| Theme | Desktop | Slow phone | Existing motion control | Audio |
|---|---|---|---|---|
| Chasing Unicorns (Amethyst) | Pass | Pass | Pause/resume pass | Sound-first request; mute/enable pass |
| Sparkle Suite / Morganite | Pass | Pass | No existing hero toggle | No audio track / CSS scene |
| Black Diamond | Pass | Pass | No existing hero toggle | No audio track / CSS scene |
| Moonstone | Pass | Pass | No existing hero toggle | No audio track / CSS scene |
| Alpine Opal | Pass | Pass | No existing hero toggle | No audio track / CSS scene |
| Emerald Garden | Pass | Pass | No existing hero toggle | No audio track / CSS scene |
| Gnome Forest | Pass | Pass | Pause/resume pass | No audio track / CSS scene |
| Neon Butterfly | Pass | Pass | Pause/resume pass | No audio track / CSS scene |
| Halloween Pumpkin and Witch | Pass | Pass | Pause/resume pass | No audio track / CSS scene |
| Halloween Pumpkin and Cat | Pass | Pass | Pause/resume pass | No audio track / CSS scene |
| The Golden Leaves of Autumn | Pass | Pass | Pause/resume pass | No audio track / CSS scene |
| Rose Gold | Pass | Pass | No existing hero toggle | No audio track / CSS scene |
| Midnight Rose | Pass | Pass | Pause/resume pass | No audio track / CSS scene |
| Fall Owl and Harvest Moon | Pass | Pass | Pause/resume pass | Sound-first request; mute/enable pass |
| Gobble & Fizz | Pass | Pass | Pause/resume pass | No audio track / CSS scene |
| Pumpkin Pie | Pass | Pass | Pause/resume pass | No audio track / CSS scene |
| Pearl Rose | Pass | Pass | Pause/resume pass | No audio track / CSS scene |
| Sunset Beach | Pass | Pass | Pause/resume pass | Sound-first request; mute/enable pass |
| Rose Champagne | Pass | Pass | Pause/resume pass | No audio track / CSS scene |
| Garnet | Pass | Pass | No existing hero toggle | No audio track / CSS scene |
| Amber | Pass | Pass | No existing hero toggle | No audio track / CSS scene |
| Velvet | Pass | Pass | No existing hero toggle | No audio track / CSS scene |
| Rose Quartz | Pass | Pass | No existing hero toggle | No audio track / CSS scene |

Standalone fresh-profile audio tests: Unicorn was permitted to play audibly; Owl and Sunset received `NotAllowedError`, continued muted, then enabled audio and muted again successfully on clicks. There is no Web Audio resume or universal first-visit permission bypass. Reduced-motion preferences remain respected; the landing preview also respects data saver and visibility. Adding sound to silent themes would require separately approved soundtracks.

Landing preview autoplay and parent pause/resume pass on desktop and slow phone. Home, Join Team, Dance Floor, generic unsubscribe, and the compiled theme unsubscribe preview return 200 without browser errors, broken loaded images, or development runtimes. No forms were submitted. These are safe read-only checks, not end-to-end provider charges or sent emails.

## Load measurements

Serial, cache-disabled lab runs on October 25; single-run diagnostics, not field Core Web Vitals or a physical-phone guarantee. The same Chrome/network/CPU profiles were used. Sample-preview metrics are relative to the child document; the outer sample toolbar is excluded. Filmstrip timestamps start at the first trace screenshot, while the JSON contains browser paint timestamps.

| Matching Pumpkin Cat sample | Rolled-back Live LCP | Smoke LCP |
|---|---:|---:|
| desktop | 3.304 s | 0.476 s |
| phone | 3.036 s | 0.780 s |

The actual `/dudesfizzfest` records differ between environments. These numbers are supplied transparently and must not be treated as an identical-content comparison:

| Actual route | Desktop first content / LCP | Slow phone first content / LCP | Desktop / phone CLS |
|---|---:|---:|---:|
| Pinned Live — Fizz Festival / Pumpkin Cat | 1.188 / 4.704 s | 2.360 / 18.960 s | 0.0124 / 0.0294 |
| Smoke — The Dudes Fizzfest / Sunset Beach | 2.140 / 2.224 s | 3.188 / 7.256 s | 0.0275 / 0.0000 |

Pinned Live's early first-content paint is the unstyled public-index text, not the finished theme. Its actual hero remained stopped in both profiles. Smoke renders themed content initially and autoplays, but Sunset's video remains the late LCP element. Desktop first content also misses the stricter under-2-second target, and small layout shifts remain. **The performance/zero-layout-jump gate is not satisfied.** The remaining work is a focused customer-page startup/media/font optimization pass and repeat measurements; no new paid service is required by the current plan. No further feature expansion was included after Louis asked about elapsed time.

## Evidence

Artifact root: `C:\Users\louis\.codex\visualizations\2026\10\25\01a173ff-7ba2-7c11-a2d8-ba1b00d8f53f`.

- `verified-summary.json`: final merged 46-case results, with the two phone rechecks.
- `verified-matrix/`: every theme/profile JSON, playing/paused screenshots, filmstrips and traces. `verified-rechecks/` contains the final Unicorn/Pumpkin Cat phone cases.
- `verified-matrix/desktop-contact-sheet.png` and `phone-contact-sheet.png`: every theme at a glance.
- `final-candidate-cat-desktop/filmstrip.png` and `final-candidate-cat-phone/filmstrip.png`: final matching-theme first paint.
- `final-candidate-account-desktop/filmstrip.png` and `final-candidate-account-phone/filmstrip.png`: actual Smoke account, including the remaining slow-phone limitation.
- `release-rollback-cat-*` and `release-rollback-account-*`: preserved comparison traces, screenshots, and result JSON.
- `audio-policy.json`, `final-flows.json`, `final-unit-tests.json`, and `history-motion.json`: audio, navigation, 436 tests, and exact source-history boundary.

Final alias readback: Smoke points to `dpl_FD4TYQgPLe6UB8cE1zYgqyuJsV4Z`; both Live domains still point to `dpl_3KRyLQ47YzNQQwEuaFyW4nRZxs9P`. Live was never deployed, promoted, unpinned, or edited. A later report/QA-only commit does not change the deployed application code.
