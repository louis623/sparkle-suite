# Sparkle Suite Smoke

Provisioned September 26, 2026 under Louis's explicit Smoke-only authorization. Production and CWS were not released. This environment overrides older single-live-surface review instructions only for Smoke. It is a baseline twin, not a v5.2 release or certification.

## URLs and identities

| Product | Smoke URL | Vercel project | Supabase project |
|---|---|---|---|
| Suite | https://sparkle-suite-smoke.vercel.app/login | `prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ` | `pukemqiwlyqmyytxkdmo` (us-east-1) |
| Finder | https://sparkle-finder-smoke.vercel.app/auth/sign-in | `prj_PvqPYv0R3DclFbFmM6vVNX2Q50gl` | `awdwtxcqkqrzgdikrwab` (us-west-2) |

Vercel team: `team_kvcmZ4RlZB0Hah65NE3280x5`. Supabase organization: `txjscamtfzxjlsdoklit`.

Suite source: `louis623/sparkle-suite`, `codex/nic-nac-trade-hardening`, `4a679d751f7519de2396da89b03ba8de1ddfe140`. Deployment: `dpl_8javW3ayk1hYJR9X4Qso3Svp7nJM`.

Finder source: **the deployed monorepo `apps/finder`**, `5a1aa7ec197bfbdfb334b95a1f1bbe30fad05110`, chosen explicitly by Louis. Deployment: `dpl_FAzWj6S97zv7fJkyrpPHMJYxhnwr`. The separate Finder repo tip `8192b11f1535e8cbc0af2c4df352ea93c0e86233` was inspected but not deployed.

## Demo access and smoke walkthrough

Both apps have `louis@smoke.example.test`, `sam@smoke.example.test`, and `codex@smoke.example.test`. These are reserved synthetic addresses, not mailboxes. Use email/password, not Google. Public signup is disabled. Each app has its own password; there is no cross-app auth integration.

Louis's Windows account can decrypt the Desktop `SPARKLE-SUITE-SMOKE-DEMO-ACCESS-2026-09-26.clixml` with `Import-Clixml`; each record contains a PSCredential, product, and (Suite only) Workspace code. Keep this outside Git and ordinary notes. Do not send passwords or codes in chat, PRs, or screenshots. Sam/Codex need a secure secret handoff if operating on another machine; DPAPI is bound to Louis's Windows user/machine.

1. Open the Suite Smoke login URL, sign in with the selected synthetic persona. Expect `Name Smoke`, workspace access, and no checkout.
2. Open `/nic-nac?section=live-queue`. Expect the synthetic Workspace code and empty/disconnected lineup. **Do not install or pair the live Store extension, open live Party Orders, or follow the legacy setup instructions during this baseline test.** A separately authorized Smoke-targeted extension and synthetic order evidence are needed for extension end-to-end testing.
3. Open `/smokelouis`, `/smokesam`, or `/smokecodex` on the Smoke domain. Expect the announcement `Sparkle Suite Smoke · no real orders` and an empty/stale lineup. The database also holds a Smoke banner; its visibility depends on the skin.
4. Open Finder Smoke separately, sign in with that app's password, then `/account`. Expect the synthetic name, rep badge linked, and `Silver Rep Included`. `/silver` and the library begin empty.
5. Keep browser address on the Smoke domains. Baseline source includes hard-coded live public links, notably the Suite header's copied public-site address and Finder footer link. Use the explicit Smoke URLs above instead. A link correction is a future application change; this infrastructure PR does not alter production behavior.

All six password logins were verified against the matching staging JWT issuer. Codex's Suite workspace, Live Lineup tools, storefront, and Finder rep account were inspected in browser. This is not evidence that every application feature or v5.2 contract passes.

Password reset does not require email delivery: run `scripts/smoke-environment/reset-password.mjs <suite|finder> <louis|sam|codex> <private-env.json> <private-demo-credentials.json>`. It verifies staging key/project, synthetic email, recorded auth ID, and Smoke metadata before rotating. Refresh the encrypted Desktop handoff afterward. Do not run customer-facing forgot-password for these nonexistent mailboxes. The seed preserves existing credentials. Resetting test data by deletion requires Louis/Sam approval; this task deleted no user data.

## Isolation and schema baseline

Both Supabase projects were created fresh. Only schema/catalog configuration was read from production, never customer rows, auth users, storage objects, or production Vault secrets. Fresh staging keys, bridge tokens, cron secret, and session secret were generated. No production environment file was copied. Suite and Finder use separate staging databases with matching new bridge tokens.

The schema was exported with PostgreSQL 17 `pg_dump --schema-only --no-owner --schema=public --schema=private`, under a read-only connection. Each import used a single transaction and `ON_ERROR_STOP`. Auth triggers and app storage policies were copied from catalog definitions; empty app buckets and Suite's five Realtime table memberships were configured separately. No Edge Functions were deployed and no provider/Vault secrets were transferred.

Schema comparison: Suite 220 table/view objects, 2,673 columns, 152 non-extension functions, 218 policies, and 1,189 constraints. Finder 21 table/view objects, 218 columns, 19 functions, 53 policies, and 102 constraints. Normalized fingerprints match except four Suite constraint strings whose AND-parentheses were flattened by the newer PostgreSQL patch; predicates match. This comparison covers these objects, not every possible platform setting.

Deliberate sanitization: hard-coded personal email literals in Suite schema definitions replaced with reserved invalid addresses; one embedded production function endpoint replaced with the staging endpoint; an unrelated storage policy tied to a live auth UUID omitted. Unrelated video/LOC/VAC buckets were not created. `loc_runtime` exists only as NOLOGIN/NOBYPASSRLS to preserve schema dependencies. Staging PostgreSQL is 17.6.1.166, newer than source patch levels.

