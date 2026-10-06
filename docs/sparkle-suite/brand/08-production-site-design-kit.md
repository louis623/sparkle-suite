# Sparkle Suite Approved Brand System

**Current owner-approved direction: October 6, 2026 — Warm plum / concept 2.**

This is the canonical visual and marketing-copy reference for Sparkle Suite. Louis approved the warm-plum hero concept, then the complete Home scroll and Portfolio/FAQ mockups, and authorized implementation. The filename is retained for existing links; **approval of this system does not mean it has been released to Live**. Implementation and review are Smoke-only until separately authorized.

This direction supersedes the May 2026 prelaunch lock, old deployment references, inherited CSS colors, and older channel examples wherever they conflict. Files `05`, `06`, and `07` are historical evidence, not a release target or a current design mandate. Use the latest explicit owner instructions when they refine this document; no special approval phrase is required.

## What makes the design Sparkle Suite

Warm plum establishes the brand. Espresso frames product demonstrations. Blush and warm-white sections create breathing room. Bright pink is the action color, not a full-page wash. Playfair Display headlines, occasional italic soft-pink emphasis, real product captures, and generous spacing complete the system.

The result should feel polished, distinctive, warm, and useful. Avoid generic card grids, dark neon effects, artificial luxury, oversized empty sections, and a sequence of near-identical white panels. A Finder or rep-theme palette must never take over Suite page chrome.

## Color roles

| Role | Token / value | Use |
| --- | --- | --- |
| Warm plum | `--suite-plum: #34252f` | Hero, short subpage openings, closing CTA bands |
| Espresso | `--suite-espresso: #36221d` | Product demonstration and proof sections |
| Warm paper | `--suite-paper: #fff6fa` | Light reading and portfolio surfaces; light text on plum |
| Blush | `--suite-blush: #fbf5f2` | Alternating lighter sections |
| Cream | `--suite-cream: #f6e7da` | Text on espresso |
| Accent pink | `--suite-pink: #ee2c9b` | Small accents, focus indication, brand mark |
| Soft pink | `--suite-soft-pink: #ffd4ea` | Italic emphasis and secondary accents on dark sections |
| Ink | `--suite-ink: #402924` | Main text on light surfaces |
| Muted ink | `--suite-muted: #775d57` | Secondary text on light surfaces |
| Supporting ink | `#a48882` | Decorative/subordinate use only when contrast permits |
| Supporting backgrounds | `#fcf8f6`, `#f6ede8`, white | Subtle light surfaces and locked white footer |
| Primary action | `#ff4cae` → `#d81b87` | Pink gradient buttons with `#fff6fb` text |

Warm plum is an intentional approved addition to the earlier incomplete kit; it is not Finder violet. Do not reuse the retired button colors `#b91a70` or `#c21878`. Do not replace espresso with near-black `#1b1218`. Check actual text contrast at the chosen size; a token's presence in this table is not a guarantee for every foreground/background combination.

Shared marketing tokens are scoped to `.suite-marketing`. Future email and Workspace work should adopt the documented roles through a separately scoped change, not global overrides to unrelated pages. Email rendering may require inline styles; the color and typography roles remain the same.

## Typography and spacing

- Display: **Playfair Display**, using `var(--font-prelaunch-display)` in the site. Body, labels, buttons: **DM Sans**, using `var(--font-prelaunch-sans)`.
- Use sentence case. Italic emphasis belongs inside the serif headline, not in every sentence or button.
- Desktop hero: approximately 60–76px; subpage hero 48–64px; section headings 40–56px. On a 390px screen, use roughly 38–44px hero type and 30–38px section headings, adjusting line breaks to fit real copy.
- Body: 16–19px, around 1.6–1.75 line height. Keep explanatory prose near 55–70 characters wide.
- Spacing scale: 8, 12, 16, 24, 32, 48, 64, 80, 96px. Most desktop sections need 64–96px vertical space, mobile 40–56px. Use 20px mobile side gutters; avoid clipping as a substitute for correct widths.
- Give each section one clear focal point. Prefer large real captures and alternating rows over a repeated three-card pattern.
- Buttons and controls need at least 44px touch targets, readable focus states, and text that survives zoom. Border radius is restrained for screenshots and fully rounded for action pills.

## Logo and locked footer

