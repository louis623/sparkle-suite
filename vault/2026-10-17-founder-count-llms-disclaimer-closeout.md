# Founder-count and llms disclaimer draft

- Draft only. No merge and no Live deploy. Draft pull request https://github.com/louis623/sparkle-suite/pull/126 on `cursor/founder-copy-llms-disclaimer-8afd` targets `codex/nic-nac-trade-hardening`. Head for the copy commit is `2afd03ec9bb468ff2b9eba76fd391673cc3a73e5`. The branch is allowlisted for a Smoke preview on project `prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ`, environment `preview`.
- Public founder-spot counts are removed from the pricing article, the What Is Sparkle Suite article, the FAQ page and FAQPage JSON-LD, the home and build-queue price card, public Nic-Nac, prelaunch pricing copy, and the founder checkout email.
- Pricing article sentence: There's a one-time setup fee of $49.99, plus a monthly plan. The Standard plan is $74.99 a month. During the founding-rep beta, a limited number of founding reps who sign up get Founder pricing: $49.99 a month for their first 12 paid months, which is 33% off, then $74.99 a month after that.
- Suite `llms.txt` adds the `/faq/articles` footer line: Sparkle Suite is an independent tool for Reps and Collectors. We are not affiliated with, endorsed by, sponsored by, or officially connected to Bomb Party.
- `npm test`: 19 files, 299 tests passed. The copy and llms tests passed. Three older public Nic-Nac contract tests still fail on Dance Floor phrases that were already missing on `e1806853`.

Next session: review draft pull request #126. Do not merge or deploy unless Louis asks.
