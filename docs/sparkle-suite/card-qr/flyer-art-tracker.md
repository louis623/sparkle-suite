# Flyer art tracker

Status of the 1080×1920 background behind the fixed QR flyer layout. Plates have no words. The generator draws the show name, tagline, scan pill, QR, instructions, and sign-off on top.

Louis has not approved these plates. Nothing here is live.

## Shared themes

All 14 shared themes have a wraparound plate at `public/amethyst/skins/<folder>/flyer/plate.webp`. The art runs up the sides of the QR as well as across the top and bottom. Title and steps panels sit on top of the plate. They are nearly opaque so the type stays readable, and the plate stays visible around them.

The 7 themes that used to be drawn as flat color (Morganite, Moonstone, Emerald Garden, Rose Gold, Garnet, Amber, Velvet) now use generated jeweled crest, garland, and floor plates. The pieces and the compositors are in `scripts/card-qr/plate-sources/` (`compose.py`, `compose_pc.py`, and a folder per theme). The other 7 shared themes use wraparound plates from the same sources folder.

| Theme | Plate |
| --- | --- |
| Chasing Unicorns (`amethyst`) | `public/amethyst/skins/am01-unicorn/flyer/plate.webp` |
| Sparkle Suite / Morganite | `public/amethyst/skins/morganite/flyer/plate.webp` |
| Moonstone | `public/amethyst/skins/moonstone/flyer/plate.webp` |
| Emerald Garden | `public/amethyst/skins/emerald-garden/flyer/plate.webp` |
| Pumpkin & Witch | `public/amethyst/skins/halloween-pumpkin-witch/flyer/plate.webp` |
| Pumpkin & Cat | `public/amethyst/skins/halloween-pumpkin-cat/flyer/plate.webp` |
| Gilded Autumn | `public/amethyst/skins/gilded-autumn/flyer/plate.webp` |
| Rose Gold | `public/amethyst/skins/rose-gold/flyer/plate.webp` |
| Midnight Rose | `public/amethyst/skins/midnight-rose/flyer/plate.webp` |
| Pearl & Rose | `public/amethyst/skins/pearl-rose/flyer/plate.webp` |
| Rose Champagne | `public/amethyst/skins/rose-champagne/flyer/plate.webp` |
| Garnet | `public/amethyst/skins/garnet/flyer/plate.webp` |
| Amber | `public/amethyst/skins/amber/flyer/plate.webp` |
| Velvet | `public/amethyst/skins/velvet/flyer/plate.webp` |

Rose Quartz is retired. If a saved preset still asks for it, the flyer draws a generated background. It has no plate.

## Hand-made, not generated

These reps keep a custom theme. The generator does not ship a plate for them. Their flyers stay hand-made.

- Black Diamond (`black_diamond`, Brittany)
- Alpine Opal (`alpine_opal`, Lindsey)
- Gnome Garden (`gnome_garden`, Kim)
- Neon Butterfly (`neon_butterfly`, Kelly)
