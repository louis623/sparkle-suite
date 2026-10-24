# Seasonal Cards & QR Live release — October 24, 2026

Louis confirmed the three designs look good and work well inside Suite Smoke, then explicitly authorized releasing the Owl, Pumpkin Pie and Gobble & Fizz cauldron designs to the Live QR flyer and business-card tools. This supersedes the earlier Smoke-only/no-Live restriction for these scoped designs.

## Scope and provenance

Release prepared in C:/Users/louis/sparkle-suite-repo, remote louis623/sparkle-suite, allowed branch codex/nic-nac-trade-hardening. Shared local HEAD 6162d278 and unrelated workbench edits remain untouched. Candidate starts from remote tip dfcd3c89a4cb448d1c9d0baa236bb0795b48f310, including the current production carousel release (95ea4574).

The scoped application/art/tests/build-source changes come byte-for-byte from approved PR #151 head 340d5946 (Smoke application commit fc2beaa). Preview branch policy/configuration is not part of the production change. Existing renderer, rep tool controls, order flow, APIs and site hero artwork remain unchanged. No customer saved-theme or database changes, including Kristen. No extension or Finder changes.

Prior Live deployment retained for provenance: dpl_FyDFBopRXJTf5itU52vGsRZHn5nJ, sparkle-suite-q4k0ubl6u-louis-2849s-projects.vercel.app, commit 95ea4574ba0341214c3320c9e981a84f131f15a6. Both Suite domains pointed there before release. Target project is sparkle-suite / prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3, team_kvcmZ4RlZB0Hah65NE3280x5, production. A normal production deployment updates that project's existing aliases, including Suite www/apex and existing rep domains; no domain configuration changes.

## Validation

User verified the authenticated Smoke workflow. Automated art/layout/QR/export checks and the new full production build are required before declaring completion. Record final deployed commit, build result, exact alias mappings, served artwork checks and reviewer UI results in the session closeout/Open Brain. Never describe authenticated Live checks as complete unless they were exercised.

Review path: https://www.yoursparklesuite.com/nic-nac > Tools > QR codes, QR flyers, business cards. Choose Fall Owl, Gobble & Fizz or Pumpkin Pie; step 4 previews/downloads the flyer and step 5 previews the business card front/back. Tool theme selection does not change the site's saved theme. No order or payment should be placed for artwork verification.

## Deployed and verified

Production application commit: e6a06786bb532af049d66644137cfbab40bc2cf0. Deployment dpl_AU1MyAgqkxgs68EkZPtH7BPNbBHy / sparkle-suite-4bd4ecyjn-louis-2849s-projects.vercel.app reached READY; full Next.js build passed. Both Suite www/apex aliases verified on that exact deployment. 25 focused tests passed against the candidate's exact renderer and assets.

All three served 1080x1920 flyer plates match the approved release SHA-256 hashes. Original heroes also match unchanged release bytes. Live /, /login, /nic-nac and /dudesfizzfest returned 200. The three Cards & QR API endpoints return 401 without a session, confirming the existing authentication gate. Evidence: artifacts/creative/2026-10-24-seasonal-business-cards/live-verification.json.

The in-app browser showed a stable Live landing page and an existing Louis Chapman / The Dudes Fizzfest workspace session. No protected tool actions were performed in that personal session. The synthetic reviewer credentials/token are stored as non-retrievable Vercel sensitive variables. Permission was requested for preview/download-only use of the existing session; signed-in Live design checks remain pending unless a later record confirms completion. Do not reset reviewer credentials or use customer records to bypass this limitation.

PR #151 was closed as delivered by scoped integration e6a06786; its obsolete base and preview policy were not merged. No customer saved-theme, account, database, order, payment, extension or Finder changes. Shared local HEAD/index preserved.
