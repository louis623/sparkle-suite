# 2026-10-18 Suite SEO metadata and images

Draft only. No Live deploy and no Live database writes.

- Branch `cursor/suite-seo-metadata-images` off `codex/nic-nac-trade-hardening`.
- Pantry and rep photos go through `/_next/image` with srcset, lazy loading below the fold, and WebP/AVIF.
- BlingKitchen `/in-the-pantry` grid plus hero was 19,629,930 bytes of JPEG (26 files). A phone full scroll at the 828px candidate is about 1.65 MB AVIF or 1.82 MB WebP. The hero alone drops from 279,417 bytes to about 44 KB AVIF.
- Suite title is `Sparkle Suite | Websites and tools for independent Bomb Party reps`. Footer and Organization markup say Jacksonville, FL. No street address and no founder spot count.
- Rep titles live in `buildRepPublicPageText`. City and state are included only when join-template `repCity` / `repState` are already public. There is no separate location-approval field. Overlaps `cursor/rep-join-unique-content`.
- Article author is Louis Chapman, with the Suite OG image. FAQ, Linktree article, and Terms Dance Floor wording are in git, so no SQL file. Privacy “sell, rent, trade, or share” stays. `/trade` stays.
- Smoke follow-up: BlingKitchen hero alt no longer uses “her.” Targeted `/join` pages keep the server title; the hardcoded Mile High, Britt, and BlingKitchen document titles are gone. `/join` title copy stays with `cursor/rep-join-unique-content`. Privacy and Terms say “Sparkle Suite Live Lineup Chrome Extension.” Image optimizer hosts are the Live and Smoke Supabase projects only. Merged hardening `f37b60a2` (#131). Lock baseline unchanged.
- Merged Live `#132` at `c528845f`. `/join` titles stay on that branch’s index copy. Pantry meta descriptions use the rep’s business name. `join-runtime.js` was rebuilt with `npm run build:amethyst:join` and matched the existing bundle. Lock baseline unchanged.
- Smoke review of `cfda795c`: targeted homepage and Dance Floor pages leave the server title in place. Those `applyTargetedMetadata` calls were in `App()`, outside the locked header functions. BlingKitchen titles come from `buildRepPublicPageText`, so the name and place come from published fields. Lock baseline unchanged. No Live deploy.
- Combined release branch now also contains #133 `b2088b56` (`cursor/rep-host-seo-fixes`) and #135 `071ca88c` (`cursor/join-server-html-26e8`). Allowlist and October 18 register sections for all three branches stay. Rep FAQ header links Portfolio and Watch only off a custom domain, and Watch points at `/#watch`. `join-runtime.js` rebuild matched the committed bundle. Lock baseline unchanged.
