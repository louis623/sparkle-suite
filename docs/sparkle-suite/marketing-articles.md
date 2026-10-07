# FAQ articles

Articles live at `/faq/articles/[slug]` and are discovered in a small section **below the existing FAQ answers and above the demo links** on `/faq`. Home and top navigation stay unchanged. There is no blog index; `/faq/articles` returns not found. The section is hidden until the first approved article is published.

The existing reserved FAQ namespace avoids adding a root path that could collide with a rep's show slug. No new show-slug restriction is introduced.

## Authoring

Add an owner-approved record to `suiteArticles` in `lib/sparkle-suite/articles.ts`, using the exported `SuiteArticle` type. Keep each article in a separate imported file if the catalog grows. No CMS or additional packages are needed.

- Use a unique lowercase hyphenated slug; preserve it after publication.
- Supply the actual title, short descriptive summary, and credited author. Use `Person` or `Organization` accurately. Author URL is optional and must identify that author.
- Start with `status: 'draft'`. Keep confidential drafts outside the repo entirely.
- Body blocks support paragraphs, section headings (h2), and unordered lists. Plain text is escaped by React. Do not insert HTML or markup into the text.
- When publication is approved, set `status: 'published'` with the actual ISO publication timestamp including timezone, such as UTC ending in `Z`. Do not predate or fabricate dates. Add `updatedAt` only after a meaningful article revision, never automatically at build time.
- Empty fields, empty/incomplete bodies, duplicate slugs, invalid timestamps, drafts, and future publication dates are excluded from FAQ links, route lookup, metadata, schema, and article sitemap entries by the same filter.
- Articles render server-side with visible authors and dates. Metadata, absolute canonical, sitemap URL and BlogPosting schema share the main Suite identity. No unapproved image or fabricated author/date is supplied. Customer domains return 404/noindex for the whole blog namespace; their FAQ remains their customer FAQ.

Run `node node_modules/vitest/vitest.mjs run tests/suite-articles.test.tsx tests/sparkle-suite-faq.test.ts tests/custom-domain-proxy.test.ts`, scoped lint, TypeScript and the guarded build. Inspect the actual article at desktop and 390px before release; test back links, keyboard focus, headings, canonical, JSON-LD and sitemap. Remove any synthetic QA routes/data before committing. Publishing code, pushing a PR and deploying require separate authorization for this task.

## Search references reviewed October 7, 2026

- [Google Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article): add applicable properties and keep them consistent with visible content.
- [Google canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): use the preferred absolute URL consistently.
- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): include canonical public URLs and accurate modification dates.

This supports accessible, crawlable articles. It makes no ranking, AI citation or FAQ rich-result promise.
