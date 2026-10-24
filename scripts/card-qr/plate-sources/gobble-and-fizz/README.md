# Gobble & Fizz — approved cauldron-only flyer

Louis approved this direction on October 24, 2026 after reviewing the actual Cards & QR renderer. Earlier small-subject and cutout-border designs are rejected.

Rebuild: node scripts/card-qr/plate-sources/compose-thanksgiving.cjs gobble-and-fizz

scene.webp is the approved 1080×1920 source-referenced composition generated offline with the built-in image tool. generation.json records the exact prompt. This is a redesigned scene, not an unchanged-pixel hero cutout. The original site hero remains untouched and stays the registry source.

The builder verifies hero and scene hashes from approved-scene.json, splits the approved scene into top.png (y0–599), side.png (y600–1499) and floor.png (y1500–1919), then composes public/amethyst/skins/gobble-and-fizz/flyer/plate.webp. This lossless build partition preserves one continuous scene without duplicated scenery or blur-fill. Tests compare every output pixel with the approved scene.

The turkey is deliberately removed. The oversized copper cauldron's ring handles, curved sides, rim and fizz remain readable around the real QR and panels.

The actual title/QR/instructions format is unchanged. PNG/JPEG QR decoding is checked with short and long titles. No runtime generation, saved-theme changes or Live release.
