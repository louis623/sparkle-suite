# Fall Owl and Harvest Moon release

Louis authorized publishing this approved theme to every rep on October 17, 2026.

## Customer behavior

Reps can select **Fall Owl and Harvest Moon** (FO-01) from the existing theme picker and save it through the existing workflow. Current selections remain unchanged. The approved animated owl, moon, leaves and lake play silently initially; visitors can enable natural autumn sounds or pause the animation. No existing theme is retired.

The release adds a Community catalog row with no owner restriction and extends the appearance selection constraint. It does not update any rep's saved selection. The migration rejects conflicting pre-existing catalog policies and preserves all 22 previously accepted IDs.

## Provenance and verification

- Repository: `louis623/sparkle-suite`, branch `codex/nic-nac-trade-hardening`.
- Built in a clean disposable clone from `39871833b6207c67a519ddd574ab93d1457e3855`, leaving the historical dirty Windows checkout untouched.
- Existing production deployment preserved for comparison: `dpl_39Go4XC7dQY6oYaL6qHdZL7aHMxp`, `sparkle-suite-r2e7t2rrf-louis-2849s-projects.vercel.app`.
- Intended Vercel project: `prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3` (`sparkle-suite`).
- Production build passed using the documented manual-release branch/repository provenance environment.
- 224 focused theme, catalog, persistence, motion, contrast, preview-sandbox and shared-layout tests passed. Eight focused flyer/card/font/QR compatibility checks passed (rendering timeout set to 30 seconds on this machine).
- Isolated Chromium checked all four customer pages at 1440px and 390px: no page errors or horizontal overflow; pause, sound and reduced-motion controls verified.

## Reviewer path

After deployment, open `https://www.yoursparklesuite.com/skin-preview/fall_owl_harvest_moon/homepage`. This is a labeled sample, available without personal credentials. Use its navigation to inspect Home, Dance Floor, Join and Preferences; scroll every page. Enable sounds, pause/resume, then test reduced motion. Sample submissions/uploads are guarded and cannot affect live customers. Reload resets the sample.

For authenticated selection, use the supported synthetic reviewer Workspace path, choose FO-01, save, reload, and confirm the saved selection and public customer pages. Do not use Louis's personal account. If reviewer controls are unavailable, record that verification gap.

## Pending production steps

At package preparation, the migration, manual Vercel production release, alias confirmation and live authenticated selection smoke are not yet complete. Automatic approval review rejected an attempted export of Vercel production secrets to a local environment file. No export occurred. Do not retry that export or use another route to bypass the rejection. Publishing requires authorized database access for the reviewed migration; use credentials only through an approved mechanism and never log or commit them.

Verify both `www.yoursparklesuite.com` and `yoursparklesuite.com` resolve to the exact released commit/deployment, then verify the sample and rep selection on the live domain before marking this complete.
