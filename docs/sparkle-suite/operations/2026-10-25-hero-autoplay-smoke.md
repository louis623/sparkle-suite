# Hero autoplay and first paint — Smoke only

Louis requested animation and available sound on arrival, with visitor pause/mute controls. Legacy saved `still`/`none` settings now select the theme's motion default. Browser reduced-motion preferences remain respected. This changes the meaning of the old Still setting; the workspace labels it **Theme default (autoplay)**. No customer records are rewritten.

## Evidence and root cause

- The exact reported route is `/dudesfizzfest`. Its public template returns `heroMotion: "still"`; the Pumpkin Cat controller consequently never assigns the video source or attempts playback.
- Commit `e5e40653a0383f7b8a9232702c08fd65a31c5c76` (August 15, `fix: preserve saved hero motion`) introduced the saved-value override after theme defaults. That behavior predates the October 10 investigation window. Current evidence does **not** establish when the account's setting was saved.
- The preserved October 12 deployment `dpl_BJJXsbpCJNmwHim34hyWFeyTeuxG`, commit `1f74d76951e5026ddf058ce4cc96ce8666226625`, reproduces the exact stopped Fizz Festival hero in a fresh Chrome context. Its Unicorn and Rose Champagne sample heroes autoplay.
- Rolled-back Live is pinned to `dpl_3KRyLQ47YzNQQwEuaFyW4nRZxs9P`, commit `3f175871674e42dbc62d18419318941ea6a49935`. The preserved PR #154 deployment is `dpl_FR1uJtcKBdNkrMZJLEG6nsriufKn`, commit `e78fa626c443124ba11725dc93d32e859985ffa4`. Fresh desktop sample autoplay also works on both. A universal #154 autoplay failure has not been reproduced.
- Unicorn has requested audible autoplay since `a1475999` (October 2), then falls back to muted playback on `NotAllowedError`. Fall Owl (`52fd92ac`, October 17) and Sunset Beach (`f356bd97`, October 24) originally started muted. They now attempt sound first using their existing muted fallback.
- `ffprobe` confirms only Unicorn, Fall Owl, and Sunset Beach have audio tracks. Pumpkin Cat and the other decorative movies are silent; palette/CSS themes do not contain a soundtrack. No new audio is invented.
- The landing preview additionally forced all videos muted. That override is removed, and its opaque iframe delegates autoplay permission. It still cannot override the browser's audible-autoplay policy. Parent pause/resume now resumes only videos that the parent paused, preserving visitor pauses.

Sound without a click is possible when Chrome permits the site to autoplay audio (for example, prior engagement or site permission). A clean profile may reject the identical request. Animation must continue muted and the sound button must enable it on a gesture. See [Chrome autoplay policy](https://developer.chrome.com/blog/autoplay).

## Fix and performance scope

This same PR completes #154: production React and precompiled classic scripts, including Unsubscribe; deterministic Windows-safe compilation and content hashes; actual customer homepage HTML and theme variables in the initial response; one shared bootstrap for server and browser so customer identity, calendar, links, and lineup agree. The server renderer bundles production React separately from Next's RSC compiler. Each request receives a separate script context; only trusted repository scripts are cached, never rep data.

Only the selected theme's external CSS/controllers are loaded. Pumpkin Cat uses approved Georgia/Arial fonts and no longer waits for unrelated webfont stylesheets. Initial posters are included for the three scenes that previously created their artwork only after JavaScript.

## Validation in progress

- Production build and TypeScript passed locally with the branch's locked dependencies.
- 314 relevant tests passed, including all 23 theme first paints, cross-rep isolation, customer links/lineup identity, production compilation, layout lock, and the video-controller lifecycle suites.
- Fresh Chrome local production checks passed for Unicorn, Pumpkin Cat, and Sunset Beach, including animation pause/resume and available audio mute/unmute.
- Smoke measurements and the complete desktop/slow-phone matrix are recorded below after deployment. This document is not a release approval.

## Risks and rollback

The shared homepage now renders once on the server and again in the classic browser runtime. Risks are mismatched bootstrap data, missing server runtime files, first-paint layout differences, and imperative theme-controller mounting. Tests cover tenant isolation and the deployment trace includes the renderer and its scripts; browser evidence is still required.

Prior Smoke: `dpl_5y9xqRCjg61DaGr88YRvPLF6dx9v` (`sparkle-suite-smoke-kge8utcsk-louis-2849s-projects.vercel.app`). Rollback is to reassign **only** `sparkle-suite-smoke.vercel.app` to that exact deployment. Do not move either Live domain, promote a deployment, or change the Live rollback pin.

Lesson: tests previously preserved an account setting while theme reviews exercised preset defaults. Those are different arrival paths. Compilation checks also missed Unsubscribe and did not measure first themed paint. Keep the exact reported account path, every theme, clean-profile audio rejection, and slow-phone filmstrips in release checks.
