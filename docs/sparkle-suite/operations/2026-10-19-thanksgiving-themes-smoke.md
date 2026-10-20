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

## Pie refinement after owner review — October 19

Louis accepted Gobble & Fizz unchanged. Pie's 1100px stack breakpoint had put
its copy below the video in the owner's roughly 1045px window. The overlay now
continues down to 701px; phones retain the approved art-above-copy layout.
Pumpkin-orange accents, ruby actions/headings and a deep ruby footer carry the
artwork palette through Home, Dance Floor, Join and Preferences. Reading and
form surfaces remain cream. Shared header/ticker/lineup geometry is unchanged.

Louis approved one Pie-only Higgsfield replacement, capped at $5, and confirmed
funding. Exact-input estimate: $4.622 before discounts; actual charge unverified.
Request `95d66f8f-c677-47ba-bc3c-f7d84f089090` completed. The brief requests fixed
foliage and barely perceptible sunlight. The raw 10.04-second output is retained
outside the repository; the web export trims reference snaps and uses an
8-frame circular overlap, yielding 221 frames at 24fps (9.208 seconds), 1280x720,
2,340,959 bytes, silent H.264. No stabilization, reverse playback, interpolation
or programmed still-image animation was applied. Gobble assets are unchanged.

The new Pie filenames include `-v4`, covering customer playback, CSS fallback,
marketing-preview bundling and flyer source references without reusing a cached
old clip. Independent review caught the marketing cache and flyer references;
both are corrected.

Validation: 249 focused theme/motion/header/layout/template/marketing tests;
local production build and TypeScript passed. Real IAB viewport checks at
1440, 1100, 1045, 820 and 701px retain the overlay; 390 and 320px stack without
horizontal overflow. Fonts reported loaded. Solid-surface contrast inspection
on all four pages at desktop and phone sizes found no failures after correcting
footer background specificity. Photo/gradient areas were visually reviewed;
this is not exhaustive accessibility certification. Browser playback sampled
223 states through three actual 9.208-second restarts and captured 32 images;
window-region source sequences and the resulting seam were inspected. Numerical
restart delta is 0.825 against a maximum within-clip delta of 1.002 (8-bit luma).
Physical iOS/Safari playback remains untested and final owner motion acceptance
is pending. This revision is for Smoke only, without a database or rep-setting
change; Live remains separately gated.

## Final approval and display name — October 19

Louis accepted the revised Pie appearance and v4 loop, then requested the name
**Pumpkin Pie**. Updated public labels, preview title, selection registry and
runtime pickers. The stable `pie_please` ID, PP-01 code, asset paths and preview
URLs remain compatible; the previous name remains a recognized selection alias.
No art, video, saved rep selection or database change accompanies the rename.
150 focused label, normalization/save, template and layout checks passed.
Both Pumpkin Pie and Gobble & Fizz are owner-approved on Smoke. Remaining Live
work is the separately authorized release batch: preflight current production,
apply the additive Community catalog migration to Live if still absent, rebuild
the accepted SHA with Live configuration, verify both aliases and safe customer
selection/rendering, and record release evidence. Physical iPhone/Safari remains
untested. No additional Higgsfield generation or funding is needed.
