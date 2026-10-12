# 2026-10-12 Suite-list and Fizz approve closeout

- Branch `cursor/suite-list-fizz-approve-105c` at `4ba84fc4224c8ab774295d9ca6a1c98896687e2f`. PR https://github.com/louis623/sparkle-suite/pull/82 into `codex/nic-nac-trade-hardening`. Not merged.
- Smoke deploy `dpl_7U1GFQcZjVcXpz6o99qKUHcyjj7t` on project `sparkle-suite-smoke` (`prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ`). Alias `https://sparkle-suite-smoke.vercel.app` points at that deployment. Live aliases stayed on `dpl_BJJXsbpCJNmwHim34hyWFeyTeuxG`.
- Migration `20261012183000_ss_suite_list_notices_and_fizz_issues.sql` is in the branch and was not applied. The connected database was not the smoke project, and no smoke database password was available.
- Owner MCP tools: `communications_preview_broadcast`, `communications_publish_broadcast`, `fizz_issue_stage`, `fizz_issue_get`, `fizz_issue_approve`. Bunny uses the same MCP URL and bearer token with `agentName: "bunny"`.
- Fizz test mode was not run. Smoke does not have `SPARKLE_FIZZ_TEST_SEND=1`, and the new tables are not on the smoke database. No Suite-list broadcast was sent.
- Resend template `suite-official-notice` was republished with optional `THUMBNAIL_HTML`. That publish did not send email.
- Next action: apply the migration to smoke ref `pukemqiwlyqmyytxkdmo` only, then run Fizz mode `test` for one owner email and one owner Workspace post.
