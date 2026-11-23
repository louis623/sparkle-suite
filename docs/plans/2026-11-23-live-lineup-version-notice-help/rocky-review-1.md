# Rocky plan review, round 1 of 2: Live Lineup version notice + help guide
This review covers /workspace/plans/live-lineup-version-notice-help-plan.md (v1). I checked it against the worktree /workspace/ss-plan-1123 @ 9667296a, the email folder and the running log (neon-rabbit-memory main).
- Done Mon Nov 23, 2026, around 10:40 AM ET.
- Static only: 0 builds, 0 tests, 0 loads, 0 DB queries.

## Verdict: Approve with changes
The design is sound. The version logic already exists server-side, and the notice is UI only.
- Two blockers: one user-facing copy gap and one handoff gap that would waste a build run.
- One required simplification: drop the Smoke preview.
- The rest are nits.

## Blockers
1. **The update steps must tell reps never to remove and reinstall the extension (user-facing).**
   - Evidence: running log, "Reinstalling the extension wipes the saved connection code. Tell reps to Update (chrome://extensions, Developer mode, Update), never remove and reinstall." Plan §1 steps (a)-(d), plan L55-60, don't say it.
   - Risk: a rep who sees "out of date" right before a show may uninstall and reinstall, and lose her pairing.
   - Fix: add one line to the `update-extension` part: "Don't remove the extension. Removing it erases your connection code."
   - Also reorder so step (c), the Developer mode Update, is the main step for anyone below 2.0.13. Those reps are exactly the ones the notice targets:
     - Update-on-startup and Check for updates exist only in 2.0.13 (email notes.md §2.1).
     - The running log §10h says `requestUpdateCheck` is throttled for about 5 h, so (a) and (b) are often no-ops.
     - Keep (a) and (b) as "on 2.0.13 or newer, this usually happens by itself".
   - This goes with Q2 for Louis.
2. **The builder can't open the box paths the prompts depend on (cost; wasted run).**
   - Both prompts (plan L176 and L200) say "Plan: /workspace/plans/…, section N" and "Build exactly as section N describes". The PR B prompt also needs `/workspace/live-lineup-rep-email/copy.md`, `email.html` and `img/01-04`.
   - The builder is a Cursor cloud agent. It has no access to the box, so it can't read the plan, the copy or the 4 images.
   - Fix (efficiency standard: the named files must exist where the builder can open them). Before handoff, Suite does one of these:
     - (a) paste the section text and the exact copy into each prompt and stage the 4 images where the agent can fetch them, for example on a branch or as PR attachments Louis approves;
     - (b) run the build on the box with Codex.
   - Each prompt then names that exact location.

## Required change (not a blocker)
3. **Drop the `?lineupVersionPreview=outdated` Smoke preview** (plan §2.6, L132-135). Rely on the unit tests, plus one static HTML render in the test.
   - The two-marker rule needs `SPARKLE_ENVIRONMENT`, which is server-only. `resolveLineupReviewState` reads `process.env` on the server (lib/amethyst/skin-preview.ts:313-317, used by app/skin-preview/[skin]/[page]/route.ts).
   - `LiveLineupShowControls.tsx` is `'use client'` (L1). In the browser, `SPARKLE_ENVIRONMENT` is undefined, so a two-marker check there never turns on.
   - A builder who "fixes" that would end up checking only `NEXT_PUBLIC_SPARKLE_ENVIRONMENT`, which is a one-marker gate. Doing it properly means passing a server-computed flag down from app/nic-nac/page.tsx → _client.tsx → DashboardPlaceholder → LiveLineupCard. Those files are all outside PR A's file list.
   - Leak risk is low. It's display-only and the text is fictional, and Live has NEXT_PUBLIC ≠ smoke. But the preview costs more than it's worth.
   - If Louis wants to see the notice, a test-rendered screenshot will do.

## Checks: plan §0 claims vs code (Reported)
- **release.ts:** matches. `{protocol:1, version:'2.0.13', publishedAt:'2026-11-22T13:13:00.000Z', rolloutEnabled:true}` (L2-4). The route is public with no-store (app/api/live-lineup/release/route.ts:4-6). The manifest says 2.0.13.
- **projectShowControl:** matches, at show-control.ts:106-145.
  - `workerVersion = row.worker_version ?? (showVersion(sourceVersion) ? sourceVersion : null)` (L115).
  - `latestPublishedVersion` is set only if rollout is on and `publishedAt <= now` (L117-118).
  - `updateNeeded = worker && latest && compare < 0` (L140).
  - Small correction: the regex is `^[0-9]{1,5}(\.[0-9]{1,5}){1,3}$` (L40-41), not `\d+`. That makes no difference to behavior.
  - `row.worker_version` is validated with the same regex in parseControlRow (L97), and the client re-checks it (isLineupExtensionStatus L156-164).
- **service.ts:** close. getWorkspaceLineup is at L55-65 and attaches `extensionStatus` on both paths (L62, L64). changeLineup is at L133-135, and the check-in RPC is at L317-330.
- **LiveLineupShowControls.tsx:** the old string is at L70-74, inside LiveLineupExtensionDetails (L61-90). `.showWarning` is amber `#fff1d2/#6e3909` (LiveLineupCard.module.css:341-343). Existing warnings use `role="alert"` (L84). The plan's `role="status"` for the notice is the right call.
- **Card height:** fixed. `height:min(480px,70dvh)` (css:5), or `90dvh` at max-height 520px (css:80-81). The compact card is at DashboardPlaceholder.tsx:7904 and the full tool at :8344.
- **HelpResourcesCard** is at DashboardPlaceholder.tsx:9288.
  - Groups and guides are native `<details>` (L9444, L9457). Only the first group is `open` (L9395).
  - `initialTab` defaults to 'help'.
  - In help-resources.ts, `use-live-queue-during-show` is at L198 and the Mac guide at L231.
