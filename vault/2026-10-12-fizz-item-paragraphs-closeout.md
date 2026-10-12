# 2026-10-12 Fizz item paragraphs closeout

- Branch `cursor/fizz-item-paragraphs-4587`. PR https://github.com/louis623/sparkle-suite/pull/83 into `codex/nic-nac-trade-hardening`. Not merged. Not deployed.
- Item summary and what-it-means render blank lines as `<p>` paragraphs (existing item inline styles), single newlines as `<br>`, and a short lead label before a colon (max 40 characters, no URL) in `<strong>`. Plain text only; HTML still rejected.
- `fizz_issue_stage` item summary cap is 1,500 in the MCP schema and the renderer. What-this-means stays 800.
- `npx vitest run tests/fizz-issues.test.ts tests/remy-communications-mcp-contract.test.ts` passed (16). `npx tsc --noEmit` passed.
- Next action: review the PR. Do not deploy until Louis asks.
