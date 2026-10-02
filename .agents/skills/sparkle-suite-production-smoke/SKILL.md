---
name: sparkle-suite-production-smoke
description: "Use whenever working on Sparkle Suite or Finder releases, Smoke verification, logged-in workspace checks, required setup checks, Help & Resources checks, Nic-Nac UI checks, or smoke testing where a clean browser would hit sign-in. Default lane is Smoke (production twin, staging Supabase, demo accounts). Live yoursparklesuite.com checks happen only after Louis approves a batch promote or names a same-day hotfix. Use reviewer-smoke or demo sessions instead of Louis's personal account."
---

# Sparkle Suite Smoke Verification

## Purpose

Verify Suite, and Finder when that app changed, on the Smoke lane before reps
see the change. Smoke is the production twin: separate staging Supabase
(schema clone, no live rep data) and demo accounts. Live is the promote
target after Louis says go.

This skill is the Smoke verification lane. It does not mean live is the only
surface, and it does not authorize `vercel --prod` after a merge. Canonical
ship order: Core Memory `skills/sparkle-smoke-ship.md`.

## Review Targets

- **Smoke (default):** agent verification and Louis demo-smoke. Exact Smoke
  URLs and demo logins are in the status file Codex writes
  (`SPARKLE-SUITE-SMOKE-BUILD-STATUS-*.md`). Never invent them. Never put
  passwords in git.
- **Live (after Louis says go):** `https://www.yoursparklesuite.com` and apex
  `https://yoursparklesuite.com`. Check these only after Louis approves the
  batch promote, or names a same-day hotfix. Both domains must then resolve
  to that exact deployment.
- Raw Vercel deployment URLs and `sparkle-suite-demo.vercel.app` are
  provenance evidence only, not Louis-facing review targets.
- Do not report a live release complete until the affected live-domain path
  is verified after that approved promote settles.

## Chrome Flow

When logged-in UI matters, use the Chrome plugin if available or explicitly enabled by Louis.

1. Open the Smoke review URL from the status file. Open live `/start` only after an approved promote or a named hotfix.
2. Prefer built-in `Reviewer smoke mode` controls, or the named Smoke demo account.
3. Use `Open setup preview` for required setup, Help & Resources from setup, final setup, and Nic-Nac setup checks.
4. Use the dashboard/workspace reviewer path when checking the post-setup Sparkle Suite Workspace.
5. Do not use Louis's personal account.
6. Do not inspect Chrome cookies, local storage, saved passwords, profiles, or session stores.
7. Do not touch Chrome Web Store settings or local live extension code.
8. Leave a useful reviewer tab open as a handoff when Louis should inspect the exact state.

## Account Rule

Do not ask Louis for a password just to smoke test Sparkle Suite. The reviewer-smoke path should create and sign into the synthetic demo account from the app flow itself. If reviewer-smoke controls are missing or disabled, report that as the blocker and do not fall back to Louis's personal account unless he explicitly asks.

### Louis admin/demo invariant

When Louis explicitly asks to verify or repair his Google-auth account,
`louis@neonrabbit.net` is the original Sparkle Suite admin/demo workspace. It is
not a disposable signup account and must not be used to exercise checkout.

Expected production state:

- rep status: `active`
- required setup status: `dashboard_unlocked`
- entitlement: `$0` internal demo
- Stripe mode: non-live
- post-auth destination: Sparkle Suite Workspace, normally `/nic-nac`

If this account reaches Stripe or reports `checkout_required`, treat that as an
account-state incident. Before any live checkout action, inspect the rep,
required-setup session, entitlement/subscription, and pricing reservation
together. Release any accidental reservation and restore the established
internal-demo contract with an identity-guarded, audited repair. Do not create
a live charge or delete Stripe evidence.

## Required Checks

For logged-in smoke verification, check the relevant real UI state, not just source or unauthenticated HTML.

- Required setup: Nic-Nac setup screen loads and Help & Resources is available from setup.
- Help & Resources: workflow sections are scannable/collapsible, with clear expand indicators.
- Workspace: Nic-Nac is integrated as expected for the section under review.
- Smoke: the affected workflow on the Smoke URL from the status file, with a demo or reviewer-smoke session.
- Live aliases, only after the approved promote: `www.yoursparklesuite.com` and `yoursparklesuite.com`
  serve the exact intended deployment.
- Live custom domain: after a live restore or alias change, verify
  `https://www.yoursparklesuite.com` does not refresh away from the landing
  page, then verify the relevant post-auth destination. Root HTML or a brief
  landing-page flash is not sufficient.

## Reporting

In final updates, state:

- which lane was verified (Smoke, or live after Louis said go)
- the exact paths verified
- the deployment id/commit provenance
- whether Chrome reviewer-smoke was used
- what account/session type was used, without exposing or storing secrets
- any parts not visually verified because authentication or reviewer-smoke was unavailable
