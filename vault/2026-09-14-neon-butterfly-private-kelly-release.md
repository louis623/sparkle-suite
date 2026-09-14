# Neon Butterfly private Kelly release closeout

Date: September 14, 2026

## Outcome

- Neon Butterfly is private to Kelly's `Sparkly Butterflies` workspace and
  Louis's established internal demo workspace, `The Dudes Fizzfest`
  (`louis@neonrabbit.net`).
- Kelly's customer site now uses Neon Butterfly by default.
- Louis's demo workspace can select and preview the skin, but its saved
  appearance remains Amethyst until Louis chooses to change it.
- The owner-only picker label is exactly `Only Kelly has`.
- Every other rep is excluded from the skin picker and is rejected if a direct
  Site Settings, Nic-Nac, required-setup, or database write attempts to select
  Neon Butterfly.

## Durable product rule

Custom skins made for a named rep are private by default. The allowlist is the
named rep plus Louis's established demo workspace so he can review and tune the
skin without entering the rep's account. Non-owners must not see a disabled
teaser or discover the custom skin in their dropdown. The restriction must be
enforced in every selection/write path and by the database, not only hidden in
the interface. Expanding an allowlist requires Louis's explicit approval.

This rule was added to the Sparkle Suite skin-builder skill and skin contract.
The public noindex skin-preview route can remain available as a design/review
surface; it is not a selectable workspace option.

## Implementation and data safety

- Application commit: `8f4f08ea2fff87f449f37996abbfe364f187cec7`
  (`feat: make Neon Butterfly a private Kelly skin`).
- Migration `20260914000200_make_neon_butterfly_kelly_exclusive.sql` uses exact
  identity guards for Kelly and Louis's demo workspace, makes Neon Butterfly
  Kelly's default, resets any non-owner Neon selection to Morganite, and adds a
  database constraint containing only the two approved rep IDs.
- Production readback found zero non-owner Neon Butterfly rows after the
  migration. Louis's demo remained Amethyst; Kelly read back as Amethyst
  template plus Neon Butterfly appearance.
- The migration was applied directly and then recorded in the migration ledger.
  Protected Live Lineup migrations `20260910000100` and `20260910000200` remain
  pending and were not run.

## Verification

- Five focused test files passed: 87 tests.
- The exact isolated commit passed branch safety, production compilation,
  TypeScript checking, and the 32-page static build.
- Live Chrome verification on `https://sparklybutterflies.com/` confirmed the
  approved Neon Butterfly homepage, three butterflies, Neon styling, correct
  page title and heading, no horizontal overflow, and no console errors.
- Read-only verification in Louis's live `The Dudes Fizzfest` workspace showed
  `Neon Butterfly (NB-01) — Only Kelly has` in Site Settings while Amethyst
  remained selected and the save action remained disabled.
- Non-owner exclusion and rejection were covered by application tests and the
  production database constraint. No personal account was logged out or
  replaced with a synthetic session merely to duplicate that proof.
- Kelly's root and Trade routes returned 200. Kelly's Join route returned 404
  because of the workspace's pre-existing Join visibility/settings, so Join is
  not claimed as verified by this release.

## Release provenance and alias protection

- Production deployment: `dpl_DPcYwvfeSoLLGqAEv9fcNMkYxJ6G`.
- The Suite `www` and apex domains and Kelly's `sparklybutterflies.com` `www`
  and apex domains resolve to the new deployment.
- Vercel initially auto-moved every attached customer alias. The movement was
  detected immediately. Mile High Fizz, Bri's Glowtique, Go For The Bling,
  Britt With Bling, and The Bling Kitchen aliases were restored to preserved
  deployment `dpl_5S4omxT8Eo8YKx4P5eU3dZzuJ8uU` and verified through alias
  inspection plus direct HTTP checks.
- The shared dirty checkout, Sparkle Finder, Live Lineup, extension, queue,
  Store, billing, and unrelated customer data were not modified or released.
