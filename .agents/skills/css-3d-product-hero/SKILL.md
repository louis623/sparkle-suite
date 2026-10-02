---
name: css-3d-product-hero
description: "Use when designing, implementing, or reviewing CSS 3D transform product hero scenes, tilted UI mockups, floating cards, perspective/preserve-3d bugs, Beacons-style dimensional landing visuals, Sparkle Suite public landing page hero work, or any request to make a web hero look more 3D."
---

# CSS 3D Product Hero

## Purpose

Build product-led landing-page hero visuals that feel dimensional in the browser, using CSS perspective, `transform-style: preserve-3d`, real Z-depth, and disciplined verification. This skill is for converting an approved dimensional mockup into production CSS without slipping into a flat card collage.

## Required Reading

Before changing code or giving implementation advice for a 3D hero, read `references/css-3d-field-guide.md`.

For Sparkle Suite public landing pages, also use:

- `sparkle-suite-dynamic-landing-page`
- `sparkle-suite-master-brand`
- `build-web-apps:frontend-testing-debugging` before showing rendered work

## Workflow

1. Lock the visual target.
   - Compare the approved mockup/reference to the live browser view.
   - Name what must match: camera angle, screen scale, card depth, shadows, first-viewport rhythm, and mobile behavior.

2. Build the 3D scene hierarchy.
   - Outer layout handles sizing and clipping.
   - The scene parent owns `perspective` and `perspective-origin`.
   - The stage owns `transform-style: preserve-3d`.
   - The screen and floating panels get `translateZ()`, `rotateX()`, `rotateY()`, and `rotateZ()`.

3. Tune the camera first.
   - Start with `perspective: 1000px` to `1400px`.
   - Move the vanishing point with `perspective-origin`, usually around `58% 35%` for a right-side product hero.
   - Smaller perspective values create more dramatic foreshortening; larger values feel flatter and calmer.

4. Add real depth, not just offsets.
   - Main screen: subtle `rotateX`, stronger `rotateY`, tiny `rotateZ`.
   - Floating cards: give each card a different `translateZ()` and a small independent rotation.
   - Shadows should scale with depth: closer cards get softer/larger shadows; distant surfaces get tighter shadows.

5. Avoid CSS that silently flattens the scene.
   - Keep `overflow`, `opacity < 1`, `filter`, `backdrop-filter`, `clip-path`, `mask`, `mix-blend-mode`, `isolation: isolate`, and `contain: paint` off the `preserve-3d` stage and other 3D containers.
   - Put decorative fades, blur, and clipping on wrappers or leaf elements that do not need to preserve descendant depth.

6. Make responsive choices deliberately.
   - Desktop can be fully dimensional.
   - Tablet can soften the angles and reduce Z-depth.
   - Mobile should preserve polish without horizontal overflow; stacking beats shrinking the whole scene into unreadable mush.
   - Respect `prefers-reduced-motion` for any parallax or pointer tracking.

7. Verify in the browser before showing the user.
   - Capture/check desktop around `1600x900`.
   - Check the current in-app browser viewport.
   - Check mobile around `390x844`.
   - Confirm the product visual reads as dimensional, the CTA is visible, text does not overlap, and no horizontal scroll appears.

## Quality Gate

Do not show or ship the hero until these are true:

- The product surface feels like a staged object in space, not a flat screenshot with sticky notes.
- The floating cards use Z-depth and matching shadows.
- The parent perspective is shared across the product screen and cards.
- The scene is not flattened by grouping properties.
- The mobile view is intentionally composed, not just squeezed.
- For Sparkle Suite, the visual uses real product concepts, avoids fake jewelry, uses the approved brand, and keeps Nic-Nac secondary to Sparkle Suite.
- A shipped Suite hero is verified on Smoke before any live promote. Canonical playbook: Core Memory `skills/sparkle-smoke-ship.md`.
