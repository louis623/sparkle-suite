# September 15, 2026 — Live Lineup responsive strip and support-view closeout

## Outcome

- Customer-site Live Lineup strips now render the complete lineup instead of capping the strip at four entries. The existing flex/overflow layout fills available desktop space and remains horizontally scrollable on narrow screens.
- Operator support sessions now route the compact Workspace Live Lineup read through the audited, frozen-target gateway. The read uses the selected rep's exact tenant context.
- Live Lineup remains read-only while acting for a rep. Support mode does not expose working drag/reorder actions or permit the lineup POST route, and its helper copy now says customers are shown in their current order.
- Root cause of the Brittany mismatch: `/api/workspace/live-lineup` was outside the support client's proxied API prefixes, so the support Workspace read the operator's ordinary queue instead of Brittany's target-scoped queue. This was generic to support mode, not evidence that Brittany's own extension feed was missing.

## Verification

- Focused tests: 150 passed across the public homepage/join/trade templates, Live Lineup HTTP boundary, compatibility/read-only UI, operator support client routing, and support route classification.
- Broader Live Lineup/operator-support check: 22 passed.
- Local production build passed, including branch guard and TypeScript.
- Vercel production build passed for exact application commit `f1a275dbd331da7d17568e1ab8933b5a0075b39f`.
- Production deployment: `dpl_6Nb3n2x7pENJypm4zn1DmzSpL5nL` (`sparkle-suite-ja36y8y3p-louis-2849s-projects.vercel.app`). The previous production deployment `dpl_B1DaUBEygAXFHftS2cgzpgSWF82W` remains the rollback reference. Failed pre-release attempt `dpl_4JXJ6hLtKvwGNhC6CVjGqW63Qdeo` never reached a successful build because its detached upload lacked declared branch metadata.
- Vercel inspection showed the new deployment owns both Sparkle Suite domains and all established customer aliases, including Brittany, Bri, Bling Kitchen, Mile High Fizz, Go For The Bling, and Sparkly Butterflies.
- Anonymous live visual QA on `brittwithbling.com` at 1280×720 showed 19 rendered queue pills, about eight visible across the available row before contained horizontal overflow, a visible full-lineup control and far-right updated time, and no page-level horizontal overflow.
- Anonymous live visual QA at 390×844 showed all 19 pills in the scrollable strip, three visible initially, the updated time and full-lineup control visible, and no page-level horizontal overflow.
- Signed-in support rendering is covered by target-context and mutation-boundary tests. No personal/customer account was used for release smoke.

## Read-only Bri inspection

- At Louis's request, inspected Brianna Williams / Bri's Glowtique without changing any data.
- Public projection reported `offline`, no last update, and an empty lineup.
- Production database read confirmed no v2 Live Lineup state, no active upgraded connection key, and no key use. The legacy `BGL-2463` row is an empty placeholder created April 10, 2026 with `last_updated = null`.
- Conclusion: Bri was not connected, rather than connected with an empty queue. Louis recalled she uses Safari; the near-term supported path is Chrome on her MacBook with the Chrome extension. Safari extension work remains a separate future project.

## Safety

- No Chrome extension files, customer queue state, support-session data, billing/account state, DNS, or provider objects were changed.
- Unrelated dirty workspace changes were preserved and excluded from the application commit.
