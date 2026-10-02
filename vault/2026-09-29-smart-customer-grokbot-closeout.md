# Smart customer closeout — September 29, 2026

Grokbot continued the paused Codex draft. Code is on `cursor/smart-customer-cards-9630` (PR against `codex/nic-nac-trade-hardening`). Base code remains `08ab1e733b55601f712787cb27a6c152b9914d7c`; docs tip `7ce40b0f` is the branch parent. No Smoke migration, Vercel deploy, Finder change, production change, CWS change, or Bomb Party action.

## Decision

Auto-create stays on the Workspace enrichment and inspect calls. A ready, identity-eligible order with no same-rep full-name card gets a minimal card (no birthday, preferences, contact, or messaging consent). Extension publish does not create cards while the Workspace is closed. That keeps the protected extension a source snapshot and avoids minting cards from a background scrape.

## What the fix covers

- Audience route fixtures now use `live_lineup_customer_cards`. Clarification hides birthday, preferences, label, and candidates.
- Preference chips sanitize control characters and keep up to 160 characters, matching the longest stored collection. A long or messy value no longer fails the whole receipt.
- Separate-person retry with the same new id and a different label is rejected and does not relabel the first card.
- Capable-publisher bootstrap does not auto-create.
- Held orders can open the same customer card. Expanded Live Lineup can Ask Nic-Nac with the customer id. The Customer List shows the private label.
- Nic-Nac updates require `audienceId` and `expectedVersion`. The tool text tells the model to ask which card when names collide. There is still no dedicated conversational order-link resolver.

## Evidence

`npx tsc --noEmit` passed. Focused Vitest: 7 files, 58 passed. Broader local lineup/customer files: 22 files, 321 passed, 1 skipped (Chrome path absent). Dashboard placeholder, audience export, and Amethyst audience route: 146 passed. Not a full suite, lint, or Next build. No Chrome or Smoke workflow proof.

## Next

Sam/Louis: apply `supabase/migrations/20260929000100_live_lineup_customer_cards.sql` to Smoke `pukemqiwlyqmyytxkdmo` before deploying this app SHA. Do not use `scripts/smoke-environment/migrate-lineup.mjs` as-is; it only lists the September 26 files and aborts when those versions are already recorded. Then deploy that exact SHA to Smoke `prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ` and verify real existing orders. Last verified Smoke app remains `0528acd4355e2766cfe4e1903c251f5ba23dd2fd` / `dpl_4gdF5ELMNmde62BCrfgwDq341gyw`. Extension 2.0.6 `bpipafleeajdagfimfnfgmhcdendgkfl` code TDF-1552 stays. Do not touch CWS `kmodgfffflplfdlkkhadgimmobplhoih`.
