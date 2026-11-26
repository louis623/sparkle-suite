# Rocky review, round 2 (final): My Website plan

**Verdict: NO BLOCK.** R1–R8 are all fixed. The plan can go to the builder as the five paste-ready chunk blocks, with the fix-it-yourself notes below pasted into the named blocks. Per the 2-round cap, there are no more plan reviews; next is one build review per chunk.

**Scope and counts**
- Re-checked R1–R8 only.
- Inputs: plan.md (round 2), rocky-fixes-1.md, and a diff against ref/plan-round1.md.
- Code: clone /workspace/ss-website-audit at b8fd4646d338, read only.
- 0 builds, 0 tests, 0 page loads, 0 DB queries, 0 model calls, 0 env reads. Only this file was written.

## The claim that all real Live reps are on the new renderer
**Can't verify statically. It's consistent with the repo, and the plan doesn't depend on it.**
- **What the code shows:**
  - The renderer choice comes only from the runtime `REP_RENDER_V2_SLUGS` env value (rep-render-version.ts:11–13, 17–24).
  - Nothing in the repo lists Live's current value. The vault says it's stored as a secret (vault/2026-11-04-live-browser-alerts-activation-blocked.md:6).
  - The last recorded Production setting was `dudesfizzfest` only ("all seven real reps remain legacy": vault/2026-10-30-ssr-per-rep/report.md:7). Suite reports the variable was edited Nov 3, after that report, so a later widening fits.
- **Suite's evidence is page loads I didn't repeat.** Treat "9 real slugs SSR, 3 demo/test on the old renderer" as Reported by Suite, not verified by me. A real rep slug that isn't in the repo can't be checked this way, as rocky-fixes-1.md:21 already says.
- **Smoke is verifiable** (Reported, vault/2026-11-02-lindsey-signup-discount-smoke.md:25): the list there is `dudesfizzfest,milehighfizz`. So any other Smoke rep slug serves the old renderer, as long as that env is unchanged. The plan's check for the off-list rep (`data-template-src` present, no `data-server-rendered`) is the right proof.
- **Why it doesn't matter for safety:**
  - The preview always renders SSR (Chunk 1 item 10).
  - It never falls back to the old renderer (item 9, versus public-asset-response.ts:756–758).
  - It sends `X-Preview-Live-Engine` (item 8).
  - It's tested on an off-list rep (checklist line 3).

  So the preview is correct whether the claim holds or not. New reps also start off-list (rep-render-version.ts:10), so that path stays live.

## R1–R8 status

| # | Status | Evidence in plan.md |
|---|---|---|
| R1 Preview on the old renderer | **Fixed** | Chunk 1 items 8–10 (SSR for every rep, own CSP + meta CSP, no fallback, engine header); checklist: off-list Smoke rep, 0 CSP violations, forced SSR error → 503; named test covers the legacy-slug rep. |
| R2 Sandbox and identity | **Fixed** | Item 3 (typed server-only no-beacon/GA4 option); item 11 (identity only from `getPaidNicNacContext`, Join/Dance Floor off); item 12 (`sandbox="allow-scripts"` only, title, no-referrer); checklist `?rep=/?c=/?slug=`, exact sandbox, public beacon still present. |
| R3 Hero motion | **Fixed** | Chunk 4 items 1–2: formula = custom layout OR not v2-rendered; On restores the previous value; untouched sends nothing; unit and Smoke lines per rep type. **Re-judged:** if Suite's claim holds, the 3-choice control on Live today matters only for demo/test and future unlisted reps, and the switch only for the 3 custom-layout reps. It's now low-risk and still correct either way, because it's computed from the same `repRenderV2Enabled` the renderer uses. No longer user-facing for current reps. |
| R4 Unplaced controls | **Fixed** | Chunk 3b item 1 places each one by name (Email in section 7, the Britt-only switch in section 5 at :10186, and so on); Chunk 3a item 2 keeps the button as "Preview saved site" with the same handler; the layout-map test checks each id once. |
| R5 Prompt rules | **Fixed** | 5 fenced blocks, one per chunk. The exact MWG sentence plus fallback URL appears 6× (5 blocks + §4). Build rule = fix-it-yourself plus "Spec corrections I made". Stop-and-report is only in the deploy rule (§4:308). Named tests per chunk. Load budgets stated. "One self-review pass, then stop" in every block. No show-timing gates. |
| R6 Fold 6 | **Fixed** | §3 Screens (cover width recorded, ~360–375, swapped for the 390 loads, no extra loads); Chunk 2 checklist unfold-with-pop-up-open; Chunk 3a item 1 `scroll-padding-bottom` and checklist "doesn't cover tab bar or focused field". |
| R7 Spec gaps | **Fixed** | §0 differences (no chips, no hold-to-compare); Chunk 2 items 5, 7, 8, 9, 10 (grouping, saved theme not on offer, idle-loaded panel, pop-up contents, 0.2s selection + abort + session cache + <2.5s); Chunk 1 item 5 (poster only, `preload="none"`). |
| R8 Discard scope | **Fixed** | Chunk 3a item 3 + checklist 2. The confirm copy needs one wording fix (note 3 below); it isn't a block. |

## Fix-it-yourself notes (paste into the named block; no re-review)

1. **Chunk 1, item 10. Append:** "Add `<base href="${origin}/">` (or rewrite asset URLs to absolute) in the returned document; a `srcdoc` document resolves relative URLs against `about:srcdoc` (skin-preview.ts:541 adds a base for the same reason). A `srcdoc` frame also inherits the Workspace page's own CSP; if that blocks the preview, fix it in the preview document, never by loosening the Workspace CSP."
   - Why: without the base tag, styles, images and scripts break inside the frame.
2. **Chunk 1, item 11. Append:** "Pass the renderer a clean URL built from the origin and the page path only (no query string), so Smoke's `ssrReviewTheme`/`ssrReviewLayout` (homepage-smoke-review.ts:18–31) and any other query value can't change the theme or layout past the item-2 check."
   - Why: on Smoke today, `?ssrReviewTheme=` on the request could swap in a theme the rep doesn't have. It's Smoke-only, but the identity rule should be airtight.
3. **Chunk 3a, item 3 and checklist line 2. Replace the confirm copy with:** "Discard N unsaved changes? Photos you uploaded stay uploaded but won't show on your site; removed videos stay removed."
   - Why: "library" was my round-1 wording, and reps have no photo library to look in. The upload only stores the file and sets the draft URL (DashboardPlaceholder.tsx:4545–4565).
   - Change the checklist to: "an uploaded-but-unsaved photo is not on the live site."
4. **Chunk 1, report line. Append:** "If no off-list Smoke rep can sign in, or the Smoke `REP_RENDER_V2_SLUGS` has changed so none serves the older renderer, say so and cover the old-renderer case with the named unit test only. Don't edit Smoke env to create one."
   - Why: it stops an env change or an unbudgeted search loop.
5. **§6 risk 9 (for Louis, not a build item).** New reps are off-list until someone adds their slug. Their live site uses the older page while the preview shows the new one, with the notice. That's acceptable as planned; adding slugs at signup stays out of scope.

## Stopping point
This was the final plan round. Next step: build Chunk 1 from its block, with notes 1, 2 and 4 pasted in. Then one Rocky build review per chunk, covering only the report and the diff.
