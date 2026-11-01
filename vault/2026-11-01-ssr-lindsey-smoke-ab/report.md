# Lindsey Smoke A/B — stopped at binding gate

Fresh origin/codex/ssr-per-rep-allowlist was exactly approved application 320951fc4e8dd08391d259630a2b8fc47f1e8305. The prompt was committed first as bcca722a; later commits in this run contain vault files only. PR #169 remains draft.

The unchanged appendix was saved outside the repo and run once with Git bash, the installed signed-in Vercel CLI and Python. It returned:

```text
NEXT_PUBLIC_SUPABASE_URL: UNREADABLE
NEXT_PUBLIC_SUPABASE_ANON_KEY: UNREADABLE
SUPABASE_SERVICE_ROLE_KEY: UNREADABLE
RESULT: FAIL (stop)
BINDING_EXIT=1
```

**STOPPED**, as explicitly required. UNREADABLE is not evidence that the bindings are Smoke or Live; no binding conclusion can be drawn. No custom decrypt/compare, alternative binding check or second attempt was made.

- A/B deployment IDs: none; zero deployment attempts.
- ALIAS_BEFORE/AFTER: not queried because the binding gate failed first. This run made no alias assignment or protection/settings/env change.
- A, alias and B 12-GET controls: not run.
- Performance rows: 0 measured / 26 planned device rows. All are NOT_RUN in report.json, with null metrics; no fabricated PASS, FAIL or WAIVED measurements.
- Preset restore: not applicable. No Smoke DB read/write was performed after the failed gate; appearance_preset, template and motion were not changed by this run. No independent read-back is claimed.
- Committed harness gates/cases are unchanged. No Chromium matrix, local WebKit run, code fix, full unit run, provider action, send, checkout, merge, Live project or Live DB access occurred.
- Resume requires a binding-check run that actually prints RESULT: SMOKE BINDING OK and exits 0. This report does not authorize changing or bypassing the check.

Rollback: unnecessary; no deployment, alias or database state changed.
