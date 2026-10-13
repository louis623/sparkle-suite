# RG-01 Rose Champagne — Smoke review

Louis preferred the original palette over the Champagne & Copper color study.
Only its decorative gold gradient is adopted: the three Homepage reveal-step
icons, Join benefit icons and Live Lineup number circles (including the existing
drawer counters). Their dark rose glyphs/numerals retain readable contrast.
All other icon groups, social/calendar controls, page surfaces and the approved
hero stay in the first version's styling. This is a color-only RG-01 override;
sizes, spacing, shapes, content, lineup state behavior and other themes remain
unchanged. The broader local color study is not part of the release.

Louis approved the hero animation on October 3. The subsequent icon polish
keeps that animation, poster and runtime unchanged. RG-01 social platform
labels/glyphs, team social circles and Google/Outlook calendar choices use the
theme's wine, rose and cream palette. Existing media/benefit/success bubbles
have stronger contrast. No icon box, spacing, typography or layout changes.

The opaque sample-preview iframe blocked the Homepage's external SVG sprite.
For RG-01 Homepage previews only, trusted repository glyph paths are copied
into the existing SVG boxes before display. The iframe still uses
`sandbox="allow-scripts"`; its CSP, disabled uploads/forms and blocked network
writes retain their existing protections. Other themes and actual customer
runtime source are unchanged. To review, inspect the three reveal-step icons,
media header/empty-state circles, Facebook/TikTok event links, Add to calendar
choices, Join benefit/final icons and footer socials. Calendar review requires
opening and closing its choices only; do not follow provider links or submit
forms. Refresh restores the sample state. No Higgsfield request or spend is
needed for this polish.

Rose Champagne replaces the appearance of RG-01 while keeping the saved
`rose_gold` identity, Community policy, and existing Amethyst layout. Header,
navigation, announcement rows, tickers, Live Lineup, typography metrics, section
order, visibility preferences and customer actions retain their established
structure. Rose Gold remains a recognized selection alias. RG-02 Midnight Rose
and RG-03 Pearl Rose are planned separately after Louis accepts this first theme.

The original approved rose-copper artwork was animated through the Higgsfield
API using Seedance 2.5. The source is ten seconds at 720p with a fixed camera and
independent glitter/bokeh/reflection motion. The inspected web loop is 9.5 seconds,
1280×720/24fps, silent H.264, faststart, 1,753,130 bytes. Its matching WebP poster
uses the same crop. Customer visits do not call Higgsfield. Reduced motion and
saved Still prevent video loading; an accessible Pause/Play control preserves a
paused frame. Hidden/offscreen media pauses. Autoplay failure offers manual Play;
media failure retains the poster.

One request: `91373dd7-8518-47a8-87db-50296cab26ae`. Estimate $4.6224;
$5 reserved against the $30 collection contingency ceiling. Actual billed cost
is unverified. No paid revision or RG-02/RG-03 generation. Input/output hashes and
encode details are in `public/amethyst/skins/rose-champagne/PROVENANCE.md`.

## Release and verification

This batch targets only `sparkle-suite-smoke.vercel.app`, Vercel project
`prj_VTY0rpz2O3VBJqJv69iBz8tzLexQ`, staging database `pukemqiwlyqmyytxkdmo`.
The remote build must pass the original `assertEnvironment('suite',process.env)`
before `npm run build`. Project-level cron remains disabled. No Live aliases,
provider credentials, customer accounts, extension, Chrome Web Store or Finder
changes are included. Exact commit/deployment provenance and post-release results
are recorded in the Core Memory ship receipt, rather than guessed in this note.

Smoke's baseline catalog lacked the existing `rose_gold` row. The bounded fixture
completion inserts only that row as Community, with no owner/demo exception;
the guarded SQL refuses a conflicting existing policy and changes no account
selection. It is a manual staging fixture operation, not a Live migration.

Local checks: original eleven layout locks unchanged; focused identity, motion,
preview, header/layout, template, unsubscribe and settings regressions; TypeScript;
scoped ESLint; optimized offline build. Actual-page browser checks cover 320–2560px,
four customer pages, landscape/intermediate dimensions, four lineup states,
another light/dark theme, sandboxed preview navigation, same mobile animation,
matching crop, pause/resume, offscreen pause and reduced motion. The offline build
does not validate remote credentials; the separate build-host guard does.

## Repeatable Louis review

1. Open `https://sparkle-suite-smoke.vercel.app/skin-preview/rose_gold/homepage`.
   This is real Amethyst with clearly labeled sample content and no provider side
   effects. Review Home, Dance Floor, Join and Preferences using its preview tabs.
2. For saved settings, sign in at `https://sparkle-suite-smoke.vercel.app/login`
   with the designated synthetic Codex Suite access from the private Desktop
   Smoke handoff. Never paste its credentials into reports.
3. Open `/nic-nac?section=site-settings`. Under Customer-facing site theme select
   Rose Champagne (RG-01), use Sparkle rise or Soft glow, and Save site settings.
   Reload to verify persistence. Preserve all other settings.
4. Open `https://sparkle-suite-smoke.vercel.app/smokecodex`. Review animation on
   phone, tablet and laptop; pause/resume; scroll away/back; use the customer
   navigation for Dance Floor and Join. Avoid Shop and external provider links.
5. Save Hero motion = Still, then reload the customer site to verify the matching
   poster and no video request. Restore motion = Sparkle rise for animated review.
6. Reset the synthetic theme to The Golden Leaves of Autumn (GA-01) and motion to
   Sparkle rise if a prior-state reset is wanted. No personal account is needed.

The public preview is reusable without reseeding. It blocks real writes and its
optional lineup review controls remain environment-gated; regression tests prove
the controls are ignored outside Smoke. Live release requires Louis's later
approval of an exact accepted SHA and a fresh Live build.