- Header lockup: `public/brand/sparkle-suite-logo-transparent.png`, approved on PR #76. It contains the italic S seal, Sparkle Suite wordmark, and gray workspace byline.
- Opaque plate when genuinely needed: `public/brand/sparkle-suite-logo.png`.
- Do not rebuild the header logo as an S-seal SVG or use the old brown email-signature bar. There is no approved white/knockout logo. Keep the existing generated `app/icon.tsx` favicon.
- Shared footer is locked to the approved extraction from Finder PR #74, branch `cursor/finder-learn-white-chrome-61e3` near `61a2efa`, and reference `standing/assets/2026-10-05-approved-marketing-footer.png` in Core Memory.
- Footer: white; Suite and Finder logos on the left; Privacy and Terms centered; TikTok/YouTube pills on the right; existing independence disclaimer beneath. Preserve its logo treatment. FAQ belongs in navigation or page content, not a footer redesign.
- Owner-approved October 6 refinement: Suite marketing footer channel pills match the Watch buttons: equal size, trailing channel icons, TikTok black with cyan/red accents and YouTube red with white text. Keep the remaining footer structure, logos, legal links, and disclaimer unchanged. Channel brand colors are confined to the social buttons.

## Approved hero and preview

Exact headline, with the final word in italic:

> Your brand.
> Your show.
> A setup that *shines*.

Exact explanation:

> A polished website for your live-selling business. Give shoppers one place to find your next show, follow your Live Lineup, and explore your Dance Floor.

Primary CTA: **Join the build queue**. Hero is product before price; show the price in the pricing section after the visitor sees what the product is.

The hero previews the existing Dude's Fizzfest demo account. Its saved theme drives the default, including seasonal, retired, or custom themes. The public page is read-only and must never change that account. Resolve its configurable slug, default `dudesfizzfest`; never hardcode a rep ID across environments. The picker contains catalog-confirmed community themes only, excluding retired Rose Quartz and custom themes. Say **themes**, never skins, in visible copy, labels, and alt text.

Theme choices use equal-size tiles in a regular grid. At 760px and below, the “Try one of our Sparkle Suite themes” control opens a collapsed-by-default picker. Desktop choices stay expanded without a disclosure arrow (owner refinement, October 6).

Use a responsive, fast poster first. Enhance the visible hero after the poster paints and the page settles; keep the initial server render frame-free. If the demo lookup fails, show a neutral poster without claiming a theme; do not substitute another theme. No automatic theme rotation or carousel. Preserve real animation with visible-only muted playback and pause controls; retain the poster for reduced motion and data saver until the visitor chooses play. Keep independent Smoke and Live configuration.

## Approved page family

Home scroll: plum hero → light real-site gallery → four tool cards → founder → espresso Watch → pricing → short FAQ → plum closing CTA → locked white footer.

Owner-approved tools hierarchy (October 6): Home shows exactly four cards, in order: Dance Floor, Live Lineup, Live Show Calendar, Team Management. Each has an icon, short description, two benefits, and an Explore link to its `/tools#section`. Beneath: “There’s more inside your Suite.” and “Explore the tools that help you manage your business, support your team, and prepare for your next live.” with “Explore all tools”. Use two columns on desktop, one on phones. Move deep demonstrations to `/tools`, which has sticky section navigation on desktop and a “Jump to a tool” menu on mobile. Team Management contains New Rep Onboarding; Nic-Nac has a substantial section there. Jewelry Library, Customer List, Message Center, and Resources & Help are supporting workspace essentials, not inflated into major Home tools. Preserve real captures and the isolated Live Lineup sample. The two approved generated mockups establish visual direction, with the owner's final four-card selection taking precedence over their example inventory.

- Portfolio: short plum title band; all available real rep sites as large alternating rows; plum CTA; same footer. Labels and alt text use show name/domain only, never the rep's personal name.
- FAQ: short plum opening; warm-white topic navigation and native readable accordions; espresso links to Portfolio/Watch; plum CTA; same footer. No public assistant or question form posting to Nic-Nac.
- Build queue: matching header, plum introduction, warm-white form and clear offer context, same footer. Explain the next step before collecting details.
- Legal pages: restrained branded opening, readable light text area, same footer; retain legal content unless explicitly authorized to change it.
- `/learn` redirects 301 to `/`; `/demo` redirects 301 to `/#watch`. No Suite/Finder chooser.

