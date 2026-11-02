# Lindsey Smoke A/B — stopped at Louis's instruction

Application SHA: `5eaefb1f0e903c7d0b2b0a78389672c7920aab6c`, branch `codex/ssr-per-rep-allowlist`, draft PR #169. Prompt recorded and pushed first in `b1b4893b`. Deployment source was a clean disposable clone at `/workspace/codex-runs/lindsey-smoke-ab-source`; records are in `/workspace/codex-runs/lindsey-smoke-ab-clean`. Branch safety passed. No application or committed harness changes.

The required binding check exited 0 with `RESULT: SMOKE BINDING OK`. Two single-attempt Smoke Preview deployments were created with the 39 deployment-only build/runtime overrides, using Smoke's own three bindings. Temporary secret-bearing configuration files were outside the repository and deleted. Both deployments are retained:

| Cohort | Deployment | Final aliases |
| --- | --- | ---: |
| A SSR | `dpl_JEF6TBQswcfF13s4xFSPKCu3DfQY` | 0 |
| B intended legacy | `dpl_CZGN3W5CyF7P4ACNqdVzXkkm7iEp` | 0 |

A's candidate GET controls passed 12/12. The alias assignment executed, but the connector returned this exact value-free error:

```text
tool call error: tool call failed for `codex_apps/vercel.assign_alias`

Caused by:
    Transport closed
```

After Louis's stop/cleanup instruction, a fresh alias read confirmed A was serving the Smoke alias. Exactly one restore request moved `sparkle-suite-smoke.vercel.app` back to **`dpl_2tsBNUCP3cFyvf9Au155cMTX3s51`**. Independent alias readback confirmed the original target, and each new deployment's alias list independently confirmed zero aliases. Receipts: `stop-alias-initial-read.json`, `restore-attempt.json`, `stop-alias-final-read.json`, `A-stop-aliases.json`, `B-stop-aliases.json`.

The A/B harness was **not run**. Its immutable route uses `/dudesfizzfest` for both cohorts, while B's mandated allowlist still includes `dudesfizzfest`; B would therefore be SSR and fail its legacy-renderer check. Its fixed cases also differ from the requested Pumpkin Witch/MHF coverage. Louis explicitly agreed to stop for corrected instructions. A-alias and B-candidate controls and all performance/interaction/autoplay measurements remain unrun, not passed or failed.

**Lindsey's `milehighfizz` preset was never read or changed.** No preset restore was needed. No direct database calls, Live project/database/domain access, Live changes, project env/settings/protection changes, new bypass token, sends, checkouts, provider actions, merge, or extension changes. The existing bypass was used only in memory for A's origin-scoped GET controls.

Open Brain capture unavailable: tool discovery exposes no `capture_thought` tool; no alternative database or Live service was used.

Next-session prompt: Read this stop note and verify the current GitHub tip. Keep PR #169 draft and Live untouched. The Smoke alias was restored to the original target above, and both retained new deployments have zero aliases. Resolve the cohort-routing and fixed-case contradictions in a separately authorized prompt/harness change before any A/B run; do not rerun deployments or completed controls automatically.
