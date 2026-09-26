---
name: sparkle-suite-skin-builder
description: Use when creating, reviewing, or modifying Sparkle Suite customer-site skins/appearance presets for Amethyst-based sites. Trigger for requests to add new site styles, color/font/card variants, gemstone-themed looks, or Nic-Nac-controlled visual customization while keeping Amethyst as the only customer-site template.
---

# Sparkle Suite Skin Builder

## Purpose

Create visual-only skins for Sparkle Suite customer sites while preserving the Amethyst template, behavior, data mapping, SEO, and Nic-Nac surfaces. Every skin also needs a lightweight branding card so reps can browse available looks before asking Nic-Nac to apply one.

## Required References

Before designing or implementing a skin, read:

- `references/skin-contract.md`
- `references/cinematic-hero-contract.md` when the skin uses custom hero art,
  supplied visual references, source-specific motifs, or ambient animation
- `docs/sparkle-suite/brand/00-master-index.md`
- `docs/sparkle-suite/brand/05-public-site-version-lock.md`
- `docs/sparkle-suite/brand/06-public-site-incident-lesson.md`
- `docs/sparkle-suite/brand/07-design-kit-audit-brief.md`
- `docs/sparkle-suite/brand/08-production-site-design-kit.md` when the skin uses Sparkle Suite brand styling
- `lib/amethyst/appearance-presets.ts`
- the affected Amethyst template data files under `lib/amethyst/`

For rep-facing copy or Sparkle Suite brand language, also use `sparkle-suite-master-brand`.

## Workflow

1. Confirm the skin is visual-only.
   - `customerSiteTemplate` stays `amethyst`.
   - The skin is represented by `appearancePreset`.
   - Do not move, remove, rename, or fork Homepage, Trade Board, Join, signup, Nic-Nac panel, SEO metadata, or data slots.

2. Name the skin.
   - Use a stable database/code ID with lowercase snake_case.
   - Use a human label that can appear in Site Settings and Nic-Nac replies.
   - Prefer gemstone-related labels when the user wants a themed family.

3. Mock the skin before implementation when visual direction is not already locked.
   - Use the browser visual companion or a lightweight local mockup.
   - When Louis asks to see a skin, preview, branding card, card, or direction before approval, show the reference artifact from `.superpowers/brainstorm/.../content` in the same workflow used for Morganite and Black Diamond, not a registry card or one-off image.
   - Show the same Amethyst page structure in different clothes.
   - Show the hero and enough of the next section to prove how real cards,
     typography, and section transitions inherit the skin.
   - Ask for approval before production edits.

4. Lock the reference contract before building a source-led hero.
   - List exact motifs, object counts, colors, placement relationships,
     negative space, physical structures, crop, and explicit exclusions.
   - Mark which details are reference-faithful and which are interpretive.
   - Plan independent environment, motif, light/effect, content, and motion
     planes using `references/cinematic-hero-contract.md`.
   - If an exact supplied shape is required, do not substitute a generic icon
     or approximate AI/SVG interpretation.

5. Add red tests first.
   - Preset normalization recognizes the new ID.
   - Homepage, Trade, and Join receive the same visual tokens.
   - Site Settings and Nic-Nac can save the new preset.
   - The skin appears in the skin-card registry with a stable code and label.
   - Existing default remains `amethyst`.

6. Create the skin branding card.
   - Add a compact card artifact or registry entry for the Help/More Info surface.
   - Include the skin label, stable code, short feel description, palette swatches, type pairing, surface/shape notes, and a small visual sample.
   - Keep cards cheap to browse: no live skin switching, no provider calls, no generated media at runtime.
   - Nic-Nac may direct reps to browse cards and then provide the code/label to apply.

7. Implement the token set and render branches.
   - Add the preset to `lib/amethyst/appearance-presets.ts`.
   - Extend TypeScript unions, Zod schemas, dropdown options, and database constraints.
   - Add CSS/JS branches only for visual tokens and interaction polish.
   - Update public Amethyst page preset maps if the shipped runtime exposes local preset pickers.

### Skin visibility and ownership

Classify every skin in the maintained skin catalog before it can be released:

- **Community:** visible and selectable to every rep. Seasonal and holiday skins are Community by default unless Louis explicitly designates one as private.
- **Private/custom:** visible and selectable only to its explicitly assigned stable rep ID, Louis's established `louis@neonrabbit.net` demo workspace, and explicitly trusted Nic-Nac/AI demo or reviewer workspaces. Never grant demo access by guessing from an email address or name; use a durable internal demo/reviewer identity or allowlist.
- Record the classification, stable skin ID, and—for each private/custom skin—the owner and approved review identities in the catalog. Do not infer, expand, or reassign ownership without Louis's explicit authorization.

The same access decision must drive every selectable-skin surface: Site Settings, required setup, Nic-Nac, and future pickers. For an unauthorized rep, a private/custom skin must be absent entirely: no disabled option, locked teaser, preview link, or selectable control. Community skins remain visible normally.

Enforce the same policy in direct Site Settings writes, Nic-Nac writes, required-setup publication, and a database-backed rule. UI filtering alone is not exclusivity. A private skin may keep a noindex sample-content preview route for design QA, but that route is never a selectable customer option.

Before changing this policy or adding a private/custom skin, read current assignments first. Do not automatically change an existing rep's saved skin, public site, show, Live Queue, or other current workflow. If an assignment conflicts with the approved catalog, stop and report it for Louis's decision.

Add focused tests for each private/custom skin: its owner, Louis's demo workspace, and each explicitly trusted reviewer can see and select it; every other rep cannot see or save it; Community skins remain available to all reps.

8. Verify.
   - Run the focused Vitest suite for Amethyst appearance, Site Settings, Nic-Nac customization, and affected templates.
   - Run `npx tsc --noEmit --pretty false`.
   - Browser-smoke Homepage, Trade, and Join if rendering logic changed.
   - For a cinematic hero, complete the asset, responsive, motion,
     accessibility, and visual-comparison gates in
     `references/cinematic-hero-contract.md`.
   - Run `npm run qa:amethyst` when available and practical.
   - Verify the skin on Smoke before any live promote. Canonical playbook: Core Memory `skills/sparkle-smoke-ship.md`.

## Output Rules

- Keep rep branding dominant; a skin must not turn the rep site into Sparkle Suite marketing.
- Do not introduce a second customer-site template.
- Do not let Nic-Nac repeatedly switch skins just to preview them; use the skin-card browsing surface for low-cost selection.
- Do not treat old imported design kits as current authority; use them only as historical context when explicitly needed.
- Do not touch `chrome-extension/content.js`, `supabase/functions/live-queue-sync`, or marketing docs unless the user explicitly asks.
- Do not include throwaway mockups in commits unless the user asks to preserve them.
