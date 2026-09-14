# Neon Butterfly shape and foliage refinement — September 13, 2026

## Scope

This refinement keeps Neon Butterfly (`NB-01`, preset id `neon_butterfly`)
inside the shared Amethyst layout and changes only its visual layer.

## Changes

- Reduced the amount and prominence of the hero room's edge greenery while
  preserving the velvet curtains, lamp, jewelry staging, furniture, palette,
  and centered negative space in both responsive artwork crops.
- Rebuilt the neon butterflies from separate left- and right-wing paths with
  taller upper lobes and smaller curled lower lobes based on Kelly's reference.
- Removed the white interior Y/T detail entirely.
- Gave each of the three main butterflies a real independent wing-flap cycle
  with 19-, 23-, and 27-second staggered timing. The restrained glow and drift
  remain separate from the wing motion.
- Corrected the motion control's stacking so Pause/Resume is actually clickable.

## Verification

- Focused Neon Butterfly test: 12/12 passed.
- Related integration run: 320/322 passed. The two failures are pre-existing
  source-shape assertions in already-dirty, unrelated Dashboard/Homepage work;
  neither failing file is part of this refinement.
- Amethyst QA run: 91/92 passed with the same unrelated Homepage source-shape
  assertion drift.
- Exact production build: passed, including TypeScript and static generation.
- Browser QA at 1440x1000 and 390x844 confirmed three main butterflies, six
  animated wings, zero white detail paths, and successful Pause/Resume.
- The measured minimum wing scales were approximately 0.49, 0.48, and 0.48,
  proving all three independent flap cycles executed in the rendered page.

## Asset provenance

The two room edits were created with the built-in image generation workflow in
precise-object-edit mode from the existing responsive backdrops. The generated
masters remain in the Codex generated-images directory; the production WebP
derivatives remain at the existing public asset paths so no skin or route
contract changed.

## Safety

No extension, Live Lineup, queue, Store, Finder selection, migration, billing,
authentication, or customer-data behavior was changed.
