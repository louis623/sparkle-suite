# PR #189 fixes — Smoke only

- Followed `/workspace/handoffs/suite-pr189-fix-prompt.md` from verified PR head `40b8afd172b7f18f089d6d7724ee72e6c7295c0a`; production/base remains `6be08e8c0fbd1b750a16b4c5a8e95cb060d91130`.
- Registered remove-video in the support inventory and gateway under `site.manage`; accepted HTTP alongside HTTPS in the dashboard helper; replaced stale upload wording and mapped invalid slots to a plain 400 response.
- Spec correction: the required inventory test found the pre-existing owner-direct attachment route missing. Classified it `rep_only`, preserving its existing denial through support. No gate/auth change.
- Four individual tests executed: three passed, one failed on that inventory omission before correction. Required classification file attempted once with `--bail=1`; no rerun after correction. The previously unexecuted named render case passed once separately. Earlier 11 tests untouched. Focused ESLint and diff whitespace check passed.
- Prior shared Smoke alias: `dpl_8aSvX4WV6Aefu266K1M5zMLt6T34`. Only Smoke Preview deployment/alias is authorized; max one document load, `/dudesfizzfest`. Final deployment, load evidence and exact SHA belong in `/workspace/codex-runs/suite-pr189-fix.report.md` and the requested memory receipt.
- Applied migration `20261110223956` is unchanged; no DB work, merge, Live release, owner-login addition, extension edit or PR #187 work.
- Open Brain capture unavailable: no `capture_thought` MCP tool exposed. Next session: use the final report/receipt, retain the test/load limits, and obtain separately authorized Smoke reviewer access before claiming authenticated Remove video acceptance.
