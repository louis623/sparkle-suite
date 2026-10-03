# 2026-10-02 — Demo page featured YouTube

- Featured reel on `/demo` is public YouTube `62gaZBz8zF4`, title “New Sparkle Suite looks: Witch, Black Cat, Golden Leaves, Unicorns”.
- Previous featured TikTok `7684058046800071966` is no longer the hero embed. YouTube and TikTok channel links, waitlist, and the rest of the page stay.
- Files: `lib/sparkle-suite/demo-page-content.ts`, `tests/sparkle-suite-demo.test.ts`. Focused demo test passed (4/4).
- Not merged and not promoted to `yoursparklesuite.com`. Suite Smoke was not deployed from this environment: no Vercel token, and the smoke deploy guard only accepts allowlisted `codex/nic-nac-trade-hardening`.
- Draft PR: https://github.com/louis623/sparkle-suite/pull/61 (`cursor/demo-featured-youtube-19f9`). Smoke `/demo` is still the previous TikTok until a smoke deploy of this change is allowed.
