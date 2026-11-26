# Look pop-up · inside redesign · concepts (Nov 26, 2026)
Static mockups only. No repo, PR, deploy or DB changes.
- inventory.md: every control in today's Look pop-up (all kept in every concept)
- emoji-set.md / assets/emoji-set.json: 238 emojis, 11 categories + Recently used + search
- concept-a.html … concept-d.html (shared look.css + picker.js), shots/ (1366 + 375 full length, plus current-*)
- Render: `python3 -m http.server 8817 --bind 127.0.0.1` here, then `node shot.mjs concept-a.html 1366 shots/x.png auto 8817` (Chrome CDP on 9336)

A · Style Studio: editorial page. Masthead render of the top of her site up top (ticker + name + hero, no device frame), 6 big portrait theme swatches, quiet underline fields, composer + tabbed emoji drawer side by side.
B · Chapters: four gold roman-numeral chapter cards. Big "on your site now" theme swatch + holiday picks, toolbar (Emoji · Link words · Show announcements) with emoji popover listing every category (scrolls), headline written on a frosted card over the theme art (echoes About you R4a).
C · Jewelry Box: plum velvet interior, gold-foil title, four compartments (Theme · Name & shop · Announcements · Hero) with live summaries; the open one slides out a satin tray. Emoji picker has a vertical category rail like jewelry-box slots.
D · Split canvas: wide two-column. Left: theme ribbon, fields, announcements as one card per line, hero. Right: always-open Emoji drawer (all categories, search, "Adding to line 2"). On phone it becomes a bottom sheet under the composer.
