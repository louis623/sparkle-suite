# Tools overview and detail page design QA

Result: passed (local visual and interaction review, 2026-10-06).

## Approved sources and owner refinements

- Home concept: `C:/Users/louis/.codex/generated_images/01a10df3-2121-7673-8f71-c58c6d0e5ab4/exec-a3c5e766-eff0-43c0-9efa-c94613abb635.png`
- Tools concept: `C:/Users/louis/.codex/generated_images/01a10df3-2121-7673-8f71-c58c6d0e5ab4/exec-ae400ff2-267f-4529-bf7e-19961f09d791.png`
- Owner refinement supersedes example cards: Dance Floor, Live Lineup, Live Show Calendar, Team Management, in that order. Nic-Nac belongs on the tools page. New Rep Onboarding remains within Team Management.

## Captures and comparison

Artifacts directory: `C:/Users/louis/.codex/visualizations/2026/10/05/01a10df3-2121-7673-8f71-c58c6d0e5ab4/`

- `tools-home-local-desktop.jpg` (1440px desktop, four-card region)
- `tools-home-local-mobile.jpg` (390px mobile)
- `tools-page-local-desktop.jpg` (1440px desktop, Team Management)
- `tools-page-local-mobile.jpg` (390px mobile, Nic-Nac and sticky jump menu)

Sources and implementation captures were inspected together, comparing the corresponding card and detail regions rather than mismatched full-page heights. This is fidelity to the approved direction and owner refinements, not a pixel-identical reproduction of generated text or mock UI.

## Five fidelity surfaces

1. Layout: two-column Home cards become one column on phones; desktop detail sidebar becomes a compact mobile jump menu. Longer proof lives on `/tools`.
2. Typography: existing Playfair Display and DM Sans; italic pink headline emphasis and clear description/benefit hierarchy.
3. Palette: existing Suite paper, blush, pink, warm plum, and espresso tokens; ink text on outlined card links improves legibility.
4. Assets: approved logo and real existing Dance Floor, calendar, team lead, onboarding, and Nic-Nac captures; original interactive sample Lineup retained. No invented product screenshots.
5. Detail: soft-pink icon badges and benefit checks, consistent card radius/padding, descriptive Explore links, generous proof spacing, shared header/footer and queue promise.

## Interaction review

- Home Team Management card opens `/tools?src=tiktok#team-management`; outreach source reaches queue CTA.
- Mobile menu opens, navigates to Nic-Nac, and closes. Fixed inherited anchor offset so section labels clear the sticky menu (88px).
- Header fits at 390px; no horizontal overflow on Home or tools page.
- No public assistant input or launcher. Nic-Nac proof is an image.

## Deliberate deviations

- Retained both team-lead and onboarding captures and full supported details, honoring the request not to skimp on onboarding.
- Supporting capabilities are grouped under Workspace essentials instead of promoted into the four main cards.
- Nic-Nac's former dark Home card is replaced by the owner's chosen calendar card; the dark treatment moves to his tools section.
- Local hero uses its existing unavailable-data fallback; live demo integration is verified on Smoke where its environment exists.

No unresolved visual blockers in the changed sections. Release verification is recorded separately in the PR and Core Memory.
