# 2026-11-24 My Website chunk 4 closeout

- Branch `cursor/my-website-hero-motion-583b`, stacked on `cursor/my-website-customer-scroll-cd8d` at `ae74b1ecab317d2eded6920eb9b4d059f676e6b1`.
- Hero motion follows the renderer. Team I manage is read-only on My Website. Labels renamed. Settings load error has Retry.
- No Live deploy and no Live database write. Smoke allowlist is preview-only on `sparkle-suite-smoke`.
- Follow-up: restored the locked `preview-template-data.ts`, made the hero flags null-safe, and kept the theme preview column in the first paint so desktop CLS stays under 0.1.
- Privacy follow-up: harness data is fictional (Sasha Sample). Hero motion mode is computed on the server. Profile modules stay server-only. The theme preview frame mounts only when the column is wide.
- Signed-in review follow-up: save bar clears the focused field and pads the scroller; Try it on is centered with a phone-width frame; private themes are offered only to their owner; reviewer slugs are hyphen-free.
