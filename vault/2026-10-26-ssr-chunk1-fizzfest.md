# SSR Chunk 1 — October 26, 2026

Louis authorized a fresh `codex/ssr-chunk1-fizzfest-home` from production e78fa626, a separate revert of PR #154 (8827f151), and ONE Vercel preview for dudesfizzfest only. Live remains pinned to 3f175871 / dpl_3KRyLQ47YzNQQwEuaFyW4nRZxs9P. Do not continue or merge #156.

Louis subsequently approved a PUBLIC preview because project preview protection is disabled; do not change project settings. No Smoke, Live, aliases, project env, or database changes except the specifically authorized one test signup/favorite. Do not fix anything after the single deployed measurement round.

Implementation: frozen Live renderer/assets with exact original URLs; only the server-verified dudesfizzfest homepage can use the empty-by-default allowlist. Production React SSR/hydration, fixed first-paint locale/timezone/time, original locked header, selected Pumpkin Cat and base styles, inline bootstrap, early native Pause handling; error or >1.5s returns exact Live HTML. No audio/header/signup/migration/poster changes from #156.

Pre-preview verification: TypeScript PASS, 75 focused tests PASS, 11 layout locks PASS. Existing dependency cache is used locally after all direct dependency versions matched package-lock; the stalled install was preserved under ignored .local/incomplete-dependencies. Vercel builds from the lockfile.

Known acceptance constraints to report honestly: original Pumpkin Cat has no Sound button, original header has links rather than menu toggle; preview host policy suppresses rep GA4. Neither was changed. Public roster completeness and custom-domain request equivalence must not be assumed from partial comparisons. Deployed report pending.
