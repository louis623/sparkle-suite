"""Compose the Fall Owl flyer plate from the approved landscape hero.

The approved poster is 1280×720. The owl's left ear starts near x=640 and the
harvest moon's bright edge ends near x=1176, so the subject is one span on
the right, not two pictures. A 9:16 window of the full poster height is only
405px wide and would cut the ear or the moon.

This plate is that one span (x=620..1200, the full 720px height), scaled
uniformly to the flyer width and placed at the top. Below it, only the
poster's own bottom edge — the foreground leaves — is stretched so the
ground continues. There is no second crop, no mirrored lake, and no seam
between two copies of the poster.
"""

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[4]
SOURCE = ROOT / 'public/amethyst/skins/fall-owl/hero-poster.webp'
OUTPUT = ROOT / 'public/amethyst/skins/fall-owl/flyer/plate.webp'

WIDTH = 1080
HEIGHT = 1920
# Right-hand span that holds the ear (x≈640) and the moon (bright edge ≈1176).
CROP_LEFT = 620
CROP_RIGHT = 1200
# How much of the scaled painting's own foreground is used to fill the plate.
FOREGROUND_ROWS = 140
JOIN_FADE = 120


def compose(source):
    if source.size != (1280, 720):
        raise SystemExit(f'Expected the approved 1280×720 poster, got {source.size}.')
    painting = source.crop((CROP_LEFT, 0, CROP_RIGHT, source.height))
    scaled_height = round(painting.height * WIDTH / painting.width)
    if scaled_height >= HEIGHT:
        raise SystemExit(
            f'Crop {painting.size} already fills the plate; do not cover-crop the owl.'
        )
    painting = painting.resize((WIDTH, scaled_height), Image.Resampling.LANCZOS)
    painting = painting.filter(ImageFilter.UnsharpMask(radius=1.0, percent=28, threshold=3))

    plate = Image.new('RGB', (WIDTH, HEIGHT))
    plate.paste(painting, (0, 0))

    # Same foreground, continued downward. Not another view of the lake.
    take = min(FOREGROUND_ROWS, painting.height)
    foreground = painting.crop((0, painting.height - take, WIDTH, painting.height))
    band_height = HEIGHT - painting.height + JOIN_FADE
    band = foreground.resize((WIDTH, band_height), Image.Resampling.LANCZOS)
    mask = Image.new('L', band.size, 255)
    pixels = mask.load()
    for y in range(JOIN_FADE):
        value = int(255 * y / JOIN_FADE)
        for x in range(WIDTH):
            pixels[x, y] = value
    plate.paste(band, (0, painting.height - JOIN_FADE), mask)
    return plate


def main():
    source = Image.open(SOURCE).convert('RGB')
    plate = compose(source)
    if plate.size != (WIDTH, HEIGHT):
        raise SystemExit(f'Plate must be {WIDTH}×{HEIGHT}, got {plate.size}.')
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    plate.save(OUTPUT, 'WEBP', quality=86, method=6)
    print(f'Wrote {OUTPUT.relative_to(ROOT)} {plate.size} {OUTPUT.stat().st_size} bytes')


if __name__ == '__main__':
    main()
