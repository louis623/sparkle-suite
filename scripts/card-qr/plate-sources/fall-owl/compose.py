"""Compose the Fall Owl flyer plate.

The approved site poster is 1280×720. In that painting the owl is large on
the right and the lake sits in the same short frame, so a crop cannot leave
open sky under a smaller owl and put the hills only at the bottom.

portrait.jpg is a 720×1280 painting in that poster's palette and subject:
the owl on a hanging branch with the harvest moon in the upper fifth, open
plum sky through the middle, and the lake and hills once along the bottom.
This script scales that painting uniformly to 1080×1920. It does not
cover-crop the owl, blur-fill the ground, or stack a second copy of the hero.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
MASTER = Path(__file__).resolve().parent / 'portrait.jpg'
OUTPUT = ROOT / 'public/amethyst/skins/fall-owl/flyer/plate.webp'

WIDTH = 1080
HEIGHT = 1920
MASTER_SIZE = (720, 1280)


def compose(master):
    if master.size != MASTER_SIZE:
        raise SystemExit(f'Expected the {MASTER_SIZE[0]}×{MASTER_SIZE[1]} portrait, got {master.size}.')
    # 720×1280 and 1080×1920 are the same 9:16 frame, so this scale keeps
    # the owl at the top and the lake at the bottom.
    return master.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)


def main():
    master = Image.open(MASTER).convert('RGB')
    plate = compose(master)
    if plate.size != (WIDTH, HEIGHT):
        raise SystemExit(f'Plate must be {WIDTH}×{HEIGHT}, got {plate.size}.')
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    plate.save(OUTPUT, 'WEBP', quality=86, method=6)
    print(f'Wrote {OUTPUT.relative_to(ROOT)} {plate.size} {OUTPUT.stat().st_size} bytes')


if __name__ == '__main__':
    main()
