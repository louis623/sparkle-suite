# 2026-09-18 Sparkle ships closeout (Sam batch)

Companion vault record for coding agents. Open Brain has the full day closeout.

## Shipped to Suite production (Sam box Vercel)

| Item | PR / note | Prod deploy lineage |
|------|-----------|---------------------|
| Kelly founder Checkout (Kim path) | PR #6 `11314d2f` | Suite prod (billing path live) |
| Nic-Nac dancer label ≠ hero | PR #7 `e3f2260b` | `dpl_9ADyL84rXMh8ZxVy8uwbLuf4xaTv` lineage |
| Waitlist MCP list+get + name+email form | PR #8 `59f257f5` | `dpl_6PaSxzvADNa34yR8PLWh7ugstB81` |
| Team cards Pass A/B/C | PR #5 / tip `8dccff6f` | join cache-bust `20260917-team-social-lead-photo-avatar-clip-v1` |

Cloud-agent vault notes that said "Suite prod not released" for #6/#7/#8 were written **before** Sam's box deploys. Treat this file as the release truth.

## Waitlist / build-list

- Live TEST 2026-09-18 ~2:48pm ET: POST /api/prelaunch/waitlist with name + email + emailConsent:true → 201 → sparkle_suite_waitlist → MCP list+get → TEST deleted.
- Empty MCP list = real empty (Louis deleted Jason/Heather).
- Migration 20260918180000 optional/not applied (no DATABASE_URL). Service-role reads worked in live test.
- Nic-Nac sparkle-waitlist-lead-watch resumed weekdays 5:30pm ET; catch pass green.

## Live Lineup extension

- CWS item kmodgfffflplfdlkkhadgimmobplhoih version 2.0.4.
- Package SHA-256: 961bffd3d6b512cc8fc1e03f59976b71f7e57c8d82932b003ce1be0ab6e7e6cc.
- Further LL polish parked Sunday overnight.
- Agent Live Lineup Watch (4086972) — reporter only.

## Lessons

- Prefer narrow Cursor cloud fixes for urgent regressions.
- Cloud agents often lack VERCEL_TOKEN/DATABASE_URL — Sam deploys from box.
- GitHub MCP merge may 403 — local merge+push via Cursor cloud agent.
- Louis is not a developer: agents own smoke; Louis CWS-only when Sam greens.
- Customer language: build list (not waitlist).

## Still open

- Optional RLS migration 20260918180000 when DB URL available.
- Live Bomb Party smoke for further LL store releases.
