#!/usr/bin/env python3
"""Sparkle Finder brand concept boards — 2026-10-02.
Hard locks: circle F optically centered; NO Suite pink on circle/F;
Amethyst keeps pink wordmark; Playfair Display Italic for F + wordmark.
"""
from __future__ import annotations

import math
import os
from pathlib import Path

import cairosvg
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = Path("/workspace/finder-brand-concepts-2026-10-02")
PLAYFAIR_ITALIC = "/usr/share/fonts/truetype/sand-box/google/Playfair Display/PlayfairDisplay-Italic-VariableFont_wght.ttf"
PLAYFAIR_ROMAN = "/usr/share/fonts/truetype/sand-box/google/Playfair Display/PlayfairDisplay-VariableFont_wght.ttf"
DM_SANS = None
for p in [
    "/usr/share/fonts/truetype/sand-box/google/DM Sans/DMSans-VariableFont_opsz,wght.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
]:
    if os.path.exists(p):
        DM_SANS = p
        break

SUITE_PINK = "#ee2c9b"  # wordmark only on Amethyst; NEVER on circle/F


def load_playfair(size: int, italic: bool = True, weight: int = 500) -> ImageFont.FreeTypeFont:
    path = PLAYFAIR_ITALIC if italic else PLAYFAIR_ROMAN
    font = ImageFont.truetype(path, size)
    try:
        font.set_variation_by_axes([weight])
    except Exception:
        pass
    return font


def measure_f_offsets(font_size: int = 400, weight: int = 500) -> tuple[float, float]:
    """Locked optical offsets for Playfair Italic F in circle.
    Chosen from visual A/B vs geo/mass: left6 / m-6% S-like won (Louis: old S looked better).
    Unit = fraction of font-size added to text x/y with anchor=mm / SVG central.
    """
    # Absolute optical lock (not re-derived each run)
    return -0.058, 0.012


DX_UNIT, DY_UNIT = measure_f_offsets(400, 500)
print(f"F optical unit offsets: dx={DX_UNIT:.4f} dy={DY_UNIT:.4f} (× font-size)")


def make_seal_svg(
    path: Path,
    circle_fill: str,
    f_fill: str,
    stroke: str | None = None,
    stroke_width: float = 0.75,
    size: int = 64,
) -> None:
    """SVG seal with optically centered Playfair Italic F. No pink on circle/F."""
    # Reject Suite pink on seal
    for c in (circle_fill, f_fill, stroke or ""):
        if c.lower() in (SUITE_PINK.lower(), "#ee2c9b", "#ff4cae", "#d81b87"):
            raise ValueError(f"Suite pink forbidden on seal: {c}")

    cx = cy = size / 2
    r = size / 2 - 2
    font_size = size * 0.50  # ~32 at 64
    # text x/y with optical offset (SVG uses dominant-baseline central ≈ mm)
    tx = cx + DX_UNIT * font_size
    ty = cy + DY_UNIT * font_size
    stroke_attr = f' stroke="{stroke}" stroke-width="{stroke_width}"' if stroke else ""
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" role="img" aria-label="Sparkle Finder F seal">
  <circle cx="{cx}" cy="{cy}" r="{r}" fill="{circle_fill}"{stroke_attr}/>
  <text
    x="{tx:.3f}"
    y="{ty:.3f}"
    fill="{f_fill}"
    font-family="Playfair Display, Georgia, serif"
    font-size="{font_size}"
    font-style="italic"
    font-weight="500"
    text-anchor="middle"
    dominant-baseline="central"
  >F</text>
