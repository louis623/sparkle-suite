# Thumper Spike Cost Benchmark

Built for Phase 1 Task 1.0 Deliverable 7. Replaces the Gemini-report estimate
of $0.0017/message for Phase 1 budget modelling.

> **Status:** the `/spike` route was promoted to `/thumper` in Task 1.1
> (commit `feat(thumper): Task 1.1 — promote spike to production route +
> Guardian/Enforcer hooks`). The benchmark driver below was originally
> wired to `/api/thumper/spike`; if you re-run it after Task 1.1, swap that
> path for `/api/thumper`. Production responses now also carry the
> `x-thumper-run-id` header for log correlation.

## Generation approach

`prompts.json` was authored by hand to approximate a realistic Thumper
conversation mix. The 60/30/10 split (conversational / read-tool / HITL) is a
**planning baseline**, not an empirical observation — real rep conversation
distributions will need to be sampled from production logs once Phase 1 ships.

## Files

- `prompts.json` — 40 hand-authored prompts. Each has `{ kind, text }` where
  `kind ∈ { 'conversational', 'read', 'hitl' }`.
- `run-benchmark.ts` — driver. Hits the spike route via authenticated HTTP
  (signInWithPassword against the test rep), signs in, sends prompts, records
  per-prompt tokens + USD. Retries on 429 with exponential backoff. After
  Task 1.1, point this at `/api/thumper` (the production route).

## Running

```bash
# Strip cache-test padding FIRST — set in .env.local or inline
SPIKE_BENCHMARK_CACHE_MODE=stripped npx tsx spike/run-benchmark.ts

# Output: spike/benchmark-results-<timestamp>.json
```

## Notes on sample size

The spike ran a **lean 20-prompt sample** (10 cold + 10 warm) rather than the
plan's 200 because:

1. The org rate limit is 50,000 input tokens per minute. With a 4.5K-token
   system prompt, each request consumes ~5K input tokens; the theoretical
   max throughput is ~10 requests/min. A 200-prompt run would take 20+ real
   minutes plus retry backoff, and in practice we observed rate-limit
   triggers during dev testing that cooled the run further.
2. The 20-prompt numbers are sufficient to prove the per-message cost order
   of magnitude; the full 200-prompt baseline should be re-run when the
   org's rate limit is bumped or from a separate benchmark box.

The findings doc records the 20-prompt numbers AND documents the
extrapolation methodology so the number can be refined without re-running
the whole harness.
