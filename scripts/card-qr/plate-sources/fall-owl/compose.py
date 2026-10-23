"""Compose the Fall Owl flyer plate from the approved landscape hero.

The approved poster is 1280×720 with the owl and harvest moon on the right.
The QR flyer plate is 1080×1920. A centre cover-crop of that poster keeps the
middle of the lake and cuts the owl off. This script restages the same pixels:

- Top: the painting from x=300 through the right edge, scaled to the flyer
  width. That window starts left of the owl, so the owl and moon stay whole.
- Middle: the lake and hills, enlarged only as atmosphere under the portrait.
- Bottom: the perch and foreground leaves, so the lower safe band is the branch.

Nothing here is a new owl. Every layer is a crop of
public/amethyst/skins/fall-owl/hero-poster.webp.
"""

from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

ROOT = Path(__file__).resolve().parents[4]
SOURCE = ROOT / 'public/amethyst/skins/fall-owl/hero-poster.webp'
OUTPUT = ROOT / 'public/amethyst/skins/fall-owl/flyer/plate.webp'

WIDTH = 1080
HEIGHT = 1920
# Left of the owl. The bright face begins near x=760 and the pupils near
# x=798 and x=997; starting at 120 keeps that whole head on the plate and
# high enough that both eyes sit above the flyer title panel.
HERO_LEFT = 120
HERO_TOP = 0


def scale_to_width(image, width):
    height = max(1, round(image.height * width / image.width))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def scale_to_height(image, height):
    width = max(1, round(image.width * height / image.height))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def cover(image, width, height, anchor='left'):
    scale = max(width / image.width, height / image.height)
    resized = image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    if anchor == 'right':
        left = resized.width - width
    elif anchor == 'centre':
        left = (resized.width - width) // 2
    else:
        left = 0
    top = max(0, (resized.height - height) // 2)
    return resized.crop((left, top, left + width, top + height))


def fade_mask(size, top=0, bottom=0, left=0, right=0, blur=12):
    width, height = size
    mask = Image.new('L', size, 255)
    pixels = mask.load()
    for y in range(height):
        fade_y = 1.0
        if top and y < top:
            fade_y = y / top
        if bottom and y > height - 1 - bottom:
            fade_y = min(fade_y, (height - 1 - y) / bottom)
        for x in range(width):
            fade = fade_y
            if left and x < left:
                fade *= x / left
            if right and x > width - 1 - right:
                fade *= (width - 1 - x) / right
            pixels[x, y] = int(max(0, min(255, fade * 255)))
    return mask.filter(ImageFilter.GaussianBlur(blur))


def paste(base, image, xy, **fades):
    blur = fades.pop('blur', 12)
    mask = fade_mask(image.size, blur=blur, **fades) if fades else None
    base.paste(image, xy, mask)


def unsharp(image, percent=48, radius=1.1):
    return image.filter(ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=2))


def compose(source):
    plum = source.getpixel((24, 28))
    plate = Image.new('RGB', (WIDTH, HEIGHT), plum)

    # Atmosphere under the portrait: the lake and hills, not the owl.
    valley = source.crop((0, 160, 980, 700))
    valley = cover(valley, WIDTH, 1280, 'left')
    valley = ImageEnhance.Brightness(valley).enhance(0.86)
    valley = ImageEnhance.Color(valley).enhance(1.05)
    valley = valley.filter(ImageFilter.GaussianBlur(1.6))
    paste(plate, valley, (0, 640), top=180, bottom=40, blur=16)

    # Whole owl and moon. Scaled to the flyer width so neither side is cropped.
    hero = source.crop((HERO_LEFT, 0, source.width, source.height))
    hero = unsharp(scale_to_width(hero, WIDTH))
    paste(plate, hero, (0, HERO_TOP), bottom=190, left=12, blur=14)

    # Foreground perch. Same branch and leaves, brought to the bottom safe band.
    perch = source.crop((160, 500, source.width, source.height))
    perch = unsharp(scale_to_width(perch, 1460), percent=40, radius=1.0)
    paste(
        plate,
        perch,
        ((WIDTH - perch.width) // 2, HEIGHT - perch.height + 28),
        top=170,
        left=36,
        right=24,
        blur=14,
    )

    # Original corner leaves, since the hero window starts right of them.
    sprig = unsharp(scale_to_width(source.crop((0, 0, 300, 180)), 480), percent=36, radius=1.0)
    paste(plate, sprig, (-18, -12), bottom=64, right=110, blur=8)
    return plate


def main():
    source = Image.open(SOURCE).convert('RGB')
    if source.size != (1280, 720):
        raise SystemExit(f'Expected the approved 1280×720 poster, got {source.size}.')
    plate = compose(source)
    if plate.size != (WIDTH, HEIGHT):
        raise SystemExit(f'Plate must be {WIDTH}×{HEIGHT}, got {plate.size}.')
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    plate.save(OUTPUT, 'WEBP', quality=86, method=6)
    print(f'Wrote {OUTPUT.relative_to(ROOT)} {plate.size} {OUTPUT.stat().st_size} bytes')


if __name__ == '__main__':
    main()
