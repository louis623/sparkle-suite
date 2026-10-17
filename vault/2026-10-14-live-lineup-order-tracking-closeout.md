# 2026-10-14 Live Lineup order tracking

Draft PR #99, branch `cursor/live-lineup-order-tracking-8a01`, SHA `ff3e39dccd8e10e50ccab5120b5e81679f5612a6`. Not merged.

Smoke preview `dpl_84jhjq5siBuTz1NVoWhqiYx8LX3f` is Ready on `sparkle-suite-smoke` with no production target. Alias `sparkle-suite-smoke.vercel.app` stayed on `dpl_68mNGKWa4XvZEooGkFeyTaFnu5ev`. Live was not deployed and the Live database was not written.

The archive function that creates a missing customer card is in the migration and passes in unit tests. It is not applied on Smoke yet: this session had no Smoke database password, and the service role cannot replace the function. Do not backfill Live. Do not publish the Chrome extension. Reps still on 2.0.4 do not send surnames; the repo extension is already 2.0.6.
