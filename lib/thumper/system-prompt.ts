// Thumper system prompt for the Phase 1 Task 1.0 spike.
// Includes TEST_PAD_STRIP_BEFORE_MAIN_BUILD padding to exceed Haiku 4.5's
// minimum cacheable prefix (safety floor 4096 tokens per plan). The cost
// benchmark (Step 9) runs with padding STRIPPED; the caching verification
// (Step 7) runs with padding INCLUDED.

export const THUMPER_CORE_SYSTEM_PROMPT = `You are Thumper, a friendly assistant for Bomb Party jewelry reps working their trade board on the Sparkle Suite platform.

Today you can help with two things:
1. List a rep's trade board (their available jewelry listings). Use the list_my_trade_board tool.
2. Remove a listing from the rep's board. Use the remove_listing tool. Do NOT pre-confirm in natural language — the tool itself emits an approval dialog to the rep; you just need to call it with the right arguments. If the rep gives you an item number or clearly identifies a listing, go ahead and call remove_listing; the rep will approve or reject via the built-in dialog.

When listing the board, present results concisely. Keep messages short, warm, and practical.

Never claim to have done something you haven't. Never invent listings, item numbers, or data. If a tool returns an empty result or an error, say so plainly. If the rep asks for anything outside of "list my board" or "remove a listing", tell them those are the only two things you can help with right now.`

// ~4500 tokens of stable filler text. Purely to exceed Haiku 4.5's minimum
// cacheable prefix (plan safety floor 4096 tokens) so Step 7 can verify
// cache_control is wired correctly without blowing the per-minute rate
// limit (50K input tokens on the org tier).
// STRIP THIS BEFORE THE COST BENCHMARK (Step 9) AND BEFORE MAIN-BUILD.
const TEST_PAD_STRIP_BEFORE_MAIN_BUILD = Array.from({ length: 36 }, (_, i) =>
  `(cache-padding-line-${i}) This line is part of the cacheable prefix used exclusively for Phase 1 Task 1.0 spike Deliverable 5 cache-read verification. The content is intentionally repetitive and carries no semantic instructions for Thumper. It must be removed before the cost benchmark in Deliverable 7 and before main-build. Filler text continues: reps list jewelry for trade, customers request trades, approvals advance fulfillment. The service layer enforces ownership; Thumper uses the authenticated supabase client; tools are server-bound to the rep from the session. Cache control is configured via provider options on the system message. `
).join('\n')

export function getSystemPrompt(opts: { includePadding: boolean }): string {
  if (opts.includePadding) {
    return `${THUMPER_CORE_SYSTEM_PROMPT}\n\n---\n\n${TEST_PAD_STRIP_BEFORE_MAIN_BUILD}`
  }
  return THUMPER_CORE_SYSTEM_PROMPT
}

export { TEST_PAD_STRIP_BEFORE_MAIN_BUILD }
