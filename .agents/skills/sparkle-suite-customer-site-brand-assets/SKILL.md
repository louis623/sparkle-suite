---
name: sparkle-suite-customer-site-brand-assets
description: "Create, review, or implement reusable favicon and social-share assets for Sparkle Suite customer-facing rep sites. Use when a rep needs a favicon, browser-tab icon, Open Graph image, social preview, custom-domain branding, or a stable visual mark that must coexist with changeable site skins."
---

# Sparkle Suite Customer-Site Brand Assets

Create customer-site assets as a two-layer system:

1. A stable rep mark: one clear initial or approved rep mark, designed for browser tabs, saved links, and recognition across future skin changes.
2. A theme-aware social-share card: a 1200x630 Open Graph image that uses the live customer-site appearance preset, business name, tagline, and custom domain.

## Required decisions

- Keep the mark neutral and durable. Prefer a single-letter monogram unless the rep has explicitly approved a different mark.
- Do not use generic Sparkle Suite public-site branding on a rep's customer-facing domain.
- Treat custom uploaded logos as a later capability unless the product has a deliberate upload, review, and safe-storage flow.
- Keep the mark stable when a rep changes their skin. Let only the share-card palette respond to the selected skin.

## Implementation contract

- Use Next.js `app/icon.tsx` for the browser icon and `app/opengraph-image.tsx` for the social-preview card.
- Make both routes request-aware with `headers()` and `dynamic = 'force-dynamic'`, so a custom-domain request is resolved to the correct rep.
- Resolve the customer domain using the established Amethyst host-routing and preview-data helpers. Do not trust a raw query string as the branding authority.
- Keep the platform domains on the normal Sparkle Suite icon/social card. Apply rep branding only to a validated custom customer domain.
- Use `getAmethystAppearancePreset` or the current appearance data as the source for the share-card palette; never hardcode a rep's current color as their permanent share background.
- Store approved static marks under `public/customer-site-assets/` and map them narrowly to the approved custom domain. Do not place temporary source prompts or credentials in tracked files.

## Quality and release gate

1. Add focused tests for the stable mark and at least two skin palettes.
2. Run the relevant focused tests and the production build.
3. Render `/icon` and `/opengraph-image` locally with the custom `Host` header; visually inspect the generated images before release.
4. Commit and push, then deploy and verify on Smoke. Confirm both live Sparkle Suite aliases and the affected custom-domain paths only after Louis approves the batch promote.
5. Use `sparkle-suite-production-smoke` on Smoke. Do not use Louis's personal account for any state-changing smoke test. Record the known reviewer-token limitation instead of bypassing it. Canonical playbook: Core Memory `skills/sparkle-smoke-ship.md`.