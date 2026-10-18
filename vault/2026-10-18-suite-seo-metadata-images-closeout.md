# 2026-10-18 Suite SEO metadata and images

Draft only. No Live deploy and no Live database writes.

- Branch `cursor/suite-seo-metadata-images` off `codex/nic-nac-trade-hardening`.
- Pantry and rep photos go through `/_next/image` with srcset, lazy loading below the fold, and WebP/AVIF.
- BlingKitchen `/in-the-pantry` grid plus hero was 19,629,930 bytes of JPEG (26 files). A phone full scroll at the 828px candidate is about 1.65 MB AVIF or 1.82 MB WebP. The hero alone drops from 279,417 bytes to about 44 KB AVIF.
- Suite title is `Sparkle Suite | Websites and tools for independent Bomb Party reps`. Footer and Organization markup say Jacksonville, FL. No street address and no founder spot count.
- Rep titles live in `buildRepPublicPageText`. City and state are included only when join-template `repCity` / `repState` are already public. There is no separate location-approval field. Overlaps `cursor/rep-join-unique-content`.
- Article author is Louis Chapman, with the Suite OG image. FAQ, Linktree article, and Terms Dance Floor wording are in git, so no SQL file. Privacy “sell, rent, trade, or share” stays. `/trade` stays.
