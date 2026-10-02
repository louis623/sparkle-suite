# Customer-Site Media Polish Implementation Plan

> **Superseded for shipping (2026-09-26):** Historical. Do not deploy from this note. Live promote follows Core Memory `skills/sparkle-smoke-ship.md` (Smoke verify, Louis says go, one live promote).

> **Status:** Design and implementation plan only. No application code or production UI is changed by this document.

**Goal:** Give every Sparkle Suite customer-facing homepage a more polished, energetic media presentation across its five rep-configurable media areas, then carry a restrained version of the improved icon and flare language into other suitable homepage elements.

**Primary outcome:** A rep who adds a showcase video, three About videos, and a portrait receives five finished, skin-aware cards rather than a mixture of raw embeds and lightly styled media.

**Architecture:** Keep `customerSiteTemplate = 'amethyst'`. Introduce one shared media-card presentation contract inside the existing Amethyst homepage renderer. Derive colors and effects from the active `appearancePreset`; do not create a second template or fork the page per rep. Preserve all current media URLs, data slots, provider behavior, public routes, SEO, customer forms, and Workspace editing flows.

---

## 1. Scope

### Five primary media areas

1. Homepage showcase video (`data-slot="showcase video"`).
2. About short video 1 (`data-slot="about short 1"`).
3. About short video 2 (`data-slot="about short 2"`).
4. About short video 3 (`data-slot="about short 3"`).
5. About portrait photo (`data-slot="about portrait"`).

### Secondary polish pass

After the five media cards are approved and stable, improve selected supporting elements that can benefit from the same visual language:

- “What is a Bomb Party?” step icons.
- Section eyebrow icons or medallions where they clarify the section.
- Platform badges and live-status badges.
- Primary media CTAs and selected directional arrows.
- Event and calendar action icons.
- Empty-state icon medallions for missing media.
- A small number of decorative divider or corner accents.

This is not a whole-page redesign. The page order, content hierarchy, rep data, Trade Board, Join page, signup form, Nic-Nac, and navigation remain unchanged.

---

## 2. Visual Direction

Use the approved screenshot as a hierarchy reference:

- A visually distinct top cap.
- A clear platform/media icon.
- A title plus optional handle or caption.
- A framed media viewport.
- A strong action area immediately beneath video.
- Soft rounding, refined borders, controlled shadow, and a little lift.

Do not copy the screenshot’s colors into every site. The card structure is shared; the appearance preset supplies the personality.

### Video-card anatomy

```text
┌──────────────────────────────────────┐
│ [platform icon]  Card title          │  ← accent header/cap
│                  handle or caption   │
├──────────────────────────────────────┤
│                                      │
│          provider video embed        │  ← existing playback behavior
│                                      │
├──────────────────────────────────────┤
│ [platform icon] Watch on TikTok  →   │  ← real outbound CTA
└──────────────────────────────────────┘
```

### Portrait-card anatomy

```text
┌──────────────────────────────────────┐
│ [portrait icon]  Meet the rep        │  ← skin-aware header/cap
├──────────────────────────────────────┤
│                                      │
│       existing smart-frame image     │  ← preserve crop controls
│                                      │
├──────────────────────────────────────┤
│ portrait caption / identity strip    │  ← no fake watch button
└──────────────────────────────────────┘
```

### Restraint rules

- One dominant accent treatment per card.
- No constant glitter animation.
- No heavy glow on light skins.
- No pure-black luxury treatment unless the active skin already calls for it.
- Decorative elements must never cover media, captions, controls, or focus rings.
- If everything becomes an accent, the pass has gone too far.

---

## 3. Shared Semantic Media Tokens

Add a shared semantic layer in `public/amethyst/homepage.css`. Prefer variables derived from the existing preset variables rather than expanding the persisted preset schema.

Proposed variables:

```css
--hp-media-card-bg
--hp-media-card-fg
--hp-media-card-muted
--hp-media-card-border
--hp-media-card-accent
--hp-media-card-accent-contrast
--hp-media-card-header-bg
--hp-media-card-footer-bg
--hp-media-card-shadow
--hp-media-card-radius
--hp-media-card-hover-shadow
--hp-media-icon-bg
--hp-media-icon-fg
--hp-media-cta-bg
--hp-media-cta-fg
--hp-media-placeholder-bg
--hp-media-placeholder-fg
```

Requirements:

