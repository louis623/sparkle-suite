# Per-rep SSR implementation — stopped on three new full-suite timeouts

The authorized isolated flyer rerun passed all 23 earlier newly failing cases. A subsequent quiet full-suite run still has three new failing names, all five-second flyer timeouts. The task's stop rule therefore blocks pushing. No push, PR, merge, deploy, alias change, Vercel environment access or hosted database access occurred. The application implementation remains uncommitted in the authorized disposable clone on `codex/ssr-per-rep-allowlist`; the verified remote base remains `968f7425272f8d2f9420623e7598343dfe7a0e1f`. Existing isolated PGlite fixtures ran with Louis's explicit approval.

For reps, the proposed behavior is an all-three-pages switch: home, Dance Floor and Join use SSR together only when their valid slug is listed. Pantry remains legacy. With the task's stated Production setting `REP_RENDER_V2_SLUGS=dudesfizzfest`, all seven real reps remain legacy and Fizzfest keeps its three SSR pages. No activation was performed. Frozen legacy remains available without an expiry change.

Wildcard, per-page, reserved, too-short/long, path and internal-whitespace entries are ignored. For example, ` MileHighFizz , DUDESFIZZFEST ` enables both normalized slugs; `milehighfizz:home`, `*`, `../x`, and `milehigh fizz` enable nobody. Valid neighboring entries survive invalid entries. The existing validator rejects hyphens, so `sparkle-reviewer-preview` cannot be listed; the seven real slugs and `dudesfizzfest` are alphanumeric.

## Checks and exact stop

| Check | Result |
| --- | --- |
| Baseline full suite, before application edits | 5,894 pass / 82 fail; four existing suite-load errors |
| Corrected focused run | 466 pass / three baseline Pantry failures; all six corrected assertions pass |
| Earlier loaded full suite | 5,987 pass / 100 fail; the same four suite-load errors |
| Earlier failing-name comparison | 23 new names, all in untouched flyer tests; all 23 passed unchanged in the authorized isolated rerun |
| Isolated flyer file | 41 pass / one known baseline failure at its unchanged 600-second limit; zero new failing names |
| Final quiet full suite | 6,007 pass / 80 fail / five skipped; three new failing names, 77 baseline failures, five baseline failures now pass |
| Final suite errors | Same four suite-load errors; one additional unhandled request-scope error, not classifiable against the baseline JSON-only log |
| Frozen Live asset hashes | Pass; no frozen/shared asset edits |
| Non-MHF full HTML comparisons | 69 pass against a freshly bundled base with the same locked Windows toolchain |
| Nine added all-page legacy-fallback cases | All pass; HTTP 200 and exact frozen legacy bytes |
| SSR bundle generation | Pass |
| TypeScript | Pass on the current tree after the six assertion corrections |
| Full `npm run build` | Pass, including branch guard, layout locks and regenerated SSR bundles |

Louis authorized an isolated rerun. All 23 earlier new cases passed unchanged; the file finished 41 pass / one pre-existing exhaustive-sweep timeout at its original 600,000 ms limit. The subsequent quiet, single-worker whole-suite run had no browser work alongside it, but three of those 23 cases again exceeded their unchanged 5,000 ms limits. The verbose log explicitly reports `Test timed out in 5000ms.`; JSON alone reports `STACK_TRACE_ERROR`. No timeout, assertion, flyer code or page code was changed. This is timing-sensitive behavior, but its exact cause is not established. Passing in isolation does not waive the full-suite gate. See [isolated results](flyer-isolated.json) and [quiet-run timing details](quiet-full-suite.json).

[Final named comparison](full-suite-comparison.json) contains every baseline/quiet-run failing name, the four suite-load errors and the unhandled-error caveat. The [earlier loaded comparison](full-suite-comparison-loaded.json) is preserved separately. [Flyer details](flyer-failures.json) records the original 23 new names, their baseline status and durations. All 23 names are retained at the end of this report; the three remaining blockers are listed below.

| New failing name, all in `tests/workspace-card-qr-flyer.test.ts` | Base pass | Isolated pass | Quiet full-run timeout |
| --- | --- | --- | --- |
| `flyer render renders amber inside the safe zones and the QR decodes` | 2.090 s | 1.698 s | 5.276 s |
| `flyer render renders velvet inside the safe zones and the QR decodes` | 2.075 s | 1.864 s | 5.586 s |
| `flyer render shrinks a long show title instead of cutting it off` | 2.472 s | 1.554 s | 5.040 s |

