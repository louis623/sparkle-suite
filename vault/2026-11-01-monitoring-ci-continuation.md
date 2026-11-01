# PR #170 continuation — November 1, 2026

Scope: same draft PR on codex/monitoring-ci; unaliased Smoke preview only. No Live, domains, data, keys, migrations, or merge.

CI run 41333197362 had 5922 passed / 78 failed / 6 skipped. Three CI-only failures: GITHUB_HEAD_REF / GITHUB_REF_NAME inherited by manual Vercel provenance fixtures (2), and an Eastern-time display assertion on a UTC runner (1). Node 24 was already selected and no CI secrets are needed. A shallow checkout also broke the pinned Git history test. Four suite-load errors were present locally too, so "no new failing names" never implied the guard passed.

Fix: isolate branch and timezone test inputs; fetch full Git history; point Finder/Thanksgiving tests at the actual renamed executable migrations; verify original waitlist/intake RLS/grants instead of a deliberately retired proposal; exercise the current robots route and sitemap helper/current metadata. Comparator and known-failure baseline remain unchanged. No tests skipped.

Validation: 92 focused tests pass with GitHub PR variables and UTC explicitly reproduced; changed-test ESLint and TypeScript pass. The GitHub full run after push is the one final full pass requested by Louis. Latest CI/deployment/visual evidence will be recorded in the PR description and Open Brain after completion.

Rollback: close the draft or revert this PR; nothing has shipped to Live. No alias assignment is authorized.
