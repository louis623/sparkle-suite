# 2026-10-12 Suite-list and Fizz approve closeout

- Branch `cursor/suite-list-fizz-approve-105c` at `4ba84fc4224c8ab774295d9ca6a1c98896687e2f`. PR https://github.com/louis623/sparkle-suite/pull/82 into `codex/nic-nac-trade-hardening`. Not merged.
- Smoke deploy `dpl_7U1GFQcZjVcXpz6o99qKUHcyjj7t` on project `sparkle-suite-smoke` (`prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ`). Alias `https://sparkle-suite-smoke.vercel.app` points at that deployment. Live aliases stayed on `dpl_BJJXsbpCJNmwHim34hyWFeyTeuxG`.
- Migration `20261012183000_ss_suite_list_notices_and_fizz_issues.sql` is in the branch and was not applied. The connected database was not the smoke project, and no smoke database password was available.
- Owner MCP tools: `communications_preview_broadcast`, `communications_publish_broadcast`, `fizz_issue_stage`, `fizz_issue_get`, `fizz_issue_approve`. Bunny uses the same MCP URL and bearer token with `agentName: "bunny"`.
- Smoke update (Oct 12): migration applied on Smoke and `SPARKLE_FIZZ_TEST_SEND=1` set. Fizz mode `test` ran for 2026-W53 (raw HTML, before the server render) and 2026-W52 (server-rendered Weekly Fizz template, Resend id `01a13074-4ade-7b43-8ced-fe0c0c85d1cb`, owner only; Workspace post `4393d9eb-0827-40e8-ae2d-bfc3ccf7034f`). A repeat approve replayed with no new send. No Suite-list broadcast was sent.
- `fizz_issue_stage` now takes structured `content`; the server renders `brand-assets/email/weekly-fizz-report/weekly-fizz-report.resend-template.html` and rejects raw HTML. Smoke deploy `dpl_2HUTTusx51EnS9TD1zHcFYppxDiZ`.
- `agentName` allowlist is now suite, bunny, fizz.
- Live Fizz mode `test` emails only `louis@neonrabbit.net` and does not require `SPARKLE_FIZZ_TEST_SEND`. Smoke still requires that flag.
- Resend template `suite-official-notice` was republished with optional `THUMBNAIL_HTML`. That publish did not send email.
- Next action: Live migration on `bqhzfkgkjyuhlsozpylf`, Live deploy, then one owner-only Fizz `test` on Live before any live issue.