- **Edge cases:**
  - Legacy path: `sourceVersion` must pass the regex. `demo-1.0.0` fails it, so there's no notice. ✔
  - Rollout off, or `publishedAt` in the future: latest is null, so there's no notice. ✔
  - Unauthorized: the plan adds `snapshot.authorized`. ✔
  - Worker newer than latest (a beta, before release.ts is bumped): compare > 0, so there's no notice. ✔
- **HARD RULE (update immediately on every startup, no caution gates):** no conflict. PR A and PR B touch no extension code and add no gate. The notice is informational only.
- **No layout jump:** the reasoning holds.
  - The notice renders from the same snapshot, inside the fixed-height card, with no fetch, effect or animation. Only the inner list area gets shorter.
  - Page CLS from the notice should be 0.
  - The guide images sit inside closed `<details>` with width and height set, so they cause no shift.
- **syncWorkspaceSectionSearch** (DashboardPlaceholder.tsx:432-447) already keeps any unknown param. It only strips `section` on home and `view|compose|type|source` off messages (L419, L441-444).
  - So "must not drop guide/part" is already true. The new work is the drop-on-leave branch only.
  - Note that `source` is stripped off messages, so the email's `&src=email` survives. It also sticks around forever unless it's dropped too (nit 4).

## Nits (fix-it-yourself notes for the build prompts)
1. **Deep link from the card.** The link is a plain same-tab `<a>`, so it's a full page navigation. That works, because the section is read from the URL at init (DashboardPlaceholder.tsx:3151-3156).
   - Don't use `next/link`. A soft navigation on the same /nic-nac path won't change `activeSection`, since it's read only at init and on popstate.
   - Better: on /nic-nac, the link's onClick calls `setActiveSection('help-resources')` and sets the params, with the plain href kept as the fallback.
2. **Opening native `<details>`:** set `.open = true` through a ref in the deep-link effect. Don't add a controlled `open` prop, or React will fight the user's own toggles. Open the group first, then the guide, then rAF → scrollIntoView → `focus({preventScroll:true})` on the summary or part heading.
3. **tests/help-resources.test.ts:196-200 maps search terms to this guide id:** 'assigned code', 'Web Store', 'Chrome', 'stale lineup', 'empty'.
   - Dropping "stale" changes Nic-Nac search results.
   - Keep 'assigned code', 'Web Store' and 'Chrome' in the new text or keywords. Consciously update the 'stale lineup' row, and list it under Spec corrections.
4. **Drop `guide`, `part` and `src` when leaving help-resources.** Also make sure that going Back after the deep link doesn't re-scroll unexpectedly.
5. **Guide step 2 version:** using `LIVE_LINEUP_RELEASE.version` is fine. If rollout is off or `publishedAt` is in the future, the guide would show a version reps can't get yet, so use the same "published" rule as `latestPublishedVersion`.
6. **Store propagation:** after a release.ts bump, Chrome Web Store updates can take hours to reach a rep. Add one line of guide copy, such as "Updates can take a few hours to show up after we release one". Don't add any gate.
7. **Card space:** the notice is title + line + a 44px link inside the fixed card. At 70dvh on short phones, check that the list still shows at least 2 rows. Use `white-space:nowrap` on the version numbers so they don't break mid-number.
8. **Support view:** `SupportWorkspaceClient` (app/control-center/support/[sessionId]/SupportWorkspaceClient.tsx:211) renders the same card. There, "How to update" takes staff to their own /nic-nac. Hide the link or keep the notice text-only when it's rendered in the support view.
9. **Prompts:** add the fallback URL after the skill line in both prompts: "If the modern-web-guidance skill is not installed for you, read https://developer.chrome.com/docs/modern-web-guidance and follow it."
10. **Smoke deploy:** `create_deployment` with gitSource ref `codex/nic-nac-trade-hardening` plus a PR SHA labels a PR commit as the active branch so it passes `scripts/check-active-branch.mjs`.
    - This matches how #219 reached Smoke. Say plainly in the plan that it's intentional, so nobody reads it as a bypass.
    - If the Cursor agent has no Vercel access, it stops after the PR and CI and reports. It must not look for credentials.
11. **Prompt rules otherwise pass:**
    - one paste-ready block each;
    - the exact skill line;
    - named tests with ≤3 runs;
    - 3 loads + 1 Lighthouse, only with an existing sign-in, otherwise "not checked";
    - Spec corrections and fix-it-yourself in the build part;
    - release steps stop on failure with no fix loop;
    - no show, heartbeat or no-show-window gates;
    - Live only on Louis's go;
    - no Store upload, since there's no extension change.

    Missing: "one review pass, then stop". Add it to both prompts.
12. **Shot 05:** the plan says no placeholder. Good; this is Q1. The 4 images are 70-195 KB, all ≤200 KB. Their sizes are 1072×1117, 560×1126, 560×792 and 780×566, so the width and height are known. Image 04 is the public demo site, which is fine.

## Learnings for the running log (to list, not push)
- **Reported (code):** the Workspace already computes "extension out of date" server-side (show-control.ts:115-140) and sends it on every snapshot. The gap was only UI: a plain text line.
- **Reported (code):** Smoke two-marker gates use `SPARKLE_ENVIRONMENT`, which is server-only. They can't be evaluated in a `'use client'` component, so Smoke-only previews must be computed server-side and passed down.
- **Reported (code):** `syncWorkspaceSectionSearch` keeps unknown query params across sections. Deep-link params need explicit removal when the rep leaves the section.
- **Likely:** reps on versions before 2.0.13 have no Check for updates button and no update-on-startup. For them, the Developer mode Update is the reliable path, and the guide must say not to reinstall.
