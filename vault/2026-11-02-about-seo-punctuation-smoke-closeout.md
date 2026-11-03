# About and SEO punctuation extension — PR #173, Smoke only

Louis approved this extension on existing codex/about-headline-smoke; base head
2862482599eeb9d8476e108dacbc7e0cbd0c2910. No new PR, merge or Live work.

Extracted withFinalPunctuation to lib/public-site/final-punctuation.ts and reused
it in About and SEO. Homepage/pantry sentences ending with the business name
and Join sentences ending with the rep name preserve terminal ., ! or ?.
Existing location wording/output is kept exactly. Meta description, Open Graph,
Twitter and JSON-LD share the corrected text. Only the preview-template file's
existing layout-lock hash changed; all 11 source locks pass.

Added two SEO cases only. Latest checks: preview-template-data 50/50, run once;
SEO metadata 5/5 final. Initial two SEO cases failed because the fixture inherited
Austin/Texas; cleared fixture location and reran only SEO. A source-review scope
failure (normal-name location output must remain exact) was corrected and only
SEO was rechecked. Preview was not rerun. No full suite/browser checks.

Deploy this final branch head only to sparkle-suite-smoke / preview; no project
environment or production-branch changes. Current Smoke rollback target before
this extension: dpl_37NGwXGPST1emTVD1RofGDRS2AEa. The final deployment identity
and readiness are recorded on PR #173 / Vercel and in the Open Brain closeout
after this commit. Do not repeat passing tests or release Live without approval.
