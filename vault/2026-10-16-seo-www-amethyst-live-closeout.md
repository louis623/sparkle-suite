# SEO www and Amethyst pages live

- Louis approved shipping PR https://github.com/louis623/sparkle-suite/pull/112. It was already current with `8b4be74d` (notes on production `4d91832e` / #111). Merge SHA `9e1b9ce8ad30bdf987c105a9e7d5a1efa630a07a` is Ready production deployment `dpl_B9PiaWEPR8aYibqk9xGfsGz5Uk19` on project `sparkle-suite`. `www.yoursparklesuite.com` and `sparklybutterflies.com` point at that deployment. Rollback remains Ready `dpl_ByhQY6mudf96r24F47Dpvs6tAoJw` at `4d91832e`.
- Pull requests #106 and #109 were not merged. No database or billing change.
- Live checks: `www` `/sitemap.xml` and `/robots.txt` return 308 to the apex on brittwithbling, sparklybutterflies, theblingkitchen, milehighfizz, and brisglowtique. Those apex sitemaps and robots list apex URLs. Suite `Homepage.html` and `Trade.html` return 308 to `/`. The Suite homepage, both FAQ articles, and the Sparkly Butterflies and Britt with Bling homepages return 200 on the new deployment. Suite robots still point at `https://www.yoursparklesuite.com/sitemap.xml`.
- Brisglowtique's apex sitemap host is now the apex. Its page list is still the Suite marketing set. That page-set mismatch was left as it was.
- This note is not a second application release.

Next session: start from the verified GitHub tip. Live stays on `9e1b9ce8` / `dpl_B9PiaWEPR8aYibqk9xGfsGz5Uk19` unless Louis asks for another release.
