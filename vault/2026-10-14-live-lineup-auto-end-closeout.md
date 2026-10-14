# Live Lineup automatic show ending — 2026-10-14

- Draft PR: https://github.com/louis623/sparkle-suite/pull/95 on `cursor/live-lineup-auto-end-show-b22f`, tip `45bf603e869dd44713fd4fa505d69af74de6a5ec`.
- A packet ends a show the same way a manual Start show does when the show is older than 18 hours, or when a ready snapshot contains none of that show's parties. The archive keeps the old entries, including an order such as Brooke, and the new show starts empty on the parties in that packet.
- A ready snapshot that still shows one displayed party drops entries from parties that left the page. Hidden parties stay. A snapshot that only names a hidden party does not clear the visible lineup. A blank snapshot does not end the show.
- When setup sees a new party and none of the current parties are present, the scope is replaced in place. The show generation does not change.
- Suite Smoke preview: https://sparkle-suite-smoke-39tn2iucn-louis-2849s-projects.vercel.app (`dpl_6hosh9dLEPzFvUruxK2bSV22VGLJ`, project `sparkle-suite-smoke`). Homepage returned 200 for that deployment id. The shared Smoke alias and `www.yoursparklesuite.com` were not moved.
- Tests: live-lineup suite 371 passed, `npm test` 288 passed, `tsc --noEmit` passed. The first Smoke build failed the type check; the follow-up commit fixed it.
- Next: review the draft, then decide whether this preview should replace the shared Smoke alias. Live stays untouched until that is a separate approval.
