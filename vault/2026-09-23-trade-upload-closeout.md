# September 23, 2026 — Trade request upload and Dance Floor closeout

## Released behavior

- Customers can attach an optional reveal photo or screenshot in JPEG, PNG, WebP, HEIC, HEIF, or AVIF, up to 25 MiB. The form shows the preview, filename, size, upload state, and a specific failure state. Customers can remove the image and submit a text-only request. The private rep image is normalized to JPEG and expires after seven days.
- The image transfers directly to private Supabase Storage through a scoped ticket; the trade submission binds only a verified, ready ticket. The flow prevents a replay from consuming another available dancer. The rep image route still requires the owning rep session.
- The Dance Floor and request form use shared readable color tokens, with a Halloween correction for small text and a visible requested-versus-revealed comparison. The independent-rep disclosure remains in the site footer and is removed from every dancer card.
- MSRP is removed from current Dance Floor cards, rep cards, active Nic-Nac collection and tool output, sorting, and trade decisions. Historical stored values and Finder compatibility remain. The trade rule stays one item for one item, same collection family and jewelry type, with the rep making the final decision.

## Provenance and verification

- Source: clean task checkout `C:\Users\louis\sparkle-suite-repo\.codex-worktrees\trade-request-completion`, approved branch `codex/nic-nac-trade-hardening`, GitHub `louis623/sparkle-suite`. Product commit `1e4b8cee262707f5767c924280493efc0e8cf0d1` was pushed; local HEAD and remote tip matched, and the tree was clean before deployment. The dirty primary checkout and protected Live Lineup extension were not changed.
- Three additive Supabase migrations `20260923200000`, `20260923210000`, and `20260923220000` applied to project `bqhzfkgkjyuhlsozpylf`. The last corrected a pre-existing enum/text COALESCE failure in the atomic request RPC that had caused a submit error. A subsequent production `supabase db push --dry-run` returned `upToDate: true`.
- Local focused test batches passed (245 integrated tests, 320 MSRP-focused tests, 75 customer UI tests, 45 backend upload tests); TypeScript, targeted ESLint, SQL/PGlite contract tests, and local Next production build passed. In the in-app browser, a synthetic reviewer selected Louis's supplied 5.12 MiB JPG, saw `Attached and ready`, submitted, received a private pending-status link, and saw the dancer leave the available list. Synthetic rows and tickets were verified absent after timed cleanup.
- Manual production Vercel deployment `dpl_29qoZBeZ5WdfPMbH6LL9sKXW5YgK` is Ready on project `prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3`. Vercel identifies both `www.yoursparklesuite.com` and `yoursparklesuite.com` among its aliases; the apex redirects to `www`. Previous served deployment `dpl_AW1GVeN697R8FS4VCWs83kBRrJQt` remains available for provenance.
- On the exact live `www` domain, synthetic requests with the supplied 5,363,712-byte JPG and a real 200,538-byte HEIC both passed upload, normalization, submission, replay, pending receipt, anonymous screenshot denial, authorized rep screenshot redirect, text-only request, reservation, seven-day expiry, and automatic cleanup. Local testing also passed a 24.77 MiB PNG. Live root, apex, health, Dudes Fizzfest Trade and FAQ returned 200; the browser showed the Halloween Dance Floor, request form, and FAQ with readable text and no MSRP. The root stayed on the landing page.

## Remaining acceptance

- Existing Control Center Task List items `4231943e-9d9d-4077-8838-ac7961178f27` and `1b339a70-cd4e-44ad-a2c5-ea282bdf48c9` were updated with the new release evidence and remain in progress. An authenticated synthetic rep must still visually exercise alert, audio, approval/denial, and the resulting customer receipt state. Automated authorization and ingestion evidence is not a substitute for that UI acceptance.
- Reviewer reseed and click-through steps are in `docs/sparkle-suite/testing/trade-request-upload-reviewer-smoke.md`. The public site has no production reviewer switch. Do not use a real customer or Louis's demo account as disposable smoke data.