- All text colors are semantic surface colors; do not inherit blindly from the section.
- Accent contrast meets WCAG AA for text and icons.
- Each appearance preset can override only the variables it needs.
- Morganite remains warm and refined.
- Alpine Opal can use a brighter iridescent accent and lift.
- Black Diamond can use a dark metallic card with gold/cyan detail.
- Other presets inherit a safe default derived from their current primary/accent colors.
- Bling Kitchen and migrated variants may add small overrides without replacing the shared structure.

Only add new fields to `lib/amethyst/appearance-presets.ts` if CSS-derived tokens cannot satisfy contrast or card behavior across all presets.

---

## 4. Renderer Design

### Existing code to preserve

- `TikTokEmbed` retains its intersection-based muted playback behavior and sound toggle.
- `CustomerVideoEmbed` retains TikTok, YouTube, Instagram, and Facebook routing.
- `AboutPortraitCard` retains `portraitFocusX`, `portraitFocusY`, and `portraitZoom` smart framing.
- Existing `data-slot` names remain unchanged.
- Existing media URLs and captions remain the source of truth.

### New shared helpers

Add small renderer helpers in `public/amethyst/homepage.jsx`:

1. `getCustomerVideoProvider(videoUrl)`
   - Returns `tiktok`, `youtube`, `instagram`, `facebook`, or `unknown`.
   - Reuses the existing provider parsers.

2. `getCustomerVideoPresentation(videoUrl)`
   - Returns the platform label, accessible icon label, CTA label, and outbound URL.
   - Example CTA labels: `Watch on TikTok`, `Watch on YouTube`, `Open on Instagram`, `Watch on Facebook`.

3. `CustomerMediaCard`
   - Shared outer card shell.
   - Accepts header metadata, media body, footer action, card size, and empty-state presentation.
   - Does not own provider playback logic.

4. `CustomerMediaIcon`
   - Uses a consistent inline SVG or CSS-mask icon system.
   - No emoji glyphs or font-dependent social marks.
   - Decorative icons use `aria-hidden="true"`; meaningful icon-only controls receive an accessible name.

### Integration

- Wrap the showcase `CustomerVideoEmbed` in the full-size media card.
- Wrap each `AboutShortCard` in the compact media card.
- Render `AboutPortraitCard` through the photo variant of the same shell.
- Keep `CustomerVideoEmbed` usable independently for existing specialty content.
- Audit Britt with Bling’s featured and explainer videos for token alignment, but do not force those bespoke editorial cards into the exact five-slot layout.

### CTA behavior

- The bottom action must link to the original configured public video URL.
- Use `target="_blank"` and `rel="noreferrer"` through the established link helper.
- Never synthesize a provider URL from an invalid embed.
- Do not render an actionable CTA when there is no valid public video.
- The embedded player remains the primary in-page experience; the CTA is a clear secondary route.

---

## 5. Five-Area Presentation Rules

### Showcase video

- Full visual treatment with header, provider badge, large video, and bottom CTA.
- Header title defaults to `Watch a Live Reveal` or the existing configured caption when appropriate.
- Preserve the current landscape/portrait responsiveness by provider.
- Keep the card visually balanced beside the “What is a Bomb Party?” explanation.

### About short videos 1–3

- Use the same family, but a more compact header and CTA.
- Titles may remain `Short video 1`, `Short video 2`, and `Short video 3` unless a future caption field supplies better copy.
- Cards in the same row must align at the top and bottom despite provider aspect differences.
- On narrow screens, cards stack with consistent spacing and no horizontal overflow.

### Portrait photo

- Use a photo/portrait icon instead of a platform icon.
- Preserve the current subject-focused 4:5 crop and Smart Frame values.
- Display the saved caption in a distinct footer strip.
- No outbound CTA unless a future product decision adds an explicit portrait link field.
- Empty state uses a tasteful portrait medallion and `Portrait photo coming soon`.

### Empty video states

- Keep the section structure stable when a slot is empty.
- Use a low-emphasis icon medallion, short label, and skin-aware dashed or soft border.
- Do not show a bright CTA or imply that a video exists.
- Empty cards must not visually overpower completed cards.

---

## 6. Site-Wide Icon and Flare Pass

Implement only after the five media surfaces are approved.

### Eligible areas

