# 2026-10-16 Suite list broadcast html

- Production branch remains `codex/nic-nac-trade-hardening` at `20f5017d`. This fix is a PR off that SHA. Not merged. Not deployed.
- `deliverSuiteListNotice` now creates the Resend broadcast with rendered `html` and derived `text`. Broadcast create has no template field, and the emails API rejects html plus template, so the template object is omitted. `{{{RESEND_UNSUBSCRIBE_URL}}}` stays in both bodies.
- A `suite_official_notice_sends` row with status `failed` is reclaimed and retried. `sent` and in-progress rows are not sent again.
- One-time retry for resource `958bd34d-7b46-4570-b115-ec3ea12f86f0` v1, after this code is the process that runs: `npx tsx scripts/retry-failed-suite-list-notice.ts --key suite-list:resource:958bd34d-7b46-4570-b115-ec3ea12f86f0:v1`. The script does not publish, bump version, or announce. It refuses unless that ledger row is `failed` and the resource is still published at v1.
