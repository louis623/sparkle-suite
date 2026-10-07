# FAQ articles

Articles live at `/faq/articles/[slug]` and are discovered in a small section **below the existing FAQ answers and above the demo links** on `/faq`. Home and top navigation stay unchanged. There is no blog index; `/faq/articles` returns not found. The section is hidden until the first approved article is published.

The existing reserved FAQ namespace avoids adding a root path that could collide with a rep's show slug. No new show-slug restriction is introduced.

## Authoring

Add an owner-approved record to `suiteArticles` in `lib/sparkle-suite/articles.ts`, using the exported `SuiteArticle` type. Keep each article in a separate imported file if the catalog grows. No CMS or additional packages are needed.

- Use a unique lowercase hyphenated slug; preserve it after publication.
- Supply the actual title and short descriptive summary. Add a credited author only when explicit attribution is verified; writing voice is not a byline. Use `Person` or `Organization` accurately. Author URL is optional and must identify that author.
- Start with `status: 'draft'`. Keep confidential drafts outside the repo entirely.
- Body blocks support paragraphs, section headings (h2), and unordered lists. Paragraph/list text also supports source `**bold**` and `[label](https://...)` links. Other text and HTML are escaped by React. No general Markdown/HTML renderer or new package is needed.
- `status: 'published'` makes a complete article eligible for the local FAQ/list/route; it never pushes or deploys anything. Production publication requires its separate release approval. Add `publishedAt` only when the actual publication timestamp is known, including timezone, such as UTC ending in `Z`. A draft date is not a publication date. Omit unverified dates rather than inventing them. Add `updatedAt` only after a meaningful article revision, never automatically at build time.
- Empty required title/description fields, empty/incomplete bodies, duplicate slugs, invalid supplied timestamps/credits, drafts, and future publication dates are excluded from FAQ links, route lookup, metadata, schema, and article sitemap entries by the same filter. Author and dates are optional; unknown values are omitted in UI/schema and undated sitemap entries omit `lastmod`.
- Articles render server-side with supplied verified authors and dates visible. Metadata, absolute canonical, sitemap URL and BlogPosting schema share the main Suite identity. No unapproved image or fabricated author/date is supplied. Customer domains return 404/noindex for the whole blog namespace; their FAQ remains their customer FAQ.

Run `node node_modules/vitest/vitest.mjs run tests/suite-articles.test.tsx tests/sparkle-suite-faq.test.ts tests/custom-domain-proxy.test.ts`, scoped lint, TypeScript and the guarded build. Inspect the actual article at desktop and 390px before release; test back links, keyboard focus, headings, canonical, JSON-LD and sitemap. Remove any synthetic QA routes/data before committing. Publishing code, pushing a PR and deploying require separate authorization for this task.

## Search references reviewed October 7, 2026

- [Google Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article): add applicable properties and keep them consistent with visible content.
- [Google canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): use the preferred absolute URL consistently.
- [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap): include canonical public URLs and accurate modification dates.

This supports accessible, crawlable articles. It makes no ranking, AI citation or FAQ rich-result promise.

## First supplied article

`lib/sparkle-suite/article-content/why-serious-bp-rep.ts` preserves the public body from memory commit `77edb3293c5681873cf29e73ce2ae26bf0a4693a`, article blob `411ad5dbbef42d777aeef60a77b82b7a5fec4388`. Exact draft and research copies are under `docs/sparkle-suite/article-sources/`. Editorial header and trailing suggested metadata are excluded from the body; the suggested description is used for metadata and the FAQ preview. Source headings, paragraphs, lists, emphasis, CTA wording and destinations are unchanged. Canonical Suite links render as equivalent internal links through the existing attribution-aware navigation.

The source Date (`2026-10-07`) and Voice (`Louis`) are provenance only; they supply no explicit author byline or actual publication timestamp. UI and schema omit both. The Email/SMS “coming soon” claim was checked against the current brand kit, FAQ source and public live `/faq` response on October 7; all agree. Recheck availability before the separately authorized release. No referral-for-paying-reps content is included.
