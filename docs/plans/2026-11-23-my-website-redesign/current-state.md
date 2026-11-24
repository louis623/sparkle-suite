# Customer-facing site setup: current state audit

Source: louis623/sparkle-suite @ `codex/nic-nac-trade-hardening` tip `b8fd4646` (read-only clone at `/workspace/ss-website-audit`).
Page: Workspace → Tools → **Customer-facing site setup** (`/nic-nac?section=site-settings`). Nothing was changed, deployed, or written.

## 1. Where it lives (files)

| What | Path |
|---|---|
| Page component (whole page is one ~830-line function) | `app/nic-nac/components/DashboardPlaceholder.tsx` → `SiteSettingsCard` (lines ~9697–10523) |
| Section registration (tab key `site-settings`, label "Customer-facing site setup", short "Site setup") | same file, `SECONDARY_WORKSPACE_SECTIONS` (~line 262); rendered at ~7323 |
| Draft / save / upload / preview handlers | same file: `handleSiteSettingsDraftChange` (~4475), `handleHomepageMediaUpload` (~4530), `handleRemoveHomepageVideo` (~4660), `saveSiteSettingsDraft` (~4685), `handleSaveSiteSettings` (~4749), `handleOpenCustomerSitePreview` (~6819), unsaved logic `hasSiteSettingsUnsavedChanges` (~2554) |
| "Show on your website" switches | `app/nic-nac/components/PublicSiteVisibility.tsx` (+ `.module.css`) |
| Social links | `app/nic-nac/components/SocialHandlesSettings.tsx`, `lib/public-site/social-visibility.ts` |
| Theme list for the rep | `app/nic-nac/components/useAvailableAmethystSkinCards.ts` → `GET /api/nic-nac/skin-options` → `lib/amethyst/skin-access.ts` |
| Theme catalog (names, codes, fonts, swatches, preview links) | `lib/amethyst/skin-cards.ts` |
| Theme engine values (colors, motion, fonts per preset) | `lib/amethyst/v2/homepage.jsx` (`PRESETS`, `TONES`, `applyHomepageTheme`), `lib/amethyst/appearance-presets.ts` |
| Existing sample-content theme preview pages | `app/skin-preview/[skin]/[page]/route.ts`, `lib/amethyst/skin-preview.ts` |
| A second, nicer theme picker (only in new-rep Required Setup, picks via a Nic-Nac chat message) | `app/nic-nac/components/RequiredSetupLookPicker.tsx` |
| Save API | `app/api/nic-nac/site-settings/route.ts` (+ `/media`, `/remove-video`), service `lib/services/site-settings.ts` |
| Styles | `app/nic-nac/components/DashboardPlaceholder.module.css` (`.siteSettings*`, `.homepageMedia*`, phone rules at ~7584) |
| Customer homepage it feeds | `lib/amethyst/v2/homepage.jsx` (SSR), data mapping in `lib/amethyst/preview-template-data.ts` |

## 2. Every section and control, in on-screen order

Header: title "Customer-facing site setup", subtitle "Keep your public profile, customer pages, and brand details tuned up." Right side: status text ("No unsaved changes." / "Unsaved changes." / "Saving changes..." / "Changes need attention."), **Preview customer site** button, **Save site settings** button.

