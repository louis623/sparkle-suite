# Owner browser alerts — Smoke hardening, November 1, 2026

Draft PR #170, codex/monitoring-ci. App code tested on Smoke: `5e8486f2026975e10ed2570e4ec3a5ef8464ba2f`; subsequent commits contain vault evidence only. No Live project, keys/data, customer accounts or domains were accessed or changed.

## Changes

- Durable private database state allows one email per message-hash/source-file/line fingerprint per hour, with repeats counted for the next email, and a global maximum of 20 reservations per rolling 24 hours across deployments. Failed/uncertain sends conservatively keep their reservation.
- Same-origin metadata and the existing approved rep-host resolver; 8 KB actual UTF-8 byte limit; trusted platform IP HMAC; actual built-script file/line/column allowlist. Extensions, third-party and unknown scripts are ignored. An IP window exceeding ten reports is discarded in its entirety before reserving any email budget. Delivery waits roughly one minute for this classification.
- Smoke found two real deployment issues before any email was sent: Vercel's `?dpl=...` script selector was rejected, and Turbopack emitted NFT file traces before the post-compile manifest existed. Accept/strip only the known selector; explicitly add the generated manifest to the route trace, failing the build if the trace is missing. One generic configuration error per instance makes future fail-closed drops diagnosable without logging report contents/IPs.
- Alerts remain OFF unless `CLIENT_ERROR_ALERTS=on` is explicitly set at build/deployment. No packages or new secrets. Public diagnostic reports are not authenticated security evidence; the IP gate rejects burst floods, and the daily cap remains the abuse backstop.

## Migration approval and checks

Louis explicitly approved the ORIGINAL tested `20261101170000_client_error_alert_limits.sql` after reviewing the full SQL. Applied successfully only to Smoke `pukemqiwlyqmyytxkdmo`; readback confirmed its four new `ss_client_error_*` tables. Cleanup and counter mutations are confined to those monitoring tables. The temporary append-only rewrite was discarded.

26 focused monitoring tests passed against that migration; the 19 affected endpoint/reporter tests passed after correcting the URL selector, and all 26 passed again with the configuration diagnostic. One additional focused packaging regression test passed after fixing NFT tracing. TypeScript and changed-file ESLint passed; the final Smoke production build passed. The unchanged full Vitest workflow runs once on the final guarded push; its current run/counts are linked in [PR #170](https://github.com/louis623/sparkle-suite/pull/170/checks).

The missing original CI evidence is filled in [the continuation note](2026-11-01-monitoring-ci-continuation.md): [run 41340468197](https://github.com/louis623/sparkle-suite/actions/runs/41340468197), 5,938 passed / 75 baseline failures / 6 skipped, zero new failures/load errors, at fa14e954. That is historical evidence, not a claimed fresh full pass of this hardening patch. The comparator, baseline and workflow are unchanged; no exclusions/skips were added.

## Final Smoke check

- Preview: https://sparkle-suite-smoke-egdlnekj9-louis-2849s-projects.vercel.app/login; `dpl_BoMvJFYvRrgxQncrKbXAohLtqAWx`, Smoke project `prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ`, preview target, zero aliases.
- Existing normal Smoke alias remained on A, `dpl_3HV4hEooc71gMpZ633zhcwjkTvB5`. No domain/alias was moved. Earlier failed preview attempts were also unaliased; retries were limited to the actual failed alert check, with no matrices.
- Two successful Chromium desktop loads of /login. First own-script TypeError: one redacted beacon, HTTP 204, then one email delivered at 2026-11-01T21:57:01Z. Gmail message `1a1991db0030da5c` identifies this deployment, To `louis@neonrabbit.net`, no CC/BCC, repeat count zero. No unrelated browser runtime errors.
- Second load, same message/file/line within the hour: one beacon, HTTP 204; after its admission window, database readback showed `repeat_count=1`, `reserved_emails=1`, `pending_observations=0`. Gmail message-ID search for this exact deployment still returned only the first message. No second email was reserved or sent.
- Only this private preview enables alerts. Its URL and both DB keys were verified as Smoke. Existing Smoke preview email settings were retained; unrelated integrations/credentials were blanked. No project-wide env/settings changes. Temporary automation credentials are outside Git and removed after the check.
- Historical global-error page/reload evidence is in the continuation note; that unchanged visual flow was not rerun under this task's limited check.

Rollback: leave alerts unset/off or revert this draft. No Live rollback needed. Live activation/release remains unapproved.