- Replace the plain numeric circles in the three-step reveal explanation with meaningful icons while retaining visible step order.
- Add polished platform glyphs to video headers and media CTAs.
- Add a small calendar icon to `Add to calendar` without changing the download behavior.
- Improve live/platform badges with consistent icon sizing and alignment.
- Add subtle divider accents to major media-oriented sections.
- Improve media empty states with quiet icon medallions.

### Areas to leave quiet

- Legal copy.
- Form field labels and consent text.
- Dense Trade Board cards.
- Footer navigation.
- Every paragraph and minor label.

### Motion

- Hover lift: approximately 2–4px with a short easing curve.
- Optional highlight sweep only on hover/focus, never a continuous loop.
- Respect `prefers-reduced-motion: reduce` by removing lift animation, shimmer, and decorative movement.
- Embedded-video playback rules are unchanged.

---

## 7. Implementation Tasks

### Task 1: Capture baselines and create the review mock

**Files:** no production source changes; use an approved temporary brainstorm artifact.

- [ ] Capture desktop and mobile baselines for Morganite, Alpine Opal, and Black Diamond.
- [ ] Produce one high-fidelity five-card mock showing the showcase, three short videos, and portrait together.
- [ ] Produce three skin variants using the same structure.
- [ ] Produce one full-section mock showing the proposed icon/flare pass in context.
- [ ] Get Louis’s approval before editing production renderer/CSS.

### Task 2: Add red structural tests

**Files:**

- Modify: `tests/amethyst-homepage-template.test.ts`
- Modify: `tests/amethyst-preview-template-data.test.ts` only if the data contract changes.
- Modify: migrated-site tests only where shared rendering guarantees need coverage.

- [ ] Assert a shared media-card component exists.
- [ ] Assert the showcase uses the full media-card variant.
- [ ] Assert all three short-video slots use the compact video variant.
- [ ] Assert the portrait uses the photo variant and retains Smart Frame values.
- [ ] Assert provider presentation covers TikTok, YouTube, Instagram, and Facebook.
- [ ] Assert invalid/empty URLs do not produce active CTAs.
- [ ] Assert all five original `data-slot` values remain present.
- [ ] Assert the existing TikTok muted-loop and sound-toggle contract remains present.

### Task 3: Build the shared media-card shell

**Files:**

- Modify: `public/amethyst/homepage.jsx`
- Modify: `public/amethyst/homepage.css`

- [ ] Add provider-presentation helpers.
- [ ] Add the shared icon renderer.
- [ ] Add `CustomerMediaCard` with video, portrait, and empty variants.
- [ ] Wrap the showcase, About shorts, and portrait.
- [ ] Preserve all existing provider iframe attributes and security policies.
- [ ] Preserve all current data slots for bootstrap and tests.

### Task 4: Add skin-aware semantic styling

**Files:**

- Modify: `public/amethyst/homepage.css`
- Inspect/modify only if necessary: `lib/amethyst/appearance-presets.ts`

- [ ] Add shared semantic media variables.
- [ ] Add the default card surface, header, footer, CTA, icon, focus, hover, and empty-state styles.
- [ ] Add responsive rules for the five-card layout.
- [ ] Add reduced-motion rules.
- [ ] Add targeted overrides for Morganite, Alpine Opal, and Black Diamond.
- [ ] Check all remaining presets for legible inherited behavior.

### Task 5: Apply the restrained icon/flare pass

**Files:**

- Modify: `public/amethyst/homepage.jsx`
- Modify: `public/amethyst/homepage.css`

- [ ] Upgrade the reveal-step icons while retaining step numbers in accessible text.
- [ ] Upgrade platform/live/calendar badges.
- [ ] Add restrained section accents around media-oriented sections.
- [ ] Confirm quiet content areas remain quiet.
- [ ] Confirm icons do not rely on external runtime assets.

### Task 6: Verify migrated variants and setting propagation

**Files:**

- Verify: `lib/mile-high-fizz/profile.ts`
- Verify: `lib/britt-with-bling/profile.ts`
- Verify: `lib/bling-kitchen/profile.ts`
- Modify migrated-site tests only if a shared contract assertion is needed.

- [ ] Confirm Lindsey’s configured showcase video remains the rendered source.
- [ ] Confirm Brittney’s future Workspace media values still propagate.
- [ ] Confirm Bling Kitchen’s customer-site treatment remains coherent.
- [ ] Confirm special editorial cards keep their intended content and actions.
- [ ] Confirm no current rep setting or media value is rewritten.

