---
name: sparkle-suite-existing-site-migration
description: Use when migrating an existing rep-owned website into Sparkle Suite, especially when Louis wants the original site preserved while adding Sparkle Suite automations such as Trade Board, Live Queue, Calendar, Join, tickers, and Nic-Nac-managed settings.
---

# Sparkle Suite Existing Site Migration

## Purpose

Migrate a rep's existing website into Sparkle Suite without turning it into a generic Amethyst skin. The target is the same site: brand, copy, media, typography, mood, and section hierarchy preserved, with Sparkle Suite automations built in and styled to match.

Use this for bespoke migrations like Mile High Fizz. This is not the normal skin-builder flow unless Louis only wants a reusable visual preset.

## Non-Negotiable Intake Gate

Do not begin a full migration from screenshots alone when Louis expects an exact or near-exact migration.

Ask for the strongest available source, one question at a time:

1. "Can you send me the existing site's code/project export or repository? That is the best source of truth for preserving the site accurately."
2. If no code is available: "Can you send the live URL and any exported assets or builder package?"
3. If only a live URL is available: "Is a close recreation acceptable, or should we pause until we can get the source files?"
4. If screenshots are the only source: "Screenshots can guide visual matching, but they are not enough for an exact migration. Do you want a close recreation or should we wait for the source?"

When Louis says he owns/runs the site or can provide the code, do not argue legalities. Ask for the code package, repo, or export location and proceed once it is available.

## Source Priority

Use sources in this order:

1. Supplied project source code, repository, builder export, package, assets, and videos.
2. The current live site URL as a visual/runtime reference.
3. Screenshots from Louis as comparison checkpoints.
4. Louis's spoken instructions for what to keep, remove, reorder, or replace.
5. Existing Sparkle Suite Amethyst behavior contracts.

If source code and live site conflict, ask one focused question about which is current.

## First Questions For Louis

Ask one question at a time. Do not dump a long questionnaire.

Start with:

`Can you send me the current site source code, project export, or repo for this rep?`

After receiving the source, ask only the next missing decision:

- Which live URL is the source of truth?
- Which pages/sections must stay untouched?
- Which pages/sections should be removed?
- Which Sparkle Suite automations should appear and where?
- Should the header/tickers use Sparkle Suite standards or stay like the original?
- Should the rep workspace remain standard Sparkle Suite?
- Should Nic-Nac be allowed to edit migrated copy/branding like a normal rep?
- Should the custom public site stay protected behind the demo/login for now?

Use Louis's answers to build a concise migration brief before editing code.

## Migration Brief Template

Before implementation, write a short brief and confirm it if any expectations are still fuzzy:

- Rep/business:
- Live source URL:
- Source package/repo:
- Public routes to migrate:
- Keep exactly:
- Summarize/rework:
- Remove:
- Sparkle Suite automations to add:
- Header/ticker decision:
- Trade Board decision:
- Join page decision:
- Live Queue decision:
- Calendar decision:
- Nic-Nac/site settings control:
- Protected/public deployment status:
- Acceptance bar:

For Mile High Fizz, the acceptance bar was: preserve the Mile High Fizz site as closely as possible, swap only the header/tickers to Sparkle Suite style, keep Join My Team content, remove Diamond/Unicorn/FAQ pages, add Sparkle Suite Live Queue, Calendar, and Trade Board, and keep automations functionally identical.

## Implementation Pattern

1. Work in `C:\Users\louis\sparkle-suite-repo`, not the binder.
2. Inspect the source project first: routes, components, assets, copy, videos, fonts, Tailwind/CSS tokens, and external links.
3. Run or statically inspect the source site when practical. Capture reference screenshots for desktop and mobile.
4. Add or extend a rep profile module, such as `lib/<rep-slug>/profile.ts`, to hold imported copy, links, public-site variant flags, and asset paths.
5. Preserve Sparkle Suite mechanics:
   - Customer template stays Amethyst unless Louis explicitly changes architecture.
   - Trade Board, Live Queue, Calendar, Join, audience/signup, trade requests, and Nic-Nac APIs keep their existing behavior.
   - Public routing and targeted rep context must keep `repId`/`publicSiteSlug` intact.
