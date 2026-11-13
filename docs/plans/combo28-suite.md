# Combo28 Suite branch notes

Base 0a763690. Suite receives local fixture tests only. The Finder team handles the Smoke release.

1. S0 preserves service authentication and returns an empty legacy-compatible memory response by default, before resolving subjects or reading storage. Only an explicit `NIC_NAC_REP_MEMORY_ENABLED=true` permits the old lookup.
2. S2s keeps the current live-shows route response for limit-only callers. The opt-in v2 reader filters public rows before the display limit, returns coverage metadata and accepts a scoped rep, time window or live-only query.
3. Verify default/opt-in routes, memory denial, producer ordering, visibility and coverage, and compatibility using recorded fixtures and the contract checker's injected fetcher. Run TypeScript once.

At R1 an authorized Suite release with the bridge switch unset denies private reads. Keep the deny path when rolling back. R2 activates the shows consumer only after the compatible producer is available.
