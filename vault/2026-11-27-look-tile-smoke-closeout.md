# Look tile Smoke closeout — November 27, 2026

- [Draft PR #241](https://github.com/louis623/sparkle-suite/pull/241) targets `codex/nic-nac-trade-hardening`. The existing allowlist commit is `e03b1eba`. The fix is `dc3726b981f0bd39a6f6acea307653dead369d20`.
- Vercel confirmed `dpl_CsgLMT95fwJgTpPptvbnEKpygLpg` Ready for that SHA on Sparkle Suite Smoke Preview. [My Website on Smoke](https://sparkle-suite-smoke-jgz4ra3ec-louis-2849s-projects.vercel.app/nic-nac?section=site-settings).
- The four focused Look tile component tests, local optimized build, and TypeScript check passed. Signed-in desktop verification remains open. The browser host was unavailable, and Vercel withheld the reviewer token. Zero browser page loads. Open Brain capture was unavailable in this session.
- Deployment scope was Smoke Preview only. The previous shared Smoke deployment is `dpl_G6TqocyQMPEC33DSTfA9wmkibAqs`.

## Spec corrections I made

- A poll can finish after a newer settings save. The client discards that response to prevent an old ready screenshot from resurfacing.
- The old preload tried the desktop URL first. The tile now waits for the browser-selected responsive image and reports the visible source after decode.

## Next session

With a signed-in synthetic browser on the linked Smoke My Website route, open Look, apply another theme, and close both dialogs. Verify the current poster, then wait for the captured screenshot to replace it on the same desktop page. The existing Look close action flushes the recapture.
