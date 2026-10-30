# Local SSR parity evidence — October 30, 2026

This is synthetic local review evidence, not a Live release or a certification of Lindsey's saved content. Browser plugin was unavailable; Playwright used a fresh headless Chrome profile. No rep sign-in, form submission, hosted database access or deployment occurred. Local API responses are fixtures. Font-provider stylesheets/files were read for the legacy comparison; other external resources were blocked.

The legacy reference compiles the frozen JSX with the repository's locked production React bundle instead of executing the development/Babel loader from the old HTML. This compares the frozen UI source under a production runtime; it does not certify raw Live legacy loading performance or runtime-version-specific behavior. Separate response/asset hash tests preserve the actual frozen renderer's bytes.

The comparison contains 48 views in 24 side-by-side images: desktop 1440×900 and phone 390×844; motion allowed and reduced motion; home, Dance Floor and Join; Alpine Opal/MHF hybrid and Gilded Autumn/standard. Frozen legacy appears on the left, SSR on the right. Independent moving-video frames and ticker positions are not synchronized.

All 24 final SSR views recorded CLS 0, no horizontal overflow and no JavaScript runtime errors. The aurora plays with motion allowed; reduced-motion arrival has `paused=true`, `currentTime=0`, `autoplay=false`, `preload=metadata`. No visible aurora Pause button was added. Full measurements are in [measurements.json](measurements.json).

| Theme/layout and page | Desktop, motion | Desktop, reduced | Phone, motion | Phone, reduced |
| --- | --- | --- | --- | --- |
| Alpine Opal / MHF home | [Image](alpine_opal-homepage-desktop-no-preference.webp) | [Image](alpine_opal-homepage-desktop-reduce.webp) | [Image](alpine_opal-homepage-phone-no-preference.webp) | [Image](alpine_opal-homepage-phone-reduce.webp) |
| Alpine Opal / MHF Dance Floor | [Image](alpine_opal-trade-desktop-no-preference.webp) | [Image](alpine_opal-trade-desktop-reduce.webp) | [Image](alpine_opal-trade-phone-no-preference.webp) | [Image](alpine_opal-trade-phone-reduce.webp) |
| Alpine Opal / MHF Join | [Image](alpine_opal-join-desktop-no-preference.webp) | [Image](alpine_opal-join-desktop-reduce.webp) | [Image](alpine_opal-join-phone-no-preference.webp) | [Image](alpine_opal-join-phone-reduce.webp) |
| Gilded Autumn / standard home | [Image](gilded_autumn-homepage-desktop-no-preference.webp) | [Image](gilded_autumn-homepage-desktop-reduce.webp) | [Image](gilded_autumn-homepage-phone-no-preference.webp) | [Image](gilded_autumn-homepage-phone-reduce.webp) |
| Gilded Autumn / standard Dance Floor | [Image](gilded_autumn-trade-desktop-no-preference.webp) | [Image](gilded_autumn-trade-desktop-reduce.webp) | [Image](gilded_autumn-trade-phone-no-preference.webp) | [Image](gilded_autumn-trade-phone-reduce.webp) |
| Gilded Autumn / standard Join | [Image](gilded_autumn-join-desktop-no-preference.webp) | [Image](gilded_autumn-join-desktop-reduce.webp) | [Image](gilded_autumn-join-phone-no-preference.webp) | [Image](gilded_autumn-join-phone-reduce.webp) |

Known differences remain. The MHF title resolves to Brush Script MT in both renderers on this Windows machine; neither loads Pacifico. Legacy hero body/CTA text uses DM Sans 9pt, while SSR falls back to Segoe UI Black, changing wrapping. Gilded Autumn/standard SSR home keeps playing under reduced motion. Its utility pages retain an extra, hidden SSR Pause button absent from legacy; MHF utility pages have none. See [typography.json](typography.json) and [report.md](report.md).

The throttled phone fixture recorded FCP 3.724 s, LCP 3.960 s and CLS 0 at 390×844, 150 ms latency, 200 KiB/s download and 4× CPU slowdown. This misses the phone target. The existing video is 4,238,213 bytes; no poster or new media was added. This is a local simulated observation, not a real-device or deployed cold-start guarantee. [Metrics](slow-phone.json), [initial DOM-ready frame](slow-phone-0ms.jpg), [3-second frame](slow-phone-3000ms.jpg), [5-second frame](slow-phone-5000ms.jpg). Filmstrip offsets are relative to DOMContentLoaded; performance metrics are relative to navigation.

## Repeat safely

Use an authorized disposable clean clone of this branch and its locked dependencies. The source copies below are text artifacts so they do not enter the application build. Copy them into the ignored harness directory before executing:

```powershell
New-Item -ItemType Directory -Force .tmp-qa
Copy-Item vault/2026-10-30-ssr-per-rep/qa/generate.ts.txt .tmp-qa/generate.ts
Copy-Item vault/2026-10-30-ssr-per-rep/qa/server.cjs.txt .tmp-qa/server.cjs
Copy-Item vault/2026-10-30-ssr-per-rep/qa/capture.cjs.txt .tmp-qa/capture.cjs
Copy-Item vault/2026-10-30-ssr-per-rep/qa/slow-phone.cjs.txt .tmp-qa/slow-phone.cjs
Copy-Item vault/2026-10-30-ssr-per-rep/qa/typography.cjs.txt .tmp-qa/typography.cjs
Copy-Item vault/2026-10-30-ssr-per-rep/qa/interactions.cjs.txt .tmp-qa/interactions.cjs
npm install --prefix .tmp-qa --no-save --ignore-scripts --no-audit --no-fund playwright
npm run build:amethyst:ssr
npx tsx .tmp-qa/generate.ts
node .tmp-qa/server.cjs
```

Keep that server terminal open. In another terminal at the same repository root:

```powershell
node .tmp-qa/capture.cjs --legacy-only
node .tmp-qa/capture.cjs
node .tmp-qa/typography.cjs
node .tmp-qa/slow-phone.cjs
node .tmp-qa/interactions.cjs
```

The generation command overwrites synthetic fixtures, and every capture creates a fresh browser context. Repeating these commands is the reset/reseed path; no database reset is needed. Stop the local server with Ctrl+C when finished.

Manual review entry: [MHF home](http://127.0.0.1:4397/review?theme=alpine_opal&page=homepage&renderer=ssr), then [Dance Floor](http://127.0.0.1:4397/review?theme=alpine_opal&page=trade&renderer=ssr), then [Join](http://127.0.0.1:4397/review?theme=alpine_opal&page=join&renderer=ssr). Change `renderer=legacy` for the frozen reference or `theme=gilded_autumn` for the standard layout. The automatic interaction script maps the customer paths `/trade`, `/join` and `/` to the corresponding fixtures and verifies navigation/motion controls; the base server's manual review entry uses the explicit fixture URLs. No forms are submitted. Live canonical/link behavior is covered by mocked route tests, not claimed as a deployed end-to-end test here.

The recorded interaction audit preceded the fixture-only utility-title refinement, so its H1 strings still contain the generic demo titles. Final image fixtures use explicit MHF/ Diamond Peak Society titles in both renderers. Application code was unchanged; current images are the final visual reference.
