# Seasonal Cards & QR Smoke review — October 24, 2026

Louis approved all three business-card designs (Fall Owl, Pumpkin Pie, Gobble & Fizz cauldron) and requested that the cards and previously approved QR flyers be put into Suite Smoke for his review before Live.

## Deployment

- Repository: C:/Users/louis/sparkle-suite-repo; remote louis623/sparkle-suite.
- Shared workbench remains codex/nic-nac-trade-hardening at 6162d278ef7aa4a8a43ebcc3065a0a6f4e96c714; unrelated changes preserved.
- Exact deployed source: PR #151, cursor/fall-owl-flyer-plate-9b56, fc2beaa9cfeec4ac6b9deb1c6ff352e97a53818f.
- Smoke project: prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ, team_kvcmZ4RlZB0Hah65NE3280x5, preview environment (target null).
- Deployment READY: dpl_BykCGfMcrtycoGUmv2stHAqzdf1J; sparkle-suite-smoke-2738sxj1w-louis-2849s-projects.vercel.app.
- Smoke review alias https://sparkle-suite-smoke.vercel.app now points to that exact deployment. Previous Smoke deployment preserved: dpl_24bhA3yHhzFKSouroCyrdemiVa9W / sparkle-suite-smoke-grg8yrqrh-louis-2849s-projects.vercel.app.
- Live www alias remained dpl_FyDFBopRXJTf5itU52vGsRZHn5nJ / sparkle-suite-q4k0ubl6u-louis-2849s-projects.vercel.app. No Live deployment, merge or domain change.

## Verification and limit

Full remote Next.js build, TypeScript and deployment completed successfully. Previous 25 focused art/layout/QR/export tests passed. All three served flyer plates returned HTTP 200, are exactly 1080x1920, and match approved local bytes by SHA-256. Evidence: artifacts/creative/2026-10-24-seasonal-business-cards/smoke-verification.json.

Signed-in tool verification is NOT complete. The in-app browser reached Smoke /nic-nac, then the expected login redirect. The tool API returns 401 without a session. Vercel environment metadata confirms no SPARKLE_REVIEWER_SMOKE_TOKEN is configured on Smoke; /start redirects to prelaunch. No personal account was used and no reviewer identity/auth setting was changed. Do not claim deployed previews/downloads/QR scans were exercised inside an authenticated workspace.

Louis review path: https://sparkle-suite-smoke.vercel.app/nic-nac, sign in, Workspace > Tools > QR codes, QR flyers, business cards. Pick Fall Owl, Gobble & Fizz, or Pumpkin Pie in the tool, then review step 4 (QR flyer) and step 5 (business cards). Theme selection is per tool visit and does not change the saved site theme. Free flyer downloads are real; do not place a printer order for this art review.

Before Live: Louis reviews the actual tools; complete authenticated Smoke checks using a designated safe reviewer session. PR merge conflicts remain a separate future release concern. No Kristen saved-theme, customer record, database, payment, order, extension or Finder changes.

## Deployment API lesson

Vercel REST create-deployment rejects target="preview". A staging retry was rejected by automatic approval review because it could select a different environment; it did not run. Official Vercel API documentation confirms omitting target creates preview. The corrected request omitted target, passed approval, and returned target:null. Keep this explicit distinction; never infer authorization for a custom staging environment.