6. Add bespoke visual branches with a stable `publicSiteVariant` only where needed.
7. Copy source-owned media into the public asset tree when appropriate, especially hero videos or unique brand imagery.
8. Migrate page-by-page:
   - Homepage shell and hero first.
   - Homepage sections next.
   - Trade Board page with original brand styling around standard Trade Board behavior.
   - Join page with original content/copy and Sparkle Suite-safe mechanics.
   - Any remaining public pages or sections.
9. Keep the rep workspace standard Sparkle Suite unless Louis explicitly asks for a custom workspace.
10. Let Nic-Nac edit migrated branding/copy through normal Site Settings surfaces unless Louis says a section is locked.

## What Worked Best From Mile High Fizz

- Source code changed the quality of the migration. Once the Readdy project export was available, the work became faithful instead of approximate.
- Hero media mattered. The original hero video carried more brand identity than a recreated background.
- A page-by-page pass worked better than trying to skin everything at once.
- The right mental model was "same website with Sparkle Suite automations inserted," not "Amethyst with similar colors."
- Custom components should look like the imported site, while automations should work exactly like every Sparkle Suite rep's automations.
- The Trade Board should have its own route and normal behavior, but wear the rep's branding.
- The Join page needs content parity, especially titles, page-specific offers, and original recruitment language.

## Red Tests First

Write focused tests before implementation. Useful assertions:

- The rep slug resolves to the custom public-site variant.
- Homepage, Trade, and Join data include the expected imported copy.
- Footer/header routes point to slug-specific routes.
- Source-specific assets, such as hero video paths, are present.
- Removed sections/pages are absent from navigation.
- Trade Board and Join still use existing Amethyst APIs and public route contracts.
- Public runtime files contain the custom variant branch only where needed.
- Default Amethyst behavior remains unchanged.

Use existing focused tests as the model:

- `tests/mile-high-fizz-public-site.test.ts`
- `tests/public-site-slug-route.test.ts`
- affected Amethyst template tests

## Visual QA

Always compare against the original source and the Sparkle Suite route:

- Desktop screenshot.
- Mobile screenshot.
- First viewport: brand name, hero, key CTA, and ticker/header state.
- Scroll depth: homepage sections, Trade Board, Join page, footer.
- Check text fit, mobile stacking, and no Black Diamond/default styling leaks.
- Verify media loads, especially videos.

For deployed Sparkle Suite checks, use `sparkle-suite-production-smoke` on
Smoke. Live `yoursparklesuite.com` checks happen after Louis approves the
batch promote. Canonical playbook: Core Memory `skills/sparkle-smoke-ship.md`.

## Common Failure Modes

- Starting from screenshots and calling the result a migration. Screenshots are references, not source.
- Treating "recognizable" as the target when Louis asked for the same site.
- Overbuilding a reusable skin when the request is a bespoke rep migration.
- Changing automation behavior while changing visual dressing.
- Forgetting page-specific copy such as Join titles, promo details, or FAQ language.
- Letting default Amethyst/Black Diamond styling leak into migrated sections.
- Missing hero videos, background media, fonts, or external CTA links.
- Asking Louis a wall of questions instead of one useful next question.

## Stop And Ask

Stop before editing when:

- Source code is missing and Louis expects an exact migration.
- The live site differs materially from the source package.
- It is unclear which sections should be removed.
- A page contains payments, account setup, or external CRM/forms whose destination is unclear.
- A requested change would alter core Sparkle Suite automation behavior instead of styling around it.

Ask one concise question, then continue.

## Verification Before Closeout

Before committing or deploying:

1. Run focused rep migration tests.
2. Run affected Amethyst template tests or `npm run qa:amethyst`.
3. Run `npm run build`.
4. Browser-smoke local or preview desktop and mobile for each touched public route.
5. Deploy and verify the affected public routes on Smoke. Stack related
   updates there until Louis approves one live promote.
6. After that promote, confirm `www.yoursparklesuite.com` plus
   `yoursparklesuite.com` resolve to the batch tip and screenshot the
   affected live public routes.
7. Report commit, Smoke URL, live deployment id when promoted, and what was
   visually verified. Canonical playbook: Core Memory `skills/sparkle-smoke-ship.md`.
