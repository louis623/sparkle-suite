---
name: sparkle-suite-qr-flyer-builder
description: Build or refine Sparkle Suite QR flyer artwork from approved theme art, integrate it with the real Cards & QR renderer, and verify exports. Use for QR flyer requests and the flyer deliverable of every new Sparkle Suite theme.
---

# Sparkle Suite QR Flyer Builder

Create a dedicated portrait background that still reads as the approved theme after the actual rep tool places its title, centered QR and instructions over it. New-theme work includes this deliverable by default; coordinate with [business-card-builder](../sparkle-suite-business-card-builder/SKILL.md) and [skin-builder](../sparkle-suite-skin-builder/SKILL.md). A skin browsing/branding card is a separate artifact.

Paths below are relative to the repository root. Read the current branch's files; an old dirty checkout or historical smoke guide may describe an obsolete renderer.

## Inspect the real format first

- `app/nic-nac/components/CardQrTool.tsx`: current picker, fields, step 4 preview/download and defaults.
- `lib/workspace/card-qr/flyer-layout.ts`, `render.ts`, `flyer-copy.ts`, `flyer-format.ts`, `flyer-themes.ts`: authoritative geometry, copy, export and art registry.
- `design-theme.ts`, `palette.ts`, `flyer-decode.ts` in that directory: accepted theme IDs, palette and actual QR verification.
- `app/api/workspace/card-qr/flyer/route.ts`: what the deployed tool actually returns.
- `scripts/card-qr/plate-sources/README.md` and the nearest existing compositor: reproducible asset pattern.

Current plate is **1080 x 1920**. Keep the QR horizontally centered; its current pad is 560-600 px depending on content. Title/tagline wrapping and optional text-to-link/custom-domain content affect vertical geometry. Obtain the layout from the real renderer with representative data. Do not copy one sample's y coordinates into a new format, shrink/move the QR to rescue a composition, or redesign the overlays as part of an art-only task.

## Preserve the art and compose for occlusion

1. Inspect the approved hero and any approved flyer references. Record source paths/hashes, character identity, signature jewelry/colors, lighting, focal objects, exclusions and approved simplifications. Preserve the hero file and its `source` registry entry.
2. Reuse original character pixels where identity is locked. A similar generated animal is not the same character. If source editing/outpainting is appropriate and authorized, reference the actual approved image with the image-editing tool and preserve the recognizable details. A no-new-art instruction forbids invented replacements. Disclose edited versus retained pixels accurately.
3. Build a coherent tall scene around the real overlay footprint. Use top, side and floor artwork, consistent lighting/perspective and purposeful margins. Extend the environment deliberately. Do not stretch or cover-crop a landscape hero into a portrait, repeat it twice, hide a seam in blurred fill, or use a webpage screenshot as the deliverable.
4. Check the visible silhouette after overlays. Zoom out/reposition a subject or place a branch from a margin when that preserves identity. An oversized object can extend behind the panels if enough unmistakable features remain outside them. Do not add scattered lanterns, jewelry, leaves or other props merely to fill space. Seek clean, warm, inviting artwork with enough scene detail to avoid an unfinished appearance.
5. If the art is being rejected, stop repeating decorative variants. Identify the obstruction or identity problem. Work on one theme at a time; offer a few quick concepts only when useful or requested. Do not silently remove a defining character. A user-approved simplification can become that theme's new focal brief.

## Approved examples and their limits

- **Fall Owl:** same purple jeweled owl, amber wing gems and amber pendant. Approved high-perch version shows head plus some body, a right-edge hanging branch, head above the QR/title area, original moon/foliage, and lake low at the bottom once. A head-only peek or substitute bird fails. These are Owl-specific locks, not a universal flyer composition.
- **Gobble & Fizz:** Louis explicitly replaced the turkey brief with a giant bubbling copper cauldron. Copper sides, ring handles, fizz and amber gem remain recognizable around the panels. Earlier turkey concepts, random lanterns and cutout-border revisions were rejected.
- **Pumpkin Pie:** oversized original-style pie; visible orange filling/crust left of QR, cream at right and jeweled tray below instructions. A small pie hidden under the QR is not an acceptable adaptation.

## Implement and retain provenance

- Output `public/amethyst/skins/<skin>/flyer/plate.webp`; register it as `plate` in `flyer-themes.ts`, with `source` still pointing at the approved hero. Respect community/private theme visibility; don't expose private designs in a shared picker.
- Retain inputs and a repeatable compositor under `scripts/card-qr/plate-sources/<skin>/` or a clearly scoped shared builder. Store source hashes, composition parameters and the exact edit prompt/reference provenance when generation was used. Do not store credentials.
- Existing patterns: `fall-owl/compose.cjs` composes original-pixel pieces; `compose-thanksgiving.cjs` splits an approved whole portrait scene into lossless top/side/floor pieces and recomposes it. Both are valid. Cutting a bad landscape crop into strips does not turn it into a designed portrait.
- Verify a rebuild reproduces the approved composition, preferably byte-for-byte; compare decoded pixels if a documented encoder change prevents byte equality. Generation is an offline design step, never a runtime rep-tool dependency.
- Register a genuinely new theme in the current shared-theme/palette/picker mappings as needed; keep custom/private access intact. No saved rep theme is changed to demonstrate a flyer.

## Verify through the renderer and tool

- Render normal and long titles, representative tagline and optional text-to-link/custom-domain cases. Inspect the **finished flyer**, not just the bare plate. Use synthetic content for proofs when possible.
- Show original hero versus final flyer side-by-side when character fidelity is central, and always show the real finished format before claiming layout approval. Never substitute a hand-drawn mock overlay or alter the tool format for a nicer screenshot.
- Check true dimensions, clipping, margins, QR quiet zone/contrast, subject visibility and readable panels. Decode actual exported JPG **and** PNG to the expected destination, including any selected QR center mark. JPG and PNG should follow the current tool's real defaults and download behavior.
- Use `tests/fall-owl-flyer-plate.test.ts` and `tests/thanksgiving-flyer-plates.test.ts` as meaningful test examples. Adapt fixtures/expectations to the new theme; don't hard-code all future art to Owl's placement or the three seasonal hashes.
- Before release, exercise the theme picker, preview and download in the actual rep tool on the authorized target. Record exactly what was checked locally, in Smoke and on Live. User-confirmed Smoke review is evidence; it is not an agent-performed Live click-through.
- Follow current repository release rules and [production-smoke](../sparkle-suite-production-smoke/SKILL.md). Keep Smoke-only instructions when given; a later explicit Live approval supersedes them for the approved scope. Do not interpret proof approval as authorization for payments, printer orders, saved-theme changes or broader workflow changes.
