# Pass 4 predeployment record

- Parent: 9dbbd2296e3161523090277465c34fca8f556b19; branch codex/ssr-chunk1-fizzfest-home; isolated /tmp/sparkle-ssr-pass4 clone of GitHub.
- One fix: unknown Dance Floor/events data stays neutral until loaded; fixed event slots and the existing ticker/strip dimensions reserve the swap space. Loaded-empty listings retain their actual empty state.
- Slow-data flag: SSR_PREVIEW_PAGE_DATA_DELAY_MS=5000, guarded by preview environment, preview project and dudesfizzfest identity. Approved in-memory SSR_PREVIEW_THEME_OVERRIDE selects Pumpkin Cat so the existing SSR renderer can exercise Smoke data; no saved-theme edit.
- TypeScript, guarded production prebuild and focused tests pass. One full-suite run only; comparison names and counts are in full-suite-comparison.json. No provider/database credentials were supplied to the tests.
- One Git-sourced preview is authorized in prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ, using Smoke bindings only. All inherited project credentials except Smoke database bindings will be blanked in deployment-only overrides; no Live values are retrieved.
- Planned deployed checks only: five deferred loads, then three desktop and three slow-phone loads. No taps, parity comparisons, forms, seeding or data writes. Report and stop after this round.