</svg>
'''
    path.write_text(svg, encoding="utf-8")


def render_seal_png(svg_path: Path, png_path: Path, px: int = 512) -> None:
    # Embed font via cairosvg — may not find Playfair; also rasterize with PIL for fidelity
    # Primary: PIL render matching SVG geometry for guaranteed font
    # Secondary: keep SVG as source of truth; PNG from PIL
    pass


def render_seal_png_pil(
    png_path: Path,
    circle_fill: str,
    f_fill: str,
    stroke: str | None,
    stroke_width_frac: float = 0.012,
    px: int = 512,
) -> None:
    img = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    margin = int(px * 0.03)
    # circle
    bbox = [margin, margin, px - margin - 1, px - margin - 1]
    draw.ellipse(bbox, fill=hex_to_rgba(circle_fill))
    if stroke:
        sw = max(1, int(px * stroke_width_frac))
        # inset stroke
        draw.ellipse(bbox, outline=hex_to_rgba(stroke), width=sw)
    # F
    font_size = int(px * 0.50)
    font = load_playfair(font_size, italic=True, weight=500)
    cx = cy = px / 2
    tx = cx + DX_UNIT * font_size
    ty = cy + DY_UNIT * font_size
    draw.text((tx, ty), "F", fill=hex_to_rgba(f_fill), font=font, anchor="mm")
    img.save(png_path)


def hex_to_rgba(h: str, alpha: int = 255) -> tuple[int, int, int, int]:
    h = h.lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return (r, g, b, alpha)


def hex_to_rgb(h: str) -> tuple[int, int, int]:
    return hex_to_rgba(h)[:3]


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def gradient_bg(size: tuple[int, int], c1: str, c2: str, horizontal: bool = True) -> Image.Image:
    w, h = size
    img = Image.new("RGB", size)
    r1, g1, b1 = hex_to_rgb(c1)
    r2, g2, b2 = hex_to_rgb(c2)
    pix = img.load()
    if horizontal:
        for x in range(w):
            t = x / max(w - 1, 1)
            # soft mid glow like amethyst header
            t2 = 0.5 - abs(t - 0.5)  # peak at center
            # blend edge→mid→edge using c1 at edges, brighter mix toward center via c2
            edge = abs(t - 0.5) * 2  # 0 center, 1 edges
            rr = int(lerp(hex_to_rgb(c2)[0], r1, edge ** 0.85))
            gg = int(lerp(hex_to_rgb(c2)[1], g1, edge ** 0.85))
            bb = int(lerp(hex_to_rgb(c2)[2], b1, edge ** 0.85))
            for y in range(h):
                pix[x, y] = (rr, gg, bb)
    else:
        for y in range(h):
            t = y / max(h - 1, 1)
            rr = int(lerp(r1, r2, t))
            gg = int(lerp(g1, g2, t))
            bb = int(lerp(b1, b2, t))
            for x in range(w):
                pix[x, y] = (rr, gg, bb)
    return img


def rounded_rect(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


CONCEPTS = [
    {
        "slug": "01-amethyst",
        "name": "Amethyst",
        "vibe": "Deep indigo→amethyst field; pink wordmark kept; violet F on white seal (Suite pink off the mark).",
        "board_bg": ("#1a0b2e", "#5b2a8f"),  # deep indigo → brighter amethyst mid
        "panel": "#140820",
        "title_color": "#f5eeff",
        "wordmark": SUITE_PINK,  # pink wordmark LOCK for concept 1
        "tagline": "#d4c4e8",
        "circle_fill": "#ffffff",
        "f_fill": "#5C0EFF",  # amethyst purple (email-sig lock), NOT pink
        "stroke": "#c4a8ef",
        "chips": [
            ("#1a0b2e", "Deep indigo"),
            ("#5b2a8f", "Amethyst"),
            ("#5C0EFF", "Violet F"),
            ("#ffffff", "Seal fill"),
            (SUITE_PINK, "Wordmark"),
            ("#c4a8ef", "Stroke"),
        ],
        "chip_label_dark_on": {"#ffffff", "#c4a8ef", "#f5eeff"},
    },
    {
        "slug": "02-opal-moon",
        "name": "Opal Moon",
        "vibe": "Milky opal / moonstone mist — cool lilac-silver, no Suite pink on mark or wordmark.",
        "board_bg": ("#2a2438", "#8b7fa3"),
        "panel": "#1c1826",
        "title_color": "#f2eef8",
        "wordmark": "#3d3550",  # deep charcoal-violet
        "wordmark_on_light": True,
        "tagline": "#6a6078",
        "circle_fill": "#e8e4f0",
        "f_fill": "#4a4458",  # deep slate
        "stroke": "#b8b0c8",
        "chips": [
            ("#f7f4fb", "Opal mist"),
            ("#e8e4f0", "Seal fill"),
            ("#b8b0c8", "Lilac silver"),
            ("#4a4458", "Slate F"),
            ("#3d3550", "Wordmark"),
            ("#8b7fa3", "Moon mid"),
        ],
        "chip_label_dark_on": {"#f7f4fb", "#e8e4f0", "#b8b0c8"},
        "seal_on_light_panel": True,
    },
    {
        "slug": "03-black-diamond",
        "name": "Black Diamond",
        "vibe": "Near-black prestige with cool silver sparkle — collector evening-wear energy.",
        "board_bg": ("#0a0a0c", "#2a2a32"),
        "panel": "#050506",
        "title_color": "#f0f0f4",
        "wordmark": "#e8e8ee",
        "tagline": "#9a9aa8",
        "circle_fill": "#121216",
        "f_fill": "#d8d8e0",
        "stroke": "#a8a8b8",
        "chips": [
            ("#0a0a0c", "Near black"),
            ("#121216", "Seal fill"),
            ("#d8d8e0", "Silver F"),
            ("#a8a8b8", "Stroke"),
            ("#e8e8ee", "Wordmark"),
            ("#2a2a32", "Graphite"),
        ],
        "chip_label_dark_on": {"#d8d8e0", "#a8a8b8", "#e8e8ee"},
    },
    {
        "slug": "04-sapphire-night",
        "name": "Sapphire Night",
        "vibe": "Deep sapphire field with ice highlight — night-sky collector calm.",
        "board_bg": ("#061428", "#1a3a6e"),
        "panel": "#040e1c",
        "title_color": "#e8f0ff",
        "wordmark": "#c8dcff",
        "tagline": "#8aa8d0",
        "circle_fill": "#0c2348",
        "f_fill": "#e8f2ff",
        "stroke": "#7eb0ef",
        "chips": [
            ("#061428", "Night navy"),
            ("#0c2348", "Seal fill"),
            ("#1a3a6e", "Sapphire"),
            ("#e8f2ff", "Ice F"),
            ("#7eb0ef", "Stroke"),
            ("#c8dcff", "Wordmark"),
        ],
        "chip_label_dark_on": {"#e8f2ff", "#7eb0ef", "#c8dcff"},
    },
    {
        "slug": "05-pearl-mist",
        "name": "Pearl Mist",
        "vibe": "Warm pearl cream + champagne taupe — soft jewelry-counter elegance (no pink circle).",
        "board_bg": ("#3a322c", "#c4b4a4"),
        "panel": "#2a241e",
        "title_color": "#faf6f0",
        "wordmark": "#4a3e34",
        "wordmark_on_light": True,
        "tagline": "#7a6a5c",
        "circle_fill": "#f5efe6",
        "f_fill": "#5c4e42",
        "stroke": "#c8b8a4",
        "chips": [
            ("#faf6f0", "Pearl"),
            ("#f5efe6", "Seal fill"),
            ("#c8b8a4", "Champagne"),
            ("#5c4e42", "Taupe F"),
            ("#4a3e34", "Wordmark"),
            ("#8a7a6c", "Soft taupe"),
        ],
        "chip_label_dark_on": {"#faf6f0", "#f5efe6", "#c8b8a4", "#8a7a6c"},
        "seal_on_light_panel": True,
    },
    {
        "slug": "06-tourmaline-grove",
        "name": "Tourmaline Grove",
        "vibe": "Deep teal/emerald grove with soft mint accent — gem-collector, not Suite pink.",
        "board_bg": ("#06241c", "#1a6a58"),
        "panel": "#041812",
        "title_color": "#e8fff6",
        "wordmark": "#b8f0d8",
        "tagline": "#7ab89a",
        "circle_fill": "#0a3a2e",
        "f_fill": "#d8fff0",
        "stroke": "#6ed4b0",
        "chips": [
            ("#06241c", "Deep teal"),
            ("#0a3a2e", "Seal fill"),
            ("#1a6a58", "Emerald"),
            ("#d8fff0", "Mint F"),
            ("#6ed4b0", "Stroke"),
            ("#b8f0d8", "Wordmark"),
        ],
        "chip_label_dark_on": {"#d8fff0", "#6ed4b0", "#b8f0d8"},
    },
]


def build_board(concept: dict) -> Path:
    slug = concept["slug"]
    folder = OUT / slug
    folder.mkdir(parents=True, exist_ok=True)

    # Seals
    svg_path = folder / f"{slug}-seal.svg"
    png512 = folder / f"{slug}-seal-512.png"
    make_seal_svg(
        svg_path,
        circle_fill=concept["circle_fill"],
        f_fill=concept["f_fill"],
        stroke=concept.get("stroke"),
        stroke_width=0.9,
    )
    render_seal_png_pil(
        png512,
        circle_fill=concept["circle_fill"],
        f_fill=concept["f_fill"],
        stroke=concept.get("stroke"),
        px=512,
    )
    # also 256 for convenience
    render_seal_png_pil(
        folder / f"{slug}-seal-256.png",
        circle_fill=concept["circle_fill"],
        f_fill=concept["f_fill"],
        stroke=concept.get("stroke"),
        px=256,
    )

    # Board 1920×1080
    W, H = 1920, 1080
    c1, c2 = concept["board_bg"]
    board = gradient_bg((W, H), c1, c2, horizontal=True)
    # subtle vignette
    vignette = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vignette)
    for i in range(80):
        a = int(40 * (i / 80))
        vd.rectangle([i, i, W - 1 - i, H - 1 - i], outline=a)
    board = Image.composite(
        Image.new("RGB", (W, H), (0, 0, 0)),
        board,
        vignette.filter(ImageFilter.GaussianBlur(20)),
    )

    draw = ImageDraw.Draw(board, "RGBA")

    # Card panel
    margin = 72
    card = [margin, margin, W - margin, H - margin]
    # frosted dark panel with alpha via overlay
    overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    panel_rgb = hex_to_rgb(concept["panel"])
    od.rounded_rectangle(card, radius=28, fill=(*panel_rgb, 210))
    # inner light rim
    od.rounded_rectangle(card, radius=28, outline=(255, 255, 255, 35), width=2)
    board = Image.alpha_composite(board.convert("RGBA"), overlay)
    draw = ImageDraw.Draw(board)

    # Title
    title_font = load_playfair(52, italic=False, weight=600)
    small = ImageFont.truetype(DM_SANS, 22) if DM_SANS else load_playfair(20, False, 400)
    vibe_font = ImageFont.truetype(DM_SANS, 24) if DM_SANS else load_playfair(22, False, 400)
    label_font = ImageFont.truetype(DM_SANS, 18) if DM_SANS else load_playfair(16, False, 400)
    hex_font = ImageFont.truetype(DM_SANS, 16) if DM_SANS else load_playfair(14, False, 400)

    title = f"Sparkle Finder — {concept['name']}"
    draw.text((margin + 56, margin + 40), title, fill=hex_to_rgba(concept["title_color"]), font=title_font)
    draw.text(
        (margin + 56, margin + 110),
        "Brand concept board · circle F · Playfair Display Italic",
        fill=hex_to_rgba(concept["tagline"]),
        font=small,
    )

    # Large seal
    seal = Image.open(png512).convert("RGBA").resize((420, 420), Image.Resampling.LANCZOS)
    # Optional soft pedestal for light seals
    seal_x, seal_y = margin + 80, 260
    if concept.get("seal_on_light_panel"):
        # light rounded plate behind seal
        plate = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        pd = ImageDraw.Draw(plate)
        pd.rounded_rectangle(
            [seal_x - 40, seal_y - 40, seal_x + 420 + 40, seal_y + 420 + 40],
            radius=32,
            fill=(250, 248, 255, 230),
        )
        board = Image.alpha_composite(board, plate)
        draw = ImageDraw.Draw(board)
    board.paste(seal, (seal_x, seal_y), seal)

    # Wordmark block to the right of seal
    wm_x = seal_x + 480
    wm_y = seal_y + 80
    # For light-wordmark concepts on dark board, put wordmark on a light chip if needed
    wm_font = load_playfair(72, italic=True, weight=700)
    if concept.get("wordmark_on_light"):
        # light wordmark plate
        plate = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        pd = ImageDraw.Draw(plate)
        pd.rounded_rectangle(
            [wm_x - 28, wm_y - 24, wm_x + 720, wm_y + 200],
            radius=20,
            fill=(250, 248, 255, 235),
        )
        board = Image.alpha_composite(board, plate)
        draw = ImageDraw.Draw(board)

    draw.text((wm_x, wm_y), "Sparkle Finder", fill=hex_to_rgba(concept["wordmark"]), font=wm_font)
    tag_font = ImageFont.truetype(DM_SANS, 26) if DM_SANS else load_playfair(24, False, 400)
    draw.text((wm_x, wm_y + 100), "by Sparkle Suite", fill=hex_to_rgba(concept["tagline"]), font=tag_font)

    # Vibe line
    vibe_y = seal_y + 460
    draw.text(
        (margin + 56, vibe_y),
        concept["vibe"],
        fill=hex_to_rgba(concept["title_color"]),
        font=vibe_font,
    )

    # Color chips
    chips = concept["chips"]
    chip_y = vibe_y + 70
    chip_w, chip_h = 200, 92
    gap = 24
    start_x = margin + 56
    dark_on = concept.get("chip_label_dark_on", set())
    for i, (hexcol, label) in enumerate(chips):
        x = start_x + i * (chip_w + gap)
        rounded_rect(draw, [x, chip_y, x + chip_w, chip_y + chip_h], 14, fill=hex_to_rgba(hexcol))
        # border
        draw.rounded_rectangle([x, chip_y, x + chip_w, chip_y + chip_h], radius=14, outline=(255, 255, 255, 50), width=1)
        text_fill = (20, 16, 28, 255) if hexcol.lower() in {c.lower() for c in dark_on} or luminance(hexcol) > 0.62 else (255, 255, 255, 255)
        draw.text((x + 14, chip_y + 18), label, fill=text_fill, font=label_font)
        draw.text((x + 14, chip_y + 52), hexcol.upper(), fill=text_fill, font=hex_font)

    # Footer
    foot = ImageFont.truetype(DM_SANS, 16) if DM_SANS else load_playfair(14, False, 400)
    draw.text(
        (margin + 56, H - margin - 36),
        "2026-10-02 · Finder brand concepts · F optically centered · Suite pink (#ee2c9b) never on circle/F",
        fill=hex_to_rgba(concept["tagline"]),
        font=foot,
    )

    out_path = folder / f"{slug}-board.png"
    board.convert("RGB").save(out_path, "PNG", optimize=True)
    print(f"wrote {out_path}")
    return out_path


def luminance(h: str) -> float:
    r, g, b = [c / 255 for c in hex_to_rgb(h)]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def build_grid(board_paths: list[Path]) -> Path:
    # 2×3 of boards scaled
    cols, rows = 3, 2
    thumb_w, thumb_h = 640, 360
    pad = 24
    W = cols * thumb_w + (cols + 1) * pad
    H = rows * thumb_h + (rows + 1) * pad + 80
    grid = Image.new("RGB", (W, H), (18, 12, 28))
    draw = ImageDraw.Draw(grid)
    title_font = load_playfair(36, False, 600)
    draw.text((pad, 24), "Sparkle Finder — 6 brand concepts (2026-10-02)", fill=(245, 238, 255), font=title_font)
    for i, p in enumerate(board_paths):
        r, c = divmod(i, cols)
        # wait 2 rows × 3 cols: index 0→(0,0), 1→(0,1)...
        row, col = divmod(i, cols)
        x = pad + col * (thumb_w + pad)
        y = 80 + pad + row * (thumb_h + pad)
        im = Image.open(p).convert("RGB").resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
        grid.paste(im, (x, y))
    out = OUT / "00-all-concepts-grid.png"
    grid.save(out, "PNG", optimize=True)
    print(f"wrote {out}")
    return out


def write_readme(board_paths: list[Path]) -> None:
    lines = [
        "# Sparkle Finder brand concepts — 2026-10-02",
        "",
        "Presentation boards for Louis (via Denver). Circle **F** optically centered;",
        "**Suite pink `#ee2c9b` never used on circle/F** (Amethyst keeps pink on the wordmark only).",
        "",
        "## Fonts",
        "- Seal F + wordmark: **Playfair Display** (Italic for F; Bold for wordmark)",
        "- UI/chip labels: DM Sans (fallback DejaVu/Liberation)",
        f"- F optical unit offsets (× font-size): dx={DX_UNIT:.4f}, dy={DY_UNIT:.4f}",
        "  (mass-center + slight left nudge echoing old S at x≈30/64)",
        "",
        "## Index",
        f"- `{OUT / '00-all-concepts-grid.png'}`",
        "",
    ]
    for c in CONCEPTS:
        slug = c["slug"]
        folder = OUT / slug
        lines += [
            f"## {c['name']} (`{slug}`)",
            "",
            f"- Vibe: {c['vibe']}",
            f"- Board: `{folder / f'{slug}-board.png'}`",
            f"- Seal SVG: `{folder / f'{slug}-seal.svg'}`",
            f"- Seal PNG: `{folder / f'{slug}-seal-512.png'}` · `{folder / f'{slug}-seal-256.png'}`",
            "- Hex recipe:",
        ]
        for hexcol, label in c["chips"]:
            lines.append(f"  - `{hexcol}` — {label}")
        lines.append(f"- Seal: fill `{c['circle_fill']}` · F `{c['f_fill']}` · stroke `{c.get('stroke')}`")
        lines.append(f"- Wordmark: `{c['wordmark']}`")
        lines.append("")
    lines += [
        "## Locks honored",
        "1. Circle F mark, optically centered (better than geometric-only prior F).",
        "2. No Suite pink on circle fill or F glyph in any concept.",
        "3. Amethyst = foundation: deep indigo/amethyst field + pink `#ee2c9b` wordmark + Playfair;",
        "   seal uses white fill + violet `#5C0EFF` F (matches Finder email-sig purple lock).",
        "4. Logo identity boards only — not full /learn mocks.",
        "",
    ]
    (OUT / "README.md").write_text("\n".join(lines), encoding="utf-8")
    print("wrote README")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    boards = []
    for c in CONCEPTS:
        boards.append(build_board(c))
    build_grid(boards)
    write_readme(boards)
    # Diagnostic: show Amethyst seal for visual check
    print("DONE")


if __name__ == "__main__":
    main()
