# Thanksgiving Community themes — Smoke review

Louis approved Gobble & Fizz (GF-01 / `gobble_and_fizz`) and Pie, Please!
(PP-01 / `pie_please`), including the corrected Higgsfield loops. This package
targets Smoke only. Live requires separate authorization and a fresh build with
Live configuration.

## Behavior

Both themes use the existing selection and save workflow. No existing theme is
retired and no saved rep selection is migrated. The new migration preserves all
23 previously accepted appearance IDs and registers two unowned Community rows.

Gobble uses plum, ivory and warm gold. Pie uses cream and brown, with a frosted
hero panel enclosing the title, description and all actions. Both theme Home,
Dance Floor, Join and Preferences. Shared header, ticker and lineup geometry
remains unchanged. Matching print-card assets reuse the approved posters and
existing renderer; no additional generated art or paid media was requested.

The silent loops are 9.0 and 8.375 seconds, respectively. Pause/resume, reduced
motion, saved motion-off, offscreen/background suspension and static error
fallback are supported. Shipped videos match the owner-approved v3 files byte
for byte. The animated-skin reference now requires 8–10-second loops and repeated
restart inspection.

## Verification

- Clean checkout from GitHub tip `65ebca5f6be5db85cb28dadd5dabed30c29a6f01`.
- 296 focused theme/catalog/persistence/motion/layout tests passed.
- 102 customer-template tests passed; TypeScript passed.
- 30 focused marketing-preview, print-card, font and picker checks passed,
  including rendering both new card fronts/backs and safe text bounds.
- Production build passed with runtime-injected Smoke configuration. The final
  remote deployment rebuilds the committed package.
- Browser inspection: both themes × four pages × six widths (320–2560px),
  plus 1920/3440px and effective zoom viewport sizes; no horizontal overflow.
- Loaded fonts confirmed as Playfair Display and DM Sans. Corrected form-panel,
  badge, Join action and disclosure-link contrast. All six corrected Join sizes
  had no detected solid-surface contrast failures. Photographic areas were
  visually inspected; this is not a claim of exhaustive accessibility testing.
- All 16 light/dark baseline comparisons matched header/ticker/lineup geometry
  across empty, queued, delayed and no-calendar fixtures.
- Reviewed actual scrolled lower-page sections, controls, sample submission
  guards, search and FAQ interactions. Physical Safari/iPhone testing was not run.
- Independent patch review found missing marketing media and business-card
  registrations; both were corrected and covered by focused checks.

Existing unrelated limitation: the broad print-picker asset test finds the
pre-existing missing `/card-qr-themes/fall-owl.webp`. The completed Fall Owl was
not rebuilt. Both new themes have their own verified thumbnails.

## Safe review path

After the Smoke deployment is verified, use
`https://sparkle-suite-smoke.vercel.app/skin-preview/gobble_and_fizz/homepage`
and the corresponding `pie_please` path. Navigate Home, Dance Floor, Join and
Preferences and scroll each page. These labeled samples block submissions and
uploads; reload resets them. Observe several loop restarts and pause/resume.

For persisted selection testing, use the synthetic Codex Smoke account only,
save each theme, reload, inspect its customer pages, and restore its original
selection. Never change a real rep's settings for QA. Record deployment and
authenticated verification results in Core Memory, including any access limit.
