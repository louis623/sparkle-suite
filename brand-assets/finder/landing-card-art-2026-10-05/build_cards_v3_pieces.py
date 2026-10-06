#!/usr/bin/env python3
"""Rebuild /learn pillar cards with four DIFFERENT shiny jewelry-library pieces.
v2 layout kept: no side gradient; soft 0.75rem color pocket bottom-left; UI dominates; titles not baked.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

OUT = Path(__file__).resolve().parent
PIECES = OUT / "pieces"
PATCHED = OUT / "patched"
PATCHED.mkdir(exist_ok=True)

BASE_NJ = Path("/workspace/finder-brief/learn-no-jewelry-qa-2026-10-02")
BASE_WOW = Path("/workspace/finder-brief/learn-wow-qa-2026-10-02")

SERIF = "/usr/share/fonts/truetype/sand-box/custom/Source Serif Pro/SourceSerifPro-Bold.ttf"
SERIF_REG = "/usr/share/fonts/truetype/sand-box/custom/Source Serif Pro/SourceSerifPro-Regular.ttf"
SANS = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
SANS_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

COLORS = {
    "search": (0x1A, 0x0B, 0x2E),
    "save": (0x3D, 0x18, 0x70),
    "go-to-the-show": (0x5B, 0x2A, 0x8F),
    "show-it-off": (0x24, 0x10, 0x48),
}

# Locked assignment after visual QA (pretty / cute / blingy / warm)
ASSIGN = {
    "search": {
        "design_name": "The GoGo Necklace",
        "item_number": "NK77364",
        "main_stone": "Lab-Created Blue Spinel",
        "material": "Rhodium Plating",
        "collection_label": "BRINGBACK",
        "kind": "necklace",
        "kind_title": "Necklace",
        "photo": PIECES / "NK77364-GoGo-Necklace.jpg",
        "photo_url": "https://bqhzfkgkjyuhlsozpylf.supabase.co/storage/v1/object/public/jewelry-photos/9a971c05-3631-443e-bcb8-4e9a26e15885/NK77364-source.jpg",
        "why": "Vibrant blue spinel + CZ sparkle; clean studio card; necklace for Search piece page.",
    },
    "save": {
        "design_name": "The Prestige Hoops",
        "item_number": "ER39527",
        "main_stone": "Diamond Cubic Zirconia",
        "material": "Rhodium Plating",
        "collection_label": "OG",
        "kind": "earrings",
        "kind_title": "Earrings",
        "photo": PIECES / "ER39527-Prestige-Hoops.jpg",
        "photo_url": "https://bqhzfkgkjyuhlsozpylf.supabase.co/storage/v1/object/public/jewelry-photos/9a971c05-3631-443e-bcb8-4e9a26e15885/ER39527-source.jpg",
        "why": "Cute heart-cut CZ hoops; bright rhodium; photographs cleanly for Save card.",
    },
    "go-to-the-show": {
        "design_name": "I've Been Dreaming Of You",
        "item_number": "ER88724",
        "main_stone": "Amethyst Cubic Zirconia",
        "material": "Gold Plating",
        "collection_label": "OG",
        "kind": "earrings",
        "kind_title": "Earrings",
        "photo": PIECES / "ER88724-Dreaming-Of-You.jpg",
        "photo_url": "https://bqhzfkgkjyuhlsozpylf.supabase.co/storage/v1/object/public/jewelry-photos/d0b2f7da-8aa2-4e7d-983a-3263996ad58b/ER88724-source.jpg",
        "why": "Warm gold + amethyst CZ halo; accent inset because Master Live Calendar has no jewelry thumbs.",
    },
    "show-it-off": {
        "design_name": "The Marisol Earrings",
        "item_number": "ER94385",
        "main_stone": "Lab-Created Pink Sapphire",
        "material": "Gold Plating",
        "collection_label": "ORIGINAL",
        "kind": "earrings",
        "kind_title": "Earrings",
        "photo": PIECES / "ER94385-Marisol.jpg",
        "photo_url": "https://bqhzfkgkjyuhlsozpylf.supabase.co/storage/v1/object/public/jewelry-photos/b5404543-b90a-41cf-85f6-4e6d1d576cfa/designs/cfa03f11-9f0c-480b-a0b5-7313e7488e10/ER94385-source.jpg",
        "why": "Warm pink sapphire + gold + turquoise accents; cute geometric bling for Showcase sheet.",
    },
}


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def cover_fit(src: Image.Image, tw: int, th: int, bias=(0.5, 0.42)) -> Image.Image:
    """Scale-cover crop into tw×th, bias toward jewelry center."""
    sw, sh = src.size
    scale = max(tw / sw, th / sh)
    nw, nh = int(round(sw * scale)), int(round(sh * scale))
    resized = src.resize((nw, nh), Image.Resampling.LANCZOS)
    max_x, max_y = max(0, nw - tw), max(0, nh - th)
    x0 = int(round(max_x * bias[0]))
    y0 = int(round(max_y * bias[1]))
    return resized.crop((x0, y0, x0 + tw, y0 + th)).convert("RGB")


def rounded_rect_mask(size, radius: int) -> Image.Image:
    w, h = size
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius=radius, fill=255)
    return m


def paste_cover(base: Image.Image, photo: Image.Image, box, bias=(0.5, 0.42)):
    x0, y0, x1, y1 = box
    tw, th = x1 - x0, y1 - y0
    fitted = cover_fit(photo, tw, th, bias=bias)
    base.paste(fitted, (x0, y0))


def fill_rect(draw: ImageDraw.ImageDraw, box, color):
    draw.rectangle(box, fill=color)


def text_w(draw, text, fnt):
    b = draw.textbbox((0, 0), text, font=fnt)
    return b[2] - b[0]


def wrap_text(draw, text, fnt, max_w):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if text_w(draw, trial, fnt) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def patch_search() -> Path:
    """Piece page: replace Cosmic Navigator photo + labels + lead thumb/text."""
    p = ASSIGN["search"]
    im = Image.open(BASE_NJ / "extra-piece-page-card.png").convert("RGB")
    photo = Image.open(p["photo"]).convert("RGB")
    draw = ImageDraw.Draw(im)

    # Main jewelry photo (left column)
    paste_cover(im, photo, (52, 208, 218, 372), bias=(0.50, 0.40))
    # Lead thumbnail
    paste_cover(im, photo, (268, 470, 316, 518), bias=(0.50, 0.40))

    # Labels under main photo — wipe then redraw
    fill_rect(draw, (48, 374, 248, 442), (255, 255, 255))
    f_coll = font(SANS_BOLD, 11)
    f_title = font(SERIF, 18)
    f_meta = font(SANS, 10)
    draw.text((52, 376), p["collection_label"], fill=(214, 45, 138), font=f_coll)
    # Title may need wrap for long names
    title_lines = wrap_text(draw, p["design_name"], f_title, 190)
    ty = 392
    for line in title_lines[:2]:
        draw.text((52, ty), line, fill=(45, 30, 110), font=f_title)
        ty += 20
    meta = f"{p['item_number']} / {p['kind']} / Standard library label"
    draw.text((52, ty + 2), meta, fill=(120, 120, 130), font=f_meta)

    # Exact design line in lead panel
    fill_rect(draw, (320, 498, 468, 540), (255, 255, 255))
    f_small = font(SANS, 8)
    exact_lines = wrap_text(
        draw,
        f"Exact design: {p['design_name']} · Item {p['item_number']} · {p['main_stone']} · {p['material']}",
        f_small,
        145,
    )
    ey = 500
    for line in exact_lines[:3]:
        draw.text((322, ey), line, fill=(90, 90, 100), font=f_small)
        ey += 11

    out = PATCHED / "search-source.png"
    im.save(out)
    return out


def patch_save() -> Path:
    """Save-a-piece card: replace jewelry + Necklace/title/Obsidia."""
    p = ASSIGN["save"]
    im = Image.open(BASE_NJ / "extra-save-piece-card.png").convert("RGB")
    photo = Image.open(p["photo"]).convert("RGB")
    draw = ImageDraw.Draw(im)

    # Full jewelry photo (must cover old Cosmic photo through WHAT WILL YOU REVEAL band)
    paste_cover(im, photo, (78, 268, 422, 545), bias=(0.50, 0.38))

    # Wipe ALL old meta (Necklace / Cosmic Navigator / Obsidia lived ~y550–640)
    fill_rect(draw, (60, 545, 440, 648), (255, 255, 255))

    # Soft lavender pocket behind title
    pocket = Image.new("RGBA", (340, 78), (0, 0, 0, 0))
    pd = ImageDraw.Draw(pocket)
    pd.rounded_rectangle((0, 0, 339, 77), radius=10, fill=(235, 228, 245, 255))
    im.paste(pocket.convert("RGB"), (78, 568), rounded_rect_mask((340, 78), 10))

    # Tag pill
    tag = Image.new("RGBA", (78, 22), (0, 0, 0, 0))
    td = ImageDraw.Draw(tag)
    td.rounded_rectangle((0, 0, 77, 21), radius=6, fill=(232, 220, 245, 255))
    td.text((8, 4), p["kind_title"], fill=(90, 60, 140), font=font(SANS, 11))
    im.paste(tag.convert("RGB"), (78, 548), rounded_rect_mask((78, 22), 6))

    draw = ImageDraw.Draw(im)
    f_title = font(SERIF, 22)
    f_sub = font(SANS, 12)
    draw.text((86, 578), p["design_name"], fill=(55, 35, 130), font=f_title)
    draw.text((86, 608), "OG" if p["collection_label"] == "OG" else p["collection_label"].title(), fill=(110, 110, 120), font=f_sub)

    out = PATCHED / "save-source.png"
    im.save(out)
    return out


def patch_go() -> Path:
    """Live calendar has no jewelry — keep chrome, add small shiny piece inset (Dreaming Of You)."""
    p = ASSIGN["go-to-the-show"]
    im = Image.open(BASE_NJ / "extra-live-shows-card.png").convert("RGB")
    photo = Image.open(p["photo"]).convert("RGB")

    # Inset panel on the right of the Master Live Calendar white card
    panel_w, panel_h = 150, 190
    px, py = 310, 300  # inside the white calendar card area
    # Soft white rounded card with jewelry + caption
    panel = Image.new("RGB", (panel_w, panel_h), (255, 255, 255))
    pd = ImageDraw.Draw(panel)
    # thin purple border feel
    pd.rounded_rectangle((0, 0, panel_w - 1, panel_h - 1), radius=12, outline=(200, 180, 230), width=2)
    fitted = cover_fit(photo, panel_w - 16, 118, bias=(0.50, 0.40))
    panel.paste(fitted, (8, 10))
    f_cap = font(SANS_BOLD, 9)
    f_name = font(SERIF, 11)
    f_meta = font(SANS, 8)
    pd.text((10, 132), "TONIGHT'S SPARKLE", fill=(180, 60, 140), font=f_cap)
    name_lines = wrap_text(pd, p["design_name"], f_name, panel_w - 16)
    ny = 145
    for line in name_lines[:2]:
        pd.text((10, ny), line, fill=(55, 35, 120), font=f_name)
        ny += 13
    pd.text((10, ny + 2), f"{p['item_number']} · gold", fill=(120, 120, 130), font=f_meta)

    mask = rounded_rect_mask((panel_w, panel_h), 12)
    # Soft drop shadow
    shadow = Image.new("RGBA", (panel_w + 8, panel_h + 8), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((4, 4, panel_w + 3, panel_h + 3), radius=12, fill=(40, 20, 60, 60))
    shadow = shadow.filter(ImageFilter.GaussianBlur(3))
    im_rgba = im.convert("RGBA")
    im_rgba.alpha_composite(shadow, (px - 2, py - 2))
    im = im_rgba.convert("RGB")
    im.paste(panel, (px, py), mask)

    out = PATCHED / "go-to-the-show-source.png"
    im.save(out)
    return out


def patch_show_it_off() -> Path:
    """Showcase/save sheet: replace Cosmic Navigator photo + all labels/specs."""
    p = ASSIGN["show-it-off"]
    im = Image.open(BASE_WOW / "phone_scroll_08_showcase.png").convert("RGB")
    photo = Image.open(p["photo"]).convert("RGB")
    draw = ImageDraw.Draw(im)

    # Jewelry photo inside SAVE A PIECE sheet
    paste_cover(im, photo, (40, 252, 220, 388), bias=(0.50, 0.40))

    # Wipe meta: tag, title, Obsidia, stone/material block
    fill_rect(draw, (28, 390, 232, 500), (255, 255, 255))

    # Soft lavender detail band
    band = Image.new("RGB", (196, 58), (236, 228, 245))
    im.paste(band, (32, 448))

    # Tag
    tag = Image.new("RGBA", (72, 18), (0, 0, 0, 0))
    td = ImageDraw.Draw(tag)
    td.rounded_rectangle((0, 0, 71, 17), radius=5, fill=(230, 220, 242, 255))
    td.text((6, 3), p["kind_title"], fill=(90, 60, 140), font=font(SANS, 9))
    im.paste(tag.convert("RGB"), (34, 392), rounded_rect_mask((72, 18), 5))

    draw = ImageDraw.Draw(im)
    f_title = font(SERIF, 14)
    f_sub = font(SANS, 10)
    f_lab = font(SANS, 7)
    f_val = font(SANS_BOLD, 8)

    title_lines = wrap_text(draw, p["design_name"], f_title, 190)
    ty = 414
    for line in title_lines[:2]:
        draw.text((34, ty), line, fill=(45, 30, 110), font=f_title)
        ty += 15
    draw.text((34, ty), p["collection_label"].title() if p["collection_label"] != "OG" else "OG", fill=(120, 120, 130), font=f_sub)

    # Stone / Material columns
    draw.text((38, 452), "STONE", fill=(140, 140, 150), font=f_lab)
    stone_lines = wrap_text(draw, p["main_stone"], f_val, 88)
    sy = 462
    for line in stone_lines[:2]:
        draw.text((38, sy), line, fill=(70, 45, 130), font=f_val)
        sy += 10
    draw.text((38, sy + 2), f"Item {p['item_number']}", fill=(130, 130, 140), font=f_lab)

    draw.text((130, 452), "MATERIAL", fill=(140, 140, 150), font=f_lab)
    mat_lines = wrap_text(draw, p["material"], f_val, 90)
    my = 462
    for line in mat_lines[:2]:
        draw.text((130, my), line, fill=(70, 45, 130), font=f_val)
        my += 10

    # Retag bottom chips: earrings / gold (cover old necklace/rhodium chips if visible)
    # Original chips around y 505-520 — partially in crop used later; patch lightly
    if im.size[1] > 520:
        fill_rect(draw, (30, 508, 230, 528), (255, 255, 255))
        chip_y = 510
        for label, x in [("earrings", 34), ("gold", 110)]:
            cw = 8 + text_w(draw, label, font(SANS, 8))
            chip = Image.new("RGBA", (cw + 8, 16), (0, 0, 0, 0))
            cd = ImageDraw.Draw(chip)
            cd.rounded_rectangle((0, 0, cw + 7, 15), radius=4, outline=(180, 160, 210), width=1)
            cd.text((5, 3), label, fill=(90, 70, 130), font=font(SANS, 8))
            im.paste(chip.convert("RGB"), (x, chip_y), rounded_rect_mask((cw + 8, 16), 4))

    out = PATCHED / "show-it-off-source.png"
    im.save(out)
    return out


SOURCES = {}
MODES = {
    "search": "cover",
    "save": "panel",
    "go-to-the-show": "cover",
    "show-it-off": "panel",
}
# Crop boxes match prior v2 (inner UI only)
SOURCE_BOXES = {
    "search": (28, 188, 472, 630),
    "save": (50, 200, 450, 638),
    "go-to-the-show": (32, 188, 468, 572),
    "show-it-off": (16, 208, 245, 558),
}


def cover_canvas(crop: Image.Image, tw: int, th: int, x_bias=0.50, y_bias=0.20) -> Image.Image:
    sw, sh = crop.size
    scale = max(tw / sw, th / sh)
    nw, nh = int(round(sw * scale)), int(round(sh * scale))
    resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    max_x, max_y = max(0, nw - tw), max(0, nh - th)
    x0 = int(round(max_x * x_bias))
    y0 = int(round(max_y * y_bias))
    return resized.crop((x0, y0, x0 + tw, y0 + th)).convert("RGB")


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
    path = SOURCES[name]
    box = SOURCE_BOXES[name]
    crop = Image.open(path).convert("RGB").crop(box)
    if MODES[name] == "cover":
        x_bias = 0.48 if name == "search" else 0.55
        y_bias = 0.18 if name == "search" else 0.15
        if name == "go-to-the-show":
            x_bias, y_bias = 0.62, 0.20  # bias toward jewelry inset on right
        base = cover_canvas(crop, tw, th, x_bias=x_bias, y_bias=y_bias)
    else:
        base = panel_on_ui_backdrop(crop, tw, th)

    radius = max(10, int(round(12 * (tw / 560.0))))
    if name == "go-to-the-show":
        pocket_w, pocket_h = int(round(tw * 0.30)), int(round(th * 0.40))
    elif name == "show-it-off":
        pocket_w, pocket_h = int(round(tw * 0.29)), int(round(th * 0.37))
    else:
        pocket_w, pocket_h = int(round(tw * 0.27)), int(round(th * 0.32))

    margin_x = int(round(tw * 0.032))
    margin_y = int(round(th * 0.050))
    px, py = margin_x, th - margin_y - pocket_h
    pocket = Image.new("RGB", (pocket_w, pocket_h), COLORS[name])
    base.paste(pocket, (px, py), rounded_rect_mask((pocket_w, pocket_h), radius))
    assert pocket_w / tw < 1 / 3.0
    print(f"{name} {tw}x{th}: pocket {pocket_w}x{pocket_h} r={radius} width={pocket_w/tw:.1%}")
    return base


def write_docs():
    lines = [
        "# Pieces chosen — /learn pillar cards (2026-10-05)",
        "",
        "Four **different** shiny jewelry-library pieces. Cosmic Navigator / Obsidia / black onyx removed from every card.",
        "Visual bar: pretty, cute, blingy, warm, photographs well. No Bling Vault wording in crops.",
        "",
    ]
    for key in ("search", "save", "go-to-the-show", "show-it-off"):
        p = ASSIGN[key]
        lines += [
            f"## {key}",
            f"- **design_name:** {p['design_name']}",
            f"- **item_number:** {p['item_number']}",
            f"- **main_stone:** {p['main_stone']}",
            f"- **material:** {p['material']}",
            f"- **photo path:** `{p['photo'].relative_to(OUT)}`",
            f"- **photo url:** {p['photo_url']}",
            f"- **why:** {p['why']}",
            "",
        ]
    lines += [
        "## Skipped / not used (after visual check)",
        "- NK57811 Statement Of Sparkle — shiny blue, but hematite chain reads cooler; GoGo preferred for Search.",
        "- ER17794 All Shine, No Shade — blingy CZ hoops; Prestige Hoops preferred (cuter hearts) for Save.",
        "- ER76003 The Elodie Luxe — very sparkly CZ drops, but cooler hematite/silver; Marisol warmer for Show it off.",
        "- ER59000 Baguette Braid (Rose Quartz / Ruby) — cute geometric; held as spare, not needed once four locked.",
        "",
        "## Go to the show note",
        "Master Live Calendar UI has **no jewelry thumbs**. Card keeps calendar chrome and adds a small",
        "**Tonight's sparkle** inset with I've Been Dreaming Of You so this card also shows a distinct shiny piece.",
        "",
    ]
    (OUT / "pieces-chosen.md").write_text("\n".join(lines))

    readme = (OUT / "README.md").read_text()
    # Replace "What's in each crop" section
    marker = "## What's in each crop"
    end = "## Vault / collection wording"
    if marker in readme and end in readme:
        before = readme.split(marker)[0]
        after = end + readme.split(end, 1)[1]
        mid = """## What's in each crop

