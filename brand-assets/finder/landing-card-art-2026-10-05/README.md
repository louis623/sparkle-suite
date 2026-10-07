# Sparkle Finder — /learn four-pillar card art (2026-10-05) v2

Hand-off for **Denver** to drop into the Smoke `/learn` four-pillar cards.

Louis art direction (voice 2026-10-05) — **supersedes the left→right gradient fade**:

1. **No gradient.** Scrap the soft color→image dissolve across the card.
2. Keep the card’s original background color as a **soft-cornered rectangular pocket** behind the title/copy zone so the white serif title stays readable.
3. That color pocket is **less than a third of the card** (~27–30% width). Soft corners match the pink **Get notified when we launch** CTA: `border-radius: 0.75rem` (~12px at card display; baked ~26px on 1200-wide PNGs). Soft rounded rect — **not** a full pill.
4. The app-style example UI takes up the **rest** of the card. The point is to show off the UI.
5. **Titles are not baked into the PNGs.** Denver keeps CSS white serif bottom-left (`clamp(2.15rem, 3vw, 3.15rem)`, `max-width: 11ch`, `line-height: 0.96`). Do **not** shrink the title — especially **Go to the show**. Pockets are sized so that title fits.

## Primary files (use these)

| Card | File | Hex | Size | Pocket width |
|------|------|-----|------|--------------|
| Search | `search.png` | `#1a0b2e` | 1200×675 | ~27% |
| Save | `save.png` | `#3d1870` | 1200×675 | ~27% |
| Go to the show | `go-to-the-show.png` | `#5b2a8f` | 1200×675 | ~30% (taller pocket for wrapped title) |
| Show it off | `show-it-off.png` | `#241048` | 1200×675 | ~29% |

Optional taller crops (same direction): `*-tall.png` at **900×700**.

Absolute paths:

```
/workspace/finder-brief/landing-card-art-2026-10-05/search.png
/workspace/finder-brief/landing-card-art-2026-10-05/save.png
/workspace/finder-brief/landing-card-art-2026-10-05/go-to-the-show.png
/workspace/finder-brief/landing-card-art-2026-10-05/show-it-off.png
```

## Art direction for Denver

1. Set each card’s `background-color` to the hex above (fallback).
2. Use the matching PNG as `background-image` — **cover**, center or slight right bias fine.
3. Keep existing title markup (bottom-left white serif). Do not bake titles into PNGs. Do not shrink title font — pocket on **Go to the show** is already larger for the wrapped line.
4. Card corner radius stays in CSS. PNGs are rectangular; the soft 0.75rem radius is only on the **in-image color pocket**.
5. Refs used for pocket corners / title scale:
   - `refs/notify-button-closeup.png` (0.75rem soft CTA)
   - `refs/feature-card-go-to-the-show.png` (current title size)

## What's in each crop

Four **different** shiny library pieces (see `pieces-chosen.md`). Cosmic Navigator / Obsidia removed everywhere.

- **Search** — Piece page with **The GoGo Necklace** (NK77364, Lab-Created Blue Spinel, Rhodium). Source patched from `extra-piece-page-card.png`.
- **Save** — Save-a-piece card with **The Prestige Hoops** (ER39527, Diamond Cubic Zirconia, Rhodium). Source patched from `extra-save-piece-card.png`.
- **Go to the show** — Master Live Calendar chrome + **Tonight's sparkle** inset: **I've Been Dreaming Of You** (ER88724, Amethyst Cubic Zirconia, Gold). Calendar itself has no jewelry thumbs.
- **Show it off** — Piece sheet with **The Marisol Earrings** (ER94385, Lab-Created Pink Sapphire, Gold). Source patched from `phone_scroll_08_showcase.png`.

Rebuild: `python3 build_cards_v3_pieces.py`

## Vault / collection wording

Louis standing: say **collection**, not vault, in customer-facing copy.

- Crops exclude “Bling Vault” / standalone vault marketing headlines.
- Visible in-frame terms: Showcase, library, Live Shows, piece names (GoGo Necklace, Prestige Hoops, Dreaming Of You, Marisol), rep names (Sparkly Butterflies / Kelly).

## Not done here

- No Smoke deploy
- No sparkle-suite repo edits
- Titles / card layout remain Denver’s CSS job
