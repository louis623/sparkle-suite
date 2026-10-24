# Sunset Beach Smoke review

Approved package: SB-01 / `sunset_beach`, Community. Dark rose navigation, pink/coral/gold accents, blush surfaces, nine-second beach motion and optional waves. Matching QR, dedicated portrait flyer, centered business-card front, gradient back and real CMYK PDF are registered together. Existing theme IDs and saved customer selections remain compatible.

Source baseline: GitHub `louis623/sparkle-suite`, `codex/nic-nac-trade-hardening`, `b26a663bfe3b45a0a125308e9992bde7003ae53e`, in a disposable clone. This includes the currently served Smoke fixes from `f201ea70d13a84cf60465b0a0e66e6c191adad21`.

Target: only `https://sparkle-suite-smoke.vercel.app`, project `prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ`, preview environment, database `pukemqiwlyqmyytxkdmo`. Previous alias: `dpl_14JwP3joDHys7wvByxPj1XaQqL8R` / `sparkle-suite-smoke-nwmpn65tf-louis-2849s-projects.vercel.app`. Project cron remains disabled. No Live, provider, extension or Finder changes.

Local verification: 331 focused tests; TypeScript; all eleven layout locks; deterministic flyer/card rebuild; actual flyer PNG/JPG and card-back PNG/JPG QR decoding; 256px standalone QR; safe text boxes and two-page CMYK PDF. Four actual customer pages at 1440/768/390/320px have no overflow or runtime errors. Pause/resume, optional sound/mute, Still, reduced motion, offscreen pause, poster fallback and page navigation pass in isolated Edge. Browser plugin was unavailable; Playwright used synthetic fixtures. Existing defaults and other themes remain unchanged.

Repeatable review:
1. Open `/skin-preview/sunset_beach/homepage` for labeled sample content. Use Home, Dance Floor, Join and Preferences. Forms/provider actions remain disabled in this sandbox.
2. In the designated synthetic Codex Smoke workspace, use Site Settings → Sunset Beach (SB-01) → Save, reload, and review `/smokecodex`. Restore its prior theme/motion after testing.
3. Open Workspace → Tools → QR codes, QR flyers, business cards. Change theme → Sunset Beach. Inspect QR, flyer and both card sides; download free images/PDF only. This per-visit theme choice does not change the site. Never proceed to an order or checkout for theme QA.

The sample preview can be repeated without reseeding. Live release requires Louis's separate approval, Suite/Grokbot coordination, and a fresh Live-configured build. Deployed results and exact release SHA belong in the final session receipt.

Completed: application SHA `4a13e8c0286c6fe2dc9fcf77e030924236c94101`, READY deployment `dpl_9kmohPnyYSBVJaaFHM4jCvKiyXcZ`, exact Smoke alias verified. The synthetic signed-in picker/save/reload/Still and all six print downloads passed; downloaded gradient QR images decode correctly. Reviewer settings were restored. See `vault/2026-10-24-sunset-beach-smoke-closeout.md` for the release receipt and verification limits.
