#!/usr/bin/env python3
"""Finder /learn pillar cards v2 — soft 0.75rem title pocket, UI dominates, no gradient."""
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
from pathlib import Path

OUT = Path(__file__).resolve().parent
COLORS = {
    'search': (0x1A, 0x0B, 0x2E),
    'save': (0x3D, 0x18, 0x70),
    'go-to-the-show': (0x5B, 0x2A, 0x8F),
    'show-it-off': (0x24, 0x10, 0x48),
}
BASE_NJ = Path('/workspace/finder-brief/learn-no-jewelry-qa-2026-10-02')
BASE_WOW = Path('/workspace/finder-brief/learn-wow-qa-2026-10-02')
SOURCES = {
    'search': (BASE_NJ / 'extra-piece-page-card.png', (28, 188, 472, 630)),
    'save': (BASE_NJ / 'extra-save-piece-card.png', (50, 200, 450, 638)),
    'go-to-the-show': (BASE_NJ / 'extra-live-shows-card.png', (32, 188, 468, 572)),
    'show-it-off': (BASE_WOW / 'phone_scroll_08_showcase.png', (16, 208, 245, 558)),
}
MODES = {
    'search': 'cover',
    'save': 'panel',
    'go-to-the-show': 'cover',
    'show-it-off': 'panel',
}


def rounded_rect_mask(size, radius: int) -> Image.Image:
    w, h = size
    m = Image.new('L', (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=255)
    return m


def cover_canvas(crop: Image.Image, tw: int, th: int, x_bias=0.50, y_bias=0.20) -> Image.Image:
    sw, sh = crop.size
    scale = max(tw / sw, th / sh)
    nw, nh = int(round(sw * scale)), int(round(sh * scale))
    resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    max_x, max_y = max(0, nw - tw), max(0, nh - th)
    x0 = int(round(max_x * x_bias))
    y0 = int(round(max_y * y_bias))
    return resized.crop((x0, y0, x0 + tw, y0 + th)).convert('RGB')


def panel_on_ui_backdrop(crop: Image.Image, tw: int, th: int) -> Image.Image:
    backdrop = cover_canvas(crop, tw, th, x_bias=0.45, y_bias=0.15)
    backdrop = backdrop.filter(ImageFilter.GaussianBlur(radius=max(2, tw // 400)))
    backdrop = ImageEnhance.Brightness(backdrop).enhance(0.92)
    pad_y = int(round(th * 0.035))
    pad_r = int(round(tw * 0.028))
    panel_h = th - 2 * pad_y
    panel_w = int(round(tw * 0.66))
    sw, sh = crop.size
    scale = min(panel_w / sw, panel_h / sh)
    nw, nh = int(round(sw * scale)), int(round(sh * scale))
    resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    panel_radius = max(14, int(round(18 * (tw / 560.0))))
    mask = rounded_rect_mask((nw, nh), panel_radius)
    x = tw - pad_r - nw
    y = pad_y + (panel_h - nh) // 2
    backdrop.paste(resized, (x, y), mask)
    return backdrop


def make_card(name: str, tw: int, th: int) -> Image.Image:
    path, box = SOURCES[name]
    crop = Image.open(path).convert('RGB').crop(box)
    if MODES[name] == 'cover':
        x_bias = 0.48 if name == 'search' else 0.55
        y_bias = 0.18 if name == 'search' else 0.15
        base = cover_canvas(crop, tw, th, x_bias=x_bias, y_bias=y_bias)
    else:
        base = panel_on_ui_backdrop(crop, tw, th)

    radius = max(10, int(round(12 * (tw / 560.0))))  # 0.75rem scaled to PNG

    if name == 'go-to-the-show':
        pocket_w, pocket_h = int(round(tw * 0.30)), int(round(th * 0.40))
    elif name == 'show-it-off':
        pocket_w, pocket_h = int(round(tw * 0.29)), int(round(th * 0.37))
    else:
        pocket_w, pocket_h = int(round(tw * 0.27)), int(round(th * 0.32))

    margin_x = int(round(tw * 0.032))
    margin_y = int(round(th * 0.050))
    px, py = margin_x, th - margin_y - pocket_h
    pocket = Image.new('RGB', (pocket_w, pocket_h), COLORS[name])
    base.paste(pocket, (px, py), rounded_rect_mask((pocket_w, pocket_h), radius))
    assert pocket_w / tw < 1 / 3.0
    print(f'{name} {tw}x{th}: pocket {pocket_w}x{pocket_h} r={radius} width={pocket_w/tw:.1%}')
    return base


if __name__ == '__main__':
    for name in COLORS:
        make_card(name, 1200, 675).save(OUT / f'{name}.png', 'PNG', optimize=True)
        make_card(name, 900, 700).save(OUT / f'{name}-tall.png', 'PNG', optimize=True)
    print('Wrote', OUT)
