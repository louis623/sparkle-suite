# Flyer art tracker

Status of the 1080×1920 background behind the fixed QR flyer layout. Plates have no words. The generator draws the show name, tagline, scan pill, QR, instructions, and sign-off on top.

Louis has not approved these plates. Nothing here is live.

## Art plates

Rebuilt from hero art already in the repo. Stored at `public/amethyst/skins/<folder>/flyer/plate.webp`. The scene runs above and below a quieter center where the QR card sits.

| Theme | Source | Plate |
| --- | --- | --- |
| Chasing Unicorns (`amethyst`) | `public/amethyst/skins/am01-unicorn/hero-poster.webp` | `public/amethyst/skins/am01-unicorn/flyer/plate.webp` |
| Pumpkin & Cat | `public/amethyst/skins/halloween-pumpkin-cat/hero-mobile.webp` | `public/amethyst/skins/halloween-pumpkin-cat/flyer/plate.webp` |
| Pumpkin & Witch | `public/amethyst/skins/halloween-pumpkin-witch/hero-desktop.webp` plus `witch.webp` and `bats.webp` | `public/amethyst/skins/halloween-pumpkin-witch/flyer/plate.webp` |
| Gilded Autumn | `public/amethyst/skins/gilded-autumn/hero-poster.webp` | `public/amethyst/skins/gilded-autumn/flyer/plate.webp` |
| Midnight Rose | `public/amethyst/skins/midnight-rose/hero-poster.webp` | `public/amethyst/skins/midnight-rose/flyer/plate.webp` |
| Pearl & Rose | `public/amethyst/skins/pearl-rose/hero-poster.webp` | `public/amethyst/skins/pearl-rose/flyer/plate.webp` |
| Rose Champagne | `public/amethyst/skins/rose-champagne/hero-poster.webp` | `public/amethyst/skins/rose-champagne/flyer/plate.webp` |

Rebuild with `npx tsx scripts/card-qr/build-flyer-plates.ts`.

## Generated backgrounds

No scene art yet. The flyer draws a full-bleed background from that theme's colors: a layered gradient, soft light orbs, bokeh, and sparkle. There is no image file.

- Sparkle Suite / Morganite
- Moonstone
- Emerald Garden
- Rose Gold
- Garnet
- Amber
- Velvet

Rose Quartz is retired. If a saved preset still asks for it, it gets the same kind of generated background.

## Hand-made, not generated

These reps keep a custom theme. The generator does not ship a plate for them.

- Neon Butterfly (Kelly)
- Gnome Garden (Kim)
- Alpine Opal (Lindsey)
- Black Diamond (Brittany)