Recorded production migration version/name history was baselined in staging after applying the snapshot (192 Suite versions, 20 Finder versions). **Historical data migrations were not replayed.** Baseline statement metadata explicitly says so. Before later schema changes, inspect pending migrations and remove production identities/endpoints from staging execution; never blindly run `db push --include-all`. Raw schema exports and temporary connection commands remain private and are not committed.

Recreate steps: create fresh Supabase projects in the listed regions; generate fresh database passwords; export schema only using a read-only source role; sanitize literals and embedded endpoints; audit no COPY/data inserts or credentials; apply the sanitized snapshot transactionally to explicitly allowlisted staging refs; apply sanitized auth/storage definitions and empty bucket config; baseline migration history; generate staging-only keys and bridges; create only the three marked synthetic accounts and `$0`, non-live entitlements. Compare schema fingerprints before opening access. The original private import/evidence files are in Louis's protected local build directory recorded in the Desktop status.

## Disabled and unavailable integrations

- Suite cron feature is **disabled at project level**. Definitions remain visible; `crons: []` in the CLI overlay alone did not remove source crons. Verify `disabledAt > enabledAt` after every deploy. Finder has no scheduled definitions.
- Public signup, self-serve buying, paid Finder billing, outbound pre-show SMS/email, SignWell sending, auto-recharge, and lab automation are off.
- No Stripe, Resend, Telnyx, SignWell, Photoroom, OpenAI, or Anthropic credentials were provisioned. Provider-dependent flows are unavailable. No live charges/messages/provider actions were tested. Google OAuth is not configured.
- Finder has an empty catalog. Rep private visibility is enabled; no real customer/rep data is present. Profile-completion prompts may appear because no real phone or consent record is fabricated.
- Smoke has no Git link or automatic Git deployment. CWS automation was not enabled; existing live Store settings and extension code were untouched.
- URLs contain `smoke`; responses carry `X-Sparkle-Environment: smoke` and `X-Robots-Tag: noindex, nofollow, noarchive`. Noindex is labeling, not access control. App auth protects workspace data; synthetic storefronts are intentionally public.

## Deploy an approved SHA to Smoke

Use a disposable clean clone of the verified GitHub revision; never a stale persistent checkout. Check remote repository, full SHA, clean Git status, applicable branch instructions, and relevant migrations first. Do not bypass the active-branch guard. An unapproved branch requires resolving its status before building.

1. Run `node --test --test-isolation=none scripts/smoke-environment/guards.test.mjs` from this tooling revision. Set `VERCEL_TOKEN` through the authenticated CLI/secret store without printing it. Run `node scripts/smoke-environment/verify.mjs suite` and `... finder` to validate both environments and schedulers.
2. In the source clone set `VERCEL_ORG_ID` to the exact team above and `VERCEL_PROJECT_ID` to the appropriate **Smoke** project. Check `.vercel/project.json` agrees. Never use an inherited production project link. Finder working directory is `apps/finder` at its chosen source revision; Suite working directory is the repo root.
3. Deploy with `npx --yes vercel@60.1.3 deploy --yes --meta githubCommitSha=<FULL_SHA> --meta githubCommitRef=<VERIFIED_BRANCH>`. Pass `--local-config <absolute-tooling-path>/scripts/smoke-environment/vercel.json` for Smoke/noindex headers and disabled Git creation. Do not trust that overlay alone to disable the scheduler. **Do not pass `--prod` for Finder**: baseline code redirects `.vercel.app` production-target requests to the live domain. Prefer preview target for both apps going forward. Do not override `VERCEL_ENV` to hide target mismatches.
4. Verify READY, project ID, and SHA metadata through `GET /v13/deployments/<id>`, and confirm build logs/source provenance. Metadata alone is not cryptographic source verification: it must agree with the clean checkout actually uploaded.
5. Only after checking those fields, assign the matching Smoke hostname using `POST /v2/deployments/<id>/aliases` with `{ "alias": "sparkle-suite-smoke.vercel.app" }` (or Finder). Never move a production domain. Then run `verify.mjs <product> <deploymentId> <FULL_SHA>`; it checks alias identity, environment keys, project, cron state, and Finder preview target.
6. Follow the demo walkthrough. Confirm no redirects to live domains, expected staging JWT issuer, zero-dollar access, and affected functionality. Record exact SHA, deployment ID, schema changes, limitations, and Louis's smoke result. Failed checks mean not ready for Louis acceptance.

The initial Suite deployment uses the production target **inside the separate Smoke project**; this did not touch the real production project. The initial Finder Smoke production-target attempt was retained as evidence but its alias was moved to the verified preview build. It must never be used for testing.

## Production later is a separate authorization

Ship sequence remains Smoke → Louis demo smoke → CWS queue (when relevant and authorized) → production. **Never promote a Smoke deployment artifact into production:** its compiled public keys and runtime configuration point at staging. After Louis's explicit production go, rebuild the same accepted source SHA using the existing production project's own configuration and release procedure, then verify live-domain deployment identity and workflows. Do not copy Smoke env to production or production env to Smoke. This task grants no future production/CWS authorization.

Protected production IDs: Suite Vercel `prj_zCKmYDx1Sbs9hA1Lokzdv9Qm0TM3`, Supabase `bqhzfkgkjyuhlsozpylf`; Finder Vercel `prj_mk7PGhirgNotU1BtdmZrZhhJWz8w`, Supabase `pzksocboqauqjdtsgpdp`. They are never mutation targets for Smoke tooling.