| # | Section (as labeled) | Control | What it does | Where customers see it |
|---|---|---|---|---|
| 1 | **Signup discount** | Switch "Show a discount code after customers sign up for updates" | Turns the post-signup code on | Home → Signup section (confirmation after signing up) |
| | | Code (1–40 letters/numbers/hyphens) | The code shown | same |
| | | "Message shown with your code" (140 chars, counter) | Line shown with the code | same |
| | | Note: "Suite only shows this code. Set up the code itself in Bomb Party first." | | |
| 2 | **Profile basics** | Display name | Rep's first name used in copy ("Meet Louis", "It's a live jewelry reveal — with Louis") | Home hero subtitle default, About, What-is-a-Bomb-Party, Join, Trade |
| | | Show name | Business/brand name ("Fizz Festival") | Header logo text on every page, footer, legal text |
| | | Email | Contact email (no hint where it shows; plain text input, no email type) | Join page footer "Contact" (mailto) |
| | | Bomb Party rep store link (URL) | Every "Shop" button | Header SHOP button, hero "Shop Bomb Party", Dance Floor, Join |
| 3 | **Announcement messages** | Announcement ticker textarea (one per line) | Scrolling announcements | Top-of-page "ANNOUNCEMENTS" ticker on Home (and other pages' header stack) |
| | | 8 emoji buttons | Insert emoji at cursor | |
| | | "Link selected words" (highlight text → paste URL → button) | Makes chosen words a link | |
| | | "Make existing links plain text" (only if old links exist) | Legacy cleanup | |
| | | **Show on your website** (sub-block, `PublicSiteVisibility`): Announcements / Join Team (early-access only) / Dance Floor / Live Lineup switches | Hide/show those sections and nav links | Header nav, ticker rows, Live Lineup bar, Join page |
| 4 | **Branding and visuals** | **Customer-facing site theme** (plain `<select>`; option text like "Silver Bells (SB-01)" or "Black Diamond (BD-01) — Brittany's original custom skin") | Whole public-site look | Every public page |
| | | Team I manage | Join Team identity | Join page, hero "Join My Team" context |
| | | Team I belong to | Upline label | Home/Join/Trade small print |
| | | Site tagline | Footer tagline; hero subtitle only for older ("grandfathered") sites | Footer |
| | | Hero title (180) | Big homepage heading | Home hero |
| | | Hero subtitle (240) | Line under heading | Home hero |
| | | Hero motion (Sparkle rise / Soft glow / Still) | See "dead settings" below | (Mostly nowhere) |
| 5 | **Homepage photos and videos** (Britt: "Brittany custom media") | Help aside (only when the newer all-sources flag is off) | Explains link/embed rules | |
| | | Slot "Live reveal video" (`showcase`): video link/embed + caption | | Home → "It's a live jewelry reveal" (What is a Bomb Party) block, phone-frame video |
| | | Slot "About portrait photo" (`about_1`): Upload/Replace photo, Smart Frame (zoom, up/down, left/right sliders), photo caption, Remove photo | | Home → About section portrait |
| | | Slots "About short video 1–3": link + caption, Remove video (when queued/locked) | | Home → About section video cards |
| | | Britt only: switch "Show the About Brittany and Sparkle Moments section" | | |
| 6 | **About section** | About title (placeholder "Meet Brianna") | | Home → About heading |
| | | About narrative (counter) | | Home → About copy |
| 7 | **Social handles** | Instagram / Facebook / TikTok / YouTube / Whatnot link + "Show on site" + "Show in hero" toggles each | | Hero "Watch" buttons, footer icons |
| — | (bottom) | Error text from a failed save | | |

Customer homepage order for comparison (standard SSR layout, `homepage.jsx` `App`): **Header + ticker + Live Lineup bar → Hero (title, subtitle, Shop / Join / social buttons, "Browse the dance floor") → Upcoming shows (from Calendar tab) → What is a Bomb Party + Live reveal video → About (portrait, 3 short videos, story) → Signup (+ discount code) → Footer (socials, tagline)**. Then other pages: Dance Floor (`/trade`), Join (`/join`).

The editor order is roughly the reverse of that: the **last** thing on the homepage (signup discount) is the **first** thing in the editor, and the theme (the first thing a customer notices) is section 4 of 7.

## 3. How saving works

- **One Save for everything.** Every field edits a client-side draft; nothing goes live until **Save site settings** (top-right only). Status text next to it says "Unsaved changes."
- **Exceptions that act on their own**: photo upload stores the file immediately but still needs Save to publish ("Image uploaded. Save site settings to publish it."); **Remove video** on a queued/locked video saves instantly after a browser `confirm()`; Team Management's team-name save writes only `teamName` + `recruitingLink` from a different tab.
- **No autosave, no publish step, no draft history/undo, no "discard changes".**
- **No unsaved-changes guard.** No `beforeunload`; closing the tab or refreshing loses edits silently (draft survives switching Workspace tabs only because state lives in the parent).
- **Save button lives only at the top.** On phone it stacks full-width at the top of a very long page; it is not sticky. A rep editing socials at the bottom must scroll all the way back up to save, and the error from a failed save appears at the very **bottom** while the status at the top just says "Changes need attention."
- Save button is **disabled** while there are no changes or the discount fields are invalid (so the rep can't click and be told why).

## 4. Validation

- Client: discount code pattern and message length (inline `role="alert"`); ticker link must be http(s); text `maxLength`s on hero/about.
- Server only: store link must be a full http(s) URL; recruiting link must be https bombparty.com; TikTok "remove before replace" (409). Server errors come back as one message at the bottom of the card; the offending field is not highlighted or focused.
- No validation or hint on Email, Display name, Show name, social URLs (social shows "Use a real Instagram link to choose footer and hero" when invalid).

## 5. Empty / loading / error states

- Loading: two grey skeleton lines.
- Load error: one line, "Site settings will appear here once your public profile data loads." (no retry button).
- Theme list loading/error: the select shows "Loading your available themes…" / "Themes unavailable — refresh and try again".
- Empty media slots: just empty inputs; no picture of where the slot shows up.

## 6. Phone vs desktop

- Desktop: 2-column field grid inside soft-pink section boxes; media in a grid with a help aside.
- ≤ ~840px: everything goes to one column; save actions stack full width at the top. At 390px the page is a very long single scroll of ~35 controls with no in-page navigation, no section collapse, and no sticky save. Fold inner screen (~880px) gets the desktop 2-column grid squeezed into the Workspace content column.

## 7. Themes (catalog in `lib/amethyst/skin-cards.ts`)

25 entries, 24 selectable (Rose Quartz is retired and hidden). Which ones a rep sees comes from `/api/nic-nac/skin-options` (community + any private ones granted to that rep).

| Theme (code) | Access | Look assets that a preview could reuse | Sample preview page |
|---|---|---|---|
| Gobble & Fizz (GF-01) | community | `skins/gobble-and-fizz/hero-poster.webp` + loop.mp4 + sample portrait/moments | yes |
| Pumpkin Pie (PP-01) | community | `pie-please/hero-poster-v4.webp` + loop + samples | yes |
| Chasing Unicorns / Amethyst (AM-01) | community | `am01-unicorn/hero-poster.webp`, opening poster, motion.mp4 | yes |
| Sparkle Suite/Morganite (SS-01) | community | palette only (#ee2c9b / #ff4cae / #fcf8f6) + flyer plate | no |
| Moonstone (MS-01) | community | palette only + plate | no |
| Emerald Garden (EG-01) | community | palette only + plate | no |
| Halloween Pumpkin and Cat | community | `halloween-pumpkin-cat/hero-desktop*.webp`, mobile, motion.mp4 (own hero layout) | yes |
| Halloween Pumpkin and Witch | community | `halloween-pumpkin-witch/hero-*.webp`, witch/bats, plate.mp4 | yes |
| Rose Gold | community | palette only + plate | yes |
| Midnight Rose | community | `midnight-rose/hero-poster.webp` + loop | yes |
| Fall Owl and Harvest Moon | community | `fall-owl/hero-poster.webp` + loop | yes |
| Silver Bells | community | `silver-bells/hero-poster(.phone).webp` + loops + music | yes |
| Starlight Christmas Hollow | community | `starlight-christmas-hollow/hero-poster(.phone).webp` + loops + music | yes |
| Pearl Rose | community | `pearl-rose/hero-poster.webp` + loop | yes |
| Sunset Beach | community | `sunset-beach/hero-poster.webp`, approved hero (SSR avif/webp sizes) + loop | yes |
| Rose Champagne | community | `rose-champagne/hero-poster.webp` + loop | yes |
| Garnet / Amber / Velvet | community | palette only + plate | no |
| Black Diamond (BD-01) | private (Brittany) | palette only | no |
| Alpine Opal (AO-01) | private (Lindsey) | palette only | no |
| Gnome Forest (GG-01) | private | `gnome-garden/forest*.webp`, gnome, lantern | yes |
| Neon Butterfly (NB-01) | private | `neon-butterfly/kelly-studio-*.webp`, signs | yes |
| Pine (macies_christmas_globe) | private | posters + loops + music box | yes (auth-gated) |

Also usable for previews: every theme's `flyer/plate.webp` (1080×1920 background), and each preset's colors/fonts in `PRESETS`/`TONES`.

**Custom layouts** are not themes. They are per-rep page variants (`publicSiteVariant`): **Britt with Bling** (`britt_with_bling_hybrid`), **Bling Kitchen** (`bling_kitchen_hybrid`), and **Mile High Fizz** (`mile_high_fizz_hybrid`). Mile High Fizz is switched on by matching the rep's **email, Show name or Team name** text (`lib/mile-high-fizz/profile.ts`), so those plain text fields quietly control a layout.

**Existing preview capability**: `/skin-preview/<theme>/homepage|trade|join` renders 17 themes with **sample content** (not the rep's) in a sandboxed iframe page. It is linked only from the new-rep Required Setup picker, not from this page. Palette-only themes have no preview. The page's own **Preview customer site** button opens the Workspace preview panel on the rep's **saved** live site, so it can't show unsaved edits or another theme.

## 8. Confusing, duplicated, dead, or buried

**Confusing labels**
- "Customer-facing site setup" (tab) vs "Site Settings" (link text in Team Management) vs "Site setup" (short label): three names for one page.
- "Show name" means the business/brand name. "Display name" means the rep's first name. Neither says where it appears.
- "Site tagline" vs "Hero subtitle": both sound like the line under the headline. Tagline now mostly feeds the footer.
- Theme dropdown options carry internal codes ("(SS-01)") and long suffixes ("— Brittany's original custom skin").
- "Live reveal video" sits under "Homepage photos and videos" but shows up in the "What is a Bomb Party" block, not near About.
- The "Show on your website" switches are buried inside **Announcement messages**, though they control Dance Floor, Live Lineup and Join too.

**Duplicated**
- **Team I manage** is edited here *and* in Team Management (separate save).
- Theme picking exists twice: a plain select here and a card gallery (with preview links) in Required Setup that works through a chat message.
- Two video-help paths (`allSourcesEnabled` on/off) with different copy for the same slots.

**Dead or hidden**
- **Hero motion** select: on standard layouts `applyHomepageTheme` replaces it with the theme's own motion (`PRESETS[preset].heroMotion`), so the choice only matters on the custom-layout variants. Reps can change it and see nothing happen.
- Data fields that exist but have no control: `phone`, `bannerText`/`bannerVisible`, `heroImageUrl`, `aboutSubheading`, `signupDiscountOffer`, `customerSiteTemplate`.
- "Make existing links plain text" is a one-time legacy fixer that still has a permanent place in the UI.

**Buried**
- Theme (most-used, most visual) is section 4.
- No link to the **Calendar** tab even though "Upcoming shows" is the second block on the homepage.
- No link to **Team Management / Join page** settings, Dance Floor settings, or Business Card/QR.
- No custom-domain or "your site address" display on this page, no copy-link, no "open my site in a new tab" (only the in-Workspace preview of the saved site).
- No SEO/share-preview controls at all (title, description, share image).
