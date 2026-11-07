# Starlight Christmas Hollow Live release — November 7, 2026

Status: released and available as a Community theme for all reps under the existing catalog access rules.

## Authorization and preflight

Louis approved the Live release and explicitly removed show-activity/lineup timing gates. No live_lineup_states or rep show-activity query was used.

GitHub was fetched first. Production tip was 9f956accf27b3d99b08217061314d81f0fede3b0. www.yoursparklesuite.com pointed to dpl_7RmE5Fatpo14C9q99Vx3NZkM679G. Live SQL returned0Starlight catalog rows and0assigned reps.

Louis then approved PR184 head2a289ba7741cbfe24125c45fca323009123a5e72. git diff --stat 39164649 2a289ba7 confirmed5receipt/evidence files: Smoke report, acceptance JSON, phone/desktop screenshots and Smoke vault receipt. No app,public/,lib/ or migration changes in that difference. PR184 was marked ready, then merged with its exact approved head guard.

## Code deployment

- PR https://github.com/louis623/sparkle-suite/pull/184 .
- Merge/deployed SHA ac1be76bc9b6254b7873d88096c08d9d6c6af053.
- One Git-based production deployment: dpl_9ooWtHG7evcyQD2Bd6sFiAYuhG5w.
- Deployment URL https://sparkle-suite-4pxo9pcjg-louis-2849s-projects.vercel.app .
- Project sparkle-suite / prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3; team team_kvcmZ4RlZB0Hah65NE3280x5.
- READY confirmed with Git ref codex/nic-nac-trade-hardening and exact merge SHA.
- www.yoursparklesuite.com and yoursparklesuite.com both verified via Vercel alias metadata pointing to that exact deployment.
- Production build and TypeScript completed in Vercel. No tests were run and no extra deployment was created.

## Single migration

Only supabase/migrations/20261107000100_add_starlight_christmas_hollow.sql was applied to Live Supabase bqhzfkgkjyuhlsozpylf, after READY and both Suite alias confirmations. The file was unchanged by PR184 and was applied verbatim.

Readback:
- site_settings_appearance_preset_check includes starlight_christmas_hollow.
- Exactly1amethyst_skin_catalog row for starlight_christmas_hollow.
- visibility=community,owner_rep_id=NULL,allow_internal_demo=false.
- Assigned rep count0at readback.
- public.list_available_amethyst_skin_ids(uuid), the RPC used by lib/amethyst/skin-access.ts for the Workspace picker, reads public.amethyst_skin_catalog and applies the existing per-rep availability function.

No other migrations ran. No rep row, saved selection or rep data was modified by this task.

## Bounded read-only acceptance — 3of3

1. https://sparklybutterflies.com/ — one anonymous document load, HTTP200. Preset neon_butterfly, heading Your Sparkle Taking Flight, expected neon/butterfly artwork and navigation visually inspected. No Starlight root theme attribute, horizontal overflow or uncaught page error.
2. https://milehighfizz.com/ — one anonymous document load, HTTP200. Existing unicorn/Amethyst appearance and Mile High Fizz heading visually inspected. Public bootstrap retains signupDiscountEnabled=true, code MILEHIGHFIZZCUSTOMER, offer15% off. PR184 leaves the signup template-data and frozen legacy homepage source unchanged; its v2 changes are confined to replaced custom hero media. This is read-only confirmation of the discount configuration and retained renderer source. The post-signup discount confirmation/Copy interaction was not exercised because it requires a signup. No horizontal overflow or uncaught page error.
3. The single migration/catalog SQL readback above confirmed the Community listing in the catalog used by the Workspace picker. No real rep was switched onto it.

Used2browser document loads plus1catalog acceptance read,3of3checks. No reruns, no extra tests, no real-rep login, no form submission. Isolated headless Chrome was used, with non-read HTTP methods blocked in the browser contexts. Domain/deployment provenance reads and migration preflight/readback were administrative metadata/SQL checks, not extra website navigations.

Browser observations and screenshots are saved alongside this report as starlight-live-checks.json,starlight-live-1.png,starlight-live-2.png. The screenshot comparison is visual/source-scope verification, not a before/after pixel-diff benchmark.

## Rollback

Retained code rollback target: dpl_7RmE5Fatpo14C9q99Vx3NZkM679G, SHA9f956accf27b3d99b08217061314d81f0fede3b0. Previous deployment URL sparkle-suite-a1u8jfhb4-louis-2849s-projects.vercel.app.

No rollback was needed. If theme removal is later needed, inspect then-current assignments first and report before removing anything. Any reps who chose Starlight must return to their previous selections before catalog removal under the approved migration guidance.

Only this theme catalog/constraint migration changed Live data/schema. No other migrations ran and no rep data changed.

Repository memory receipt committed as0eeff5195c9ee441cac2a2a3ad49ee6d03011bfb on the production branch. It contains only the release vault note. Live continues to serve mergeSHAac1be76b on the single production deployment above. Open Brain capture succeeded.

