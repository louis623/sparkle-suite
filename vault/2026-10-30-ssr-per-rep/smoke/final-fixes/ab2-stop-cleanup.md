# A/B run 2 — Smoke stop cleanup

Verified October 31, 2026, 14:11 EDT. Smoke is restored. The A/B run remains stopped; this cleanup does not decide its acceptance bar.

## Final Smoke state

| Item | Final value | Verification (UTC) |
| --- | --- | --- |
| `sparkle-suite-smoke.vercel.app` target | `dpl_2tsBNUCP3cFyvf9Au155cMTX3s51` | 18:10:46; independent alias read, Smoke project guard |
| `milehighfizz.appearance_preset` | `halloween_pumpkin_witch` | 18:11:00; read-only Smoke SELECT |
| `milehighfizz.customer_site_template` | `amethyst` | Same SELECT |
| `milehighfizz.hero_animation_type` | `zoom` | Same SELECT |
| Run deployment A: `dpl_2SuWzFpfSB7stEyGCBoKvxH7q5t3` | Aliased **no**; alias count **0**; retained | 18:11:11; deployment alias list |
| Run deployment B: `dpl_BsioMXrMGqWi2vf2fDFvo1QF5GrW` | Aliased **no**; alias count **0**; retained | 18:11:14; deployment alias list |

Smoke Vercel project: `prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ`. Smoke database: `pukemqiwlyqmyytxkdmo`. Row: `public.site_settings`, rep ID `a0683f86-a19b-4ee5-a8d1-16dd015371ee` (`milehighfizz`).

## Actions taken by the stopped run

Evidence: `/workspace/codex-runs/suite-ssr-ab-final-2.log`, `resume3-preflight.json`, and `preset-guards-and-restore.json` in this directory. Historical deployment IDs printed while reading older vault notes are not deployments created by this run.

1. Read Smoke binding/provenance, environment configuration and existing deployment state; prepared deployment-scoped runtime/build overrides. The preflight records no project-settings or protection changes and no Live project/database access.
2. Created exactly two Smoke Preview deployments, one build attempt each, from application SHA `0f42a0c63a665a9e057b6507ef58cb1851bfdd8c`:
   - A (SSR): `dpl_2SuWzFpfSB7stEyGCBoKvxH7q5t3`.
   - B (legacy comparison): `dpl_BsioMXrMGqWi2vf2fDFvo1QF5GrW`.
   Both reached READY in the log. An earlier CLI argument rejection of `--skip-domain` created no deployment/build; a manifest-field correction also preceded deployment creation.
3. Passed 12 GET/renderer controls on each candidate, then moved only `sparkle-suite-smoke.vercel.app` from `dpl_2tsBNUCP3cFyvf9Au155cMTX3s51` to A. Passed 12 controls through that Smoke alias. B remained unaliased. Log lines 17681–17724 and the preflight receipt record this move.
4. Ran isolated browser performance, animation and visual probes against Smoke A/B, retaining measurement files, screenshots, scratch harness changes and incomplete samples. The browser harness blocked writes and Live destinations. No acceptance conclusion is made here.
5. Made exactly the following three recorded appearance-only PATCH writes to the Smoke `site_settings` row. Each used exact rep, expected preset, `amethyst` template and `zoom` animation guards; each had an independent read-back. No template/animation write is recorded.

| Time (UTC; EDT) | `appearance_preset` before | `appearance_preset` after |
| --- | --- | --- |
| 17:53:46.925; 13:53:46.925 | `halloween_pumpkin_witch` | `amethyst` |
| 18:01:04.757; 14:01:04.757 | `amethyst` | `fall_owl_harvest_moon` |
| 18:06:03.320; 14:06:03.320 | `fall_owl_harvest_moon` | `halloween_pumpkin_witch` |

6. Hit `SAFETY STOP: acceptance runner stopped; evidence retained` during Fall Owl phone Home. Its finally block performed the third write above and independently read the original preset at **18:06:03.413 UTC / 14:06:03.413 EDT**, with template `amethyst` and animation `zoom` (`restored: true`). See log lines 23135–23137 and 23215–23225.
7. Began post-interruption database/provenance/health inspection. The last shell command would check A's alias, B's zero aliases and both deployment SHAs, then fetch health. It has no completed success output before `turn interrupted`; those intended checks are not treated as proof. The cleanup below supplies fresh read-backs.

The receipts record no other Smoke DB write. Later planned presets were not reached. Earlier alias moves and deployments quoted from prior reports are historical, outside this stopped run.

## Actions taken by this cleanup

1. Queried GitHub directly. Requested branch `codex/ssr-per-rep-allowlist` matched local HEAD `ae0ba18fbf0d5f46778fc705260b0ed2b9f99e69`; the default application branch was also identified read-only. Used only the explicitly requested disposable clone `/workspace/codex-runs/smoke-resume-ae0ba18`, origin `https://github.com/louis623/sparkle-suite.git`. Read repository safety guidance, companion notes, the stopped log and relevant receipts/scripts. Existing untracked run evidence was preserved.
2. Ran `bash /workspace/codex-runs/tools/smoke-db-binding-check.sh` **eight times**, before each Vercel/DB operation below. Every gate exited **0** with `RESULT: SMOKE BINDING OK`. Each gate's three internal configuration reads were filtered by the supplied script; no secret values were printed.
3. Read the Smoke alias once, scoped to the Smoke project, printing only deployment ID: A. Read the intended restore deployment twice; connector response-envelope normalization required a second read. Local guards stopped before mutation until its ID, READY state and Smoke project identity were verified.
4. At **18:10:39 UTC**, assigned only `sparkle-suite-smoke.vercel.app` to the requested existing deployment `dpl_2tsBNUCP3cFyvf9Au155cMTX3s51`. Independently reread the alias with the Smoke project guard and printed only its deployment ID. No other alias was moved.
5. Executed one read-only SELECT in the Smoke database, selecting only `appearance_preset`, `customer_site_template`, and `hero_animation_type` for the exact rep ID above. The result already matched the required preset, so **no cleanup DB write was made**.
6. Listed aliases for A and B separately. Both lists were empty. Left both deployments intact; no deployment was created or deleted.
7. Ran the unchanged active-branch guard for `smoke-stop-cleanup-docs`; it passed. Wrote only this Markdown report, checked the documentation diff, and committed/pushed only this report to `codex/ssr-per-rep-allowlist` using `Codex <codex@openai.com>`. The containing Git commit is the cleanup provenance; the application SHA is unchanged.

No Live project, database, alias, domain or customer workflow was accessed by this cleanup. No environment/settings/protection change, application-code change, build, A/B rerun, new deployment or merge was performed.

Open Brain capture was unavailable: tool discovery exposed no `capture_thought` tool. This report supplies the repository closeout. Next session: keep the A/B run stopped; resume only under a new scoped instruction.

## Local evidence fingerprints

| Evidence | SHA-256 |
| --- | --- |
| `suite-ssr-ab-final-2.log` | `8faa35d61dc998e55f5e42b3926a02775ac2d4208e52d238c870eb27b1ae1376` |
| `resume3-preflight.json` | `d9f863518b9774e0ce725a47532a53518bd04ffacb736e0fda9100dbfe71686b` |
| `preset-guards-and-restore.json` | `4d8a633872b45c5b7004257bff94110d601b4b4c93ed0c5c722320d4672f66bb` |