### Task 7: Automated verification

- [ ] Run focused Vitest coverage for homepage rendering and preview mapping.
- [ ] Run migrated-site focused tests for Mile High Fizz, Britt with Bling, and Bling Kitchen.
- [ ] Run `npx tsc --noEmit --pretty false`; document any verified pre-existing unrelated failures separately.
- [ ] Run `npm run qa:amethyst` when available and practical.
- [ ] Run `npm run build` or use the successful production build as the final compilation proof.

### Task 8: Browser verification

Test public/reviewer-safe routes only. Do not change real rep data merely to create fixtures.

Desktop target: 1440×900 or equivalent.

Mobile targets: approximately 390×844 and 430×932.

Matrix:

| Site/fixture | Skin | Required checks |
| --- | --- | --- |
| Synthetic reviewer homepage | Morganite | All five areas, empty/mixed states, all providers |
| `/milehighfizz` | Alpine Opal | Existing video, identity, mobile stacking, CTA |
| `/brittwithbling` | Black Diamond | Existing editorial sections plus shared five-card treatment |
| Bling Kitchen reviewer route | Current skin | Portrait/video compatibility and readable contrast |

For each target:

- [ ] Header, media, and footer remain inside the card at every width.
- [ ] CTA sits below the video and links to the original configured URL.
- [ ] Portrait crop and caption remain correct.
- [ ] No iframe is clipped unexpectedly.
- [ ] Sound toggle remains reachable and readable.
- [ ] Keyboard focus is visible.
- [ ] No horizontal overflow.
- [ ] Reduced-motion mode removes decorative animation.

### Task 9: Release

- [ ] Confirm the active branch guard passes.
- [ ] Confirm exact repo, remote, branch, and HEAD.
- [ ] Commit the verified implementation.
- [ ] Push the approved branch.
- [ ] Manually deploy the exact verified branch tip to Vercel production.
- [ ] Confirm both `https://www.yoursparklesuite.com` and `https://yoursparklesuite.com` resolve to the exact deployment.
- [ ] Smoke the affected live customer routes using reviewer-safe/public paths.
- [ ] Scan production error logs.
- [ ] Preserve the prior production deployment as the rollback reference.

---

## 8. Acceptance Criteria

The implementation is complete only when:

- All five configurable media areas use a coherent polished card family.
- Videos have a top presentation area and a real action button beneath the embed.
- The portrait has an equally finished photo-specific treatment.
- TikTok, YouTube, Instagram, and Facebook embeds retain their current behavior.
- Empty slots remain honest and visually quieter than populated slots.
- The active appearance preset controls colors and visual energy.
- Morganite, Alpine Opal, and Black Diamond look intentionally different but equally finished.
- Current rep media URLs, captions, portrait crops, identities, and settings are unchanged.
- Lindsey’s and Brittney’s migrated sites retain their special skins and setting propagation.
- The site-wide icon/flare pass improves hierarchy without decorating every element.
- Desktop, mobile, keyboard, contrast, and reduced-motion checks pass.
- The exact verified commit is deployed and both Suite domains resolve to it.

---

## 9. Explicit Non-Goals

- No new customer-site template.
- No new appearance preset solely for this feature.
- No automatic rewriting of captions or CTA copy through AI.
- No new media upload provider or storage workflow.
- No changes to rep account values.
- No changes to Trade Board mechanics, Join behavior, signup, email, SMS, Nic-Nac, billing, authentication, or Live Queue.
- No redesign of the locked Sparkle Suite `/prelaunch` marketing page.
- No Chrome extension work.

---

## 10. Main Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| A shared wrapper breaks TikTok autoplay/mute behavior | Keep iframe/player logic inside `TikTokEmbed`; add the card outside it and retain focused tests. |
| Provider iframes produce inconsistent heights | Define provider-aware viewport rules and verify every provider at desktop/mobile widths. |
| Dark/light skins lose contrast | Use semantic media-surface variables and test Morganite, Alpine Opal, and Black Diamond first. |
| Migrated sites drift from their current identity | Reuse the shared structure while retaining profile data and narrow skin overrides. |
| Too much decorative flare reduces clarity | Limit flair to the five media cards and a short approved list of supporting elements. |
| Empty slots look actionable | Never render the outbound CTA without a valid provider URL. |
| Production differs from the approved review | Review high-fidelity mocks before renderer edits, then deploy only the exact verified branch tip. |

