# Live Lineup workspace UI simplification — September 15, 2026

## Outcome

The rep Workspace homepage now presents Live Lineup as a compact card directly beneath Add a dancer and Trade Info in the left rail. The compact homepage card focuses on connection status and customer order, keeps drag/drop and accessible move controls, and omits engineering-facing setup, archive, legacy-feed, hold, reveal, and undo controls. The full Live Lineup tool retains its advanced controls.

Rep-facing connection language is now plain English: Checking connection, Connected, Waiting for an update, and Not connected. Empty states are also simplified.

## Source and release provenance

- Repository: `C:\Users\louis\sparkle-suite-repo`
- GitHub: `louis623/sparkle-suite`
- Branch: `codex/nic-nac-trade-hardening`
- Application commit: `89f8d52ee616647802a46717d9013873cac0599c`
- Vercel project: `sparkle-suite` (`prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3`)
- Previous production deployment preserved for rollback: `dpl_DYKVKfGw58hpeseUEgfoxPVLiJtj`
- Released production deployment: `dpl_6EdixkzoH3j6qsDJJhvwtGx4ovTH`
- Deployment URL: `https://sparkle-suite-oyhcg2kvn-louis-2849s-projects.vercel.app`
- Required aliases verified on the released deployment: `https://www.yoursparklesuite.com` and `https://yoursparklesuite.com`

The deployment was created once from a clean isolated clone of the exact pushed application commit, with deployment-scoped branch, repository, and commit metadata. Automatic Git deployment creation remains disabled.

## Verification

- Focused Vitest suite: 16/16 passed.
- Changed-component lint: passed.
- Production Next.js build: passed, including branch guard, TypeScript, and 32 generated pages.
- Isolated headless-Chrome visual checks passed at desktop and mobile widths.
- Interaction fixture confirmed moving Morgan upward changed `[Jessica, Morgan, Ashley]` to `[Morgan, Jessica, Ashley]` and emitted the expected revision-guarded move command.
- `https://www.yoursparklesuite.com/` returned HTTP 200.
- `https://www.yoursparklesuite.com/nic-nac` returned HTTP 200.
- `https://yoursparklesuite.com/nic-nac` redirected to the `www` route and then returned HTTP 200.
- Both required domains resolved to `dpl_6EdixkzoH3j6qsDJJhvwtGx4ovTH` in Vercel inspection.
- Post-release error-log query returned no errors.

The broader 803-test Live Lineup release manifest had 799 passes and four failures attributable to unrelated pre-existing dirty work: homepage social links, a Dance Floor source-format assertion, a message-count fixture mismatch, and a homepage media-stack assertion. The tests directly covering this change passed.

## Safety boundaries and remaining review limitation

No Chrome Web Store setting, Chrome extension source, live lineup data, customer record, provider object, billing object, or personal account was changed for this work. Existing unrelated local changes, including changes already present under `chrome-extension`, were left untouched and excluded from the application commit.

The synthetic reviewer identity still lacks the server-owned workspace metadata required for a representative signed-in production visual. Louis's protected personal admin/demo account was not used as test infrastructure. The released UI was therefore visually and interactively verified with a safe isolated fixture plus public production route and deployment checks.
