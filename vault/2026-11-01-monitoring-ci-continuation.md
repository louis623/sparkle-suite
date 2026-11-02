# PR #170 continuation — November 1, 2026

Scope of the initial CI continuation: same draft PR on codex/monitoring-ci; unaliased Smoke preview only. No Live, domains, data, keys, migrations, or merge during that initial continuation. The later, explicitly approved Smoke-only monitoring migration is documented separately.

CI run 41333197362 had 5922 passed / 78 failed / 6 skipped. Three CI-only failures: GITHUB_HEAD_REF / GITHUB_REF_NAME inherited by manual Vercel provenance fixtures (2), and an Eastern-time display assertion on a UTC runner (1). Node 24 was already selected and no CI secrets are needed. A shallow checkout also broke the pinned Git history test. Four suite-load errors were present locally too, so "no new failing names" never implied the guard passed.

Fix: isolate branch and timezone test inputs; fetch full Git history; point Finder/Thanksgiving tests at the actual renamed executable migrations; verify original waitlist/intake RLS/grants instead of a deliberately retired proposal; exercise the current robots route and sitemap helper/current metadata. Comparator and known-failure baseline remain unchanged. No tests skipped.

Validation: 92 focused tests passed with GitHub PR variables and UTC explicitly reproduced; changed-test ESLint and TypeScript passed. Full GitHub run [41340468197](https://github.com/louis623/sparkle-suite/actions/runs/41340468197) at fa14e95466a4adb3a58ced1dc0893baaa2986cb8 passed the unchanged guard: 5,938 passed / 75 existing baseline failures / 6 skipped, zero new failures and zero suite-load errors.

Initial Smoke evidence: exact-head preview dpl_6yoBixMYGtcUWDJpGwdJaayPZonm at https://sparkle-suite-smoke-1pi7n7x10-louis-2849s-projects.vercel.app, preview target and zero aliases. Synthetic error beacon returned 204; owner-only email matched the deployment (Gmail 1a1988852f4e25b2, 2026-11-01T19:13:52Z); identical repeats produced no second email. The global error boundary displayed its heading, Reload and Back on desktop 1280x800 and phone 390x844; Reload recovered /login with throttling. These are historical checks of fa14e954, not fresh checks of the subsequent hardening change. The later two-load hardening check is recorded separately.

Rollback: close the draft or revert this PR; nothing has shipped to Live. No alias assignment is authorized.
