# Utility SSR fonts

These are byte-identical WOFF2 copies returned by the existing Fontshare and
Google Fonts stylesheets in the frozen Join/Trade HTML, pinned October 28, 2026.
`sources.json` records each original URL, content-hash filename and byte count.
The original OFL and Fontshare licenses accompany the files.

`lib/amethyst/generated/utility-fonts.json` preserves their family, style,
weight, stretch and Unicode ranges. Its only presentation change is
`font-display: block`, to avoid painting utility text in a substitute font.
`utility-page-fonts.ts` emits the applicable faces and embeds the primary
Latin heading/body/header fonts before first paint, avoiding font-induced
layout shifts. Identical variable-font sources share one weight-range rule.
Other Unicode ranges are served statically. No font bytes are modified or subset.
The generated font-data JSON contains the exact original WOFF2 bytes.
These assets are never fetched
from a provider during a build or customer request. Only demo SSR Trade/Join
HTML uses them; homepage and frozen legacy pages retain their existing fonts.
