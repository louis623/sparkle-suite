# Cinematic Customer-Site Hero Contract

Use this contract whenever a Sparkle Suite customer-site skin includes custom
hero artwork, a supplied visual reference, source-specific decorative motifs,
or ambient motion.

## Reference fidelity is a requirement

Before generating art or writing CSS, state what is exact and what is open to
interpretation.

- Inventory the reference: subject shapes, counts, colors, relative positions,
  physical structures, lighting sources, crop, negative space, and motion.
- If Louis says an element must look like the reference, treat its silhouette
  and defining proportions as acceptance criteria. Do not replace it with a
  generic icon, an approximate SVG, or a familiar symbol that merely shares
  the theme.
- Separate reference-faithful elements from inspired elements. A faithful
  butterfly sign and an interpretive sparkle field can coexist, but they are
  not held to the same standard.
- Record explicit exclusions. If the approved scene has one plant, no floor,
  no foreground furniture, or no dangling foliage, do not add those objects to
  make the frame feel fuller.

When exact motif fidelity matters, prefer a clean source-derived cutout or a
careful traced asset over asking image generation to recreate a small symbol.
Use image generation for the coherent environment plate where it adds value.

## Build the hero in independent planes

Use a deliberate layer model:

1. Environment plate: the room, curtain, shelving, furniture, and static props.
2. Tonal grade: a restrained darkening or color grade that makes content and
   illuminated elements readable.
3. Motif assets: transparent signs, butterflies, or other reference-specific
   objects whose silhouettes must remain exact.
4. Ambient effects: shelf-light drift, lamp shimmer, haze, and sparkles.
5. Product content: headline, subline, links, and CTA controls.
6. Motion/accessibility control: a real Pause/Resume control above decorative
   layers and reachable by pointer and keyboard.

Keep decorative planes `aria-hidden` and non-interactive. Use explicit stacking
and `pointer-events` so effects can never block customer actions. Do not stack
increasingly complicated pseudo-elements over an incorrect environment; repair
the layer that is actually wrong.

## Compose the environment as a believable set

- Furniture and shelving need coherent perspective, supports, contact points,
  and gravity. Mirrored shelving should have mirrored structural logic, not
  duplicated or backward uprights.
- Crop the scene where it is naturally supported. If the design does not need
  a floor, end the composition before the furniture would appear to float.
- Reserve a clean content-safe lane before generating the environment. Keep
  high-contrast props and structural bars out of headline, subline, and CTA
  areas.
- Generate or edit for the intended aspect ratio. Use independently art-directed
  desktop and mobile plates when one crop cannot preserve both the scene and
  the copy safe area.
- Prefer one coherent plate with a small number of explicit objects over a busy
  collage. Additional plants, gold ornament, furniture, or foreground props are
  not free polish; every object must be supported by the reference or brief.

## Prepare transparent motif assets rigorously

An asset is not ready merely because it appears to have transparency.

- Crop close enough that the visible motif occupies a useful fraction of the
  canvas, while leaving room for glow and transform motion.
- Require fully transparent outer edges.
- Reject opaque or semi-opaque near-black pixels left by export backgrounds,
  crop boxes, or matte removal. These become visible bars against animated
  backgrounds.
- Inspect the asset on black, white, and checkerboard surfaces.
- Preserve the intended tube color. Use CSS bloom around the art; do not wash a
  pink or violet sign to white in an attempt to make it brighter.
- Add automated alpha-edge, visible-coverage, near-black-pixel, file-type, and
  size checks for important production assets.

## Animate object mechanics, not a flat picture

- A wing flap needs separate left and right planes with transform origins at
  the body seam. Pulsing opacity or scaling the entire butterfly is glow, not a
  flap.
- Use independent, staggered durations and delays so major motifs do not move
  together. Keep motion low-frequency and let the scene rest between events.
- Separate physical motion from light behavior: wing movement, neon breathing,
  lamp shimmer, LED hue drift, and sparkle twinkle should have different timing
  signatures.
- Any randomness must be bounded and testable. Do not use per-frame randomness
  or unbounded timers. Prefer CSS keyframes and a small deterministic DOM setup
  over `requestAnimationFrame` or repeating JavaScript intervals for ambient
  decoration.
- Pause animation while the document is hidden, honor
  `prefers-reduced-motion`, and provide a visible Pause/Resume control whenever
  persistent decorative motion is present.
- Reduced-motion mode must remain visually composed; it is not an empty or
  broken hero.

## Protect typography and actions

- Review the actual display font at nonstandard widths and zoom levels. Adjust
  tracking and disable problematic ligatures only when rendered letter pairs
  collide.
- Constrain supporting copy to the content-safe lane instead of allowing the
  first or last words to run into shelving or bright props.
- Use balanced wrapping deliberately, then inspect the real line breaks on
  desktop, tablet, narrow desktop panels, and mobile.
- Keep every required Amethyst control visible and usable. Cinematic art does
  not authorize moving or hiding the announcement bar, navigation, Dance Floor
  ticker, Live Lineup rail, CTA buttons, or downstream cards.

## Iteration discipline

Classify visual feedback before editing:

- wrong environment or perspective -> regenerate or edit the environment plate;
- wrong silhouette -> replace the motif asset;
- export bars or fringe -> repair transparency/crop processing;
- weak neon -> tune scene exposure and color-preserving bloom;
- clutter or overlap -> revise composition and responsive placement;
- bad motion -> revise transform planes, origins, timing, or choreography;
- copy collision -> revise the safe lane, text measure, tracking, or breakpoint.

Change the smallest coherent layer, render it, and compare it directly with the
reference. Do not keep polishing a failed underlying asset. After more than one
round of feedback on the same structural defect, stop incremental patching and
rebuild that layer from the source reference.

## Visual and functional QA

Before asking Louis to review:

- Compare reference and rendered screenshots side by side at the same useful
  scale. Verify exact motifs before evaluating general mood.
- Capture at least desktop/laptop, tablet, mobile, and one nonstandard
  right-panel or zoomed width.
- Inspect the first viewport and enough below it to verify the transition into
  real Amethyst cards, typography, and section rhythm.
- Verify no horizontal overflow, no content/shelf collision, no visible asset
  rectangles, no console errors, and no decorative layer intercepting input.
- Observe the page long enough to see every major independent motion event, and
  exercise Pause/Resume, hidden-page pausing, and reduced-motion behavior.
- Confirm the expected motif/effect counts and the exact assets loaded.
- Run focused skin tests, type checking, the production build, and Smoke
  browser verification before any live promote. Canonical playbook: Core Memory
  `skills/sparkle-smoke-ship.md`.

## Neon Butterfly precedent

The Kelly studio rebuild established the first full precedent for this
contract: a coherent plum-curtain jewelry set, believable shelves, two
restrained snake plants, no visible floor, separately art-directed responsive
plates, three source-faithful transparent neon sign assets, independent split-
wing motion, restrained shelf-light/lamp/sparkle choreography, a center-curtain
copy safe lane, and asset-level tests that prevent black export bars from
returning. Preserve the method, not the Neon Butterfly palette, when applying
these lessons to another skin.
