# Signup consent punctuation — Smoke only

Louis approved codex/signup-consent-punctuation from verified production tip
ed16f389935c25013064c0aff0c19ffbb540ca59, one new unmerged PR and Smoke preview.

The existing withFinalPunctuation helper now handles both server consent copy
paths. The homepage bootstrap supplies an already-punctuated name to the legacy
and V2 JSX consent fragments, preserving their original words and links.
No helper duplication or data changes. Normal names retain the original text.
Only the preview-template-data layout-lock hash changed; all 11 locks pass.

Added exactly two cases to tests/amethyst-preview-template-data.test.ts. They
check both server strings, bootstrap data and the actual JSX consent fragments
through React static unit rendering. One run: 52/52 passed. No other test file,
full suite, browser check or rerun. Commit skip-ci prevents automatic full CI.

Deployment is restricted to sparkle-suite-smoke / preview. Final deployment
identity/status are recorded on this PR/Vercel and in Open Brain after the
branch-head commit. No merge, Live, data, project environment, GitHub default or
production-branch changes. Louis reviews Smoke next; no further tests or Live
release without separate approval.