The quiet run also reports an unhandled `connection was called outside a request scope` error originating during the already-failing `tests/prelaunch/prelaunch-root-route.test.ts`. Its source stack reaches `readLandingFounderAvailability` and `app/page.tsx`, which this patch does not change. The baseline JSON-only log did not retain unhandled-error text, so this additional error is explicitly unclassified rather than claimed pre-existing.

Louis authorized correcting only six wrong assertions. The exact before/after checks and why the pages were already correct are listed separately for all six in [assertion-corrections.md](assertion-corrections.md). Application and compiled file hashes remained unchanged throughout this continuation; only the CSS-selector/element and React-comment/text assertions were corrected.

The byte-comparison baseline was captured after bundling unmodified base source, then compared with the PR using the same toolchain. Regenerated style JSON includes a newline-only serialization change; no source CSS changed. The stored full-HTML hashes are measurements of this Windows build, not a claim of byte equality between different OS checkout/newline profiles.

## Custom domains and fallback

The existing single strict rep-resolution call selects `id, public_site_slug`; its serve state carries a nullable slug. The route passes that slug as `renderGateSlug`, which is removed before either renderer or rendering helper receives options. `publicSiteSlugOverride` is not set for custom domains. No extra resolver call or database query was added.

Mocked route tests prove that non-listed MHF home, Dance Floor and Join hash-match frozen legacy. Listing `milehighfizz` produces the SSR marker while retaining custom-origin canonicals and `/trade`/`/join` links, without a `/milehighfizz` prefix. Join visibility denial still returns 404. Query strings, URL paths and headers cannot enable SSR without server route identity; custom-domain review overrides remain inert. Pantry does not enter SSR.

`tests/amethyst-ssr-fallback.test.ts` proves each of `Homepage.html`, `Trade.html` and `Join.html` returns HTTP 200 and exact legacy bytes on each of three failures: thrown renderer, invalid render result, or failed data response. Test names use `returns HTTP 200 and exact legacy bytes for <asset> on SSR <failure>`. Existing slow-success and homepage safety-boundary tests also pass. Failures are logged server-side; no new 503 outage page remains in this SSR render-error branch.

## Aurora and visual parity

The legacy MHF hero tree, text, shade, class names, video source and CTA structure were restored. Pumpkin Cat alone uses the generic hero; the Gilded Autumn video exception and Gnome decoration condition remain. The same 4,238,213-byte `/mile-high-fizz/hero.mp4` is reused. No new media, font or CSS asset was added. The existing inlined CSS reserves `min-height: calc(100vh - 123px)` and preserves cover crop/stacking.

Server markup omits native autoplay until the synchronous early controller knows the browser's media preference. Motion-allowed playback then has autoplay enabled, muted/loop/inline behavior, and `preload=metadata`; reduced-motion arrival remains paused at the first frame with no autoplay. Saved still/none is off. The MHF-only controller runs before deferred hydration and responds to later media-preference changes. No visible aurora Pause button was added.

[The image index](README.md) links all 24 paired screenshots covering 48 local views. All 24 SSR views recorded CLS 0, no horizontal overflow and no JavaScript runtime errors. MHF Alpine Opal Dance Floor/Join have neither video nor the extra SSR utility Pause button, matching legacy. Synthetic navigation and Pause/Play/media-preference interactions passed without writes in [interactions.json](interactions.json). Sources for repeating the local fixture harness are preserved under `qa/` as text artifacts.

## Remaining differences and switching risks — not fixed

