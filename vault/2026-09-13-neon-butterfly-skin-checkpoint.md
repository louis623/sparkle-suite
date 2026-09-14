# Neon Butterfly skin checkpoint — September 13, 2026

## Outcome

Neon Butterfly (`NB-01`, preset id `neon_butterfly`) is implemented as a reusable Amethyst appearance preset. It is registered in the same skin-card catalog used by Site Settings and Nic-Nac, so it is available to every Sparkle Suite rep rather than being hard-coded to Kelly.

The skin covers Homepage, Dance Floor/Trade, Join, and email Preferences/Unsubscribe. It preserves the Amethyst announcement bar, Dance Floor ticker, Live Lineup rail, content hierarchy, and customer-site behavior while replacing the visual system with deep aubergine velvet, neon pink/violet, warm lamp gold, and a restrained live-green accent.

## Original art and motion

- Original responsive WebP backdrops live in `public/amethyst/skins/neon-butterfly/`.
- The shared skin styles live in `public/amethyst/neon-butterfly.css`.
- The shared runtime in `public/amethyst/neon-butterfly.js` adds decorative inline-SVG butterflies, slow ambient color drift, occasional sparkle twinkles, and a lamp shimmer.
- Motion is intentionally staggered and low-frequency. One small butterfly makes an occasional flight while the other signs flutter independently.
- The runtime includes a visible Pause/Resume control, pauses when the page is hidden, and honors `prefers-reduced-motion`.

## Safety and compatibility

- The customer-site template remains `amethyst`; this is an appearance preset only.
- The safe preview route uses fixture data, is `noindex`, and does not read a customer record from query parameters.
- The shared Sparkle Finder theme map received only the exhaustive type mapping required by the common preset union. Neon Butterfly was not added to Finder's selectable appearance IDs.
- No Live Lineup, extension, queue, Store, or unrelated production-release files were changed for this skin.
- The database migration expands only `site_settings_appearance_preset_check` and preserves the legacy database-only preset ids `pearl`, `luxe`, and `ocean_sapphire`.

## Verification completed

- Focused skin and integration suite: 10 test files, 106 tests passed.
- Production build: passed, including branch safety, TypeScript, and static generation.
- Desktop, tablet, and mobile visual QA completed against the safe local preview for Homepage, Dance Floor, Join, and Preferences.
- The animation pause control was exercised in-browser and the announcement ticker contrast issue found during QA was corrected.

## Release notes

The release must be constructed from only the Neon Butterfly file set because the primary worktree contains substantial pre-existing dirty work from other sessions. Protected pending Live Lineup migrations must not be swept into the database release.
