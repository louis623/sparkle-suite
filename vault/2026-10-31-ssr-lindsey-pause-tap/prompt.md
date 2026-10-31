# Sparkle Suite SSR: Lindsey (milehighfizz) Pause-tap fix + loading-tap gate (code-only)

Repo/worktree: /workspace/repos/sparkle-suite-ssr, branch codex/ssr-per-rep-allowlist, start from head dc644c83b7df4cb0d8d88491dc3e31ffad3f580a. PR #169 stays draft.
First commit this prompt to vault/2026-10-31-ssr-lindsey-pause-tap/prompt.md.

Testing bar (Louis 2026-10-31): test only what could matter to users or catch real bugs. Focused tests for what changed, then ONE full pass at the end. No repeated full matrices, no chasing sub-pixel or few-ms differences.

## Harness changes (required; Rocky re-review 4 of dc644c83)
1. In scripts/qa/ssr-smoke-ab-metrics.cjs, apply the tap gate and the errors gate (page errors and #418/#423/#425 hydration errors) to the CANDIDATE only. Keep legacy tap times and legacy errors in the output as baseline info. A legacy theme mismatch, a measurement error, or no rows must still fail.
2. Add tests: a slow legacy tap passes, a legacy page error passes, a legacy theme mismatch fails.
3. Loading-tap gate: warn over 200ms, fail over 300ms (median per control). Idle-tap gate stays fail over 200ms.

## Optional fix
4. gilded_autumn MHF desktop home Pause measured 714ms on loading taps in WebKit. Rocky traced this to a WebKit-on-Linux test-browser quirk (pausing a video whose play() is still starting blocks ~500ms even on a blank page), so it is NOT a blocker. Optional shared tweak: don't call video.pause() while a play() promise is pending; pause once it settles. If you make it, do it in shared motion code (all reps on the theme). Note the test-browser quirk in the report either way.

5. Change nothing else in the harness (legacy same-theme, CLS 0, waivers table stay as they are).

## Tests
- Focused: the new harness tests above; if the optional Pause tweak is made, its case in WebKit and Chromium with CLS 0 and hydration errors 0 on gilded_autumn home.
- One pass at the end: the 12 MHF tap rows (gilded_autumn + alpine_opal, home/join/trade, phone/desktop, Chromium + WebKit) once, then the full suite once. Compare to 6106/75/6; report any new failing names.

## Rules
No deploys, no alias changes, no Smoke or Live access, no external DB access. Never print secrets or bypass values. Stop after the code run.

## Report
NEW_HEAD; harness gate changes made; whether the optional Pause tweak was made; the 12-row tap table (loading/idle, ms) with any warn or fail marked; CLS and hydration results; full-suite numbers.


Shipping bar (Louis): decent and working. Only fix or block on real problems a person would notice or get stuck on (broken pages, errors, things not working, clearly slow pages, security/data risk). Skip rare edge cases and tiny visual or pixel differences; those get fixed when real users report them. Testing: focused tests for what you change plus one full pass at the end; no repeated full runs.
