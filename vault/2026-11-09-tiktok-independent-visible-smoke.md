# November 9 — Independent visible TikTok initialization (Smoke only)

- Continued draft PR187 from e3615836 in disposable clone /workspace/suite-tiktok-visible-gMfK9G. Verified production 210d5162 is already an ancestor; no merge needed.
- Removed the shared serial init queue from authoring/v2/legacy controllers. Each visible card creates its official iframe after its own 120ms size settling, without waiting for another player. Own ready/source/origin checks, pause offscreen, sound and cleanup stay. Fifth Brittany reveal 7609434971228425486 stays; no fallback, poster or retry.
- Updated the existing cases to assert independent init and per-card cancellation; regenerated only homepage runtime and matching legacy manifest entry.
- Named TikTok test command ran ONCE: 17 pass, 3 fail, 55 skipped. The new wrong-source test used the first real frame window, which correctly activated that frame and broke its later silence assertion. Corrected that test input to an unrelated object; NOT rerun per limit. No app change after the run.
- One Smoke preview deploy and at most four Fold-6-emulated loads remain authorized; no Live/DB/env writes, PR185 or shared alias promotion.
- Final results: /workspace/codex-runs/suite-tiktok-independent-visible.report.md. Open Brain capture unavailable: no capture_thought tool is exposed. Next action: finish bounded Smoke observation, append result, then stop.
