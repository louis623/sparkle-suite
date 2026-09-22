# Sparkle Suite Skin Contract

## Non-Negotiable Product Model

Every customer site uses the Amethyst template.

- Stored template: `customerSiteTemplate = 'amethyst'`
- Stored visual style: `appearancePreset = '<skin_id>'`

Skins may change only the visual layer:

- colors
- typography
- card surfaces
- border radius and shape language
- background treatment
- hover and motion energy
- sparkle, texture, and decorative intensity
- button and CTA treatment

Every card surface must also define or inherit semantic readability colors:

- primary card text
- muted card text
- card accent text
- form-panel text/background
- form-field text/background

Customer-site components must consume those surface-aware tokens instead of
inheriting a surrounding section's foreground color. A light card inside a
dark or saturated section must remain readable, and a dark card inside a light
section must do the same. Do not fix contrast by adding one-off descendant
colors for a single skin when the semantic surface contract can carry the
correct value across every skin.

Skins must not change:

- Homepage section order or slot names
- Trade Board behavior
- Join page behavior
- signup and unsubscribe flows
- Nic-Nac panel behavior
- public links between Homepage, Trade, and Join
- SEO metadata or real rep/customer data mapping
- authorization, provider, payment, SMS, email, SignWell, or calendar behavior

## Custom Hero Art and Motion

When a skin adds a custom illustrated, generated, photographed, or animated
hero, read and follow `cinematic-hero-contract.md`. The hero remains a visual
layer inside the Amethyst structure. It may art-direct responsive environment
plates and decorative motifs, but it may not replace required content slots or
customer actions.

If Louis supplies a visual reference and asks for an exact motif, the motif's
silhouette, proportions, count, and defining color behavior become acceptance
criteria. A generic themed substitute is not an acceptable first draft. Keep
environment, motif assets, lighting effects, copy, and motion in independent
planes so the incorrect layer can be replaced without accumulating patches.

Persistent ambient motion must honor reduced-motion preferences, pause while
the page is hidden, expose a usable Pause/Resume control, and remain decorative
and non-blocking. Source-specific transparent assets require automated edge,
crop-coverage, and near-black-pixel checks so export boxes cannot appear in the
render.

## Ticker Motion Contract

Announcement and Trade Board tickers use measured constant pixel speed. The
animation duration is the measured repeated-segment distance divided by the
row's pixels-per-second constant; content length must never select a fixed
duration or minimum-duration floor.

Empty-state Trade Board copy is still ticker content. It must be duplicated
into a complete loop with the same segment-start and segment-repeat markers as
real listings. Never render a lone unmarked empty-state span inside an animated
ticker track, because that bypasses measured speed and falls back to the slow
legacy duration. This rule applies across Homepage, Trade Board, Join, every
skin, and every current or future customer site.

Trade Board ticker copy is bold at `700` weight for both populated listings and
the empty-state message. Announcement ticker copy keeps its separate established
weight. Skins may change readable colors but must not flatten the Trade Board
row back to regular or medium weight.

## Skin Branding Cards

Every skin needs a small browsing card for reps. The card is not the live site and must not require Nic-Nac to apply the skin just so the rep can preview it.

Each card should include:

- stable code or ID the rep can give Nic-Nac
- display label
- one-sentence feel description
- palette swatches
- heading/body font labels
- shape/card/hover notes
- a small static visual sample that suggests the skin's homepage and card treatment

Cards should be suitable for a Help, More Info, or Site Settings browsing surface. Nic-Nac can say: "Browse the skin cards, then tell me the code or name you want to try."

Amethyst also needs a card because it is the default skin.

### Skin visibility and private custom-skin ownership

Every card has one explicit catalog visibility: `community` or `private`.

- Community skins are available to every rep by default. Seasonal and holiday skins, including Halloween, are community skins unless Louis explicitly says otherwise.
- A skin created for a named rep is private unless Louis explicitly makes it shared. Its catalog record identifies its owner.
- A private skin is visible and selectable only for its owner, Louis's established admin/demo workspace, and a deliberately classified trusted internal demo/reviewer account. Never infer that status from a display name or email pattern; use the durable account classification or explicit catalog permission.
- Non-owners must not see a private skin in Site Settings, the required-setup picker, Nic-Nac suggestions, or any future browsing surface. Do not show locked cards, teasers, or disabled options.
- Every selection path must ask the same database-backed availability rule. The user interface prevents ordinary selection; server write paths and a database trigger independently reject an unauthorized direct request.
- A noindex sample-content preview may remain available for design QA; it never grants selection access.

Before enforcing a visibility change, inspect existing assignments. Do not silently replace a rep's current skin, public site, scheduled show, or Live Queue state. Stop and have Louis review any assignment that conflicts with the new catalog rule.

## Required Implementation Surface

When adding a skin, inspect and update as needed:

- `lib/amethyst/appearance-presets.ts`
- `lib/amethyst/homepage-template-data.ts`
- `lib/amethyst/trade-template-data.ts`
- `lib/amethyst/join-template-data.ts`
- `lib/services/types.ts`
- `lib/services/site-settings.ts`
- `lib/nic-nac/tools/update-site-setting.ts`
- `lib/nic-nac/system-prompt.ts`
- `app/nic-nac/components/DashboardPlaceholder.tsx`
- skin-card registry/component files once they exist
- `public/amethyst/homepage.jsx`, `public/amethyst/trade.jsx`, and `public/amethyst/join.jsx` if their local preset maps are still shipped
- `app/api/amethyst/*-template/route.ts` if bootstrap arguments change
- `supabase/migrations/` for database constraints/defaults
- affected tests under `tests/`

## Naming

Use lowercase snake_case for persisted IDs. Examples:

- `amethyst`
- `sparkle_suite_morganite`
- `rose_quartz`

Use clear labels for reps. Examples:

- `Amethyst`
- `Sparkle Suite/Morganite`
- `Rose Quartz`

## Verification Checklist

- Existing default remains Amethyst.
- Unknown template IDs normalize back to Amethyst.
- Unknown skin IDs normalize back to Amethyst.
- New skin can be saved through Site Settings.
- New skin can be saved through Nic-Nac.
- Skin card exists with a stable code and display label.
- Homepage, Trade, and Join use the same skin tokens.
- Browser render preserves live-site buttons, customer Trade Board access, Join page access, signup behavior, and Nic-Nac visibility.
