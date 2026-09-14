# Neon Butterfly hero lessons and reusable design standard

Date: September 14, 2026

## Why this record exists

Neon Butterfly eventually became the strongest custom Sparkle Suite skin to
date, but the first implementation did not meet the reference. The page chrome,
font system, buttons, and downstream Amethyst layout were promising while the
hero environment and butterfly treatment repeatedly looked generic, overly
decorated, structurally implausible, or visibly composited. Louis correctly
identified that small incremental edits were consuming time without fixing the
underlying art direction.

The successful recovery came from treating Kelly's supplied show screenshots
as a visual contract and rebuilding the hero in separable layers. This document
captures the reusable lessons so future custom skins begin at that standard.

## What failed and why

### Approximate motifs were used where fidelity was required

The early butterflies were interpreted as stylized vectors. Their paired lobes
read like touching hearts, and later revisions were closer in outline but still
looked hand-drawn rather than like Kelly's neon signs. The screenshots did not
leave the defining silhouette open to interpretation. The correct solution was
to isolate the actual sign shapes into clean transparent raster assets rather
than keep redrawing a generic butterfly.

Lesson: “inspired by” and “looks like this exact object” are different briefs.
Confirm which one applies before choosing the asset method.

### Decoration accumulated around an incorrect environment

Early versions tried to create cinematic depth with foreground furniture,
golden accents, carpet, multiple plants, glow fields, and other overlays. Those
additions were not in the approved show backdrop and made the scene feel like a
constructed fantasy lounge instead of Kelly's curtain-and-shelving studio.
Because the base environment was wrong, further overlays amplified the error.

Lesson: do not decorate around a structural mismatch. Rebuild the environment
plate when the composition, perspective, or object inventory is wrong.

### The environment was not being judged as a physical set

The shelves initially appeared to float above a visible floor. The right shelf
had doubled, backward, or mechanically implausible uprights and did not mirror
the left shelf's inward perspective. Hanging foliage and extra plants competed
with the curtain and jewelry inventory.

Lesson: generated set art still needs gravity, perspective, supports, contact
points, believable mirrored construction, and a purposeful crop. A cinematic
mood does not excuse impossible furniture.

### Transparent assets were visually unclean

Black diagonal bars beside the butterflies came from export/crop residue in the
supposedly transparent assets. Pink and violet signs also drifted toward white
when brightness was increased, weakening their neon color identity.

Lesson: inspect alpha assets on multiple backgrounds and test their edges,
visible coverage, and near-black opaque pixels. Make neon stand out by lowering
the environment exposure and adding color-preserving bloom, not by whitening
the tube.

### Motion was being perceived as flashing, not flapping

A whole-butterfly pulse or glow change does not communicate wing motion. The
final implementation duplicates each source-faithful sign image into clipped
left and right planes, anchors both at the body seam, and applies independent
horizontal compression/skew keyframes.

Lesson: animation must reflect the object's mechanics. Glow, movement, and
ambient light are different systems and need different timing.

## The successful hero architecture

### 1. Coherent responsive environment plates

The final hero uses separate desktop and portrait WebP plates built around the
approved set:

- deep plum curtain;
- two believable black jewelry shelves angled toward the curtain;
- jewelry reveal inventory and display cards;
- one warm table lamp;
- exactly two restrained snake plants;
- colored shelf lighting;
- no floor, carpet, foreground chairs, or dangling plants;
- a clean central curtain lane for content.

Mobile is not a blind crop of desktop. Its plate intentionally shows less of
the shelves so the title, supporting copy, and actions remain legible.

### 2. Source-faithful independent motif assets

The pink, gold, and violet butterfly signs are isolated from Kelly's actual
reference forms. They have transparent outer edges, compact useful crops, no
opaque near-black residue, and enough internal room to support split-wing
movement and CSS bloom. The yellow sign keeps its warm white-hot core; pink and
violet keep saturated colored tubes instead of a white outline.

### 3. Exposure and neon hierarchy

A restrained darkening grade lowers the shelf and curtain brightness so the
signs read as the brightest objects. Bloom uses color-aware drop shadows. Shelf
LED washes, curtain breathing, and lamp shimmer use separate screen-blended
planes rather than baking every light behavior into the source plate.

### 4. Restrained choreography

The three butterflies use independent 17-, 21-, and 19-second cycles with
offset delays. Each cycle contains short paired flap moments and long rests.
Neon breathing, LED color drift, lamp shimmer, and 24 intermittent sparkles
operate on different clocks, so the scene feels alive without everything
moving at once.