Four **different** shiny library pieces (see `pieces-chosen.md`). Cosmic Navigator / Obsidia removed everywhere.

- **Search** — Piece page with **The GoGo Necklace** (NK77364, Lab-Created Blue Spinel, Rhodium). Source patched from `extra-piece-page-card.png`.
- **Save** — Save-a-piece card with **The Prestige Hoops** (ER39527, Diamond Cubic Zirconia, Rhodium). Source patched from `extra-save-piece-card.png`.
- **Go to the show** — Master Live Calendar chrome + **Tonight's sparkle** inset: **I've Been Dreaming Of You** (ER88724, Amethyst Cubic Zirconia, Gold). Calendar itself has no jewelry thumbs.
- **Show it off** — Piece sheet with **The Marisol Earrings** (ER94385, Lab-Created Pink Sapphire, Gold). Source patched from `phone_scroll_08_showcase.png`.

Rebuild: `python3 build_cards_v3_pieces.py`

"""
        (OUT / "README.md").write_text(before + mid + after)
    else:
        print("WARN: README markers not found; pieces-chosen.md written only")


def main():
    SOURCES["search"] = patch_search()
    SOURCES["save"] = patch_save()
    SOURCES["go-to-the-show"] = patch_go()
    SOURCES["show-it-off"] = patch_show_it_off()
    for name in COLORS:
        make_card(name, 1200, 675).save(OUT / f"{name}.png", "PNG", optimize=True)
        make_card(name, 900, 700).save(OUT / f"{name}-tall.png", "PNG", optimize=True)
    write_docs()
    print("Wrote cards + pieces-chosen.md + README update to", OUT)


if __name__ == "__main__":
    main()
