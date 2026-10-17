# SEO www and Amethyst preview

- PR https://github.com/louis623/sparkle-suite/pull/112 is still draft on `cursor/seo-www-amethyst-redirects-513f`. Code SHA `dad9aede58cfd26eebb76d37b169d465bb98046b`. Not merged. Production was not deployed. No database or billing change.
- Smoke preview only: project `sparkle-suite-smoke`, deployment `dpl_ByUhjHiU6jey28fMhq2WqF958exp`, URL `https://sparkle-suite-smoke-n4t1jxq3l-louis-2849s-projects.vercel.app`. Target is preview.
- On that preview, `/amethyst/Homepage.html`, `Trade.html`, `Join.html`, `Pantry.html`, `Unsubscribe.html`, and `Amethyst Design System.html` return 308 to `/`. `Trade.html?c=demo` returns 308 to `/?c=demo`. `homepage.css` and `homepage.jsx` stay 200. Preview `robots.txt` and `sitemap.xml` use `https://www.yoursparklesuite.com`.
- Rep www-to-apex behavior is covered by unit tests. The preview host is not a customer domain, so it cannot show a custom-domain www redirect.
- `tsc --noEmit` passed. Full vitest stayed at 53 failed / 5115 passed / 5 skipped, the known base set.

Next session: leave production on `4d91832e` until Louis asks to merge and release this PR.
