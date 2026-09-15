# Live Lineup workspace height closeout — September 15, 2026

## Outcome

- Expanded the compact Live Lineup card in the rep workspace so it claims the available height in the left rail instead of stopping at 360px.
- Set a 460px minimum card region, which keeps at least four compact customer rows visible in the target desktop/tablet layout.
- Moved the compact row controls beside the customer name so each customer uses less vertical space.
- Long lineups continue to scroll inside the card.

## Files

- `app/nic-nac/components/DashboardPlaceholder.module.css`
- `app/nic-nac/components/LiveLineupCard.module.css`
- `tests/nic-nac-workspace-shell.test.tsx`

## Verification

- Focused Vitest: 2 files passed, 16 tests passed.
- Production build: passed, including branch safety, Next.js compilation, TypeScript, and 32 generated static pages.
- Production deployment: `dpl_CyTUoervEnsJt7V9R1R2zoNKyXSC` (`READY`).
- Application commit: `c827df4f0bd6ef0661e3671051fe95e990b1ccf0`.
- `https://www.yoursparklesuite.com/nic-nac`: HTTP 200 on the new deployment.
- `https://yoursparklesuite.com/nic-nac`: redirects to the canonical `www` URL, then HTTP 200.
- Vercel inspection confirmed both Sparkle Suite domains are aliases of the new production deployment.

## Safe-review note

The token-gated reviewer controls were not available at `/start` without a review token, so the authenticated workspace was not opened through a customer or Louis account. Layout behavior was verified through the focused CSS contract tests and successful production build; no live queue data or Chrome extension files were changed.