## Copy and offer facts

- Current feature names: **Dance Floor**, **Live Lineup**, **event calendar**, **Team Management**, **New Rep Onboarding**, **themes**, **Nic-Nac rep assistant**.
- Email and SMS updates are **coming soon**. Do not imply they are available or invent a release date.
- No public Nic-Nac use on marketing routes: no mounted launcher, anonymous chat API, or FAQ handoff form. Explain verified capabilities on the tools page; the assistant is for paying reps.
- Founder: **$49.99/month for 12 paid months**, then **$74.99/month**, plus **$49.99 one-time setup**. First month + setup is **$99.98**. Standard first month + setup is **$124.98**.
- Founder cap: 20. A confirmed live counter may say **X founder spots remaining**; never **X of 20**. On unknown availability show founder price without invented count/urgency. Confirmed zero shows standard price. Founder pricing must render server-side on first load.
- Joining the queue does **not** reserve founder pricing. It applies only after a meeting where Louis and the rep agree to move forward, while spots last.
- Near CTA and pricing: **Join the build queue and I'll email you to book a quick 30-minute call. Your build starts once your first month and setup fee are paid.**
- Supporting reassurance: **No payment when you join the queue.** No payment mechanics beyond that sequence are implied by the marketing design.
- There are no testimonials. Never fabricate quotes, reviews, counts, conversion claims, customer activity, or sales outcomes.
- Do not use Bomb Party in the headline. Do not introduce permission or affiliation discussion; retain the approved footer disclaimer. The approved founder story below contains a factual audience reference.

Founder block: real Louis photo and name, with this approved story:

> My sister became a Bomb Party rep and asked me to help with her website. I saw how many reps needed the same thing, so I built Sparkle Suite and started my own small, veteran-owned business. It's been a lot of fun, and I've met so many great people along the way.

Use `standing/assets/louis-headshot-2026-10-05.png` from Core Memory. Its teal background may be softened or removed to fit; never alter Louis's likeness.

## Channels, social previews, and tracking

- YouTube: `https://www.youtube.com/@SparkleSuite`.
- TikTok: `https://www.tiktok.com/@yoursparklesuite.com`; featured demo `/video/7684058046800071966`. Never use `tiktok.com/@sparklesuite`.
- Watch uses real demos and two equal-size channel links with icons after the labels: TikTok black with its cyan/pink accents, YouTube red with white. These platform-brand colors are specific to channel buttons, not Suite chrome. No separate featured-clip button. The hero follows the owner's saved demo theme.
- OG/social cards explain Sparkle Suite with a themed site image and value headline, **no price**.
- Preserve `?src=tiktok`, `?src=email`, and extensible campaign labels through marketing navigation into queue signups. Use free/built-in tooling and minimal data. Louis pastes links; setup and reporting are handled by Suite/Codex.

## Verification and future reuse

Match the approved composition at desktop and actual 390px content width, with no overflow. Preserve product-before-price order, working CTAs, readable contrast, keyboard controls, and complete disclosures. Defer nonessential media and interactive frames; use responsive WebP/AVIF where appropriate and explicit dimensions. Verify reduced motion and slow/mobile loading, especially the TikTok in-app browser; do not claim physical-device checks that were not performed.

This is the reference for bringing consistency to later email and Workspace work. Updating this document does not authorize redesigning those products, migrating their CSS, or publishing to Live. Preserve the current requested scope and use the user's actual approval instead of a magic phrase.


## Complete product coverage and motion — owner correction, October 6

Team Management and New Rep Onboarding are included with every active workspace; see lib/services/team-onboarding.ts and docs/sparkle-suite/operations/2026-09-04-team-management-onboarding-hardening.md. Give both substantial, distinct coverage: public team cards/photos/links and private invitations; then the new rep’s six-step guide, saved progress, supplies, official resources and questions returning to the lead’s Message Center. A private invitation never publishes a public card. Use real component captures with labelled synthetic data. Nic-Nac remains inaccessible on marketing routes.

Show the actual Live Lineup strip in customer-site context and its click-to-open Full lineup view. Preserve real theme animation and recorded hero motion with pause controls, offscreen/background suspension, poster fallback, and reduced-motion/data-saver handling. Do not alter customer-site runtimes, queue or extension code to make marketing previews.
