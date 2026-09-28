# Pumpkin and Cat mobile motion correction

Louis explicitly approved correcting the live Black Cat mobile experience after learning it used a separate still image and disabled video below 1101px. The approved desktop artwork and existing video are unchanged. Phones now reframe that same video and poster around the cat and pumpkin, with the headline/actions below and a visible Pause/Play control. Tablets also animate. No new generation, provider credits, account migration, or skin identity change.

Reduced motion and the rep's motion-off setting still avoid automatic video loading. Hidden/offscreen playback pauses; autoplay rejection leaves manual Play available; media errors reveal the matching poster. HPC-01 remains a Community skin. Desktop composition and Pumpkin and Witch are preserved.

Local verification: 131 focused tests, guarded Next production build and TypeScript passed. Real component previews visually checked at 390px, 820px and 1440px; 320px geometry confirms no horizontal overflow and all hero controls at least 44px high. Mobile clip cycles and Pause/Play were exercised. Lifecycle tests cover reduced motion, still preference, offscreen/hidden pausing, autoplay rejection and skin disposal.

Release starts from verified GitHub/live SHA c14199b208233061b2e20b0f10c0804b4e28af3c in the existing clean disposable clone. Smoke candidate precedes a fresh production build of the same source. Final deployment and live-domain evidence will be recorded in Core Memory at ships/2026-09-28-pumpkin-cat-mobile-motion-live.md. No personal account or live customer write is used for QA.
