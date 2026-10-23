"""Compose the Fall Owl flyer plate from the approved hero poster.

The poster is 1280×720. The jeweled owl and the harvest moon are on the
right, and the lake is in the same short frame, so one crop cannot leave
open sky under a smaller owl. This plate uses only those pixels:

- The owl, the branch, and the moon, scaled down and set on the upper right
  so the head and a little of the body sit above the flyer title, clear of
  the centered QR.
- The lake and hills once, along the bottom.
- The poster's own night-sky colors between them.

Nothing here is a new owl. The face and the body are the hero's pixels.
"""

from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[4]
SOURCE = ROOT / 'public/amethyst/skins/fall-owl/hero-poster.webp'
OUTPUT = ROOT / 'public/amethyst/skins/fall-owl/flyer/plate.webp'

WIDTH = 1080
HEIGHT = 1920

# Right-hand span of the approved poster: left of the face through the moon,
# and down through the chest and the branch. Not the lake.
OWL_BOX = (400, 0, 1280, 480)
OWL_WIDTH = 530
OWL_X = 534
OWL_Y = 8

# The lake and hills, once. Stops short of the owl on the right.
LAND_BOX = (0, 430, 1100, 720)
LAND_FADE = 86


def sky_field(source):
    """Continue the poster's night sky. Colors are sampled from clear sky."""
    column = [source.getpixel((150, y)) for y in range(8, 220, 2)]
    field = Image.new('RGB', (WIDTH, HEIGHT))
    pixels = field.load()
    last = len(column) - 1
    for y in range(HEIGHT):
        t = min(0.999, y / 1480)
        index = min(last - 1, int(t * last))
        blend = t * last - index
        start = column[index]
        end = column[index + 1]
        color = tuple(int(start[channel] * (1 - blend) + end[channel] * blend) for channel in range(3))
        for x in range(WIDTH):
            pixels[x, y] = color
    return field


def edge_mask(image, fade):
    mask = Image.new('L', image.size, 255)
    pixels = mask.load()
    width, height = image.size
    for y in range(min(fade, height)):
        value = int(255 * (y / fade) ** 1.25)
        for x in range(width):
            pixels[x, y] = value
    return mask


def owl_mask(image):
    """Keep the owl solid. Fade only night-sky pixels near the crop edge."""
    mask = Image.new('L', image.size, 255)
    pixels = mask.load()
    width, height = image.size
    pad = 42
    for y in range(height):
        for x in range(width):
            if pad <= x < width - 28 and pad <= y < height - 48:
                continue
            red, green, blue = image.getpixel((x, y))
            warm = red - blue
            lum = (red + green + blue) / 3
            if warm > 14 or lum > 88:
                continue
            distance = min(x / pad, y / 28, (width - 1 - x) / 28, (height - 1 - y) / 48, 1)
            pixels[x, y] = int(255 * distance * distance)
    return mask.filter(ImageFilter.GaussianBlur(0.6))


def compose(source):
    if source.size != (1280, 720):
        raise SystemExit(f'Expected the approved 1280×720 poster, got {source.size}.')
    plate = sky_field(source)

    land = source.crop(LAND_BOX)
    land_height = round(land.height * WIDTH / land.width)
    land = land.resize((WIDTH, land_height), Image.Resampling.LANCZOS)
    plate.paste(land, (0, HEIGHT - land_height), edge_mask(land, LAND_FADE))

    owl = source.crop(OWL_BOX)
    owl_height = round(owl.height * OWL_WIDTH / owl.width)
    owl = owl.resize((OWL_WIDTH, owl_height), Image.Resampling.LANCZOS)
    plate.paste(owl, (OWL_X, OWL_Y), owl_mask(owl))
    return plate


def main():
    source = Image.open(SOURCE).convert('RGB')
    plate = compose(source)
    if plate.size != (WIDTH, HEIGHT):
        raise SystemExit(f'Plate must be {WIDTH}×{HEIGHT}, got {plate.size}.')
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    plate.save(OUTPUT, 'WEBP', quality=88, method=6)
    print(f'Wrote {OUTPUT.relative_to(ROOT)} {plate.size} {OUTPUT.stat().st_size} bytes')


if __name__ == '__main__':
    main()
