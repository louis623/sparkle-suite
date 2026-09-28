# Halloween skin release contract

Louis approved the Pumpkin & Cat motion proof and requested community availability,
plus a focused readability audit of Pumpkin & Witch. Preserve the approved art,
composition, skull charm, cat movement, and pumpkin candle glow.

- Community skin: `halloween_pumpkin_cat`, card `HPC-01`.
- Homepage uses the approved five-second video with a four-second rest.
- The shipped MP4 is byte-identical to the approved proof: SHA-256
  `d3932075b02acced7b32ca2f9cff6375274fea0b11463e2912d1ff93b7266b64`.
- Lossless WebP posters preserve the approved desktop and mobile images.
- Phones/tablets up to 1100px use the square still above the copy. Reduced
  motion and saved still preference avoid initial video downloads. Desktop
  supports pause/resume, hidden/offscreen pausing, and poster fallback.
- The normal Amethyst template, rep copy, actions, data, and custom homepage
  sections remain in place. No customer selection is changed by the migration.
- Witch changes are limited to action surfaces, label contrast, tap targets,
  and mobile Dance Floor overflow. Existing Witch art/motion remain intact.

## Repeatable review

Open `/skin-preview/halloween_pumpkin_cat/homepage` on the reviewed deployment.
Use the preview bar to visit Dance Floor, Join, and Preferences. The pages are
marked sample content; submissions, uploads, and provider calls are intercepted.
Reload to reset fixtures. Repeat for `halloween_pumpkin_witch`.

At desktop width, inspect the hero and pause/resume control. At 390px and tablet
widths, inspect the still, text, wrapped actions, forms, and filters. Tests cover
reduced motion, saved still, video error fallback, rest intervals, and cleanup.

For account persistence, use only the existing staging Codex synthetic account
with public slug `smokecodex`; save the skin through `/api/nic-nac/site-settings`,
reload settings, then open its public storefront. Its original preset was
`sparkle_suite_morganite`; save that preset through the same endpoint to reset.
Never use a real rep or Louis's original account for this test.

## Release

Apply only `20260928000100_add_halloween_pumpkin_cat.sql` to each explicitly
verified target, then record it with Supabase's supported migration repair CLI
when applied via Management API. Verify the community catalog row and preserve
all legacy preset values. Verify on Smoke before rebuilding the accepted Git SHA
with Live project configuration. Deployment IDs and final verification belong
in the corresponding Core Memory ship note.