- **Fonts:** the MHF title resolves to Brush Script MT in both frozen legacy and SSR on this machine; both use the unchanged Pacifico/Brush Script/cursive stack and neither loads Pacifico. Hero body and CTA text use DM Sans 9pt in legacy but Segoe UI Black in SSR, changing line breaks and weight. The homepage font-loading difference is shared v2 behavior; full visual equality is not established. [Measured font faces](typography.json).
- **Current seasonal home:** Gilded Autumn/standard SSR continues playing under reduced motion, while legacy pauses. This theme-wide behavior is unchanged by this patch and blocks calling Lindsey's switch Live-ready.
- **Utility themes:** standard-layout Gilded Autumn utility pages retain an extra, hidden SSR Pause button absent from legacy. The scoped fix removes it only for MHF hybrid. Shared v2 sparkle placement is deterministic, whereas legacy uses random positions. These theme-wide differences were not re-engineered.
- **Forced fixture themes:** legacy `gilded-autumn.js` can mount its own motion into `.mhf-hero`; the forced MHF/Gilded fixture therefore relies on that existing script. Real MHF hybrid data is selected only with Alpine Opal. Other forced theme combinations are review fixtures, not certification of real saved settings.
- **Phone speed:** the throttled local phone load recorded FCP 3.724 s, first video frame 3.897 s, LCP 3.960 s and CLS 0. This misses the phone target. The unpostered 4.2 MB video remains a delivery risk, but this observation does not isolate its causal contribution from HTML/CSS delivery, parsing and machine load. Improving delivery requires separate profiling/asset work; no reliable cost estimate follows from this run alone. [Metrics](slow-phone.json) and filmstrip links are in the image index.
- **Cold start:** no deployment or Live cold-start measurement was permitted. The generated React server bundle stayed the same size; page runtimes grew 2,360 bytes. This does not establish deployed cold-start safety. [Sizes](bundle-sizes.json).
- **Content and interactions not certified:** visuals use synthetic fixture content, empty calendar/lineup states and fixture inventory/roster data. Lindsey's actual show times, live lineup, events, content/media slots, About/showcase TikTok playback, signup submission, provider behavior and production footer destinations were not exercised. No form was submitted and no hosted data was read. Layout-specific source order and hero/footer link structure were compared; those facts are not a claim of complete Live-content parity.
- **Decision for Louis:** add a Pause button to the aurora hero (WCAG 2.2.2). Legacy has none; the requested port intentionally leaves this decision open.
- **Test instability:** the three mentioned SSR timing cases passed, but the untouched flyer suite produced the 23 newly failing names below. All 23 passed in the authorized isolated rerun without repairs or waived checks; three timed out again in the quiet whole-suite run and still block pushing.

No release is ready, and no PR was opened. After the check blocker is resolved, the requested deliverable is a draft PR only, with no merge or deployment. Later activation requires separate Smoke/demo/Live quality gates, Rocky review and Louis's explicit approval. A future rollback would revert this PR's code to base `968f7425`; a later per-rep rollout can return that rep's three pages to legacy by removing its allowlist entry while retaining `dudesfizzfest`. No rollback or environment action was executed.

## Earlier loaded-run failing names — all 23 passed in isolation

- `flyer render renders gobble_and_fizz inside the safe zones and the QR decodes`
- `flyer render renders pie_please inside the safe zones and the QR decodes`
- `flyer render renders amethyst inside the safe zones and the QR decodes`
- `flyer render renders sparkle_suite_morganite inside the safe zones and the QR decodes`
- `flyer render renders moonstone inside the safe zones and the QR decodes`
- `flyer render renders emerald_garden inside the safe zones and the QR decodes`
- `flyer render renders halloween_pumpkin_cat inside the safe zones and the QR decodes`
- `flyer render renders halloween_pumpkin_witch inside the safe zones and the QR decodes`
- `flyer render renders gilded_autumn inside the safe zones and the QR decodes`
- `flyer render renders rose_gold inside the safe zones and the QR decodes`
- `flyer render renders midnight_rose inside the safe zones and the QR decodes`
- `flyer render renders fall_owl_harvest_moon inside the safe zones and the QR decodes`
- `flyer render renders pearl_rose inside the safe zones and the QR decodes`
- `flyer render renders sunset_beach inside the safe zones and the QR decodes`
- `flyer render renders rose_champagne inside the safe zones and the QR decodes`
- `flyer render renders garnet inside the safe zones and the QR decodes`
- `flyer render renders amber inside the safe zones and the QR decodes`
- `flyer render renders velvet inside the safe zones and the QR decodes`
- `flyer render shrinks a long show title instead of cutting it off`
- `flyer render decodes PNG and JPG for every shared theme with a tagline, without one, and with a wrapping title`
- `flyer render closes the tagline and website slots when they are absent, and prints a custom domain`
- `flyer file formats encodes JPG from one PNG and both files decode to the same URL`
- `flyer route ignores body.appearancePreset and uses the saved theme`
