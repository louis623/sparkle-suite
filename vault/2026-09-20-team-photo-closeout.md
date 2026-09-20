# Team portraits and photo polish — final closeout

## Release and scope

- Repository: `louis623/sparkle-suite` on GitHub, branch
  `codex/nic-nac-trade-hardening`. Louis called it GitLab in the closeout request;
  the configured Git remote remains GitHub. No separate GitLab repo was used.
- Main feature: `f4fc50e5`; latest live application and wording:
  `19eb1004a14d4cb5a7e76b6ac1c800d81a31a21a`.
- Manual Vercel: `dpl_CJBCXXiRjsRx2A5KMacUQccm61XR`, READY, both
  `www.yoursparklesuite.com` and `yoursparklesuite.com` verified on that release.
- Shared large 8:7 portrait cards inherit current/future template skins. Workspace
  supports upload/replace/remove, framing, optional polish, approval and restore.
- Additive migrations `20260920000100` and `20260920000200` applied. Before/after
  original rollout: all 33 member-photo associations unchanged. No swaps by name
  or list position; especially preserve Brittany's identities and originals.

## User decisions

- Discussion is not permission to build. Wait for explicit build approval and
  communicate bottom line first, with short plain-English updates.
- Use finite coding usage economically: bounded tests and focused fixes, not
  exhaustive hardening or repeated paid image generations.
- Background must use the rep's selected skin at generation time. Purple in the
  demo came from Amethyst, not a universal background. Skin changes never trigger
  automatic image edits; reps choose **Refresh photo for my current skin**.
- Refresh edits the original, not a chain of AI outputs, and consumes an existing
  attempt. One initial result plus three retries per saved card; replacement or
  skin changes do not reset the allowance. Shared limits: 25/day, 100/month.
- Quality guidance/checks precede polish; originals remain usable when assessment
  declines or cannot run. No promise that AI can repair junk input or preserve
  likeness perfectly. Permission and rep approval are required before use.
- At the last retry flag Guardian internally. **Need Help** opens the Workspace
  Support composer; the rep sends the message. No automatic ticket or separate
  feature-generated Google Chat/email alert.
- Remove photo removes that card's image reference, not the person or retained
  source. Louis explicitly requested keeping the visible demo test card/result.

## Verification and lessons

- Main feature: production build and 226 focused tests passed. Wording follow-up:
  142 focused tests and production build passed. SQL limits tested with PGlite;
  service tests cover ownership, exact sources and ambiguous-provider outcomes.
- Safe sample UI covered retry stop and support navigation without paid calls.
  Protected reviewer entry lacked its token, so do not confuse its signup redirect
  with a broken photo feature. Louis then explicitly signed into and authorized
  his own demo account; never infer that authorization in future sessions.
- Real upload/quality check, one image generation, approve, exact-original restore,
  reapprove and live public rendering passed. Existing lead/Steve/Gracie Bot/Jane
  images unchanged. See `2026-09-20-team-photo-live-smoke.md` for exact evidence.
- Test portrait needed a small manual headroom adjustment (focusY 38 to 20).
  One successful portrait is not proof every crop/likeness/skin will be perfect.
- Current-skin explanation and button verified on live signed-in Team Management,
  clean browser console; enabling/disabling consent does not generate images.
- Keep layout mockups separate from real photo-edit results. Old tight crops or
  baked-in borders remain until replaced; larger cards cannot invent missing data.
- Preserve dirty local work. GitHub tip is source of truth; isolated Codespace was
  used for tests, stopped afterward to avoid idle costs. Push is provenance only;
  exact-SHA manual Vercel plus domain checks establish a live application release.

## Handoff

Louis plans to smoke test later. Keep **Photo Test / Photo Polish Preview** visible
and its approved result available; no cleanup, additional generation or background
monitor requested. Await his findings. Retry-reset tooling, preview storage cleanup
and exhaustive edge-case/likeness testing remain later hardening, not completed work.
This final closeout changes notes only; live application remains `19eb1004`.