The runtime uses CSS animation rather than a perpetual JavaScript render loop.
It pauses when the page is hidden, honors `prefers-reduced-motion`, and exposes
a working Pause/Resume control. Decorative layers are non-interactive and
cannot cover buttons.

### 5. Copy-safe responsive typography

The final content lane is defined by the curtain rather than the full viewport.
Desktop supporting copy is constrained to `44ch`; mobile narrows within the
viewport so first and last words do not touch the shelves. Slightly relaxed
headline tracking and disabled display ligatures prevented the Playfair `fl`
pair from colliding at nonstandard zoom sizes. Balanced wrapping was verified
in rendered layouts instead of assumed from source CSS.

### 6. Full-page continuity

The hero remains inside the real Amethyst template. Announcement and Dance
Floor tickers, navigation, Live Lineup, buttons, downstream cards, Trade, Join,
and Preferences retain their normal structure and behavior. Dark velvet-glass
cards, semantic text colors, pink/violet CTA energy, and readable form fields
carry the visual story below the hero. Future concepts must show at least one
below-hero section so this continuity can be judged before implementation.

## Better iteration protocol

1. Write a reference inventory before generating: exact shapes, counts,
   colors, object placement, physical structure, negative space, motion, and
   explicit exclusions.
2. Decide which layer owns each requirement: environment, motif asset, tonal
   grade, ambient effect, content, or motion.
3. Create desktop and mobile compositions with a known copy-safe lane.
4. Validate source-specific assets independently on black, white, and
   checkerboard surfaces before placing them in the page.
5. Implement motion only after the static frame passes silhouette,
   perspective, crop, and text-safe-area review.
6. Compare the reference and the rendered page side by side. Do not rely on a
   verbal impression or DOM inspection alone.
7. Classify feedback and replace the wrong layer. If the same structural defect
   survives more than one revision, stop patching and rebuild it.
8. Review desktop/laptop, tablet, mobile, and a nonstandard right-panel width;
   observe long enough to see every independent motion cycle.
9. Show the hero plus downstream cards before asking for final approval.

## Regression and acceptance gates

The Neon Butterfly implementation established these concrete checks:

- expected responsive backdrop assets exist, use the correct format, and stay
  inside explicit byte budgets;
- all three source-faithful sign assets load;
- transparent outer edges contain no visible pixels;
- visible crop coverage stays bounded;
- no opaque near-black pixels can recreate export bars;
- three butterflies and six wing planes render;
- all three independent flap timings are present;
- 24 sparkle points render without intercepting input;
- reduced-motion, page-hidden pausing, and Pause/Resume remain supported;
- no `requestAnimationFrame` or repeating interval is needed for ambient motion;
- no horizontal overflow, text/shelf collision, console errors, or blocked CTA;
- Homepage, Trade, Join, and Preferences load the shared skin assets;
- focused tests, type checking, production build, and live-domain browser QA
  pass before closeout.

## Product and release decisions retained

- Neon Butterfly remains an Amethyst appearance preset, not a second site
  template.
- The skin is private to Kelly plus Louis's internal demo workspace, with
  application and database enforcement and no non-owner teaser.
- Kelly's customer site uses it by default; Louis's demo can select it for
  review while remaining saved as Amethyst until he chooses otherwise.
- Custom named-rep skins follow the same private-by-default rule.
- An older September 14 Open Brain entry described the pre-exclusivity state as
  selectable by every rep. A new authoritative correction explicitly
  supersedes that sentence with the final Kelly-plus-Louis-demo allowlist.
- Manual Vercel releases must preserve and inspect every attached customer
  alias. A Ready deployment is not proof that unrelated customer domains stayed
  on their prior deployment.
- Protected Live Lineup, extension, queue, Store, Finder, billing, and unrelated
  customer work remain outside a skin release unless separately authorized.

## Source and release trail

- Initial skin: `fec493a5`.
- First shape/motion refinement: `4512357b`.
- Source-silhouette sign correction: `df9b63a6`.
- Full Kelly studio rebuild: `f8bda14c`.
- Final typography/mobile protection: `a0cbfa0e`.
- Kelly/demo exclusivity and Kelly default: `8f4f08ea`.
- Current application deployment: `dpl_DPcYwvfeSoLLGqAEv9fcNMkYxJ6G`.
- Detailed release records remain in the other three Neon Butterfly vault files
  dated September 13–14, 2026.
