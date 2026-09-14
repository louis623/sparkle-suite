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

### Private custom skins

When Louis requests a skin for one named rep, treat it as private by default:

- Store an explicit stable rep-ID allowlist on the skin card. Include the named rep and Louis's established `louis@neonrabbit.net` admin/demo workspace so he can safely review and tune the skin without entering the customer's account.
- Omit the skin entirely from every other rep's Site Settings dropdown and from the generic required-setup Look picker. Do not show a disabled or locked teaser.
- Enforce the same allowlist in direct Site Settings writes, Nic-Nac writes, required-setup publication, and a database constraint. UI filtering alone is not exclusivity.
- A private skin may keep a noindex sample-content preview route for design QA, but that preview is not a selectable customer option.
- Use Louis's requested special dropdown label for allowed workspaces. Never infer a new private owner or expand an allowlist without explicit authorization.

8. Verify.
   - Run the focused Vitest suite for Amethyst appearance, Site Settings, Nic-Nac customization, and affected templates.
   - Run `npx tsc --noEmit --pretty false`.
   - Browser-smoke Homepage, Trade, and Join if rendering logic changed.
   - For a cinematic hero, complete the asset, responsive, motion,
     accessibility, and visual-comparison gates in
     `references/cinematic-hero-contract.md`.
   - Run `npm run qa:amethyst` when available and practical.

## Output Rules

- Keep rep branding dominant; a skin must not turn the rep site into Sparkle Suite marketing.
- Do not introduce a second customer-site template.
- Do not let Nic-Nac repeatedly switch skins just to preview them; use the skin-card browsing surface for low-cost selection.
- Do not treat old imported design kits as current authority; use them only as historical context when explicitly needed.
- Do not touch `chrome-extension/content.js`, `supabase/functions/live-queue-sync`, or marketing docs unless the user explicitly asks.
- Do not include throwaway mockups in commits unless the user asks to preserve them.
