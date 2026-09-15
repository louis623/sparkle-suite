# Britt with Bling Live Lineup timestamp hotfix — September 15, 2026

## Outcome

The customer-facing Live Lineup strip no longer displays “Update delayed.” It now displays the lineup's last update as a local-time label such as “Updated 10:18 AM,” positioned at the far right after the visible customer pills and View full lineup action. The same presentation applies to the public Home, Join, and Dance Floor routes. The underlying delayed-state continuity and safety behavior remains unchanged.

The full-lineup dialog also uses the simple Updated time and no longer exposes delayed-connection or Last received wording. The shared public runtime fallback says it is showing the latest lineup while checking for updates without labeling the experience delayed.

## Source and release provenance

- Repository: `C:\Users\louis\sparkle-suite-repo`
- GitHub: `louis623/sparkle-suite`
- Branch: `codex/nic-nac-trade-hardening`
- Application commit: `5f55d4df0fc26367794021fa0600f6cb94304298`
- Vercel project: `sparkle-suite` (`prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3`)
- Previous production deployment preserved for rollback: `dpl_6EdixkzoH3j6qsDJJhvwtGx4ovTH`
- Released production deployment: `dpl_B1DaUBEygAXFHftS2cgzpgSWF82W`
- Deployment URL: `https://sparkle-suite-go78h4ago-louis-2849s-projects.vercel.app`
- Verified aliases: `https://www.yoursparklesuite.com`, `https://yoursparklesuite.com`, `https://brittwithbling.com`, and `https://www.brittwithbling.com`

The release was built once from a clean clone of the exact pushed application commit with explicit branch, repository, and commit metadata. Automatic Git deployment creation remains disabled.

## Verification

- New customer-presentation regression: passed.
- Brittany and shared public Live Lineup suites: 37/37 passed.
- ESLint and diff check for the changed source/test files: passed.
- Production build: passed, including branch guard, Join runtime rebuild, Next.js compile, TypeScript, and 32 generated pages.
- Anonymous live browser check on `https://brittwithbling.com/` at 1280×720 showed the active lineup, no delayed copy, and the Updated timestamp to the right of the customer pills and View full lineup.
- Measured desktop positions confirmed customer items ended at x=1015, View full lineup ended at x=1132, and the Updated label occupied x=1148–1241 inside the lineup bar.
- At 390×844, the timestamp remained right-aligned beside the Live Lineup heading, the customer row remained below it, and the page had no horizontal overflow.
- Opening View full lineup showed ten current positions plus the Updated time, with no delayed wording. This was a read-only UI interaction and did not mutate the lineup.
- `www.yoursparklesuite.com`, the Suite apex, and Britt with Bling resolved to `dpl_B1DaUBEygAXFHftS2cgzpgSWF82W` in Vercel inspection.
- The deployment metadata query matched the exact application commit, and the post-release error-log query returned no errors.

The larger homepage test file retains one unrelated pre-existing source-format assertion failure for social-link formatting. The new Live Lineup assertion passes independently, and the affected Brittany/Lineup suites are green.

## Safety

No Chrome extension file, Web Store setting, live queue row, customer record, provider object, billing object, or personal account was changed. Live validation used an anonymous, read-only in-app browser session on Brittany's public site; reviewer smoke and Louis's protected account were not needed.
