# SSR Chunk 1 Pass 2 — pre-deployment checkpoint

Scope: only the requested R1–R7 and R9 fixes on `codex/ssr-chunk1-fizzfest-home`. No promotion to Live or Smoke. User approved a second Git deployment solely for the empty-allowlist environment check, and deployment-only use of the existing Live database connection for both previews. No database writes.

- Baseline `8827f151`: 711 files, 5,646 tests; 5,588 passed, 54 failed, 4 skipped.
- Candidate: 716 files, 5,671 tests; 5,618 passed, 48 failed, 5 skipped. Zero new failing tests or failed file initializations. Same installed dependencies, one worker, complete Suite Vitest run in each tree. Existing failures are listed in `full-suite-comparison.json`; the additional skip is the environment-dependent Live parity test, covered by the deployed harness instead.
- Four isolated browser cases passed: Eastern/Pacific viewer zones, with/without a pre-hydration Play tap. Existing hero DOM retained; saved still motion respected; zero hydration errors.
- Public `amethyst/homepage.jsx` SHA-256 equals pinned Live `3f175871`: `49aa1ecae1229427f953adea0b79f3b270ea45e5a36d767397cd20533c35f15a`.
- Regression tests cover the five route-served gnome images, public-source route removal, saved event zones, still motion, preview-only fault injection, and portable branch guard restricted to preview project `prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ`.
- Deployed results are pending. One measurement round only; no application fixes after that round starts.

Measurement settings: Chrome, en-US; phone 390×900, mobile/touch, 4× CPU, 200,000 bytes/s down, 93,750 bytes/s up, 150 ms latency; desktop 1440×1200, 1× CPU, no network throttle, touch enabled. Cache disabled. Five fresh navigations per profile/origin; Eastern and Pacific screenshots. Each Play/Pause and Shop tap gets a separate navigation at 0/100/200/500/1000/2000 ms after FCP, five repetitions per slot. Original Live has no Sound or menu toggle, so neither is added. Application non-GET/HEAD requests are blocked during browser measurements.

Final prebuild passed (including 11 layout-lock checks); TypeScript passed with no errors. The temporary typecheck config excludes only the nested baseline archive in addition to the repository's normal exclusions.
