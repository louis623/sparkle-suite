# Compact public Live Lineup — approved option 1

## Customer result and authorization
Louis selected option 1 on October 2, 2026 and asked to implement it. An unavailable or empty public lineup becomes a slim calendar row. View lineup appears only when public queue entries exist. Queue visibility does not require a scheduled or active show. This is an explicitly approved shared product change, independent of skin work.

## Source and release scope
- Repository: louis623/sparkle-suite; branch: codex/nic-nac-trade-hardening.
- Base: 777a38bda5b2f9ec1f52894bfe34a69026ff6962; clean Codespace clone /tmp/sparkle-lineup-compact-20261002.
- Default release: Smoke project prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ; staging Supabase pukemqiwlyqmyytxkdmo; https://sparkle-suite-smoke.vercel.app.
- Pre-change Smoke: dpl_5daY1uUK1DC1DXWJDRhHfuRsWo8w / recorded source 58cada696853668cf7bff3ab8cd2054e74054a9c.
- Live promotion requires a separate Louis decision after Smoke review. Fresh rebuild of accepted source required.

## Behavior contract
| Public entries | Source state | Display |
| --- | --- | --- |
| None | Empty, offline, loading, or delayed | Compact calendar row, no lineup heading/status/time/button |
| One or more | Fresh | Existing customer pills and full-lineup drawer action |
| One or more retained | Delayed | Keep names and drawer action; discreet updating/last-update text |

Never infer zero orders from lack of connection. Never use calendar/showtime as a queue gate. Existing freshness/retention rules decide which entries are usable. Keep order grouping, public privacy projection, manual order, party selection, Hold/Return, reveal removal, and polling unchanged.

## Implementation sequence
1. Read current remote instructions and source; preserve unrelated marketing work and existing Codespace checkout.
2. Build one server calendar-link helper from the existing public Upcoming Shows loader and tenant-correct homepage link. Emit a link only when events are displayed and usable. Keep customer slug, custom-domain root, and c query targeting; reject external/protocol-relative links.
3. Expose optional calendar-link metadata in Home/Trade/Join bootstrap data. Load events alongside existing independent requests. Home uses its already-loaded events. No new database table or migration.
4. Add one shared empty-row renderer to the already-loaded public lineup runtime. Keep a harmless compact fallback if the optional runtime is unavailable.
5. Replace only the empty branches in the three public strip renderers. Retain populated markup, pills, drawer, and live behavior. Respect rep section visibility. Apply the same rendering through all skin presets and bespoke homepage variants.
6. Add skin-token-based row CSS: approximately 48px normal mobile height, 44px minimum touch target, natural text wrapping at enlarged text sizes, visible keyboard focus, decorative icon hidden from assistive tech, no pulsing disconnected indicator.
7. Update cache keys for changed assets and rebuild Join runtime. Update only the four authorized source locks (shared CSS and three strip functions); retain all unrelated locks and record this authorization.
8. Verify meaningful server and rendered regressions, type checking, layout guard, scoped lint, build, keyboard/touch/calendar/drawer interactions, and transitions from empty to populated to delayed to empty without page reload.
9. Commit and push to the active branch, re-query GitHub, deploy the exact verified SHA to Smoke only, then confirm deployment/alias and rendered behavior.

## Coverage and acceptance
- All 16 current appearance IDs and an unknown future preset using inherited tokens; every bespoke homepage variant; Home, Trade, Join.
- Phone widths 320/390/430, tablet 768, desktop 1440; enlarged text geometry, long customer names, light/dark surfaces, focus and reduced motion.
- Empty connected source; unavailable source; loading; delayed with/without retained names; a single pre-buy without any calendar; multiple grouped orders; queue exhaustion; reconnection.
- Calendar present, no published events, hidden events, malformed events, local template c target, slug target, custom-domain root. No dead anchors or external rep leakage.
- Synthetic/sample content only, labeled review mode, no live rep/provider writes, charges or sends. Repeated tests reset fixtures in memory.
- Smoke review steps: open the documented synthetic route or labeled preview; see compact row; follow calendar; seed/intercept safe queue entries; open/close drawer; delay source; clear queue; confirm compact row returns.

## Review and release gates
Read the final patch adversarially for accidental queue gating, privacy exposure, hidden-calendar anchors, stale-data loss, optional-runtime failure, skin-specific bypasses, and unrelated layout changes. Do not describe fixtures as a real-account test. Smoke deploy credentials/environment must be verified by guarded tooling. Record any blocker precisely; never substitute a Live release or claim an unperformed deployment.

## Completed pre-release evidence
- 276 affected tests passed; TypeScript and scoped ESLint passed; normal guarded optimized build passed.
- All 11 layout locks passed after updating only shared CSS and the three authorized LiveQueueStrip hashes. Header, navigation, announcements, Dance Floor and preview data locks remain byte-identical.
- Isolated Chromium rendered 727 assertions over all 16 skins plus an inherited future preset, Home/Trade/Join, 320/390/430/768/1440px widths, and the three custom homepage variants. Normal empty-row height is 48px; narrow wrapping remains within 76px. Calendar keyboard navigation, no-calendar fallback, populated unscheduled drawer/Escape, delayed names and empty/populated transitions passed. No page errors.
- These browser checks use actual customer components and synthetic bootstrap/accepted update callbacks. Independent transport/freshness tests passed. Native phones, browser zoom gestures and real extension sessions are not claimed.
- Repeatable Smoke review: /skin-preview/amethyst/homepage?lineupReview=empty. Header states: Empty, Names waiting, Delayed, No calendar. Home/Trade/Join links preserve selected state; calendar jumps to sample Upcoming Shows. Sample sandbox blocks requests/submissions; no customer queue is seeded or changed.
- Guarded read-only verifier confirmed Smoke project, staging refs/keys, preview/production environment scopes, safe disabled provider features, disabled scheduler, and preserved deployment dpl_5daY1uUK1DC1DXWJDRhHfuRsWo8w. Secrets never logged.
- Matching Live Lineup Watch was not found among accessible chats; no uncertain destination was notified.
