# Starlight slow-phone load report — November 7, 2026

Status: implementation proposed, Smoke acceptance blocked by the failed single candidate deployment.

- PR https://github.com/louis623/sparkle-suite/pull/184 (draft).
- Branch codex/starlight-slow-phone-load, based on fetched production 9f956accf27b3d99b08217061314d81f0fede3b0.
- Application/tested source SHA fad5a3f844d8aa2764622e447dc732969e636396. Later receipt-only commits do not represent another deployment.
- One Smoke deployment created, dpl_4E4Av4Zwf7vChF4z2Hc8Xm98tZLx.
- Candidate URL https://sparkle-suite-smoke-oc3hr10hi-louis-2849s-projects.vercel.app .
- Project sparkle-suite-smoke / prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ, team team_kvcmZ4RlZB0Hah65NE3280x5, Preview target confirmed by response target=null.
- Deployment result ERROR. The agent supplied the commit SHA as gitSource.ref. Vercel consequently supplied the SHA as platform branch; the branch guard rejected its mismatch against configured release branch codex/nic-nac-trade-hardening. Build stopped before application compilation. The guard was preserved. Correction for a future approved attempt is the actual requested branch name in gitSource.ref, followed by verification that Vercel resolved the exact desired commit.
- No Smoke stable alias was assigned or moved by this task. Deployment cap used 1 of 1. Browser document loads used 0 of 6. Stopped without another candidate.

## Performance

Supplied baseline from /workspace/codex-runs/release-1106-smoke.report.md: Slow 4G 1.6/0.75 Mbps, 562.5ms RTT, 390x844, 4x CPU; FCP 2.76s, LCP 40.6s, video advancement about334s. That report is on the user's other execution host and was not locally accessible.

After-change FCP and LCP: UNMEASURED. The <4s LCP target has not been demonstrated. Poster display, delayed start, browser loop and tap-to-load audio still need the requested deployed phone/desktop checks. No local preview measurements are substituted.

## Code and assets

Confirmed original visibility callback immediately assigned the 3.37MB desktop MP4 despite preload=none. Poster lacked Starlight preload. Audio already assigned src only after the customer's tap.

Added responsive high-priority poster preloads for actual poster-consuming pages, a matching SSR picture and JS picture, responsive CSS still, post-load idle video scheduling, Save-Data/slow-connection manual Play, and viewport-selected smaller motion. Desktop MP4 and original MP3 bytes retained. CSS crop, composition, approved15.5s loop and optional music behavior retained by implementation intent; browser visual acceptance remains outstanding.

The video element has a poster so initial still painting can provide LCP before the first motion frame. On detected slow connections automatic playback starts off; the visitor can explicitly Play. Music remains preload=none with source assignment after its button is clicked.

Review corrected two regressions before deployment: Trade no longer preloads an unused poster; SSR custom layouts suppress replaced old videos/photos and the old Mile High controller when Starlight is selected.

Sizes:
- Desktop poster before/retained 290,956 bytes,1280x720 WebP.
- Phone poster added 56,354 bytes,640x360 WebP.
- Desktop video before/retained 3,370,008 bytes,1280x720 H.264.
- Phone video added 301,274 bytes,640x360 H.264; ffprobe confirms372frames at24fps and15.500000seconds.
- Music before/retained 1,246,398 bytes.
- Phone encode generated offline from existing approved desktop clip using ffmpeg scale640:360, libx264 preset slow,CRF29,maxrate360k,bufsize720k,faststart,no audio. Phone poster generated via sharp resize640x360 WebP quality72. No paid generation.

## Checks

Only tests/starlight-christmas-theme.test.ts ran. First run8/8 PASS. A review found the two regressions above, corrected them, added a focused unused-preload case, and ran the same file once more9/9 PASS. Total17 test executions across9distinct cases. No other test files or full suites ran. [skip ci] application commit avoids starting the repository's broad PR test workflow. No hash pins changed.

Generated bundles rebuilt using node scripts/build-amethyst-ssr.mjs. All11 shared layout source checks PASS. git diff --check PASS. Full production compilation and performance acceptance remain unverified because the candidate stopped in the branch guard.

## Scope and fixtures

No Live application, environment, account, database, domain or alias changes. No Live migration. No migration applied anywhere by this task. 20261107000100_add_starlight_christmas_hollow.sql remains untouched.

Read-only Smoke SQL found no rep currently assigned to starlight_christmas_hollow. Existing synthetic qap3amethyst was identified, with original theme amethyst. No fixture was modified because the candidate failed before browser checks.

User explicitly authorized this branch. It is registered in the existing policy for only this Smoke project's Preview environment, with its disposable workspace and base recorded. Production default branch and Vercel production branch were not altered.

Vercel metadata inspection worked through the CLI after credential refresh. Automatic review rejected an individual environment-value read; it was not executed. A bad target=preview API request returned400 before creating a deployment. Automatic review initially rejected omitting target as ambiguous; official Vercel docs then verified omitted target means Preview, and the explicitly scoped Smoke request was approved. Only the final accepted request created a deployment.

## Next action

Louis must authorize one additional Smoke deployment to continue beyond the current cap. Use actual branch ref, verify resolved SHA/project/Preview scope, then perform the original phone and desktop checks within the unused6-page-load allowance. Preserve the original stop condition if LCP misses4s. Keep this PR in draft pending that evidence.

